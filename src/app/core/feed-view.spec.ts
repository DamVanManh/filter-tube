import { parseSettings } from './settings-io';
import { DEFAULT_SETTINGS } from './defaults';
import { dedupePreferTrusted, feedTabs, otherVideosFor, TAB_LATEST, TAB_TRUSTED, videosForTab } from './feed-view';
import { ChannelStats, Video, VIDEO_ORIGIN } from './models';

const NOW = new Date('2026-09-25T00:00:00Z');
const STATS: ReadonlyMap<string, ChannelStats> = new Map([
  ['big', { channelId: 'big', subscriberCount: 1_000_000, createdAt: '2015-01-01T00:00:00Z' }],
  ['tiny', { channelId: 'tiny', subscriberCount: 50, createdAt: '2015-01-01T00:00:00Z' }],
]);

function video(id: string, overrides: Partial<Video> = {}): Video {
  return {
    id,
    title: `Video ${id} bình thường`,
    channelId: 'big',
    channelTitle: 'Kênh lớn',
    thumbnailUrl: '',
    publishedAt: '2026-09-01T00:00:00Z',
    durationSeconds: 600,
    madeForKids: false,
    audioLanguage: null,
    categoryId: '26',
    embeddable: true,
    origin: VIDEO_ORIGIN.TOPIC,
    topicId: 'nau-an',
    ...overrides,
  };
}

const TRUSTED_SETTINGS = {
  ...DEFAULT_SETTINGS,
  trustedChannels: [{ id: 'tiny', title: 'Kênh nhỏ quen', uploadsPlaylistId: 'UUtiny' }],
};

describe('feedTabs', () => {
  it('shows the trusted tab only when trusted channels exist', () => {
    expect(feedTabs(DEFAULT_SETTINGS).map((t) => t.id)).not.toContain(TAB_TRUSTED);
    expect(feedTabs(TRUSTED_SETTINGS).map((t) => t.id).slice(0, 3)).toEqual([TAB_LATEST, TAB_TRUSTED, 'nau-an']);
  });
});

describe('dedupePreferTrusted', () => {
  it('keeps the trusted copy when a video appears from two sources', () => {
    const out = dedupePreferTrusted([video('a'), video('a', { origin: VIDEO_ORIGIN.TRUSTED_CHANNEL, topicId: null })]);
    expect(out).toHaveLength(1);
    expect(out[0]?.origin).toBe(VIDEO_ORIGIN.TRUSTED_CHANNEL);
  });
});

describe('videosForTab', () => {
  const all = [
    video('old', { publishedAt: '2026-01-01T00:00:00Z' }),
    video('new', { publishedAt: '2026-09-20T00:00:00Z' }),
    video('health', { topicId: 'suc-khoe' }),
    video('kids', { madeForKids: true }),
    video('fromTiny', { channelId: 'tiny', origin: VIDEO_ORIGIN.TRUSTED_CHANNEL, topicId: null }),
  ];

  it('filters a topic tab to that topic and to acceptable videos, newest first', () => {
    expect(videosForTab('nau-an', all, DEFAULT_SETTINGS, STATS, new Set(), NOW).map((v) => v.id)).toEqual(['new', 'old']);
  });

  it('hides watched videos entirely', () => {
    expect(videosForTab('nau-an', all, DEFAULT_SETTINGS, STATS, new Set(['new']), NOW).map((v) => v.id)).toEqual(['old']);
  });

  it('does not show the same channel several times in a row', () => {
    const busy = [
      video('b1', { publishedAt: '2026-09-20T00:00:00Z' }),
      video('b2', { publishedAt: '2026-09-19T00:00:00Z' }),
      video('b3', { publishedAt: '2026-09-18T00:00:00Z' }),
      video('other', { channelId: 'big2', publishedAt: '2026-09-10T00:00:00Z' }),
    ];
    const stats = new Map([...STATS, ['big2', { channelId: 'big2', subscriberCount: 1_000_000, createdAt: '2015-01-01T00:00:00Z' }]]);
    expect(videosForTab('nau-an', busy, DEFAULT_SETTINGS, stats, new Set(), NOW).map((v) => v.id)).toEqual(['b1', 'other', 'b2', 'b3']);
  });

  it('shows only trusted channels on the trusted tab', () => {
    expect(videosForTab(TAB_TRUSTED, all, TRUSTED_SETTINGS, STATS, new Set(), NOW).map((v) => v.id)).toEqual(['fromTiny']);
  });

  it('merges every acceptable video on the latest tab', () => {
    const ids = videosForTab(TAB_LATEST, all, TRUSTED_SETTINGS, STATS, new Set(), NOW).map((v) => v.id);
    expect(ids.sort()).toEqual(['fromTiny', 'health', 'new', 'old']);
  });
});

describe('otherVideosFor', () => {
  const current = video('now', { channelId: 'k1', topicId: 'nau-an' });
  const latest = [
    video('x1', { channelId: 'k2', topicId: 'du-lich' }),
    video('t1', { channelId: 'k3', topicId: 'nau-an' }),
    video('now', { channelId: 'k1', topicId: 'nau-an' }),
    video('x2', { channelId: 'k4', topicId: 'du-lich' }),
    video('c1', { channelId: 'k1', topicId: 'du-lich' }),
    video('t2', { channelId: 'k5', topicId: 'nau-an' }),
    video('t3', { channelId: 'k6', topicId: 'nau-an' }),
  ];

  it('puts three videos of the same topic or channel first, then the latest feed without the current video', () => {
    expect(otherVideosFor(current, latest, 3).map((v) => v.id)).toEqual(['t1', 'c1', 't2', 'x1', 'x2', 't3']);
  });

  it('falls back to the latest feed when nothing is related', () => {
    const lone = video('lone', { channelId: 'k9', topicId: null });
    expect(otherVideosFor(lone, latest.slice(0, 2), 3).map((v) => v.id)).toEqual(['x1', 't1']);
  });

  it('keeps plain latest order when the setting is 0', () => {
    expect(otherVideosFor(current, latest, 0).map((v) => v.id)).toEqual(['x1', 't1', 'x2', 'c1', 't2', 't3']);
  });

  it('reads the count from saved settings, defaulting to 3 and capped at 10', () => {
    expect(DEFAULT_SETTINGS.display.relatedFirstCount).toBe(3);
    const display = (relatedFirstCount: unknown) =>
      parseSettings({ ...DEFAULT_SETTINGS, display: { ...DEFAULT_SETTINGS.display, relatedFirstCount } })?.display.relatedFirstCount;
    expect(display(5)).toBe(5);
    expect(display(99)).toBe(10);
    expect(display('x')).toBe(3);
  });
});
