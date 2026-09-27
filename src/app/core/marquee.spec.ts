import { DEFAULT_SETTINGS } from './defaults';
import { MARQUEE_SPEED_OPTIONS, clampMarqueeSpeed, marqueeDurationSeconds, needsMarquee } from './marquee';
import { parseSettings } from './settings-io';

describe('marquee', () => {
  it('only scrolls text that is wider than its box', () => {
    expect(needsMarquee(200, 200)).toBe(false);
    expect(needsMarquee(200.5, 200)).toBe(false);
    expect(needsMarquee(260, 200)).toBe(true);
  });

  it('moves one full copy plus the gap per loop at the chosen speed', () => {
    expect(marqueeDurationSeconds(300, 60, 30)).toBe(12);
    expect(marqueeDurationSeconds(300, 60, 1000)).toBe(3);
  });

  it('keeps every offered speed inside the allowed range', () => {
    expect(clampMarqueeSpeed(0)).toBe(10);
    expect(MARQUEE_SPEED_OPTIONS.every((o) => clampMarqueeSpeed(o.value) === o.value)).toBe(true);
  });
});

describe('marquee and fullscreen settings', () => {
  it('defaults to slow scrolling and 4 seconds of fullscreen controls', () => {
    expect(DEFAULT_SETTINGS.display.marqueeSpeed).toBe(30);
    expect(DEFAULT_SETTINGS.playback.fullscreenControlsSeconds).toBe(4);
  });

  it('reads saved values and never lets fullscreen controls vanish instantly', () => {
    const parsed = parseSettings({
      ...DEFAULT_SETTINGS,
      display: { ...DEFAULT_SETTINGS.display, marqueeSpeed: 500 },
      playback: { ...DEFAULT_SETTINGS.playback, fullscreenControlsSeconds: 0 },
    });
    expect(parsed?.display.marqueeSpeed).toBe(120);
    expect(parsed?.playback.fullscreenControlsSeconds).toBe(1);
  });
});
