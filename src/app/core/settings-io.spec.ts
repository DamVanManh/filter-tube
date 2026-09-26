import { DEFAULT_SETTINGS } from './defaults';
import { parseSettings } from './settings-io';

describe('parseSettings', () => {
  it('round-trips the defaults', () => {
    expect(parseSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)))).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects malformed lists', () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, topics: [{ id: 1 }] })).toBeNull();
    expect(parseSettings({ ...DEFAULT_SETTINGS, bannedKeywords: 'sốc' })).toBeNull();
    expect(parseSettings(null)).toBeNull();
  });

  it('fills missing thresholds from the defaults', () => {
    const parsed = parseSettings({ ...DEFAULT_SETTINGS, thresholds: { minDurationMinutes: 10 } });
    expect(parsed?.thresholds).toEqual({ ...DEFAULT_SETTINGS.thresholds, minDurationMinutes: 10 });
  });

  it('keeps a valid quiet-hours schedule and rejects malformed times', () => {
    const custom = parseSettings({ ...DEFAULT_SETTINGS, quietHours: { enabled: false, start: '22:30', end: '05:45' } });
    expect(custom?.quietHours).toEqual({ enabled: false, start: '22:30', end: '05:45' });
    const broken = parseSettings({ ...DEFAULT_SETTINGS, quietHours: { enabled: true, start: '25:00', end: 'x' } });
    expect(broken?.quietHours).toEqual(DEFAULT_SETTINGS.quietHours);
  });
});
