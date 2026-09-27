export const MARQUEE_GAP_REM = 3;
export const MARQUEE_SPEED_MIN = 10;
export const MARQUEE_SPEED_MAX = 120;

export interface MarqueeSpeedOption {
  readonly value: number;
  readonly label: string;
}

export const MARQUEE_SPEED_OPTIONS: readonly MarqueeSpeedOption[] = [
  { value: 18, label: 'Rất chậm' },
  { value: 30, label: 'Chậm' },
  { value: 50, label: 'Vừa' },
  { value: 80, label: 'Nhanh' },
];

export function clampMarqueeSpeed(pxPerSecond: number): number {
  return Math.min(MARQUEE_SPEED_MAX, Math.max(MARQUEE_SPEED_MIN, pxPerSecond));
}

export function needsMarquee(textWidthPx: number, boxWidthPx: number): boolean {
  return textWidthPx > boxWidthPx + 1;
}

export function marqueeDurationSeconds(textWidthPx: number, gapPx: number, pxPerSecond: number): number {
  return (textWidthPx + gapPx) / clampMarqueeSpeed(pxPerSecond);
}
