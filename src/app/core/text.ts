export function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

const VIETNAMESE_TONE_MARKS = /[\u0300\u0301\u0303\u0309\u0323]/gu;

function withToneMarkAtWordEnd(word: string): string {
  const decomposed = word.normalize('NFD');
  const tones = decomposed.match(VIETNAMESE_TONE_MARKS)?.join('') ?? '';
  return decomposed.replace(VIETNAMESE_TONE_MARKS, '') + tones;
}

export function toWordSequence(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .map(withToneMarkAtWordEnd)
    .join(' ');
}

export function hasDiacritics(text: string): boolean {
  return stripDiacritics(text) !== text;
}

export function uppercaseRatio(text: string): number {
  const letters = [...text].filter((ch) => ch.toLowerCase() !== ch.toUpperCase());
  if (letters.length < 8) return 0;
  const upper = letters.filter((ch) => ch === ch.toUpperCase()).length;
  return upper / letters.length;
}

export function parseIsoDurationSeconds(iso: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!match) return 0;
  const [, d, h, m, s] = match;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

export function normalizeSearchQuery(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}
