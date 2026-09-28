import { Video, VIDEO_ORIGIN } from './models';
import {
  SEARCH_ORDER,
  channelsToExplore,
  mergeTopicVideos,
  searchPlanFor,
  spreadChannels,
  topicPhrases,
  uploadsPlaylistIdFor,
} from './topic-rotation';

function video(id: string, title = id, channelId = 'c'): Video {
  return {
    id, title, channelId, channelTitle: channelId, thumbnailUrl: '', publishedAt: '2026-09-01T00:00:00Z',
    durationSeconds: 600, madeForKids: false, audioLanguage: null, categoryId: null, embeddable: true, origin: VIDEO_ORIGIN.TOPIC, topicId: 't',
  };
}

describe('topicPhrases', () => {
  it('splits a topic query into phrases on ";" and new lines', () => {
    expect(topicPhrases('món kho; món canh\n món chay ;')).toEqual(['món kho', 'món canh', 'món chay']);
    expect(topicPhrases('nhạc xưa')).toEqual(['nhạc xưa']);
  });
});

describe('searchPlanFor', () => {
  it('moves to the next phrase every round, then to another time window, then to another ordering', () => {
    const q = 'a; b';
    const plans = [0, 1, 2, 3, 4, 5, 6].map((round) => searchPlanFor(q, round));
    expect(plans.map((p) => p.query)).toEqual(['a', 'b', 'a', 'b', 'a', 'b', 'a']);
    expect(plans.map((p) => p.windowDays)).toEqual([365, 365, 30, 30, 7, 7, 365]);
    expect(plans.map((p) => p.order)).toEqual([...Array(6).fill(SEARCH_ORDER.RELEVANCE), SEARCH_ORDER.VIEW_COUNT]);
  });

  it('still rotates windows for a single phrase so repeat refreshes find new videos', () => {
    expect([0, 1, 2, 3].map((r) => searchPlanFor('x', r).windowDays)).toEqual([365, 30, 7, 365]);
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

describe('channelsToExplore', () => {
  it('picks the channels that appear most, skipping blocked ones', () => {
    const found = [video('1', '', 'A'), video('2', '', 'B'), video('3', '', 'B'), video('4', '', 'C'), video('5', '', 'C'), video('6', '', 'C')];
    expect(channelsToExplore(found, new Set(['C']), 2)).toEqual(['B', 'A']);
  });
});

describe('uploadsPlaylistIdFor', () => {
  it('maps a channel id to its uploads playlist', () => {
    expect(uploadsPlaylistIdFor('UCabc')).toBe('UUabc');
    expect(uploadsPlaylistIdFor('weird')).toBeNull();
  });
});

describe('spreadChannels', () => {
  it('keeps the same channel from appearing again within the last few cards when possible', () => {
    const list = ['A', 'A', 'A', 'B', 'C', 'D'].map((c, i) => video(`${c}${i}`, '', c));
    expect(spreadChannels(list, 2).map((v) => v.channelId)).toEqual(['A', 'B', 'C', 'A', 'D', 'A']);
  });

  it('falls back to the original order when only one channel is left', () => {
    const list = ['A', 'A', 'A'].map((c, i) => video(`${c}${i}`, '', c));
    expect(spreadChannels(list).map((v) => v.id)).toEqual(['A0', 'A1', 'A2']);
  });
});
