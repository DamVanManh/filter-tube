import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { App } from '@capacitor/app';
import { ChannelPageComponent, ChannelRef, PlayRequest } from './channel/channel-page.component';
import { AuthStore } from './core/auth.store';
import { FEED_ERROR, FeedStore } from './core/feed.store';
import { TAB_LATEST, feedTabs, videosForTab } from './core/feed-view';
import { Video } from './core/models';
import { LOCK_WARNING_MINUTES, quietHoursStatus, shouldReturnToLatest } from './core/quiet-hours';
import { SEARCH_STATE, SearchStore } from './core/search.store';
import { SettingsStore } from './core/settings.store';
import { WatchedStore } from './core/watched.store';
import { PlayerComponent } from './player/player.component';
import { SettingsComponent } from './settings/settings.component';
import { VideoCardComponent } from './video-card/video-card.component';

const ERROR_TEXT: Record<string, string> = {
  [FEED_ERROR.QUOTA]: 'Hôm nay đã tải đủ lượt, mai sẽ có video mới. Vẫn xem được video bên dưới.',
  [FEED_ERROR.CONFIG]: 'App chưa được cấu hình đúng để lấy video.',
  [FEED_ERROR.NETWORK]: 'Không có mạng. Vẫn xem được video đã tải trước đó.',
};

const SEARCH_STATE_TEXT: Record<string, string> = {
  [SEARCH_STATE.QUOTA]: 'Hôm nay đã tìm đủ lượt. Mai tìm tiếp được.',
  [SEARCH_STATE.FAILED]: 'Không tìm được. Kiểm tra mạng rồi thử lại.',
};

