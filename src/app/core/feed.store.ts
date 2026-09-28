import { computed, inject, Injectable, signal } from '@angular/core';
import { ChannelStats, Video, VIDEO_ORIGIN } from './models';
import { SettingsStore } from './settings.store';
import { readJson, writeJson } from './storage';
import { channelsToExplore, mergeTopicVideos, searchPlanFor, uploadsPlaylistIdFor } from './topic-rotation';
import { worthStoring } from './video-filter';
import { VideoSource, YoutubeApi, YoutubeApiError, isQuotaError } from './youtube-api';

const CACHE_KEY = 'feed-cache';
const HOUR_MS = 3_600_000;
export const FEED_POLICY = {
  channelTtlMs: HOUR_MS,
  topicTtlMs: 4 * HOUR_MS,
  topicMinRefreshMs: HOUR_MS,
  statsTtlMs: 7 * 24 * HOUR_MS,
  uploadsPerChannel: 15,
  searchResultsPerTopic: 50,
  channelsExploredPerSearch: 4,
  uploadsPerExploredChannel: 25,
  maxVideosPerTopic: 300,
} as const;

interface CachedSource {
  readonly fetchedAt: number;
  readonly videos: readonly Video[];
  readonly query?: string;
  readonly round?: number;
}

interface CachedStats extends ChannelStats {
  readonly fetchedAt: number;
}

interface FeedCache {
  readonly sources: Readonly<Record<string, CachedSource>>;
  readonly stats: Readonly<Record<string, CachedStats>>;
}

const EMPTY_CACHE: FeedCache = { sources: {}, stats: {} };

export const FEED_ERROR = {
  QUOTA: 'quota',
  CONFIG: 'config',
  NETWORK: 'network',
} as const;
export type FeedError = (typeof FEED_ERROR)[keyof typeof FEED_ERROR];

function channelKey(id: string): string {
  return `channel:${id}`;
}
function topicKey(id: string): string {
  return `topic:${id}`;
}

function cachedForQuery(source: CachedSource | undefined, query: string): boolean {
  return source !== undefined && source.query === query;
}

function classifyError(error: unknown): FeedError {
  if (!(error instanceof YoutubeApiError)) return FEED_ERROR.NETWORK;
  if (isQuotaError(error)) return FEED_ERROR.QUOTA;
  return error.status >= 400 && error.status < 500 ? FEED_ERROR.CONFIG : FEED_ERROR.NETWORK;
}

@Injectable({ providedIn: 'root' })
export class FeedStore {
  private readonly api = inject(YoutubeApi);
  private readonly settingsStore = inject(SettingsStore);
  private readonly cache = signal<FeedCache>(EMPTY_CACHE);

  readonly loading = signal(false);
  readonly error = signal<FeedError | null>(null);

  readonly allVideos = computed<Video[]>(() => {
    const settings = this.settingsStore.settings();
    const sources = this.cache().sources;
    const fromChannels = settings.trustedChannels.flatMap((c) => sources[channelKey(c.id)]?.videos ?? []);
    const fromTopics = settings.topics.flatMap((t) => {
      const source = sources[topicKey(t.id)];
      return cachedForQuery(source, t.query) ? (source?.videos ?? []) : [];
    });
    return [...fromChannels, ...fromTopics];
  });

  readonly stats = computed<ReadonlyMap<string, ChannelStats>>(
    () => new Map(Object.values(this.cache().stats).map((s) => [s.channelId, s])),
  );

  async load(): Promise<void> {
    this.cache.set((await readJson<FeedCache>(CACHE_KEY)) ?? EMPTY_CACHE);
  }

  async refresh(userRequested: boolean): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const settings = this.settingsStore.settings();
    const now = Date.now();
    const sources: Record<string, CachedSource> = { ...this.cache().sources };
    const failures: unknown[] = [];

