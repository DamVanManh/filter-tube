import { DEFAULT_SETTINGS } from './defaults';
import { parseSettings } from './settings-io';
import { UI_SCALE_OPTIONS, clampUiScale, rootFontSizePx } from './ui-scale';

describe('ui scale', () => {
  it('scales the root font size, which every rem-sized text and box follows', () => {
    expect(rootFontSizePx(1)).toBe(20);
    expect(rootFontSizePx(1.5)).toBe(30);
    expect(rootFontSizePx(0.85)).toBe(17);
  });

  it('keeps the scale inside a usable range', () => {
    expect(clampUiScale(5)).toBe(1.6);
    expect(clampUiScale(0.1)).toBe(0.8);
    expect(UI_SCALE_OPTIONS.every((o) => clampUiScale(o.value) === o.value)).toBe(true);
  });
});

describe('display preferences in saved settings', () => {
  it('defaults to normal size with short titles', () => {
    expect(DEFAULT_SETTINGS.display).toEqual({ uiScale: 1, fullTitles: false, marqueeSpeed: 30 });
  });

  it('reads saved values, clamps an out-of-range scale, and falls back when missing', () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, display: { uiScale: 1.3, fullTitles: true } })?.display).toEqual({ uiScale: 1.3, fullTitles: true, marqueeSpeed: 30 });
    expect(parseSettings({ ...DEFAULT_SETTINGS, display: { uiScale: 9 } })?.display).toEqual({ uiScale: 1.6, fullTitles: false, marqueeSpeed: 30 });
    const { display: _omitted, ...withoutDisplay } = DEFAULT_SETTINGS;
    expect(parseSettings(withoutDisplay)?.display).toEqual(DEFAULT_SETTINGS.display);
  });
});