const NETWORK_RETRY_DELAYS_MS: readonly number[] = [3000, 10000, 30000];
const CLOCK_TICK_MS = 15_000;
const BACKGROUND_REFRESH_MS = 30 * 60 * 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nextInQueue(queue: readonly Video[], current: Video): Video | null {
  const index = queue.findIndex((v) => v.id === current.id);
  return queue[index + 1] ?? queue.find((v) => v.id !== current.id) ?? null;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PlayerComponent, SettingsComponent, ChannelPageComponent, VideoCardComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private readonly settingsStore = inject(SettingsStore);
  private readonly watchedStore = inject(WatchedStore);
  private readonly auth = inject(AuthStore);
  protected readonly feed = inject(FeedStore);
  protected readonly search = inject(SearchStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly player = viewChild(PlayerComponent);

  protected readonly SEARCH_STATE = SEARCH_STATE;
  protected readonly ready = signal(false);
  protected readonly activeTab = signal<string>(TAB_LATEST);
  private tabSelectedAt = Date.now();
  private lastRefreshAt = 0;
  protected readonly now = signal(new Date());
  protected readonly playing = signal<Video | null>(null);
  private readonly playQueue = signal<readonly Video[]>([]);
  protected readonly channelView = signal<ChannelRef | null>(null);
  protected readonly settingsOpen = signal(false);
  protected searchText = '';

  protected readonly tabs = computed(() => feedTabs(this.settingsStore.settings()));
  protected readonly selectedTab = computed(() =>
    this.tabs().some((t) => t.id === this.activeTab()) ? this.activeTab() : TAB_LATEST,
  );
  protected readonly feedVideos = computed(() =>
    videosForTab(
      this.selectedTab(),
      this.feed.allVideos(),
      this.settingsStore.settings(),
      this.feed.stats(),
      this.watchedStore.watchedIds(),
      new Date(),
    ),
  );
  protected readonly nextVideo = computed(() => {
    const current = this.playing();
    return current ? nextInQueue(this.playQueue(), current) : null;
  });
  protected readonly errorText = computed(() => {
    const error = this.feed.error();
    return error ? ERROR_TEXT[error] : null;
  });
  protected readonly searchStateText = computed(() => SEARCH_STATE_TEXT[this.search.state()] ?? null);
  protected readonly watchedIds = this.watchedStore.watchedIds;
  protected readonly quietHours = computed(() => this.settingsStore.settings().quietHours);
  protected readonly lockStatus = computed(() => quietHoursStatus(this.quietHours(), this.now()));
  protected readonly isLocked = computed(() => this.lockStatus().locked);
  protected readonly lockWarning = computed(() => {
    const minutes = this.lockStatus().minutesUntilLock;
    return minutes !== null && minutes <= LOCK_WARNING_MINUTES ? minutes : null;
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.settingsStore.load(), this.watchedStore.load(), this.feed.load(), this.auth.restore()]);
    this.ready.set(true);
    await this.listenToApp();
    this.startClock();
  }

  protected selectTab(id: string): void {
    this.activeTab.set(id);
    this.tabSelectedAt = Date.now();
    window.scrollTo({ top: 0 });
  }

  protected play(request: PlayRequest): void {
    this.playQueue.set(request.queue);
    this.playing.set(request.video);
  }

  protected playFromFeed(video: Video, queue: readonly Video[]): void {
    this.play({ video, queue });
  }

  protected playNext(video: Video): void {
    this.playing.set(video);
  }

  protected closePlayer(): void {
    this.playing.set(null);
  }

  protected openChannel(channel: ChannelRef): void {
    this.playing.set(null);
    this.channelView.set(channel);
  }

  protected closeChannel(): void {
    this.channelView.set(null);
  }

  protected markWatched(video: Video): void {
    void this.watchedStore.markWatched(video.id);
  }

  protected submitSearch(): void {
    const input = document.activeElement;
    if (input instanceof HTMLElement) input.blur();
    void this.search.search(this.searchText);
    window.scrollTo({ top: 0 });
  }

  protected clearSearch(): void {
    this.searchText = '';
    this.search.clear();
  }

  protected refresh(): void {
    void this.feed.refresh(true);
  }

  protected async closeSettings(): Promise<void> {
    this.settingsOpen.set(false);
    await this.feed.refresh(false);
  }

  private startClock(): void {
    const timer = setInterval(() => this.tick(), CLOCK_TICK_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
    this.tick();
  }

  private tick(): void {
    const now = new Date();
    this.now.set(now);
    if (this.isLocked()) {
      this.enforceLock();
      return;
    }
    if (shouldReturnToLatest(this.selectedTab() === TAB_LATEST, this.tabSelectedAt, now.getTime())) {
      this.activeTab.set(TAB_LATEST);
      window.scrollTo({ top: 0 });
    }
    if (now.getTime() - this.lastRefreshAt >= BACKGROUND_REFRESH_MS) void this.refreshRetryingNetwork();
  }

  private enforceLock(): void {
    const player = this.player();
    if (player?.isFullscreen()) void player.exitFullscreen();
    this.playing.set(null);
    this.channelView.set(null);
    if (this.search.isActive()) this.clearSearch();
  }

  private async refreshRetryingNetwork(): Promise<void> {
    if (this.isLocked()) return;
    this.lastRefreshAt = Date.now();
    await this.feed.refresh(false);
    for (const wait of NETWORK_RETRY_DELAYS_MS) {
      if (this.feed.error() !== FEED_ERROR.NETWORK) return;
      await delay(wait);
      await this.feed.refresh(false);
    }
  }

  private handleBack(): void {
    if (this.isLocked() && !this.settingsOpen()) {
      void App.minimizeApp();
      return;
    }
    const player = this.player();
    if (player?.isFullscreen()) void player.exitFullscreen();
    else if (this.playing()) this.playing.set(null);
    else if (this.channelView()) this.channelView.set(null);
    else if (this.settingsOpen()) void this.closeSettings();
    else if (this.search.isActive()) this.clearSearch();
    else if (this.selectedTab() !== TAB_LATEST) this.selectTab(TAB_LATEST);
    else void App.minimizeApp();
  }

  private async listenToApp(): Promise<void> {
    try {
      const back = await App.addListener('backButton', () => this.handleBack());
      const resume = await App.addListener('resume', () => {
        this.tick();
        void this.refreshRetryingNetwork();
      });
      this.destroyRef.onDestroy(() => {
        void back.remove();
        void resume.remove();
      });
    } catch {}
  }
}
