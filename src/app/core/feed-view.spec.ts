import { DEFAULT_SETTINGS } from './defaults';
import { dedupePreferTrusted, feedTabs, TAB_LATEST, TAB_TRUSTED, videosForTab } from './feed-view';
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

  it('pushes watched videos to the end', () => {
    expect(videosForTab('nau-an', all, DEFAULT_SETTINGS, STATS, new Set(['new']), NOW).map((v) => v.id)).toEqual(['old', 'new']);
  });

  it('shows only trusted channels on the trusted tab', () => {
    expect(videosForTab(TAB_TRUSTED, all, TRUSTED_SETTINGS, STATS, new Set(), NOW).map((v) => v.id)).toEqual(['fromTiny']);
  });

  it('merges every acceptable video on the latest tab', () => {
    const ids = videosForTab(TAB_LATEST, all, TRUSTED_SETTINGS, STATS, new Set(), NOW).map((v) => v.id);
    expect(ids.sort()).toEqual(['fromTiny', 'health', 'new', 'old']);
  });
});
