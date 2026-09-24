import { computed, inject, Injectable, signal } from '@angular/core';
import { ChannelStats, Video, VIDEO_ORIGIN } from './models';
import { SettingsStore } from './settings.store';
import { readJson, writeJson } from './storage';
import { mergeTopicVideos, searchOrderFor } from './topic-rotation';
import { YoutubeApi, YoutubeApiError } from './youtube-api';

const CACHE_KEY = 'feed-cache';
const HOUR_MS = 3_600_000;
export const FEED_POLICY = {
  channelTtlMs: HOUR_MS,
  topicTtlMs: 6 * HOUR_MS,
  topicMinRefreshMs: HOUR_MS,
  statsTtlMs: 7 * 24 * HOUR_MS,
  uploadsPerChannel: 15,
  searchResultsPerTopic: 40,
  searchWindowDays: 365,
  maxVideosPerTopic: 150,
} as const;

interface CachedSource {
  readonly fetchedAt: number;
  readonly videos: readonly Video[];
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

const QUOTA_REASONS: ReadonlySet<string> = new Set(['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded']);

function classifyError(error: unknown): FeedError {
  if (!(error instanceof YoutubeApiError)) return FEED_ERROR.NETWORK;
  if (QUOTA_REASONS.has(error.reason)) return FEED_ERROR.QUOTA;
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
    const active = new Set([
      ...settings.trustedChannels.map((c) => channelKey(c.id)),
      ...settings.topics.map((t) => topicKey(t.id)),
    ]);
    return Object.entries(this.cache().sources)
      .filter(([key]) => active.has(key))
      .flatMap(([, source]) => source.videos);
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
        .filter((t) =>
          this.isStale(sources[topicKey(t.id)], userRequested ? FEED_POLICY.topicMinRefreshMs : FEED_POLICY.topicTtlMs, now),
        )
        .map((t) => async () => {
          const since = new Date(now - FEED_POLICY.searchWindowDays * 24 * HOUR_MS);
          const ids = await this.api.searchVideoIds(t.query, FEED_POLICY.searchResultsPerTopic, since, searchOrderFor(now));
          const fresh = await this.api.videoDetails(ids, { origin: VIDEO_ORIGIN.TOPIC, topicId: t.id });
          const previous = sources[topicKey(t.id)]?.videos ?? [];
          sources[topicKey(t.id)] = { fetchedAt: now, videos: mergeTopicVideos(fresh, previous, FEED_POLICY.maxVideosPerTopic) };
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
