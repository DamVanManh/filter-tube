import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { FEED_ERROR, FeedStore } from './core/feed.store';
import { TAB_LATEST, feedTabs, videosForTab } from './core/feed-view';
import { Video } from './core/models';
import { SettingsStore } from './core/settings.store';
import { WatchedStore } from './core/watched.store';
import { PlayerComponent } from './player/player.component';
import { SettingsComponent } from './settings/settings.component';

const ERROR_TEXT: Record<string, string> = {
  [FEED_ERROR.QUOTA]: 'Hôm nay đã tải đủ lượt, mai sẽ có video mới. Vẫn xem được video bên dưới.',
  [FEED_ERROR.CONFIG]: 'App chưa được cấu hình đúng để lấy video.',
  [FEED_ERROR.NETWORK]: 'Không có mạng. Vẫn xem được video đã tải trước đó.',
};

const NETWORK_RETRY_DELAYS_MS: readonly number[] = [3000, 10000, 30000];

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlayerComponent, SettingsComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private readonly settingsStore = inject(SettingsStore);
  private readonly watchedStore = inject(WatchedStore);
  protected readonly feed = inject(FeedStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly ready = signal(false);
  protected readonly activeTab = signal<string>(TAB_LATEST);
  protected readonly playing = signal<Video | null>(null);
  protected readonly settingsOpen = signal(false);

  protected readonly tabs = computed(() => feedTabs(this.settingsStore.settings()));
  protected readonly selectedTab = computed(() =>
    this.tabs().some((t) => t.id === this.activeTab()) ? this.activeTab() : TAB_LATEST,
  );
  protected readonly videos = computed(() =>
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
    if (!current) return null;
    const list = this.videos().filter((v) => v.id !== current.id);
    const index = this.videos().findIndex((v) => v.id === current.id);
    return this.videos()[index + 1] ?? list[0] ?? null;
  });
  protected readonly errorText = computed(() => {
    const error = this.feed.error();
    return error ? ERROR_TEXT[error] : null;
  });
  protected readonly watchedIds = this.watchedStore.watchedIds;
  protected readonly formatDuration = formatDuration;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.settingsStore.load(), this.watchedStore.load(), this.feed.load()]);
    this.ready.set(true);
    await this.listenToApp();
    await this.refreshRetryingNetwork();
  }

  protected selectTab(id: string): void {
    this.activeTab.set(id);
    window.scrollTo({ top: 0 });
  }

  protected play(video: Video): void {
    this.playing.set(video);
  }

  protected closePlayer(): void {
    this.playing.set(null);
  }

  protected markWatched(video: Video): void {
    void this.watchedStore.markWatched(video.id);
  }

  protected async blockChannel(video: Video): Promise<void> {
    await this.settingsStore.blockChannel(video.channelId, video.channelTitle);
    this.playing.set(null);
  }

  protected refresh(): void {
    void this.feed.refresh(true);
  }

  protected async closeSettings(): Promise<void> {
    this.settingsOpen.set(false);
    await this.feed.refresh(false);
  }

  private async refreshRetryingNetwork(): Promise<void> {
    await this.feed.refresh(false);
    for (const wait of NETWORK_RETRY_DELAYS_MS) {
      if (this.feed.error() !== FEED_ERROR.NETWORK) return;
      await delay(wait);
      await this.feed.refresh(false);
    }
  }

  private async listenToApp(): Promise<void> {
    try {
      const back = await App.addListener('backButton', () => {
        if (this.playing()) this.playing.set(null);
        else if (this.settingsOpen()) void this.closeSettings();
        else if (this.selectedTab() !== TAB_LATEST) this.selectTab(TAB_LATEST);
        else void App.minimizeApp();
      });
      const resume = await App.addListener('resume', () => void this.refreshRetryingNetwork());
      this.destroyRef.onDestroy(() => {
        void back.remove();
        void resume.remove();
      });
    } catch {}
  }
}
