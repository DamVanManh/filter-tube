import { ChannelStats, REJECT_REASON, RejectReason, Settings, Video, VIDEO_ORIGIN } from './models';
import { hasDiacritics, stripDiacritics, toWordSequence, uppercaseRatio } from './text';

const DAY_MS = 86_400_000;

export function rejectReason(
  video: Video,
  settings: Settings,
  stats: ChannelStats | undefined,
  now: Date,
): RejectReason | null {
  const { thresholds } = settings;
  if (!video.embeddable) return REJECT_REASON.NOT_EMBEDDABLE;
  if (video.madeForKids) return REJECT_REASON.MADE_FOR_KIDS;
  if (settings.language.requireVietnamese && !looksVietnamese(video)) return REJECT_REASON.NOT_VIETNAMESE;
  if (video.durationSeconds < thresholds.minDurationMinutes * 60) return REJECT_REASON.TOO_SHORT;
  if (settings.blockedChannels.some((c) => c.id === video.channelId)) return REJECT_REASON.BLOCKED_CHANNEL;
  if (containsBannedKeyword(`${video.title} ${video.channelTitle}`, settings.bannedKeywords)) {
    return REJECT_REASON.BANNED_KEYWORD;
  }
  if (uppercaseRatio(video.title) > thresholds.maxUppercaseRatio) return REJECT_REASON.SHOUTING_TITLE;

  const isTrusted =
    video.origin === VIDEO_ORIGIN.TRUSTED_CHANNEL ||
    settings.trustedChannels.some((c) => c.id === video.channelId);
  if (isTrusted) return null;

  if (!stats || stats.subscriberCount === null || stats.subscriberCount < thresholds.minSubscribersForUnknownChannel) {
    return REJECT_REASON.CHANNEL_TOO_SMALL;
  }
  const ageDays = (now.getTime() - new Date(stats.createdAt).getTime()) / DAY_MS;
  if (!(ageDays >= thresholds.minChannelAgeDays)) return REJECT_REASON.CHANNEL_TOO_NEW;
  return null;
}

const VIETNAMESE_ONLY_LETTERS = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/iu;
const VIETNAMESE_LANGUAGE_PREFIX = 'vi';

export function looksVietnamese(video: Pick<Video, 'title' | 'audioLanguage'>): boolean {
  if (video.audioLanguage) return video.audioLanguage.toLowerCase().startsWith(VIETNAMESE_LANGUAGE_PREFIX);
  return VIETNAMESE_ONLY_LETTERS.test(video.title);
}

export function containsBannedKeyword(text: string, bannedKeywords: readonly string[]): boolean {
  const exact = ` ${toWordSequence(text)} `;
  const accentless = ` ${stripDiacritics(exact)} `;
  return bannedKeywords.some((keyword) => {
    const needle = toWordSequence(keyword);
    if (needle.length === 0) return false;
    return hasDiacritics(needle) ? exact.includes(` ${needle} `) : accentless.includes(` ${needle} `);
  });
}

export function keepAcceptable(
  videos: readonly Video[],
  settings: Settings,
  statsByChannel: ReadonlyMap<string, ChannelStats>,
  now: Date,
): Video[] {
  return videos.filter((v) => rejectReason(v, settings, statsByChannel.get(v.channelId), now) === null);
}
