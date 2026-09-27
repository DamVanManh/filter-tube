import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Video } from '../core/models';
import { relativeTimeVi } from '../core/relative-time';
import { SettingsStore } from '../core/settings.store';
import { MarqueeComponent } from '../marquee/marquee.component';

export function formatDuration(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

@Component({
  selector: 'app-video-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarqueeComponent],
  templateUrl: './video-card.component.html',
})
export class VideoCardComponent {
  readonly video = input.required<Video>();
  readonly watched = input(false);
  readonly showChannel = input(true);
  readonly chosen = output<void>();

  private readonly settingsStore = inject(SettingsStore);
  protected readonly fullTitles = computed(() => this.settingsStore.settings().display.fullTitles);
  protected readonly metaLine = computed(() => {
    const age = relativeTimeVi(this.video().publishedAt, new Date());
    return this.showChannel() ? `${this.video().channelTitle} · ${age}` : age;
  });
  protected readonly formatDuration = formatDuration;
  protected readonly relativeTime = (iso: string) => relativeTimeVi(iso, new Date());
}
