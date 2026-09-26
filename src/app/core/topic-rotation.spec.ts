import { Video, VIDEO_ORIGIN } from './models';
import { mergeTopicVideos, searchWindowDaysFor } from './topic-rotation';

function video(id: string, title = id): Video {
  return {
    id, title, channelId: 'c', channelTitle: 'c', thumbnailUrl: '', publishedAt: '2026-09-01T00:00:00Z',
    durationSeconds: 600, madeForKids: false, audioLanguage: null, categoryId: null, embeddable: true, origin: VIDEO_ORIGIN.TOPIC, topicId: 't',
  };
}

describe('searchWindowDaysFor', () => {
  it('cycles the last year, month and week every four hours so fresh videos keep arriving', () => {
    const period = 4 * 3_600_000;
    expect([0, 1, 2, 3].map((n) => searchWindowDaysFor(n * period))).toEqual([365, 30, 7, 365]);
    expect(searchWindowDaysFor(period - 1)).toBe(365);
  });
});

describe('mergeTopicVideos', () => {
  it('puts fresh results first, keeps earlier ones, and prefers the fresh copy of a repeat', () => {
    const merged = mergeTopicVideos([video('b', 'b-new'), video('c')], [video('a'), video('b', 'b-old')], 10);
    expect(merged.map((v) => v.title)).toEqual(['b-new', 'c', 'a']);
  });

  it('caps the pool so storage stays bounded', () => {
    expect(mergeTopicVideos([video('x')], [video('a'), video('b')], 2).map((v) => v.id)).toEqual(['x', 'a']);
  });
});
