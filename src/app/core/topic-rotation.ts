import { Video } from './models';

const ROTATION_PERIOD_MS = 6 * 3_600_000;
const SEARCH_WINDOWS_DAYS: readonly number[] = [365, 60];

export function searchWindowDaysFor(nowMs: number): number {
  return SEARCH_WINDOWS_DAYS[Math.floor(nowMs / ROTATION_PERIOD_MS) % SEARCH_WINDOWS_DAYS.length] ?? 365;
}

export function mergeTopicVideos(fresh: readonly Video[], previous: readonly Video[], max: number): Video[] {
  const freshIds = new Set(fresh.map((v) => v.id));
  return [...fresh, ...previous.filter((v) => !freshIds.has(v.id))].slice(0, max);
}
