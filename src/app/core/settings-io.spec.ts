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
});
