export const VIDEO_ORIGIN = {
  TRUSTED_CHANNEL: 'trusted',
  TOPIC: 'topic',
} as const;
export type VideoOrigin = (typeof VIDEO_ORIGIN)[keyof typeof VIDEO_ORIGIN];

export interface Video {
  readonly id: string;
  readonly title: string;
  readonly channelId: string;
  readonly channelTitle: string;
  readonly thumbnailUrl: string;
  readonly publishedAt: string;
  readonly durationSeconds: number;
  readonly madeForKids: boolean;
  readonly audioLanguage: string | null;
  readonly embeddable: boolean;
  readonly origin: VideoOrigin;
  readonly topicId: string | null;
}

export interface ChannelStats {
  readonly channelId: string;
  readonly subscriberCount: number | null;
  readonly createdAt: string;
}

export interface TrustedChannel {
  readonly id: string;
  readonly title: string;
  readonly uploadsPlaylistId: string;
}

export interface Topic {
  readonly id: string;
  readonly label: string;
  readonly query: string;
}

export interface BlockedChannel {
  readonly id: string;
  readonly title: string;
}

export interface FilterThresholds {
  readonly minDurationMinutes: number;
  readonly minSubscribersForUnknownChannel: number;
  readonly minChannelAgeDays: number;
  readonly maxUppercaseRatio: number;
}

export interface LanguageRule {
  readonly requireVietnamese: boolean;
}

export interface Settings {
  readonly trustedChannels: readonly TrustedChannel[];
  readonly topics: readonly Topic[];
  readonly bannedKeywords: readonly string[];
  readonly blockedChannels: readonly BlockedChannel[];
  readonly thresholds: FilterThresholds;
  readonly language: LanguageRule;
}

export const REJECT_REASON = {
  NOT_EMBEDDABLE: 'not-embeddable',
  NOT_VIETNAMESE: 'not-vietnamese',
  MADE_FOR_KIDS: 'made-for-kids',
  TOO_SHORT: 'too-short',
  BLOCKED_CHANNEL: 'blocked-channel',
  BANNED_KEYWORD: 'banned-keyword',
  SHOUTING_TITLE: 'shouting-title',
  CHANNEL_TOO_SMALL: 'channel-too-small',
  CHANNEL_TOO_NEW: 'channel-too-new',
} as const;
export type RejectReason = (typeof REJECT_REASON)[keyof typeof REJECT_REASON];
