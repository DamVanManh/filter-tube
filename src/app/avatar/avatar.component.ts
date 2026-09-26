import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const RETRY_DELAYS_MS: readonly number[] = [1500, 5000];

export function initialOf(name: string): string {
  const letter = name.replace(/^@/, '').trim().charAt(0);
  return letter ? letter.toLocaleUpperCase('vi') : '?';
}

@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex shrink-0 overflow-hidden rounded-full bg-sky-800' },
  template: `
    <span class="absolute inset-0 flex items-center justify-center font-bold text-white" aria-hidden="true">{{ initial() }}</span>
    @if (showImage()) {
      <img [src]="attemptUrl()" alt="" loading="lazy" referrerpolicy="no-referrer"
           class="relative h-full w-full object-cover" (error)="onError()" />
    }
  `,
})
export class AvatarComponent {
  readonly url = input.required<string>();
  readonly name = input.required<string>();

  protected readonly initial = computed(() => initialOf(this.name()));
  private readonly attempt = signal(0);
  private readonly failed = signal(false);
  protected readonly showImage = computed(() => this.url() !== '' && !this.failed());
  protected readonly attemptUrl = computed(() => {
    const n = this.attempt();
    return n === 0 ? this.url() : `${this.url()}${this.url().includes('?') ? '&' : '?'}r=${n}`;
  });

  protected onError(): void {
    this.failed.set(true);
    const delay = RETRY_DELAYS_MS[this.attempt()];
    if (delay === undefined) return;
    setTimeout(() => {
      this.attempt.update((n) => n + 1);
      this.failed.set(false);
    }, delay);
  }
}
