import { DEFAULT_SETTINGS } from './defaults';
import { Settings } from './models';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isObjectArrayWith(value: unknown, keys: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === 'object' && v !== null && keys.every((k) => typeof (v as Record<string, unknown>)[k] === 'string'))
  );
}

export function parseSettings(raw: unknown): Settings | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isObjectArrayWith(r['trustedChannels'], ['id', 'title', 'uploadsPlaylistId'])) return null;
  if (!isObjectArrayWith(r['topics'], ['id', 'label', 'query'])) return null;
  if (!isStringArray(r['bannedKeywords'])) return null;
  if (!isObjectArrayWith(r['blockedChannels'], ['id', 'title'])) return null;
  const t = (typeof r['thresholds'] === 'object' && r['thresholds'] !== null ? r['thresholds'] : {}) as Record<string, unknown>;
  const language = (typeof r['language'] === 'object' && r['language'] !== null ? r['language'] : {}) as Record<string, unknown>;
  const num = (key: keyof Settings['thresholds']): number =>
    typeof t[key] === 'number' && Number.isFinite(t[key]) ? (t[key] as number) : DEFAULT_SETTINGS.thresholds[key];
  return {
    trustedChannels: r['trustedChannels'] as Settings['trustedChannels'],
    topics: r['topics'] as Settings['topics'],
    bannedKeywords: r['bannedKeywords'],
    blockedChannels: r['blockedChannels'] as Settings['blockedChannels'],
    thresholds: {
      minDurationMinutes: num('minDurationMinutes'),
      minSubscribersForUnknownChannel: num('minSubscribersForUnknownChannel'),
      minChannelAgeDays: num('minChannelAgeDays'),
      maxUppercaseRatio: num('maxUppercaseRatio'),
    },
    language: {
      requireVietnamese:
        typeof language['requireVietnamese'] === 'boolean'
          ? language['requireVietnamese']
          : DEFAULT_SETTINGS.language.requireVietnamese,
    },
  };
}
