export const BASE_FONT_PX = 20;
export const UI_SCALE_MIN = 0.8;
export const UI_SCALE_MAX = 1.6;

export interface UiScaleOption {
  readonly value: number;
  readonly label: string;
}

export const UI_SCALE_OPTIONS: readonly UiScaleOption[] = [
  { value: 0.85, label: 'Nhỏ' },
  { value: 1, label: 'Vừa' },
  { value: 1.15, label: 'Lớn' },
  { value: 1.3, label: 'Rất lớn' },
  { value: 1.5, label: 'Cực lớn' },
];

export function clampUiScale(scale: number): number {
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, scale));
}

export function rootFontSizePx(scale: number): number {
  return Math.round(BASE_FONT_PX * clampUiScale(scale) * 10) / 10;
}
