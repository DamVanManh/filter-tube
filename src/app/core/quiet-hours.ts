import { QuietHours } from './models';

const MINUTES_PER_DAY = 24 * 60;
export const LOCK_WARNING_MINUTES = 5;

export interface QuietHoursStatus {
  readonly locked: boolean;
  readonly minutesUntilLock: number | null;
}

function minuteOfDay(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function quietHoursStatus(rule: QuietHours, now: Date): QuietHoursStatus {
  const start = minuteOfDay(rule.start);
  const end = minuteOfDay(rule.end);
  if (!rule.enabled || start === end) return { locked: false, minutesUntilLock: null };
  const current = now.getHours() * 60 + now.getMinutes();
  const sinceStart = (current - start + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const length = (end - start + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  if (sinceStart < length) return { locked: true, minutesUntilLock: null };
  return { locked: false, minutesUntilLock: MINUTES_PER_DAY - sinceStart };
}

export const TAB_RETURN_AFTER_MS = 30 * 60 * 1000;

export function shouldReturnToLatest(isOnLatest: boolean, selectedAtMs: number, nowMs: number): boolean {
  return !isOnLatest && nowMs - selectedAtMs >= TAB_RETURN_AFTER_MS;
}
