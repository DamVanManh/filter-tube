import { Video, VIDEO_ORIGIN } from './models';
import { SEARCH_ORDER, mergeTopicVideos, searchOrderFor } from './topic-rotation';

function video(id: string, title = id): Video {
  return {
    id, title, channelId: 'c', channelTitle: 'c', thumbnailUrl: '', publishedAt: '2026-09-01T00:00:00Z',
    durationSeconds: 600, madeForKids: false, audioLanguage: null, embeddable: true, origin: VIDEO_ORIGIN.TOPIC, topicId: 't',
  };
}

describe('searchOrderFor', () => {
  it('alternates between relevance and newest every six hours', () => {
    const sixHours = 6 * 3_600_000;
    expect(searchOrderFor(0)).toBe(SEARCH_ORDER.RELEVANCE);
    expect(searchOrderFor(sixHours)).toBe(SEARCH_ORDER.DATE);
    expect(searchOrderFor(2 * sixHours)).toBe(SEARCH_ORDER.RELEVANCE);
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
