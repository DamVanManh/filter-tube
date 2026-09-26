import { Video, VIDEO_ORIGIN } from './models';
import {
  MAX_STACK_DEPTH,
  NavStack,
  nextInQueue,
  playerScreen,
  popScreen,
  pushScreen,
  rememberPlayerPosition,
  replaceTop,
  topScreen,
} from './nav-stack';

function video(id: string): Video {
  return {
    id, title: id, channelId: `ch-${id}`, channelTitle: `Kênh ${id}`, thumbnailUrl: '', publishedAt: '2026-09-01T00:00:00Z',
    durationSeconds: 600, madeForKids: false, audioLanguage: null, categoryId: null, embeddable: true,
    origin: VIDEO_ORIGIN.TOPIC, topicId: 't',
  };
}

const A = video('a');
const B = video('b');
const channelOfA = { kind: 'channel' as const, channel: { id: 'ch-a', title: 'Kênh a' } };

describe('navigation stack', () => {
  it('feed → video → channel → back returns to the same video at the position it was left', () => {
    let stack: NavStack = pushScreen([], playerScreen(A, [A, B]));
    stack = pushScreen(rememberPlayerPosition(stack, 73.9), channelOfA);
    expect(topScreen(stack)).toEqual(channelOfA);
    stack = popScreen(stack);
    expect(topScreen(stack)).toEqual({ kind: 'player', video: A, queue: [A, B], resumeAt: 73 });
    expect(popScreen(stack)).toEqual([]);
  });

  it('channel → video → back returns to the channel page', () => {
    let stack: NavStack = pushScreen([], channelOfA);
    stack = pushScreen(stack, playerScreen(B, [B]));
    expect(topScreen(popScreen(stack))).toEqual(channelOfA);
  });

  it('playing the next video replaces the current one so back still leads to where the list came from', () => {
    let stack: NavStack = pushScreen([channelOfA], playerScreen(A, [A, B]));
    stack = replaceTop(stack, playerScreen(B, [A, B]));
    expect(stack).toHaveLength(2);
    expect(topScreen(popScreen(stack))).toEqual(channelOfA);
  });

  it('only records a position when the top screen is a player', () => {
    const stack: NavStack = [channelOfA];
    expect(rememberPlayerPosition(stack, 50)).toBe(stack);
    expect(rememberPlayerPosition([playerScreen(A, [])], -3)).toEqual([{ ...playerScreen(A, []), resumeAt: 0 }]);
  });

  it('popping an empty stack stays empty and replacing into it pushes', () => {
    expect(popScreen([])).toEqual([]);
    expect(topScreen([])).toBeNull();
    expect(replaceTop([], channelOfA)).toEqual([channelOfA]);
  });

  it('caps the depth by dropping the oldest screens', () => {
    let stack: NavStack = [];
    for (let i = 0; i < MAX_STACK_DEPTH + 5; i++) stack = pushScreen(stack, { kind: 'channel', channel: { id: `c${i}`, title: '' } });
    expect(stack).toHaveLength(MAX_STACK_DEPTH);
    expect(topScreen(stack)).toEqual({ kind: 'channel', channel: { id: `c${MAX_STACK_DEPTH + 4}`, title: '' } });
  });
});

describe('nextInQueue', () => {
  it('plays the following video, wraps to the first different one, or gives up', () => {
    expect(nextInQueue([A, B], A)).toBe(B);
    expect(nextInQueue([A, B], B)).toBe(A);
    expect(nextInQueue([A], A)).toBeNull();
    expect(nextInQueue([], A)).toBeNull();
  });
});
