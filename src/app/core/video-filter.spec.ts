import { DEFAULT_SETTINGS } from './defaults';
import { ChannelStats, REJECT_REASON, Settings, Video, VIDEO_ORIGIN } from './models';
import { parseIsoDurationSeconds, uppercaseRatio } from './text';
import { containsBannedKeyword, keepAcceptable, rejectReason } from './video-filter';

const NOW = new Date('2026-09-25T00:00:00Z');

function video(overrides: Partial<Video> = {}): Video {
  return {
    id: 'v1',
    title: 'Cách nấu canh chua cá lóc ngon',
    channelId: 'c1',
    channelTitle: 'Bếp Nhà Mình',
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

const BIG_OLD_CHANNEL: ChannelStats = { channelId: 'c1', subscriberCount: 500_000, createdAt: '2018-01-01T00:00:00Z' };

function rejectOf(v: Video, stats: ChannelStats | undefined = BIG_OLD_CHANNEL, settings: Settings = DEFAULT_SETTINGS) {
  return rejectReason(v, settings, stats, NOW);
}

describe('rejectReason', () => {
  it('accepts a normal cooking video from a large established channel', () => {
    expect(rejectOf(video())).toBeNull();
  });

  it('rejects videos YouTube marks as made for kids', () => {
    expect(rejectOf(video({ madeForKids: true }))).toBe(REJECT_REASON.MADE_FOR_KIDS);
  });

  it('rejects foreign-language videos, trusting the declared audio language first', () => {
    expect(rejectOf(video({ title: 'No Husband, No Easy Life – A Betrayed Nurse' }))).toBe(REJECT_REASON.NOT_VIETNAMESE);
    expect(rejectOf(video({ title: 'Món ngon', audioLanguage: 'vi' }))).toBeNull();
    expect(rejectOf(video({ title: 'No Husband, No Easy Life', audioLanguage: 'vi' }))).toBe(REJECT_REASON.NOT_VIETNAMESE);
    expect(rejectOf(video({ title: 'Món ngon mỗi ngày', audioLanguage: 'en-US' }))).toBe(REJECT_REASON.NOT_VIETNAMESE);
    expect(rejectOf(video({ title: 'Món ăn', audioLanguage: 'VI' }))).toBeNull();
  });

  it('can turn the Vietnamese requirement off', () => {
    const settings = { ...DEFAULT_SETTINGS, language: { requireVietnamese: false } };
    expect(rejectOf(video({ title: 'A calm cooking video' }), BIG_OLD_CHANNEL, settings)).toBeNull();
  });

  it('rejects entertainment, film, news, comedy and gaming categories from unknown channels only', () => {
    for (const categoryId of ['1', '20', '23', '24', '25', '44']) {
      expect(rejectOf(video({ categoryId }))).toBe(REJECT_REASON.BLOCKED_CATEGORY);
    }
    expect(rejectOf(video({ categoryId: '10' }))).toBeNull();
    expect(rejectOf(video({ categoryId: null }))).toBeNull();
    expect(rejectOf(video({ categoryId: '24', origin: VIDEO_ORIGIN.TRUSTED_CHANNEL }))).toBeNull();
  });

  it('rejects AI story recaps by their vocabulary', () => {
    expect(rejectOf(video({ title: 'Thần Y Bị Ruồng Bỏ | Full Có Kết | ChipChip Review' }))).toBe(REJECT_REASON.BANNED_KEYWORD);
    expect(rejectOf(video({ title: 'Xuyên Thành Ác Nữ Nông Thôn: Chị Cả Dẫn Cả Nhà Giàu Có' }))).toBe(REJECT_REASON.BANNED_KEYWORD);
  });

  it('rejects non-embeddable videos because the app cannot play them', () => {
    expect(rejectOf(video({ embeddable: false }))).toBe(REJECT_REASON.NOT_EMBEDDABLE);
  });

  it('rejects videos shorter than the minimum, which removes Shorts', () => {
    expect(rejectOf(video({ durationSeconds: 179 }))).toBe(REJECT_REASON.TOO_SHORT);
    expect(rejectOf(video({ durationSeconds: 180 }))).toBeNull();
  });

  it('rejects channels the family blocked', () => {
    const settings = { ...DEFAULT_SETTINGS, blockedChannels: [{ id: 'c1', title: 'x' }] };
    expect(rejectOf(video(), BIG_OLD_CHANNEL, settings)).toBe(REJECT_REASON.BLOCKED_CHANNEL);
  });

  it('rejects clickbait keywords in the title or the channel name', () => {
    expect(rejectOf(video({ title: 'Sốc với sự thật về canh chua' }))).toBe(REJECT_REASON.BANNED_KEYWORD);
    expect(rejectOf(video({ channelTitle: 'Tin Nóng 24h' }))).toBe(REJECT_REASON.BANNED_KEYWORD);
  });

  it('rejects titles written mostly in capitals', () => {
    expect(rejectOf(video({ title: 'CANH CHUA CÁ LÓC NGON NHẤT' }))).toBe(REJECT_REASON.SHOUTING_TITLE);
  });

  it('rejects unknown channels below the subscriber floor or with hidden counts', () => {
    expect(rejectOf(video(), { ...BIG_OLD_CHANNEL, subscriberCount: 9_999 })).toBe(REJECT_REASON.CHANNEL_TOO_SMALL);
    expect(rejectOf(video(), { ...BIG_OLD_CHANNEL, subscriberCount: null })).toBe(REJECT_REASON.CHANNEL_TOO_SMALL);
    expect(rejectReason(video(), DEFAULT_SETTINGS, undefined, NOW)).toBe(REJECT_REASON.CHANNEL_TOO_SMALL);
  });

  it('rejects unknown channels younger than the age floor', () => {
    expect(rejectOf(video(), { ...BIG_OLD_CHANNEL, createdAt: '2026-01-01T00:00:00Z' })).toBe(REJECT_REASON.CHANNEL_TOO_NEW);
  });

  it('lets trusted channels skip the size and age floors but not the content rules', () => {
    const tiny: ChannelStats = { channelId: 'c1', subscriberCount: 12, createdAt: '2026-09-01T00:00:00Z' };
    const trusted = video({ origin: VIDEO_ORIGIN.TRUSTED_CHANNEL });
    expect(rejectOf(trusted, tiny)).toBeNull();
    expect(rejectOf({ ...trusted, madeForKids: true }, tiny)).toBe(REJECT_REASON.MADE_FOR_KIDS);
    expect(rejectOf({ ...trusted, title: 'Bóc phốt hàng xóm' }, tiny)).toBe(REJECT_REASON.BANNED_KEYWORD);
  });

  it('treats a topic result from a trusted channel as trusted', () => {
    const settings = { ...DEFAULT_SETTINGS, trustedChannels: [{ id: 'c1', title: 'x', uploadsPlaylistId: 'u' }] };
    expect(rejectOf(video(), { ...BIG_OLD_CHANNEL, subscriberCount: 5 }, settings)).toBeNull();
  });
});

describe('containsBannedKeyword', () => {
  it('matches whole words only', () => {
    expect(containsBannedKeyword('Món ngon Sóc Trăng', ['sốc'])).toBe(false);
    expect(containsBannedKeyword('Tin SỐC hôm nay', ['sốc'])).toBe(true);
    expect(containsBannedKeyword('Bói bài tarot', ['bói'])).toBe(true);
    expect(containsBannedKeyword('Bởi vì thương', ['bói'])).toBe(false);
  });

  it('matches an accentless keyword against accented and accentless titles', () => {
    expect(containsBannedKeyword('Mới cập nhật: DRAMA gia đình', ['drama'])).toBe(true);
    expect(containsBannedKeyword('soc qua di', ['soc'])).toBe(true);
    expect(containsBannedKeyword('Sóc Trăng quê tôi', ['soc'])).toBe(true);
  });

  it('matches multi-word phrases across punctuation', () => {
    expect(containsBannedKeyword('Chuyện này... lộ   clip!!', ['lộ clip'])).toBe(true);
    expect(containsBannedKeyword('Chuyện lộ ra, clip hay', ['lộ clip'])).toBe(false);
  });

  it('ignores empty keywords', () => {
    expect(containsBannedKeyword('bất kỳ', ['', '  '])).toBe(false);
  });
});

describe('keepAcceptable', () => {
  it('keeps only videos that pass every rule, looking up stats per channel', () => {
    const stats = new Map([['c1', BIG_OLD_CHANNEL]]);
    const kept = keepAcceptable(
      [video({ id: 'ok' }), video({ id: 'kids', madeForKids: true }), video({ id: 'nostats', channelId: 'c9' })],
      DEFAULT_SETTINGS,
      stats,
      NOW,
    );
    expect(kept.map((v) => v.id)).toEqual(['ok']);
  });
});

describe('text helpers', () => {
  it('parses ISO 8601 durations', () => {
    expect(parseIsoDurationSeconds('PT1H2M3S')).toBe(3723);
    expect(parseIsoDurationSeconds('PT45S')).toBe(45);
    expect(parseIsoDurationSeconds('P1DT1S')).toBe(86401);
    expect(parseIsoDurationSeconds('P0D')).toBe(0);
    expect(parseIsoDurationSeconds('garbage')).toBe(0);
  });

  it('ignores very short titles when measuring capitals', () => {
    expect(uppercaseRatio('OK VN')).toBe(0);
    expect(uppercaseRatio('ABCDEFGHij')).toBeCloseTo(0.8);
  });
});
