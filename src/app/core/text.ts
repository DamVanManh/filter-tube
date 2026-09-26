export function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export function toWordSequence(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
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
