import { ChannelStats, Settings, Video, VIDEO_ORIGIN } from './models';
import { spreadChannels } from './topic-rotation';
import { keepAcceptable } from './video-filter';

export const TAB_LATEST = 'latest';
export const TAB_TRUSTED = 'trusted';

export interface FeedTab {
  readonly id: string;
  readonly label: string;
}

export function feedTabs(settings: Settings): FeedTab[] {
  const tabs: FeedTab[] = [{ id: TAB_LATEST, label: 'Mới nhất' }];
  if (settings.trustedChannels.length > 0) tabs.push({ id: TAB_TRUSTED, label: 'Kênh quen' });
  return [...tabs, ...settings.topics.map((t) => ({ id: t.id, label: t.label }))];
}

export function dedupePreferTrusted(videos: readonly Video[]): Video[] {
  const byId = new Map<string, Video>();
  for (const v of videos) {
    const existing = byId.get(v.id);
    if (!existing || (existing.origin !== VIDEO_ORIGIN.TRUSTED_CHANNEL && v.origin === VIDEO_ORIGIN.TRUSTED_CHANNEL)) {
      byId.set(v.id, v);
    }
  }
  return [...byId.values()];
}

export function videosForTab(
  tabId: string,
  allVideos: readonly Video[],
  settings: Settings,
  stats: ReadonlyMap<string, ChannelStats>,
  watched: ReadonlySet<string>,
  now: Date,
): Video[] {
  const inTab = allVideos.filter((v) => {
    if (tabId === TAB_LATEST) return true;
    if (tabId === TAB_TRUSTED) return settings.trustedChannels.some((c) => c.id === v.channelId);
    return v.topicId === tabId;
  });
  const unwatched = dedupePreferTrusted(inTab).filter((v) => !watched.has(v.id));
  const newestFirst = keepAcceptable(unwatched, settings, stats, now).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return spreadChannels(newestFirst);
}

export const RELATED_FIRST_MAX = 10;
export const RELATED_FIRST_OPTIONS: readonly number[] = [0, 1, 2, 3, 5, 10];

export function clampRelatedFirst(count: number): number {
  return Math.min(RELATED_FIRST_MAX, Math.max(0, Math.round(count)));
}

/** "Other videos" under the player: a few from the same topic or channel first, then the rest of the latest feed. */
export function otherVideosFor(current: Video, latest: readonly Video[], relatedCount: number): Video[] {
  const candidates = latest.filter((v) => v.id !== current.id);
  const related = candidates
    .filter((v) => v.channelId === current.channelId || (current.topicId !== null && v.topicId === current.topicId))
    .slice(0, relatedCount);
  const relatedIds = new Set(related.map((v) => v.id));
  return [...related, ...candidates.filter((v) => !relatedIds.has(v.id))];
}
