export const HEADER_SCROLL_THRESHOLD_PX = 8;

export interface HeaderScrollState {
  readonly visible: boolean;
  readonly lastY: number;
}

export function nextHeaderState(state: HeaderScrollState, y: number, headerHeightPx: number): HeaderScrollState {
  if (y <= headerHeightPx) return { visible: true, lastY: y };
  const delta = y - state.lastY;
  if (Math.abs(delta) < HEADER_SCROLL_THRESHOLD_PX) return state;
  return { visible: delta < 0, lastY: y };
}
