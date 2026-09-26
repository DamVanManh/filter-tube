import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ChannelProfile, Video, VIDEO_ORIGIN } from '../core/models';
import { ChannelRef } from '../core/nav-stack';
import { compactCountVi } from '../core/relative-time';
import { SettingsStore } from '../core/settings.store';
import { keepAcceptable } from '../core/video-filter';
import { WatchedStore } from '../core/watched.store';
import { CHANNEL_PAGE_SIZE, YoutubeApi } from '../core/youtube-api';
import { VideoCardComponent } from '../video-card/video-card.component';

export interface PlayRequest {
  readonly video: Video;
  readonly queue: readonly Video[];
}

@Component({
  selector: 'app-channel-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VideoCardComponent],
  templateUrl: './channel-page.component.html',
})
export class ChannelPageComponent {
  readonly channel = input.required<ChannelRef>();
  readonly closed = output<void>();
  readonly play = output<PlayRequest>();

  private readonly api = inject(YoutubeApi);
  private readonly settingsStore = inject(SettingsStore);
  protected readonly watchedIds = inject(WatchedStore).watchedIds;
  protected readonly compactCount = compactCountVi;

  protected readonly profile = signal<ChannelProfile | null>(null);
  private readonly loaded = signal<readonly Video[]>([]);
  protected readonly nextPageToken = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  protected readonly isBlocked = computed(() =>
    this.settingsStore.settings().blockedChannels.some((c) => c.id === this.channel().id),
  );
  protected readonly videos = computed<Video[]>(() => {
    const profile = this.profile();
    if (!profile) return [];
    const stats = new Map([[profile.id, { channelId: profile.id, subscriberCount: profile.subscriberCount, createdAt: profile.createdAt }]]);
    return keepAcceptable(this.loaded(), this.settingsStore.settings(), stats, new Date());
  });

  constructor() {
    effect(() => {
      const channel = this.channel();
      untracked(() => void this.open(channel.id));
    });
  }

  protected async loadMore(): Promise<void> {
    const profile = this.profile();
    if (profile) await this.loadPage(profile, this.nextPageToken());
  }

  protected async retry(): Promise<void> {
    const profile = this.profile();
    if (profile) await this.loadPage(profile, this.nextPageToken());
    else await this.open(this.channel().id);
  }

  protected choose(video: Video): void {
    this.play.emit({ video, queue: this.videos() });
  }

  private async open(channelId: string): Promise<void> {
    this.profile.set(null);
    this.loaded.set([]);
    this.nextPageToken.set(null);
    this.failed.set(false);
    this.loading.set(true);
    try {
      const profile = await this.api.channelProfile(channelId);
      if (channelId !== this.channel().id) return;
      this.profile.set(profile);
      this.loading.set(false);
      if (profile) await this.loadPage(profile, null);
      else this.failed.set(true);
    } catch {
      this.failed.set(true);
      this.loading.set(false);
    }
  }

  private async loadPage(profile: ChannelProfile, pageToken: string | null): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await this.api.uploadIdsPage(profile.uploadsPlaylistId, CHANNEL_PAGE_SIZE, pageToken);
      const trusted = this.settingsStore.settings().trustedChannels.some((c) => c.id === profile.id);
      const videos = await this.api.videoDetails(page.items, {
        origin: trusted ? VIDEO_ORIGIN.TRUSTED_CHANNEL : VIDEO_ORIGIN.TOPIC,
        topicId: null,
      });
      if (profile.id !== this.channel().id) return;
      this.loaded.update((list) => [...list, ...videos]);
      this.nextPageToken.set(page.nextPageToken);
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
