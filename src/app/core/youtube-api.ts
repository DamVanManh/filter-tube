import { Injectable } from '@angular/core';
import { SEARCH_ORDER, SearchOrder } from './topic-rotation';
import { CapacitorHttp } from '@capacitor/core';
import { environment } from '../../environments/environment';
import {
  ChannelProfile,
  ChannelStats,
  CommentItem,
  CommentThread,
  Page,
  SignedInAccount,
  TrustedChannel,
  Video,
  VideoOrigin,
} from './models';
import { parseChannelReference } from './channel-reference';
import { parseIsoDurationSeconds } from './text';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const BATCH_SIZE = 50;

export const YOUTUBE_REGION = 'VN';
export const YOUTUBE_LANGUAGE = 'vi';

export class YoutubeApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(`YouTube API ${status}: ${reason}`);
  }
}

interface ApiThumbnails {
  readonly medium?: { readonly url: string };
  readonly high?: { readonly url: string };
  readonly default?: { readonly url: string };
}

interface ApiVideo {
  readonly id: string;
  readonly snippet: {
    readonly title: string;
    readonly channelId: string;
    readonly channelTitle: string;
    readonly publishedAt: string;
    readonly thumbnails: ApiThumbnails;
    readonly defaultAudioLanguage?: string;
    readonly categoryId?: string;
  };
  readonly contentDetails: { readonly duration: string };
  readonly status: { readonly embeddable?: boolean; readonly madeForKids?: boolean; readonly privacyStatus?: string };
}

interface ApiChannel {
  readonly id: string;
  readonly snippet: { readonly title: string; readonly publishedAt: string; readonly thumbnails?: ApiThumbnails };
  readonly contentDetails?: { readonly relatedPlaylists: { readonly uploads: string } };
  readonly statistics?: { readonly subscriberCount?: string; readonly hiddenSubscriberCount?: boolean };
}

interface ListResponse<T> {
  readonly items?: readonly T[];
  readonly nextPageToken?: string;
}

interface ApiCommentSnippet {
  readonly authorDisplayName: string;
  readonly authorProfileImageUrl?: string;
  readonly textOriginal?: string;
  readonly textDisplay?: string;
  readonly likeCount?: number;
  readonly publishedAt: string;
}

interface ApiComment {
  readonly id: string;
  readonly snippet: ApiCommentSnippet;
}

interface ApiCommentThread {
  readonly id: string;
  readonly snippet: { readonly topLevelComment: ApiComment; readonly totalReplyCount?: number };
}

const QUOTA_REASONS: ReadonlySet<string> = new Set(['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded']);

export function isQuotaError(error: unknown): boolean {
  return error instanceof YoutubeApiError && QUOTA_REASONS.has(error.reason);
}

export const COMMENTS_PAGE_SIZE = 20;
export const CHANNEL_PAGE_SIZE = 30;
export const COMMENTS_DISABLED_REASON = 'commentsDisabled';

