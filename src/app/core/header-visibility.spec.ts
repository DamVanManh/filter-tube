import { HEADER_SCROLL_THRESHOLD_PX, nextHeaderState } from './header-visibility';

const HEADER = 200;

describe('nextHeaderState', () => {
  it('hides when scrolling down past the header and shows again when scrolling up', () => {
    const hidden = nextHeaderState({ visible: true, lastY: 300 }, 400, HEADER);
    expect(hidden).toEqual({ visible: false, lastY: 400 });
    expect(nextHeaderState(hidden, 350, HEADER)).toEqual({ visible: true, lastY: 350 });
  });

  it('always shows while near the top of the page', () => {
    expect(nextHeaderState({ visible: false, lastY: 150 }, 180, HEADER)).toEqual({ visible: true, lastY: 180 });
  });

  it('ignores tiny jitters so the header does not flicker', () => {
    const state = { visible: false, lastY: 1000 };
    expect(nextHeaderState(state, 1000 - (HEADER_SCROLL_THRESHOLD_PX - 1), HEADER)).toBe(state);
    expect(nextHeaderState(state, 1000 - HEADER_SCROLL_THRESHOLD_PX, HEADER).visible).toBe(true);
  });
});
