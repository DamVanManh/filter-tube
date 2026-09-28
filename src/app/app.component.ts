import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { App } from '@capacitor/app';
import { ChannelPageComponent, PlayRequest } from './channel/channel-page.component';
import { AuthStore } from './core/auth.store';
import { FEED_ERROR, FeedStore } from './core/feed.store';
import { TAB_LATEST, feedTabs, otherVideosFor, videosForTab } from './core/feed-view';
import { Video } from './core/models';
import {
  ChannelRef,
  NavStack,
  Screen,
  nextInQueue,
  playerScreen,
  popScreen,
  pushScreen,
  rememberPlayerPosition,
  replaceTop,
  topScreen,
} from './core/nav-stack';
import { rootFontSizePx } from './core/ui-scale';
import { HeaderScrollState, nextHeaderState } from './core/header-visibility';
import { LOCK_WARNING_MINUTES, UNLOCK_CHOICE, UnlockChoice, quietHoursStatus, shouldReturnToLatest, unlockedUntil } from './core/quiet-hours';
import { readJson, writeJson } from './core/storage';
import { SEARCH_STATE, SearchStore } from './core/search.store';
import { SettingsStore } from './core/settings.store';
import { WatchedStore } from './core/watched.store';
import { PlayerComponent } from './player/player.component';
import { SettingsComponent } from './settings/settings.component';
import { VideoCardComponent } from './video-card/video-card.component';
import { HistoryPageComponent } from './history/history-page.component';
import { NearEndDirective } from './near-end/near-end.directive';
import { HistoryStore } from './core/history.store';

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
const BRAND_TEXT_MAX_SCALE = 1.15;
const UNLOCKED_UNTIL_KEY = 'quiet-unlocked-until';
const BACKGROUND_REFRESH_MS = 30 * 60 * 1000;
const FEED_PAGE_SIZE = 30;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PlayerComponent, SettingsComponent, ChannelPageComponent, VideoCardComponent, HistoryPageComponent, NearEndDirective],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private readonly settingsStore = inject(SettingsStore);
  private readonly watchedStore = inject(WatchedStore);
  private readonly historyStore = inject(HistoryStore);
  private readonly auth = inject(AuthStore);
  protected readonly feed = inject(FeedStore);
  protected readonly search = inject(SearchStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly player = viewChild(PlayerComponent);
  private readonly header = viewChild.required<ElementRef<HTMLElement>>('pageHeader');
  private headerScroll: HeaderScrollState = { visible: true, lastY: 0 };
  protected readonly headerVisible = signal(true);

  protected readonly SEARCH_STATE = SEARCH_STATE;
  protected readonly ready = signal(false);
  protected readonly activeTab = signal<string>(TAB_LATEST);
  private tabSelectedAt = Date.now();
  private lastRefreshAt = 0;
  protected readonly now = signal(new Date());
  protected readonly stack = signal<NavStack>([]);
  protected readonly top = computed<Screen | null>(() => topScreen(this.stack()));
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
  private readonly feedLimit = signal(FEED_PAGE_SIZE);
  protected readonly shownFeedVideos = computed(() => this.feedVideos().slice(0, this.feedLimit()));
  protected readonly latestVideos = computed(() =>
    videosForTab(
      TAB_LATEST,
      this.feed.allVideos(),
      this.settingsStore.settings(),
      this.feed.stats(),
      this.watchedStore.watchedIds(),
      new Date(),
    ),
  );
  protected readonly otherVideos = computed(() => {
    const top = this.top();
    return top?.kind === 'player' ? otherVideosFor(top.video, this.latestVideos(), this.settingsStore.settings().display.relatedFirstCount) : [];
  });
  protected readonly nextVideo = computed(() => {
    const top = this.top();
    return top?.kind === 'player' ? nextInQueue(top.queue, top.video) : null;
  });
  protected readonly errorText = computed(() => {
    const error = this.feed.error();
    return error ? ERROR_TEXT[error] : null;
  });
  protected readonly searchStateText = computed(() => SEARCH_STATE_TEXT[this.search.state()] ?? null);
  protected readonly watchedIds = this.watchedStore.watchedIds;
  protected readonly showsBrandText = computed(() => this.settingsStore.settings().display.uiScale <= BRAND_TEXT_MAX_SCALE);
  protected readonly quietHours = computed(() => this.settingsStore.settings().quietHours);
  private readonly unlockedUntilMs = signal(0);
  protected readonly lockStatus = computed(() => quietHoursStatus(this.quietHours(), this.now(), this.unlockedUntilMs()));
  protected readonly UNLOCK_CHOICE = UNLOCK_CHOICE;
  protected readonly unlockFormOpen = signal(false);
  protected readonly unlockError = signal<string | null>(null);
  protected readonly hasPin = this.settingsStore.hasPin;
  protected unlockPin = '';
  protected readonly isLocked = computed(() => this.lockStatus().locked);
  protected readonly playback = computed(() => this.settingsStore.settings().playback);
  protected readonly lockWarning = computed(() => {
    const minutes = this.lockStatus().minutesUntilLock;
    return minutes !== null && minutes <= LOCK_WARNING_MINUTES ? minutes : null;
  });

  constructor() {
    effect(() => {
      document.documentElement.style.fontSize = `${rootFontSizePx(this.settingsStore.settings().display.uiScale)}px`;
    });
    effect(() => {
      const top = this.top();
      if (top?.kind === 'player') void this.historyStore.record(top.video);
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.settingsStore.load(), this.watchedStore.load(), this.historyStore.load(), this.feed.load(), this.auth.restore()]);
    this.unlockedUntilMs.set((await readJson<number>(UNLOCKED_UNTIL_KEY)) ?? 0);
    this.ready.set(true);
    await this.listenToApp();
    this.startClock();
    this.followPageScroll();
  }

  private followPageScroll(): void {
    const onScroll = () => {
      this.headerScroll = nextHeaderState(this.headerScroll, window.scrollY, this.header().nativeElement.offsetHeight);
      this.headerVisible.set(this.headerScroll.visible);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
  }

  private revealHeader(): void {
    this.headerScroll = { visible: true, lastY: window.scrollY };
    this.headerVisible.set(true);
  }

  protected openUnlockForm(): void {
    this.unlockPin = '';
    this.unlockError.set(null);
    this.unlockFormOpen.set(true);
  }

  protected async unlock(choice: UnlockChoice): Promise<void> {
    const pin = this.unlockPin.trim();
    this.unlockPin = '';
    if (!(await this.settingsStore.verifyPin(pin))) {
      this.unlockError.set('Sai mã PIN.');
      return;
    }
    const until = unlockedUntil(choice, this.quietHours(), new Date());
    this.unlockedUntilMs.set(until);
    await writeJson(UNLOCKED_UNTIL_KEY, until);
    this.unlockFormOpen.set(false);
    this.tick();
  }

  protected showMoreFeed(): void {
    this.feedLimit.update((limit) => limit + FEED_PAGE_SIZE);
  }

  protected selectTab(id: string): void {
    this.activeTab.set(id);
    this.feedLimit.set(FEED_PAGE_SIZE);
    this.tabSelectedAt = Date.now();
    this.revealHeader();
    window.scrollTo({ top: 0 });
  }

  protected play(request: PlayRequest): void {
    this.stack.update((stack) => pushScreen(stack, playerScreen(request.video, request.queue)));
  }

  protected playFromFeed(video: Video, queue: readonly Video[]): void {
    this.stack.set([playerScreen(video, queue)]);
  }

  protected playNext(video: Video): void {
    this.stack.update((stack) => {
      const top = topScreen(stack);
      return top?.kind === 'player' ? replaceTop(stack, playerScreen(video, top.queue)) : stack;
    });
  }

  protected pickOtherVideo(video: Video): void {
    const position = this.player()?.position() ?? 0;
    this.stack.update((stack) => pushScreen(rememberPlayerPosition(stack, position), playerScreen(video, this.otherVideos())));
  }

  protected goBack(): void {
    this.stack.update(popScreen);
  }

  protected goHome(): void {
    this.stack.set([]);
  }

  protected openHistory(): void {
    this.stack.set([{ kind: 'history' }]);
  }

  protected openChannel(channel: ChannelRef): void {
    const position = this.player()?.position() ?? 0;
    this.stack.update((stack) => pushScreen(rememberPlayerPosition(stack, position), { kind: 'channel', channel }));
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
      this.feedLimit.set(FEED_PAGE_SIZE);
      window.scrollTo({ top: 0 });
    }
    if (now.getTime() - this.lastRefreshAt >= BACKGROUND_REFRESH_MS) void this.refreshRetryingNetwork();
  }

  private enforceLock(): void {
    const player = this.player();
    if (player?.isFullscreen()) void player.exitFullscreen();
    this.stack.set([]);
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
    if (this.settingsOpen()) void this.closeSettings();
    else if (player?.isFullscreen()) void player.exitFullscreen();
    else if (this.stack().length > 0) this.goBack();
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
