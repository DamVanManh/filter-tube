import { ChannelStats, Settings, Video, VIDEO_ORIGIN } from './models';
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
  const acceptable = keepAcceptable(dedupePreferTrusted(inTab), settings, stats, now);
  return acceptable.sort((a, b) => {
    const watchedDiff = Number(watched.has(a.id)) - Number(watched.has(b.id));
    if (watchedDiff !== 0) return watchedDiff;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}
