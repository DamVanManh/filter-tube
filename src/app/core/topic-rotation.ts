import { Video } from './models';

export const SEARCH_ORDER = {
  RELEVANCE: 'relevance',
  VIEW_COUNT: 'viewCount',
} as const;
export type SearchOrder = (typeof SEARCH_ORDER)[keyof typeof SEARCH_ORDER];

const SEARCH_WINDOWS_DAYS: readonly number[] = [365, 30, 7];
const SEARCH_ORDERS: readonly SearchOrder[] = [SEARCH_ORDER.RELEVANCE, SEARCH_ORDER.VIEW_COUNT];

export interface SearchPlan {
  readonly query: string;
  readonly windowDays: number;
  readonly order: SearchOrder;
}

/** A topic's query may hold several phrases separated by ";" or new lines. */
export function topicPhrases(query: string): string[] {
  const phrases = query
    .split(/[;\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return phrases.length > 0 ? phrases : [query.trim()];
}

/**
 * Each refresh of a topic ("round") searches something different: the next phrase first,
 * then another time window, then another ordering, so the pool keeps gaining new videos.
 */
export function searchPlanFor(query: string, round: number): SearchPlan {
  const phrases = topicPhrases(query);
  const n = Math.max(0, Math.floor(round));
  const perWindow = phrases.length;
  const perOrder = perWindow * SEARCH_WINDOWS_DAYS.length;
  return {
    query: phrases[n % perWindow],
    windowDays: SEARCH_WINDOWS_DAYS[Math.floor(n / perWindow) % SEARCH_WINDOWS_DAYS.length],
    order: SEARCH_ORDERS[Math.floor(n / perOrder) % SEARCH_ORDERS.length],
  };
}

export function mergeTopicVideos(fresh: readonly Video[], previous: readonly Video[], max: number): Video[] {
  const freshIds = new Set(fresh.map((v) => v.id));
  return [...fresh, ...previous.filter((v) => !freshIds.has(v.id))].slice(0, max);
}

/** Channels that showed up most in a search, to borrow more of their uploads. */
export function channelsToExplore(found: readonly Video[], blockedIds: ReadonlySet<string>, max: number): string[] {
  const counts = new Map<string, number>();
  for (const v of found) {
    if (!blockedIds.has(v.channelId)) counts.set(v.channelId, (counts.get(v.channelId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([id]) => id);
}

/** Every YouTube channel "UC…" has its uploads in the playlist "UU…". */
export function uploadsPlaylistIdFor(channelId: string): string | null {
  return channelId.startsWith('UC') ? `UU${channelId.slice(2)}` : null;
}

/**
 * Keeps the given order but avoids showing the same channel again within the last few cards,
 * so one busy channel does not fill the screen.
 */
export function spreadChannels<T extends { readonly channelId: string }>(videos: readonly T[], gap = 3): T[] {
  const pending = [...videos];
  const result: T[] = [];
  while (pending.length > 0) {
    const recent = new Set(result.slice(-gap).map((v) => v.channelId));
    const index = pending.findIndex((v) => !recent.has(v.channelId));
    result.push(pending.splice(index === -1 ? 0 : index, 1)[0]);
  }
  return result;
}
