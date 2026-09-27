import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MARQUEE_GAP_REM, marqueeDurationSeconds, needsMarquee } from '../core/marquee';
import { SettingsStore } from '../core/settings.store';

@Component({
  selector: 'app-marquee',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 overflow-hidden whitespace-nowrap', '[attr.title]': 'text()' },
  template: `
    <span class="inline-flex" [class.marquee-run]="running()" [class.marquee-paused]="!onScreen()"
          [style.--marquee-shift.px]="shift()" [style.animation-duration.s]="duration()">
      <span [style.padding-right.px]="running() ? gapPx() : 0"><span #measure>{{ text() }}</span></span>
      @if (running()) {
        <span aria-hidden="true" [style.padding-right.px]="gapPx()">{{ text() }}</span>
      }
    </span>
  `,
})
export class MarqueeComponent implements AfterViewInit {
  readonly text = input.required<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly settings = inject(SettingsStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly measure = viewChild.required<ElementRef<HTMLElement>>('measure');

  private readonly textWidth = signal(0);
  private readonly boxWidth = signal(0);
  protected readonly onScreen = signal(true);
  protected readonly gapPx = signal(60);
  protected readonly running = computed(() => needsMarquee(this.textWidth(), this.boxWidth()));
  protected readonly shift = computed(() => this.textWidth() + this.gapPx());
  protected readonly duration = computed(() =>
    marqueeDurationSeconds(this.textWidth(), this.gapPx(), this.settings.settings().display.marqueeSpeed),
  );

  constructor() {
    effect(() => {
      this.text();
      this.settings.settings().display.uiScale;
      untracked(() => queueMicrotask(() => this.remeasure()));
    });
  }

  ngAfterViewInit(): void {
    const resize = new ResizeObserver(() => this.remeasure());
    resize.observe(this.host.nativeElement);
    resize.observe(this.measure().nativeElement);
    const visibility = new IntersectionObserver((entries) => this.onScreen.set(entries.some((e) => e.isIntersecting)));
    visibility.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => {
      resize.disconnect();
      visibility.disconnect();
    });
    this.remeasure();
  }

  private remeasure(): void {
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 20;
    this.gapPx.set(MARQUEE_GAP_REM * rootPx);
    this.textWidth.set(this.measure().nativeElement.getBoundingClientRect().width);
    this.boxWidth.set(this.host.nativeElement.clientWidth);
  }
}
