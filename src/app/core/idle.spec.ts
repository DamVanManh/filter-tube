import { AUTO_FULLSCREEN_AFTER_MS, shouldAutoFullscreen } from './idle';

const base = { isPlaying: true, isFullscreen: false, lastInteractionMs: 0 };

describe('shouldAutoFullscreen', () => {
  it('switches to fullscreen after one untouched minute of playback', () => {
    expect(shouldAutoFullscreen({ ...base, nowMs: AUTO_FULLSCREEN_AFTER_MS - 1 })).toBe(false);
    expect(shouldAutoFullscreen({ ...base, nowMs: AUTO_FULLSCREEN_AFTER_MS })).toBe(true);
  });

  it('never triggers while paused or when already fullscreen', () => {
    expect(shouldAutoFullscreen({ ...base, isPlaying: false, nowMs: 10 * AUTO_FULLSCREEN_AFTER_MS })).toBe(false);
    expect(shouldAutoFullscreen({ ...base, isFullscreen: true, nowMs: 10 * AUTO_FULLSCREEN_AFTER_MS })).toBe(false);
  });

  it('measures from the latest interaction', () => {
    expect(shouldAutoFullscreen({ ...base, lastInteractionMs: 50_000, nowMs: 100_000 })).toBe(false);
  });
});
