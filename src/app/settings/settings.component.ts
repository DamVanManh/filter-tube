import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarqueeComponent } from '../marquee/marquee.component';
import { DisplayPreferences, FilterThresholds, PlaybackPreferences, QuietHours, Topic } from '../core/models';
import { clampTimerSeconds } from '../core/settings-io';
import { MARQUEE_SPEED_OPTIONS } from '../core/marquee';
import { UI_SCALE_OPTIONS } from '../core/ui-scale';
import { addTopic as withTopicAdded, editTopic as withTopicEdited } from '../core/topics';
import { AuthStore, SIGN_IN_OUTCOME } from '../core/auth.store';
import { SettingsStore } from '../core/settings.store';
import { YoutubeApi } from '../core/youtube-api';

const MIN_PIN_LENGTH = 4;

const LOCK = {
  CREATE: 'create',
  ENTER: 'enter',
  OPEN: 'open',
} as const;
type Lock = (typeof LOCK)[keyof typeof LOCK];

interface ThresholdField {
  readonly key: keyof FilterThresholds;
  readonly label: string;
  readonly step: number;
}

const THRESHOLD_FIELDS: readonly ThresholdField[] = [
  { key: 'minDurationMinutes', label: 'Độ dài tối thiểu (phút)', step: 1 },
  { key: 'minSubscribersForUnknownChannel', label: 'Kênh lạ: số người đăng ký tối thiểu', step: 1000 },
  { key: 'minChannelAgeDays', label: 'Kênh lạ: tuổi kênh tối thiểu (ngày)', step: 30 },
  { key: 'maxUppercaseRatio', label: 'Tỉ lệ chữ IN HOA tối đa trong tiêu đề (0–1)', step: 0.1 },
];

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MarqueeComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  protected readonly store = inject(SettingsStore);
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(YoutubeApi);

  readonly closed = output<void>();

  protected readonly LOCK = LOCK;
  protected readonly THRESHOLD_FIELDS = THRESHOLD_FIELDS;
  protected readonly UI_SCALE_OPTIONS = UI_SCALE_OPTIONS;
  protected readonly MARQUEE_SPEED_OPTIONS = MARQUEE_SPEED_OPTIONS;
  protected readonly lock = signal<Lock>(this.store.hasPin() ? LOCK.ENTER : LOCK.CREATE);
  protected readonly message = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected pin = '';
  protected channelInput = '';
  protected topicLabel = '';
  protected topicQuery = '';
  protected keywordInput = '';
  protected blockInput = '';
  protected readonly editingTopicId = signal<string | null>(null);
  protected editLabel = '';
  protected editQuery = '';
  protected importText = '';

  protected async submitPin(): Promise<void> {
    const pin = this.pin.trim();
    this.pin = '';
    if (this.lock() === LOCK.CREATE) {
      if (!/^\d+$/.test(pin) || pin.length < MIN_PIN_LENGTH) {
        this.message.set(`Mã PIN cần ít nhất ${MIN_PIN_LENGTH} chữ số.`);
        return;
      }
      await this.store.setPin(pin);
      this.unlock();
      return;
    }
    if (await this.store.verifyPin(pin)) this.unlock();
    else this.message.set('Sai mã PIN.');
  }

  protected async addChannel(): Promise<void> {
    const input = this.channelInput.trim();
    if (!input) return;
    this.busy.set(true);
    try {
      const channel = await this.api.resolveChannel(input);
      if (!channel) {
        this.message.set('Không tìm thấy kênh. Dán link kênh hoặc @tên_kênh.');
        return;
      }
      await this.store.update((s) => ({
        ...s,
        trustedChannels: s.trustedChannels.some((c) => c.id === channel.id) ? s.trustedChannels : [...s.trustedChannels, channel],
        blockedChannels: s.blockedChannels.filter((c) => c.id !== channel.id),
      }));
      this.channelInput = '';
      this.message.set(`Đã thêm kênh ${channel.title}.`);
    } catch {
      this.message.set('Không kết nối được YouTube. Thử lại sau.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async removeChannel(id: string): Promise<void> {
    await this.store.update((s) => ({ ...s, trustedChannels: s.trustedChannels.filter((c) => c.id !== id) }));
  }

  protected async blockChannelByReference(): Promise<void> {
    const input = this.blockInput.trim();
    if (!input) return;
    this.busy.set(true);
    try {
      const channel = await this.api.resolveChannel(input);
      if (!channel) {
        this.message.set('Không tìm thấy kênh. Dán link kênh hoặc @tên_kênh.');
        return;
      }
      await this.store.blockChannel(channel.id, channel.title);
      this.blockInput = '';
      this.message.set(`Đã chặn kênh ${channel.title}.`);
    } catch {
      this.message.set('Không kết nối được YouTube. Thử lại sau.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async unblockChannel(id: string): Promise<void> {
    await this.store.update((s) => ({ ...s, blockedChannels: s.blockedChannels.filter((c) => c.id !== id) }));
  }

  protected async addTopic(): Promise<void> {
    await this.store.update((s) => withTopicAdded(s, { label: this.topicLabel, query: this.topicQuery }));
    this.topicLabel = '';
    this.topicQuery = '';
  }

  protected startEditTopic(topic: Topic): void {
    this.editingTopicId.set(topic.id);
    this.editLabel = topic.label;
    this.editQuery = topic.query;
  }

  protected cancelEditTopic(): void {
    this.editingTopicId.set(null);
  }

  protected async saveTopic(id: string): Promise<void> {
    if (!this.editLabel.trim()) {
      this.message.set('Tên tab không được để trống.');
      return;
    }
    await this.store.update((s) => withTopicEdited(s, id, { label: this.editLabel, query: this.editQuery }));
    this.editingTopicId.set(null);
    this.message.set('Đã lưu chủ đề. Video mới sẽ tải khi đóng cài đặt.');
  }

  protected async removeTopic(id: string): Promise<void> {
    await this.store.update((s) => ({ ...s, topics: s.topics.filter((t) => t.id !== id) }));
  }

  protected async addKeywords(): Promise<void> {
    const words = this.keywordInput
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);
    if (words.length === 0) return;
    await this.store.update((s) => ({ ...s, bannedKeywords: [...new Set([...s.bannedKeywords, ...words])] }));
    this.keywordInput = '';
  }

  protected async removeKeyword(word: string): Promise<void> {
    await this.store.update((s) => ({ ...s, bannedKeywords: s.bannedKeywords.filter((w) => w !== word) }));
  }

  protected async setThreshold(key: keyof FilterThresholds, raw: string): Promise<void> {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    await this.store.update((s) => ({ ...s, thresholds: { ...s.thresholds, [key]: value } }));
  }

  protected exportSettings(): void {
    this.importText = this.store.exportJson();
    this.message.set('Đã hiện bản sao lưu bên dưới — chép lại để giữ.');
  }

  protected async importSettings(): Promise<void> {
    const ok = await this.store.replaceFromJson(this.importText);
    this.message.set(ok ? 'Đã nạp cài đặt.' : 'Nội dung sao lưu không hợp lệ.');
  }

  protected async setPlayback(change: Partial<PlaybackPreferences>): Promise<void> {
    await this.store.update((s) => ({ ...s, playback: { ...s.playback, ...change } }));
  }

  protected async setPlaybackSeconds(
    key: 'autoFullscreenSeconds' | 'expandControlsSeconds' | 'fullscreenControlsSeconds',
    raw: string,
  ): Promise<void> {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    const seconds = clampTimerSeconds(value);
    await this.setPlayback({ [key]: key === 'fullscreenControlsSeconds' ? Math.max(1, seconds) : seconds });
  }

  protected async setDisplay(change: Partial<DisplayPreferences>): Promise<void> {
    await this.store.update((s) => ({ ...s, display: { ...s.display, ...change } }));
  }

  protected async setQuietHours(change: Partial<QuietHours>): Promise<void> {
    await this.store.update((s) => ({ ...s, quietHours: { ...s.quietHours, ...change } }));
  }

  protected async setQuietTime(which: 'start' | 'end', raw: string): Promise<void> {
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) await this.setQuietHours({ [which]: raw });
  }

  protected async signIn(): Promise<void> {
    const outcome = await this.auth.signIn();
    this.message.set(outcome === SIGN_IN_OUTCOME.SIGNED_IN ? 'Đã đăng nhập.' : 'Chưa đăng nhập được.');
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    this.message.set('Đã đăng xuất.');
  }

  protected async changePin(): Promise<void> {
    this.lock.set(LOCK.CREATE);
    this.message.set('Nhập mã PIN mới.');
  }

  private unlock(): void {
    this.lock.set(LOCK.OPEN);
    this.message.set(null);
  }
}