export interface VideoSource {
  readonly origin: VideoOrigin;
  readonly topicId: string | null;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function bestThumbnail(t: ApiThumbnails | undefined): string {
  return t?.high?.url ?? t?.medium?.url ?? t?.default?.url ?? '';
}

function toComment(c: ApiComment): CommentItem {
  return {
    id: c.id,
    authorName: c.snippet.authorDisplayName,
    authorAvatarUrl: c.snippet.authorProfileImageUrl ?? '',
    text: c.snippet.textOriginal ?? c.snippet.textDisplay ?? '',
    likeCount: c.snippet.likeCount ?? 0,
    publishedAt: c.snippet.publishedAt,
  };
}

function subscriberCountOf(c: ApiChannel): number | null {
  return c.statistics?.hiddenSubscriberCount || c.statistics?.subscriberCount === undefined
    ? null
    : Number(c.statistics.subscriberCount);
}

function parseBody(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function toApiError(status: number, data: unknown): YoutubeApiError {
  const error = (parseBody(data) as { error?: { errors?: { reason?: string }[]; message?: string } } | null)?.error;
  return new YoutubeApiError(status, error?.errors?.[0]?.reason ?? error?.message ?? 'unknown');
}

@Injectable({ providedIn: 'root' })
export class YoutubeApi {
  async resolveChannel(input: string): Promise<TrustedChannel | null> {
    const ref = parseChannelReference(input);
    if (!ref) return null;
    const params: Record<string, string> = { part: 'snippet,contentDetails' };
    if ('id' in ref) params['id'] = ref.id;
    else params['forHandle'] = ref.handle;
    const res = await this.get<ListResponse<ApiChannel>>('channels', params);
    const channel = res.items?.[0];
    const uploads = channel?.contentDetails?.relatedPlaylists.uploads;
    if (!channel || !uploads) return null;
    return { id: channel.id, title: channel.snippet.title, uploadsPlaylistId: uploads };
  }

  async latestUploadIds(uploadsPlaylistId: string, max: number): Promise<string[]> {
    return [...(await this.uploadIdsPage(uploadsPlaylistId, max, null)).items];
  }

  async uploadIdsPage(uploadsPlaylistId: string, max: number, pageToken: string | null): Promise<Page<string>> {
    const params: Record<string, string> = { part: 'contentDetails', playlistId: uploadsPlaylistId, maxResults: String(max) };
    if (pageToken) params['pageToken'] = pageToken;
    const res = await this.get<ListResponse<{ contentDetails: { videoId: string } }>>('playlistItems', params);
    return { items: (res.items ?? []).map((i) => i.contentDetails.videoId), nextPageToken: res.nextPageToken ?? null };
  }

  async channelProfile(channelId: string): Promise<ChannelProfile | null> {
    const res = await this.get<ListResponse<ApiChannel>>('channels', { part: 'snippet,statistics,contentDetails', id: channelId });
    const c = res.items?.[0];
    const uploads = c?.contentDetails?.relatedPlaylists.uploads;
    if (!c || !uploads) return null;
    return {
      id: c.id,
      title: c.snippet.title,
      avatarUrl: bestThumbnail(c.snippet.thumbnails),
      subscriberCount: subscriberCountOf(c),
      createdAt: c.snippet.publishedAt,
      uploadsPlaylistId: uploads,
    };
  }

  async commentThreads(videoId: string, pageToken: string | null): Promise<Page<CommentThread>> {
    const params: Record<string, string> = {
      part: 'snippet',
      videoId,
      order: 'relevance',
      textFormat: 'plainText',
      maxResults: String(COMMENTS_PAGE_SIZE),
    };
    if (pageToken) params['pageToken'] = pageToken;
    const res = await this.get<ListResponse<ApiCommentThread>>('commentThreads', params);
    return {
      items: (res.items ?? []).map((t) => ({
        id: t.id,
        top: toComment(t.snippet.topLevelComment),
        replyCount: t.snippet.totalReplyCount ?? 0,
      })),
      nextPageToken: res.nextPageToken ?? null,
    };
  }

  async replies(parentId: string): Promise<CommentItem[]> {
    const res = await this.get<ListResponse<ApiComment>>('comments', {
      part: 'snippet',
      parentId,
      textFormat: 'plainText',
      maxResults: '100',
    });
    return (res.items ?? []).map(toComment).reverse();
  }

  async myChannel(accessToken: string): Promise<SignedInAccount | null> {
    const res = await this.authed<ListResponse<ApiChannel>>('GET', 'channels', accessToken, { part: 'snippet', mine: 'true' });
    const c = res.items?.[0];
    return c ? { channelTitle: c.snippet.title, avatarUrl: bestThumbnail(c.snippet.thumbnails) } : null;
  }

  async postComment(accessToken: string, videoId: string, text: string): Promise<CommentThread> {
    const created = await this.authed<ApiCommentThread>('POST', 'commentThreads', accessToken, { part: 'snippet' }, {
      snippet: { videoId, topLevelComment: { snippet: { textOriginal: text } } },
    });
    return { id: created.id, top: toComment(created.snippet.topLevelComment), replyCount: 0 };
  }

  async postReply(accessToken: string, parentId: string, text: string): Promise<CommentItem> {
    const created = await this.authed<ApiComment>('POST', 'comments', accessToken, { part: 'snippet' }, {
      snippet: { parentId, textOriginal: text },
    });
    return toComment(created);
  }

  async searchVideoIds(
    query: string,
    max: number,
    publishedAfter: Date | null,
    order: SearchOrder = SEARCH_ORDER.RELEVANCE,
  ): Promise<string[]> {
    const params: Record<string, string> = {
      part: 'id',
      q: query,
      type: 'video',
      maxResults: String(max),
      safeSearch: 'strict',
      regionCode: YOUTUBE_REGION,
      relevanceLanguage: YOUTUBE_LANGUAGE,
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      order,
    };
    if (publishedAfter) params['publishedAfter'] = publishedAfter.toISOString();
    const res = await this.get<ListResponse<{ id: { videoId?: string } }>>('search', params);
    return (res.items ?? []).flatMap((i) => (i.id.videoId ? [i.id.videoId] : []));
  }

  async videoDetails(ids: readonly string[], source: VideoSource): Promise<Video[]> {
    const pages = await Promise.all(
      chunk(ids, BATCH_SIZE).map((batch) =>
        this.get<ListResponse<ApiVideo>>('videos', { part: 'snippet,contentDetails,status', id: batch.join(',') }),
      ),
    );
    return pages
      .flatMap((p) => p.items ?? [])
      .filter((v) => v.status.privacyStatus !== 'private')
      .map((v) => ({
        id: v.id,
        title: v.snippet.title,
        channelId: v.snippet.channelId,
        channelTitle: v.snippet.channelTitle,
        thumbnailUrl: bestThumbnail(v.snippet.thumbnails),
        publishedAt: v.snippet.publishedAt,
        durationSeconds: parseIsoDurationSeconds(v.contentDetails.duration),
        madeForKids: v.status.madeForKids === true,
        audioLanguage: v.snippet.defaultAudioLanguage ?? null,
        categoryId: v.snippet.categoryId ?? null,
        embeddable: v.status.embeddable !== false,
        origin: source.origin,
        topicId: source.topicId,
      }));
  }

  async channelStats(ids: readonly string[]): Promise<ChannelStats[]> {
    const pages = await Promise.all(
      chunk(ids, BATCH_SIZE).map((batch) =>
        this.get<ListResponse<ApiChannel>>('channels', { part: 'snippet,statistics', id: batch.join(',') }),
      ),
    );
    return pages
      .flatMap((p) => p.items ?? [])
      .map((c) => ({
        channelId: c.id,
        subscriberCount: subscriberCountOf(c),
        createdAt: c.snippet.publishedAt,
      }));
  }

  private async get<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const res = await CapacitorHttp.get({
      url: `${API_BASE}/${endpoint}`,
      params: { ...params, key: environment.youtubeApiKey },
      headers: {
        'X-Android-Package': environment.androidPackage,
        'X-Android-Cert': environment.androidCertSha1,
      },
    });
    if (res.status < 200 || res.status >= 300) throw toApiError(res.status, res.data);
    return parseBody(res.data) as T;
  }

  private async authed<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    accessToken: string,
    params: Record<string, string>,
    body?: unknown,
  ): Promise<T> {
    const res = await CapacitorHttp.request({
      method,
      url: `${API_BASE}/${endpoint}`,
      params,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { data: body }),
    });
    if (res.status < 200 || res.status >= 300) throw toApiError(res.status, res.data);
    return parseBody(res.data) as T;
  }
}
