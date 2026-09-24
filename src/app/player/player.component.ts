import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Video } from '../core/models';
import { PLAYER_STATE, YtPlayer, createPlayer, loadYoutubeIframeApi } from './youtube-iframe';

export const AUTO_NEXT_SECONDS = 8;
const SKIP_SECONDS = 10;
const PROGRESS_POLL_MS = 500;

const OVERLAY = {
  NONE: 'none',
  PAUSED: 'paused',
  ENDED: 'ended',
  LOAD_ERROR: 'load-error',
  CONFIRM_BLOCK: 'confirm-block',
} as const;
type Overlay = (typeof OVERLAY)[keyof typeof OVERLAY];

function clockText(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

@Component({
  selector: 'app-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player.component.html',
})
export class PlayerComponent {
  readonly video = input.required<Video>();
  readonly nextVideo = input<Video | null>(null);

  readonly closed = output<void>();
  readonly watched = output<Video>();
  readonly playNext = output<Video>();
  readonly blockChannel = output<Video>();

  protected readonly OVERLAY = OVERLAY;
  protected readonly SKIP_SECONDS = SKIP_SECONDS;
  protected readonly clockText = clockText;
  protected readonly overlay = signal<Overlay>(OVERLAY.NONE);
  protected readonly countdown = signal(AUTO_NEXT_SECONDS);
  protected readonly isPlaying = signal(false);
  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('playerHost');
  private player: YtPlayer | null = null;
  private started = false;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopCountdown();
      this.stopProgress();
      this.player?.destroy();
    });

    effect(() => {
      const video = this.video();
      untracked(() => void this.open(video));
    });
  }

  protected togglePlay(): void {
    if (this.isPlaying()) this.player?.pauseVideo();
    else this.resume();
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
  }

  protected seekTo(raw: string): void {
    const target = Number(raw);
    if (!this.player || !Number.isFinite(target)) return;
    this.player.seekTo(target, true);
    this.currentTime.set(target);
  }

  protected goNext(): void {
    const next = this.nextVideo();
    this.stopCountdown();
    if (next) this.playNext.emit(next);
    else this.closed.emit();
  }

  protected askBlock(): void {
    this.stopCountdown();
    this.player?.pauseVideo();
    this.overlay.set(OVERLAY.CONFIRM_BLOCK);
  }

  protected confirmBlock(): void {
    this.blockChannel.emit(this.video());
  }

  protected cancelBlock(): void {
    this.overlay.set(OVERLAY.PAUSED);
  }

  protected close(): void {
    this.closed.emit();
  }

  private async open(video: Video): Promise<void> {
    this.stopCountdown();
    this.overlay.set(OVERLAY.NONE);
    this.started = false;
    this.currentTime.set(0);
    this.duration.set(video.durationSeconds);
    if (this.player) {
      this.player.loadVideoById(video.id);
      return;
    }
    try {
      const yt = await loadYoutubeIframeApi();
      this.player = createPlayer(yt, this.host().nativeElement, video.id, {
        onStateChange: (e) => this.onState(e.data),
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
      const reported = this.player?.getDuration() ?? 0;
      if (reported > 0) this.duration.set(reported);
      if (this.overlay() !== OVERLAY.CONFIRM_BLOCK) this.overlay.set(OVERLAY.NONE);
      this.startProgress();
    } else {
      this.stopProgress();
    }
    if (state === PLAYER_STATE.PAUSED && this.overlay() === OVERLAY.NONE) {
      this.overlay.set(OVERLAY.PAUSED);
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
