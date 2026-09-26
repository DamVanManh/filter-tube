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

export function quietHoursStatus(rule: QuietHours, now: Date, unlockedUntilMs = 0): QuietHoursStatus {
  const start = minuteOfDay(rule.start);
  const end = minuteOfDay(rule.end);
  if (!rule.enabled || start === end) return { locked: false, minutesUntilLock: null };
  if (now.getTime() < unlockedUntilMs) {
    const minutesLeft = Math.ceil((unlockedUntilMs - now.getTime()) / 60_000);
    return { locked: false, minutesUntilLock: minutesLeft };
  }
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

export function quietHoursEnd(rule: QuietHours, now: Date): Date {
  const end = minuteOfDay(rule.end);
  const candidate = new Date(now);
  candidate.setHours(Math.floor(end / 60), end % 60, 0, 0);
  if (candidate.getTime() <= now.getTime()) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

export const UNLOCK_CHOICE = {
  HALF_HOUR: 'half-hour',
  ONE_HOUR: 'one-hour',
  UNTIL_MORNING: 'until-morning',
} as const;
export type UnlockChoice = (typeof UNLOCK_CHOICE)[keyof typeof UNLOCK_CHOICE];

export function unlockedUntil(choice: UnlockChoice, rule: QuietHours, now: Date): number {
  const nowMs = now.getTime();
  if (choice === UNLOCK_CHOICE.HALF_HOUR) return nowMs + 30 * 60_000;
  if (choice === UNLOCK_CHOICE.ONE_HOUR) return nowMs + 60 * 60_000;
  return quietHoursEnd(rule, now).getTime();
}