    const jobs = [
      ...settings.trustedChannels
        .filter((c) => this.isStale(sources[channelKey(c.id)], userRequested ? 0 : FEED_POLICY.channelTtlMs, now))
        .map((c) => async () => {
          const ids = await this.api.latestUploadIds(c.uploadsPlaylistId, FEED_POLICY.uploadsPerChannel);
          const videos = await this.api.videoDetails(ids, { origin: VIDEO_ORIGIN.TRUSTED_CHANNEL, topicId: null });
          sources[channelKey(c.id)] = { fetchedAt: now, videos };
        }),
      ...settings.topics
        .filter(
          (t) =>
            !cachedForQuery(sources[topicKey(t.id)], t.query) ||
            this.isStale(sources[topicKey(t.id)], userRequested ? FEED_POLICY.topicMinRefreshMs : FEED_POLICY.topicTtlMs, now),
        )
        .map((t) => async () => {
          const cached = sources[topicKey(t.id)];
          const sameQuery = cachedForQuery(cached, t.query);
          const round = sameQuery ? (cached?.round ?? 0) : 0;
          const plan = searchPlanFor(t.query, round);
          const since = new Date(now - plan.windowDays * 24 * HOUR_MS);
          const source: VideoSource = { origin: VIDEO_ORIGIN.TOPIC, topicId: t.id };
          const ids = await this.api.searchVideoIds(plan.query, FEED_POLICY.searchResultsPerTopic, since, plan.order);
          const keep = (v: Video) => worthStoring(v, settings);
          const found = (await this.api.videoDetails(ids, source)).filter(keep);
          const fromChannels = (await this.exploreChannels(found, settings.blockedChannels.map((c) => c.id), source)).filter(keep);
          const previous = sameQuery ? (cached?.videos ?? []).filter(keep) : [];
          sources[topicKey(t.id)] = {
            fetchedAt: now,
            query: t.query,
            round: round + 1,
            videos: mergeTopicVideos([...found, ...fromChannels], previous, FEED_POLICY.maxVideosPerTopic),
          };
        }),
    ];

    await Promise.all(jobs.map((job) => job().catch((e: unknown) => failures.push(e))));
    const stats = await this.refreshStats(sources, now).catch((e: unknown) => {
      failures.push(e);
      return this.cache().stats;
    });

    const next: FeedCache = { sources, stats };
    this.cache.set(next);
    await writeJson(CACHE_KEY, next);
    const firstFailure = failures[0];
    if (firstFailure !== undefined) this.error.set(classifyError(firstFailure));
    this.loading.set(false);
  }

  /** Borrows the latest uploads of channels a search surfaced; cheap (1 quota unit per channel) compared to a search (100). */
  private async exploreChannels(
    found: readonly Video[],
    blockedIds: readonly string[],
    source: VideoSource,
  ): Promise<Video[]> {
    const playlists = channelsToExplore(found, new Set(blockedIds), FEED_POLICY.channelsExploredPerSearch)
      .map(uploadsPlaylistIdFor)
      .filter((id): id is string => id !== null);
    const idLists = await Promise.all(
      playlists.map((id) => this.api.latestUploadIds(id, FEED_POLICY.uploadsPerExploredChannel).catch(() => [])),
    );
    const known = new Set(found.map((v) => v.id));
    const ids = [...new Set(idLists.flat())].filter((id) => !known.has(id));
    return ids.length > 0 ? this.api.videoDetails(ids, source).catch(() => []) : [];
  }

  private isStale(source: CachedSource | undefined, ttlMs: number, now: number): boolean {
    return !source || now - source.fetchedAt >= ttlMs;
  }

  private async refreshStats(
    sources: Readonly<Record<string, CachedSource>>,
    now: number,
  ): Promise<Record<string, CachedStats>> {
    const known = this.cache().stats;
    const needed = new Set(
      Object.values(sources)
        .flatMap((s) => s.videos)
        .filter((v) => v.origin === VIDEO_ORIGIN.TOPIC)
        .map((v) => v.channelId),
    );
    const missing = [...needed].filter((id) => {
      const cached = known[id];
      return !cached || now - cached.fetchedAt >= FEED_POLICY.statsTtlMs;
    });
    if (missing.length === 0) return { ...known };
    const fresh = await this.api.channelStats(missing);
    const merged: Record<string, CachedStats> = { ...known };
    for (const s of fresh) merged[s.channelId] = { ...s, fetchedAt: now };
    return merged;
  }
}
