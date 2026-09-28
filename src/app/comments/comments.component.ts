import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarComponent } from '../avatar/avatar.component';
import { AuthStore, SessionExpiredError, SignInRequiredError } from '../core/auth.store';
import { CommentItem, CommentThread, Page } from '../core/models';
import { compactCountVi, relativeTimeVi } from '../core/relative-time';
import { NearEndDirective } from '../near-end/near-end.directive';
import { COMMENTS_DISABLED_REASON, YoutubeApi, YoutubeApiError } from '../core/youtube-api';

const MAX_COMMENT_LENGTH = 10_000;
const RETRY_DELAY_MS = 2000;

const LOAD_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  DISABLED: 'disabled',
  FAILED: 'failed',
} as const;
type LoadState = (typeof LOAD_STATE)[keyof typeof LOAD_STATE];

function noticeForPostError(error: unknown): string {
  if (error instanceof SessionExpiredError) {
    return 'Đăng nhập Google đã hết hạn nên chưa gửi được. Nhờ người quản lý đăng nhập lại trong Cài đặt.';
  }
  if (error instanceof SignInRequiredError) return 'Chưa đăng nhập Google.';
  return 'Chưa gửi được bình luận. Kiểm tra mạng rồi thử lại.';
}

@Component({
  selector: 'app-comments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AvatarComponent, NearEndDirective],
  templateUrl: './comments.component.html',
})
export class CommentsComponent {
  readonly videoId = input.required<string>();

  protected readonly auth = inject(AuthStore);
  private readonly api = inject(YoutubeApi);

  protected readonly LOAD_STATE = LOAD_STATE;
  protected readonly MAX_COMMENT_LENGTH = MAX_COMMENT_LENGTH;
  protected readonly relativeTime = (iso: string) => relativeTimeVi(iso, new Date());
  protected readonly compactCount = compactCountVi;

  protected readonly threads = signal<readonly CommentThread[]>([]);
  protected readonly nextPageToken = signal<string | null>(null);
  protected readonly state = signal<LoadState>(LOAD_STATE.IDLE);
  protected readonly replies = signal<Readonly<Record<string, readonly CommentItem[]>>>({});
  protected readonly replyingTo = signal<string | null>(null);
  protected readonly posting = signal(false);
  protected readonly notice = signal<string | null>(null);

  protected draft = '';
  protected replyDraft = '';

  constructor() {
    effect(() => {
      const id = this.videoId();
      untracked(() => void this.reset(id));
    });
  }

  protected async loadMore(): Promise<void> {
    await this.loadPage(this.videoId(), this.nextPageToken());
  }

  protected async toggleReplies(thread: CommentThread): Promise<void> {
    if (this.replies()[thread.id]) {
      const { [thread.id]: _closed, ...rest } = this.replies();
      this.replies.set(rest);
      return;
    }
    try {
      const items = await this.api.replies(thread.id);
      this.replies.update((r) => ({ ...r, [thread.id]: items }));
    } catch {
      this.notice.set('Không tải được trả lời. Thử lại sau.');
    }
  }

  protected startReply(threadId: string): void {
    this.replyingTo.set(this.replyingTo() === threadId ? null : threadId);
    this.replyDraft = '';
  }

  protected async postComment(): Promise<void> {
    const text = this.draft.trim();
    if (!text || this.posting()) return;
    await this.withPosting(async (token) => {
      const created = await this.api.postComment(token, this.videoId(), text);
      this.threads.update((list) => [created, ...list]);
      this.draft = '';
    });
  }

  protected async postReply(thread: CommentThread): Promise<void> {
    const text = this.replyDraft.trim();
    if (!text || this.posting()) return;
    await this.withPosting(async (token) => {
      const created = await this.api.postReply(token, thread.id, text);
      this.replies.update((r) => ({ ...r, [thread.id]: [...(r[thread.id] ?? []), created] }));
      this.threads.update((list) => list.map((t) => (t.id === thread.id ? { ...t, replyCount: t.replyCount + 1 } : t)));
      this.replyDraft = '';
      this.replyingTo.set(null);
    });
  }

  private async withPosting(action: (token: string) => Promise<void>): Promise<void> {
    this.posting.set(true);
    this.notice.set(null);
    try {
      await action(await this.auth.accessToken());
    } catch (error) {
      this.notice.set(noticeForPostError(error));
    } finally {
      this.posting.set(false);
    }
  }

  private async reset(videoId: string): Promise<void> {
    this.threads.set([]);
    this.replies.set({});
    this.nextPageToken.set(null);
    this.replyingTo.set(null);
    this.notice.set(null);
    this.draft = '';
    await this.loadPage(videoId, null);
  }

  private async fetchPageRetryingOnce(videoId: string, pageToken: string | null): Promise<Page<CommentThread>> {
    try {
      return await this.api.commentThreads(videoId, pageToken);
    } catch (error) {
      if (error instanceof YoutubeApiError && error.reason === COMMENTS_DISABLED_REASON) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return this.api.commentThreads(videoId, pageToken);
    }
  }

  private async loadPage(videoId: string, pageToken: string | null): Promise<void> {
    if (this.state() === LOAD_STATE.LOADING) return;
    this.state.set(LOAD_STATE.LOADING);
    try {
      const page = await this.fetchPageRetryingOnce(videoId, pageToken);
      if (videoId !== this.videoId()) return;
      this.threads.update((list) => [...list, ...page.items]);
      this.nextPageToken.set(page.nextPageToken);
      this.state.set(LOAD_STATE.IDLE);
    } catch (error) {
      const disabled = error instanceof YoutubeApiError && error.reason === COMMENTS_DISABLED_REASON;
      this.state.set(disabled ? LOAD_STATE.DISABLED : LOAD_STATE.FAILED);
    }
  }
}
