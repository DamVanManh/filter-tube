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
  readonly categoryId: string | null;
  readonly embeddable: boolean;
  readonly origin: VideoOrigin;
  readonly topicId: string | null;
}

export interface ChannelProfile {
  readonly id: string;
  readonly title: string;
  readonly avatarUrl: string;
  readonly subscriberCount: number | null;
  readonly createdAt: string;
  readonly uploadsPlaylistId: string;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly nextPageToken: string | null;
}

export interface CommentItem {
  readonly id: string;
  readonly authorName: string;
  readonly authorAvatarUrl: string;
  readonly text: string;
  readonly likeCount: number;
  readonly publishedAt: string;
}

export interface CommentThread {
  readonly id: string;
  readonly top: CommentItem;
  readonly replyCount: number;
}

export interface SignedInAccount {
  readonly channelTitle: string;
  readonly avatarUrl: string;
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

export interface QuietHours {
  readonly enabled: boolean;
  readonly start: string;
  readonly end: string;
}

export interface DisplayPreferences {
  readonly uiScale: number;
  readonly fullTitles: boolean;
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
  readonly blockedCategoryIds: readonly string[];
  readonly quietHours: QuietHours;
  readonly display: DisplayPreferences;
}

export const REJECT_REASON = {
  NOT_EMBEDDABLE: 'not-embeddable',
  NOT_VIETNAMESE: 'not-vietnamese',
  BLOCKED_CATEGORY: 'blocked-category',
  MADE_FOR_KIDS: 'made-for-kids',
  TOO_SHORT: 'too-short',
  BLOCKED_CHANNEL: 'blocked-channel',
  BANNED_KEYWORD: 'banned-keyword',
  SHOUTING_TITLE: 'shouting-title',
  CHANNEL_TOO_SMALL: 'channel-too-small',
  CHANNEL_TOO_NEW: 'channel-too-new',
} as const;
export type RejectReason = (typeof REJECT_REASON)[keyof typeof REJECT_REASON];
