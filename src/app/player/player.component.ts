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

const OVERLAY = {
  NONE: 'none',
  PAUSED: 'paused',
  ENDED: 'ended',
  LOAD_ERROR: 'load-error',
  CONFIRM_BLOCK: 'confirm-block',
} as const;
type Overlay = (typeof OVERLAY)[keyof typeof OVERLAY];

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
  protected readonly overlay = signal<Overlay>(OVERLAY.NONE);
  protected readonly countdown = signal(AUTO_NEXT_SECONDS);
  protected readonly started = signal(false);

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('playerHost');
  private player: YtPlayer | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopCountdown();
      this.player?.destroy();
    });

    effect(() => {
      const video = this.video();
      untracked(() => this.open(video));
    });
  }

  protected resume(): void {
    this.overlay.set(OVERLAY.NONE);
    this.player?.playVideo();
  }

  protected pause(): void {
    this.player?.pauseVideo();
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
    this.started.set(false);
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
    if (state === PLAYER_STATE.PLAYING) {
      if (!this.started()) {
        this.started.set(true);
        this.watched.emit(this.video());
      }
      if (this.overlay() !== OVERLAY.CONFIRM_BLOCK) this.overlay.set(OVERLAY.NONE);
    } else if (state === PLAYER_STATE.PAUSED) {
      if (this.overlay() === OVERLAY.NONE) this.overlay.set(OVERLAY.PAUSED);
    } else if (state === PLAYER_STATE.ENDED) {
      this.overlay.set(OVERLAY.ENDED);
      this.startCountdown();
    }
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
