import { DEFAULT_SETTINGS } from './defaults';
import { QuietHours } from './models';
import { UNLOCK_CHOICE, quietHoursEnd, quietHoursStatus, shouldReturnToLatest, TAB_RETURN_AFTER_MS, unlockedUntil } from './quiet-hours';

function at(clock: string): Date {
  return new Date(`2026-09-26T${clock}:00`);
}

const NIGHT: QuietHours = { enabled: true, start: '23:00', end: '06:00' };

describe('quietHoursStatus across midnight (23:00 → 06:00)', () => {
  it.each([
    ['22:59', false, 1],
    ['23:00', true, null],
    ['02:30', true, null],
    ['05:59', true, null],
    ['06:00', false, 17 * 60],
    ['12:00', false, 11 * 60],
    ['22:55', false, 5],
  ])('%s → locked=%s, minutesUntilLock=%s', (clock, locked, minutes) => {
    expect(quietHoursStatus(NIGHT, at(clock))).toEqual({ locked, minutesUntilLock: minutes });
  });
});

describe('quietHoursStatus within one day (13:00 → 14:30)', () => {
  const nap: QuietHours = { enabled: true, start: '13:00', end: '14:30' };
  it.each([
    ['12:59', false],
    ['13:00', true],
    ['14:29', true],
    ['14:30', false],
    ['23:30', false],
  ])('%s → locked=%s', (clock, locked) => {
    expect(quietHoursStatus(nap, at(clock)).locked).toBe(locked);
  });
});

describe('quietHoursStatus when off', () => {
  it('never locks when disabled or when start equals end', () => {
    expect(quietHoursStatus({ ...NIGHT, enabled: false }, at('02:00'))).toEqual({ locked: false, minutesUntilLock: null });
    expect(quietHoursStatus({ enabled: true, start: '06:00', end: '06:00' }, at('06:00')).locked).toBe(false);
  });

  it('ships with the 23:00 → 06:00 schedule on', () => {
    expect(DEFAULT_SETTINGS.quietHours).toEqual(NIGHT);
  });
});

describe('shouldReturnToLatest', () => {
  it('returns to the latest tab exactly 30 minutes after a topic was chosen', () => {
    expect(shouldReturnToLatest(false, 0, TAB_RETURN_AFTER_MS - 1)).toBe(false);
    expect(shouldReturnToLatest(false, 0, TAB_RETURN_AFTER_MS)).toBe(true);
    expect(shouldReturnToLatest(true, 0, TAB_RETURN_AFTER_MS * 5)).toBe(false);
  });
});

describe('unlocking during quiet hours', () => {
  it('stays open until the unlock runs out, counting the minutes left as a warning', () => {
    const now = at('23:30');
    const until = unlockedUntil(UNLOCK_CHOICE.HALF_HOUR, NIGHT, now);
    expect(quietHoursStatus(NIGHT, now, until)).toEqual({ locked: false, minutesUntilLock: 30 });
    expect(quietHoursStatus(NIGHT, new Date(until - 4 * 60_000), until)).toEqual({ locked: false, minutesUntilLock: 4 });
    expect(quietHoursStatus(NIGHT, new Date(until), until).locked).toBe(true);
  });

  it('can unlock for an hour or until the schedule opens the app next morning', () => {
    const now = at('23:30');
    expect(unlockedUntil(UNLOCK_CHOICE.ONE_HOUR, NIGHT, now) - now.getTime()).toBe(60 * 60_000);
    expect(new Date(unlockedUntil(UNLOCK_CHOICE.UNTIL_MORNING, NIGHT, now))).toEqual(new Date('2026-09-27T06:00:00'));
    expect(quietHoursEnd(NIGHT, at('02:00'))).toEqual(new Date('2026-09-26T06:00:00'));
  });
});
