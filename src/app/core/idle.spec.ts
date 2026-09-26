import { shouldAutoFullscreen } from './idle';

const base = { isPlaying: true, isFullscreen: false, lastInteractionMs: 0, afterSeconds: 60 };

describe('shouldAutoFullscreen', () => {
  it('switches to fullscreen after the configured untouched time of playback', () => {
    expect(shouldAutoFullscreen({ ...base, nowMs: 59_999 })).toBe(false);
    expect(shouldAutoFullscreen({ ...base, nowMs: 60_000 })).toBe(true);
    expect(shouldAutoFullscreen({ ...base, afterSeconds: 10, nowMs: 10_000 })).toBe(true);
  });

  it('never triggers while paused, when already fullscreen, or when turned off with 0', () => {
    expect(shouldAutoFullscreen({ ...base, isPlaying: false, nowMs: 600_000 })).toBe(false);
    expect(shouldAutoFullscreen({ ...base, isFullscreen: true, nowMs: 600_000 })).toBe(false);
    expect(shouldAutoFullscreen({ ...base, afterSeconds: 0, nowMs: 600_000 })).toBe(false);
  });

  it('measures from the latest interaction', () => {
    expect(shouldAutoFullscreen({ ...base, lastInteractionMs: 50_000, nowMs: 100_000 })).toBe(false);
  });
});
