import { Video } from './models';

export interface ChannelRef {
  readonly id: string;
  readonly title: string;
}

export interface PlayerScreen {
  readonly kind: 'player';
  readonly video: Video;
  readonly queue: readonly Video[];
  readonly resumeAt: number;
}

export interface ChannelScreen {
  readonly kind: 'channel';
  readonly channel: ChannelRef;
}

export interface HistoryScreen {
  readonly kind: 'history';
}

export type Screen = PlayerScreen | ChannelScreen | HistoryScreen;
export type NavStack = readonly Screen[];

export const MAX_STACK_DEPTH = 30;

export function pushScreen(stack: NavStack, screen: Screen): NavStack {
  return [...stack, screen].slice(-MAX_STACK_DEPTH);
}

export function popScreen(stack: NavStack): NavStack {
  return stack.slice(0, -1);
}

export function replaceTop(stack: NavStack, screen: Screen): NavStack {
  return stack.length === 0 ? [screen] : [...stack.slice(0, -1), screen];
}

export function topScreen(stack: NavStack): Screen | null {
  return stack.at(-1) ?? null;
}

export function rememberPlayerPosition(stack: NavStack, seconds: number): NavStack {
  const top = topScreen(stack);
  if (top?.kind !== 'player') return stack;
  return replaceTop(stack, { ...top, resumeAt: Math.max(0, Math.floor(seconds)) });
}

export function playerScreen(video: Video, queue: readonly Video[]): PlayerScreen {
  return { kind: 'player', video, queue, resumeAt: 0 };
}

export function nextInQueue(queue: readonly Video[], current: Video): Video | null {
  const index = queue.findIndex((v) => v.id === current.id);
  return queue[index + 1] ?? queue.find((v) => v.id !== current.id) ?? null;
}
