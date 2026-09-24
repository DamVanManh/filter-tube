import { Video } from './models';

export const SEARCH_ORDER = {
  RELEVANCE: 'relevance',
  DATE: 'date',
} as const;
export type SearchOrder = (typeof SEARCH_ORDER)[keyof typeof SEARCH_ORDER];

const ROTATION_PERIOD_MS = 6 * 3_600_000;
const ROTATION: readonly SearchOrder[] = [SEARCH_ORDER.RELEVANCE, SEARCH_ORDER.DATE];

export function searchOrderFor(nowMs: number): SearchOrder {
  return ROTATION[Math.floor(nowMs / ROTATION_PERIOD_MS) % ROTATION.length] ?? SEARCH_ORDER.RELEVANCE;
}

export function mergeTopicVideos(fresh: readonly Video[], previous: readonly Video[], max: number): Video[] {
  const freshIds = new Set(fresh.map((v) => v.id));
  return [...fresh, ...previous.filter((v) => !freshIds.has(v.id))].slice(0, max);
}
