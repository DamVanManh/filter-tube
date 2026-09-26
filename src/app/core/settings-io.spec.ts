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

  it('reads the playback timers and captions, clamping timers to 0–3600 seconds', () => {
    expect(DEFAULT_SETTINGS.playback).toEqual({ autoFullscreenSeconds: 60, expandControlsSeconds: 30, captions: false });
    const custom = parseSettings({ ...DEFAULT_SETTINGS, playback: { autoFullscreenSeconds: 120, expandControlsSeconds: -5, captions: true } });
    expect(custom?.playback).toEqual({ autoFullscreenSeconds: 120, expandControlsSeconds: 0, captions: true });
    const huge = parseSettings({ ...DEFAULT_SETTINGS, playback: { autoFullscreenSeconds: 99999 } });
    expect(huge?.playback).toEqual({ autoFullscreenSeconds: 3600, expandControlsSeconds: 30, captions: false });
  });
});
