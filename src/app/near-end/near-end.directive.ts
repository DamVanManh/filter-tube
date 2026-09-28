import { DestroyRef, Directive, ElementRef, afterNextRender, inject, output } from '@angular/core';

const PRELOAD_DISTANCE = '0px 0px 800px 0px';

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

/** Emits when the host element scrolls near the visible area; put it on a marker after the last item. */
@Directive({ selector: '[appNearEnd]' })
export class NearEndDirective {
  readonly appNearEnd = output<void>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let observer: IntersectionObserver | null = null;
    afterNextRender(() => {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) this.appNearEnd.emit();
        },
        { root: scrollParent(host), rootMargin: PRELOAD_DISTANCE },
      );
      observer.observe(host);
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
