import { Video } from './models';

export const MAX_HISTORY = 300;

export interface HistoryEntry {
  readonly video: Video;
  readonly watchedAt: string;
}

export function recordInHistory(
  history: readonly HistoryEntry[],
  video: Video,
  now: Date,
  max = MAX_HISTORY,
): HistoryEntry[] {
  const others = history.filter((entry) => entry.video.id !== video.id);
  return [{ video, watchedAt: now.toISOString() }, ...others].slice(0, max);
}
