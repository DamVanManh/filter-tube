import { Injectable, computed, inject, signal } from '@angular/core';
import { ChannelStats, Video, VIDEO_ORIGIN } from './models';
import { SettingsStore } from './settings.store';
import { keepAcceptable } from './video-filter';
import { YoutubeApi, isQuotaError } from './youtube-api';
import { normalizeSearchQuery } from './text';

const SEARCH_RESULTS = 50;
const SEARCH_CACHE_TTL_MS = 6 * 3_600_000;
const MAX_CACHED_QUERIES = 30;

export const SEARCH_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  DONE: 'done',
  QUOTA: 'quota',
  FAILED: 'failed',
} as const;
export type SearchState = (typeof SEARCH_STATE)[keyof typeof SEARCH_STATE];

interface SearchResult {
  readonly fetchedAt: number;
  readonly videos: readonly Video[];
  readonly stats: ReadonlyMap<string, ChannelStats>;
}

@Injectable({ providedIn: 'root' })
export class SearchStore {
  private readonly api = inject(YoutubeApi);
  private readonly settingsStore = inject(SettingsStore);
  private readonly cache = new Map<string, SearchResult>();

  readonly query = signal('');
  readonly state = signal<SearchState>(SEARCH_STATE.IDLE);
  private readonly result = signal<SearchResult | null>(null);

  readonly videos = computed<Video[]>(() => {
    const result = this.result();
    if (!result) return [];
    return keepAcceptable(result.videos, this.settingsStore.settings(), result.stats, new Date());
  });
  readonly isActive = computed(() => this.query() !== '');

  async search(raw: string): Promise<void> {
    const key = normalizeSearchQuery(raw);
    if (!key) {
      this.clear();
      return;
    }
    this.query.set(raw.trim());
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < SEARCH_CACHE_TTL_MS) {
      this.result.set(cached);
      this.state.set(SEARCH_STATE.DONE);
      return;
    }
    this.result.set(null);
    this.state.set(SEARCH_STATE.LOADING);
    try {
      const ids = await this.api.searchVideoIds(raw.trim(), SEARCH_RESULTS, null);
      const videos = await this.api.videoDetails(ids, { origin: VIDEO_ORIGIN.TOPIC, topicId: null });
      const stats = await this.api.channelStats([...new Set(videos.map((v) => v.channelId))]);
      const result: SearchResult = { fetchedAt: Date.now(), videos, stats: new Map(stats.map((s) => [s.channelId, s])) };
      this.remember(key, result);
      if (normalizeSearchQuery(this.query()) !== key) return;
      this.result.set(result);
      this.state.set(SEARCH_STATE.DONE);
    } catch (error) {
      if (normalizeSearchQuery(this.query()) !== key) return;
      this.state.set(isQuotaError(error) ? SEARCH_STATE.QUOTA : SEARCH_STATE.FAILED);
    }
  }

  clear(): void {
    this.query.set('');
    this.result.set(null);
    this.state.set(SEARCH_STATE.IDLE);
  }

  private remember(key: string, result: SearchResult): void {
    this.cache.delete(key);
    this.cache.set(key, result);
    while (this.cache.size > MAX_CACHED_QUERIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
  }
}
