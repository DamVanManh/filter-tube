import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  computed,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ChannelRef } from '../core/nav-stack';
import { CommentsComponent } from '../comments/comments.component';
import { MarqueeComponent } from '../marquee/marquee.component';
import { shouldAutoFullscreen } from '../core/idle';
import { Video } from '../core/models';
import { relativeTimeVi } from '../core/relative-time';
import { enterDeviceFullscreen, exitDeviceFullscreen } from '../native/player-chrome';
import { VideoCardComponent, formatDuration } from '../video-card/video-card.component';
import { PLAYER_STATE, YtPlayer, applyCaptions, createPlayer, loadYoutubeIframeApi } from './youtube-iframe';

export const AUTO_NEXT_SECONDS = 8;
const SKIP_SECONDS = 10;
const PROGRESS_POLL_MS = 500;
const IGNORE_LAYOUT_SCROLL_MS = 500;

const IDLE_CHECK_MS = 5000;

export const PLAYER_PANEL = {
  COMMENTS: 'comments',
  OTHER_VIDEOS: 'other-videos',
} as const;
export type PlayerPanel = (typeof PLAYER_PANEL)[keyof typeof PLAYER_PANEL];

let lastChosenPanel: PlayerPanel = PLAYER_PANEL.COMMENTS;

const OVERLAY = {
  NONE: 'none',
  ENDED: 'ended',
  LOAD_ERROR: 'load-error',
} as const;
type Overlay = (typeof OVERLAY)[keyof typeof OVERLAY];

@Component({
  selector: 'app-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommentsComponent, VideoCardComponent, MarqueeComponent],
  host: { '(pointerdown)': 'markInteraction()' },
  templateUrl: './player.component.html',
})
export class PlayerComponent {
  readonly video = input.required<Video>();
  readonly nextVideo = input<Video | null>(null);
  readonly startAt = input(0);
  readonly otherVideos = input<readonly Video[]>([]);
  readonly autoFullscreenSeconds = input(60);
  readonly expandControlsSeconds = input(30);
  readonly captions = input(false);
  readonly fullscreenControlsSeconds = input(4);

  readonly closed = output<void>();
  readonly watched = output<Video>();
  readonly playNext = output<Video>();
  readonly openChannel = output<ChannelRef>();
  readonly pickVideo = output<Video>();

