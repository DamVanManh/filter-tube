import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { PlayRequest } from '../channel/channel-page.component';
import { HistoryStore } from '../core/history.store';
import { Video } from '../core/models';
import { relativeTimeVi } from '../core/relative-time';
import { WatchedStore } from '../core/watched.store';
import { NearEndDirective } from '../near-end/near-end.directive';
import { VideoCardComponent } from '../video-card/video-card.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-history-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VideoCardComponent, NearEndDirective],
  templateUrl: './history-page.component.html',
})
export class HistoryPageComponent {
  readonly closed = output<void>();
  readonly play = output<PlayRequest>();

  private readonly history = inject(HistoryStore);
  protected readonly watchedIds = inject(WatchedStore).watchedIds;
  protected readonly relativeTime = (iso: string) => relativeTimeVi(iso, new Date());

  private readonly shownCount = signal(PAGE_SIZE);
  protected readonly total = computed(() => this.history.entries().length);
  protected readonly shown = computed(() => this.history.entries().slice(0, this.shownCount()));

  protected showMore(): void {
    this.shownCount.update((count) => count + PAGE_SIZE);
  }

  protected choose(video: Video): void {
    this.play.emit({ video, queue: this.history.entries().map((e) => e.video) });
  }
}
