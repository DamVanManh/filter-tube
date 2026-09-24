import { Injectable } from '@angular/core';
import { CapacitorHttp } from '@capacitor/core';
import { environment } from '../../environments/environment';
import { ChannelStats, TrustedChannel, Video, VideoOrigin } from './models';
import { parseChannelReference } from './channel-reference';
import { SearchOrder } from './topic-rotation';
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
  };
  readonly contentDetails: { readonly duration: string };
  readonly status: { readonly embeddable?: boolean; readonly madeForKids?: boolean; readonly privacyStatus?: string };
}

interface ApiChannel {
  readonly id: string;
  readonly snippet: { readonly title: string; readonly publishedAt: string };
  readonly contentDetails?: { readonly relatedPlaylists: { readonly uploads: string } };
  readonly statistics?: { readonly subscriberCount?: string; readonly hiddenSubscriberCount?: boolean };
}

interface ListResponse<T> {
  readonly items?: readonly T[];
}

export interface VideoSource {
  readonly origin: VideoOrigin;
  readonly topicId: string | null;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function bestThumbnail(t: ApiThumbnails): string {
  return t.high?.url ?? t.medium?.url ?? t.default?.url ?? '';
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
    const res = await this.get<ListResponse<{ contentDetails: { videoId: string } }>>('playlistItems', {
      part: 'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: String(max),
    });
    return (res.items ?? []).map((i) => i.contentDetails.videoId);
  }

  async searchVideoIds(query: string, max: number, publishedAfter: Date, order: SearchOrder): Promise<string[]> {
    const res = await this.get<ListResponse<{ id: { videoId?: string } }>>('search', {
      part: 'id',
      q: query,
      type: 'video',
      maxResults: String(max),
      safeSearch: 'strict',
      regionCode: YOUTUBE_REGION,
      relevanceLanguage: YOUTUBE_LANGUAGE,
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      publishedAfter: publishedAfter.toISOString(),
      order,
    });
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
        subscriberCount:
          c.statistics?.hiddenSubscriberCount || c.statistics?.subscriberCount === undefined
            ? null
            : Number(c.statistics.subscriberCount),
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
    if (res.status < 200 || res.status >= 300) {
      const reason = (res.data as { error?: { errors?: { reason?: string }[]; message?: string } })?.error;
      throw new YoutubeApiError(res.status, reason?.errors?.[0]?.reason ?? reason?.message ?? 'unknown');
    }
    return (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as T;
  }
}