  protected readonly OVERLAY = OVERLAY;
  protected readonly SKIP_SECONDS = SKIP_SECONDS;
  protected readonly clockText = formatDuration;
  protected readonly relativeTime = (iso: string) => relativeTimeVi(iso, new Date());
  protected readonly overlay = signal<Overlay>(OVERLAY.NONE);
  protected readonly countdown = signal(AUTO_NEXT_SECONDS);
  protected readonly isPlaying = signal(false);
  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);
  readonly isFullscreen = signal(false);
  protected readonly fullscreenControlsVisible = signal(true);
  protected readonly controlsCollapsed = signal(false);
  protected readonly PLAYER_PANEL = PLAYER_PANEL;
  protected readonly panel = signal<PlayerPanel>(lastChosenPanel);
  protected readonly others = computed(() => this.otherVideos().filter((v) => v.id !== this.video().id));
  private lastInteractionMs = Date.now();
  private expandTimer: ReturnType<typeof setTimeout> | null = null;
  private ignoreScrollUntilMs = 0;

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('playerHost');
  private player: YtPlayer | null = null;
  private started = false;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private controlsTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopCountdown();
      this.stopProgress();
      this.clearControlsTimer();
      this.clearExpandTimer();
      if (this.isFullscreen()) void exitDeviceFullscreen();
      this.player?.destroy();
    });

    effect(() => {
      const video = this.video();
      untracked(() => void this.open(video));
    });

    effect(() => {
      const captions = this.captions();
      if (this.player) applyCaptions(this.player, captions);
    });

    const idleTimer = setInterval(() => this.checkIdle(), IDLE_CHECK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(idleTimer));
  }

  markInteraction(): void {
    this.lastInteractionMs = Date.now();
  }

  protected choosePanel(panel: PlayerPanel): void {
    lastChosenPanel = panel;
    this.panel.set(panel);
  }

  private checkIdle(): void {
    const idle = {
      isPlaying: this.isPlaying(),
      isFullscreen: this.isFullscreen(),
      lastInteractionMs: this.lastInteractionMs,
      nowMs: Date.now(),
      afterSeconds: this.autoFullscreenSeconds(),
    };
    if (shouldAutoFullscreen(idle)) void this.enterFullscreen();
  }

  position(): number {
    return this.player?.getCurrentTime() ?? this.currentTime();
  }

  protected onInfoScroll(): void {
    if (Date.now() < this.ignoreScrollUntilMs) return;
    this.markInteraction();
    this.controlsCollapsed.set(true);
    this.scheduleControlsExpand();
  }

  private scheduleControlsExpand(): void {
    this.clearExpandTimer();
    const seconds = this.expandControlsSeconds();
    if (seconds <= 0) return;
    this.expandTimer = setTimeout(() => this.expandControls(), seconds * 1000);
  }

  private expandControls(): void {
    this.clearExpandTimer();
    this.ignoreScrollUntilMs = Date.now() + IGNORE_LAYOUT_SCROLL_MS;
    this.controlsCollapsed.set(false);
  }

  private clearExpandTimer(): void {
    if (this.expandTimer !== null) clearTimeout(this.expandTimer);
    this.expandTimer = null;
  }

  async enterFullscreen(): Promise<void> {
    this.isFullscreen.set(true);
    this.revealFullscreenControls();
    await enterDeviceFullscreen();
  }

  async exitFullscreen(): Promise<void> {
    this.markInteraction();
    this.isFullscreen.set(false);
    this.clearControlsTimer();
    await exitDeviceFullscreen();
  }

  protected onVideoTap(): void {
    if (!this.isFullscreen()) {
      if (this.controlsCollapsed()) this.expandControls();
      else this.togglePlay();
      return;
    }
    if (!this.isPlaying()) {
      this.resume();
      this.revealFullscreenControls();
    } else if (this.fullscreenControlsVisible()) {
      this.hideFullscreenControls();
    } else {
      this.revealFullscreenControls();
    }
  }

  protected togglePlay(): void {
    if (this.isPlaying()) {
      this.player?.pauseVideo();
      if (this.isFullscreen()) this.hideFullscreenControls();
      return;
    }
    this.resume();
    if (this.isFullscreen()) this.revealFullscreenControls();
  }

  protected resume(): void {
    this.overlay.set(OVERLAY.NONE);
    this.player?.playVideo();
  }

  protected skip(deltaSeconds: number): void {
    if (!this.player) return;
    const target = Math.min(Math.max(0, this.player.getCurrentTime() + deltaSeconds), this.duration());
    this.player.seekTo(target, true);
    this.currentTime.set(target);
    if (this.isFullscreen()) this.revealFullscreenControls();
  }

  protected seekTo(raw: string): void {
    const target = Number(raw);
    if (!this.player || !Number.isFinite(target)) return;
    this.player.seekTo(target, true);
    this.currentTime.set(target);
    if (this.isFullscreen()) this.revealFullscreenControls();
  }

  protected goNext(): void {
    const next = this.nextVideo();
    this.stopCountdown();
    if (next) this.playNext.emit(next);
    else this.close();
  }

  protected showChannel(): void {
    const video = this.video();
    this.player?.pauseVideo();
    this.openChannel.emit({ id: video.channelId, title: video.channelTitle });
  }

  protected close(): void {
    this.closed.emit();
  }

  private revealFullscreenControls(): void {
    this.fullscreenControlsVisible.set(true);
    this.clearControlsTimer();
    this.controlsTimer = setTimeout(() => this.hideFullscreenControls(), this.fullscreenControlsSeconds() * 1000);
  }

  private hideFullscreenControls(): void {
    this.clearControlsTimer();
    this.fullscreenControlsVisible.set(false);
  }

  private clearControlsTimer(): void {
    if (this.controlsTimer !== null) clearTimeout(this.controlsTimer);
    this.controlsTimer = null;
  }

  private async open(video: Video): Promise<void> {
    const startSeconds = this.startAt();
    this.stopCountdown();
    this.overlay.set(OVERLAY.NONE);
    this.expandControls();
    this.markInteraction();
    this.started = false;
    this.currentTime.set(startSeconds);
    this.duration.set(video.durationSeconds);
    if (this.player) {
      this.player.loadVideoById({ videoId: video.id, startSeconds });
      return;
    }
    try {
      const yt = await loadYoutubeIframeApi();
      this.player = createPlayer(yt, this.host().nativeElement, video.id, startSeconds, this.captions(), {
        onStateChange: (e) => this.onState(e.data),
        onApiChange: () => {
          if (this.player) applyCaptions(this.player, this.captions());
        },
        onError: () => this.overlay.set(OVERLAY.LOAD_ERROR),
      });
    } catch {
      this.overlay.set(OVERLAY.LOAD_ERROR);
    }
  }

  private onState(state: number): void {
    this.isPlaying.set(state === PLAYER_STATE.PLAYING);
    if (state === PLAYER_STATE.PLAYING) {
      if (!this.started) {
        this.started = true;
        this.watched.emit(this.video());
      }
      if (this.player) applyCaptions(this.player, this.captions());
      const reported = this.player?.getDuration() ?? 0;
      if (reported > 0) this.duration.set(reported);
      this.overlay.set(OVERLAY.NONE);
      this.startProgress();
    } else {
      this.stopProgress();
    }
    if (state === PLAYER_STATE.PAUSED && this.isFullscreen()) {
      this.hideFullscreenControls();
    } else if (state === PLAYER_STATE.ENDED) {
      this.overlay.set(OVERLAY.ENDED);
      this.startCountdown();
    }
  }

  private startProgress(): void {
    this.stopProgress();
    this.progressTimer = setInterval(() => this.currentTime.set(this.player?.getCurrentTime() ?? 0), PROGRESS_POLL_MS);
  }

  private stopProgress(): void {
    if (this.progressTimer !== null) clearInterval(this.progressTimer);
    this.progressTimer = null;
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.countdown.set(AUTO_NEXT_SECONDS);
    if (!this.nextVideo()) return;
    this.countdownTimer = setInterval(() => {
      const left = this.countdown() - 1;
      this.countdown.set(left);
      if (left <= 0) this.goNext();
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }
}
