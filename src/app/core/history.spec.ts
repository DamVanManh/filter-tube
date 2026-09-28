import { HistoryEntry, MAX_HISTORY, recordInHistory } from './history';
import { Video, VIDEO_ORIGIN } from './models';

function video(id: string): Video {
  return {
    id, title: id, channelId: `ch-${id}`, channelTitle: `Kênh ${id}`, thumbnailUrl: '', publishedAt: '2026-09-01T00:00:00Z',
    durationSeconds: 600, madeForKids: false, audioLanguage: null, categoryId: null, embeddable: true,
    origin: VIDEO_ORIGIN.TOPIC, topicId: 't',
  };
}

const NOW = new Date('2026-09-28T10:00:00Z');
const ids = (history: readonly HistoryEntry[]) => history.map((e) => e.video.id);

describe('recordInHistory', () => {
  it('puts the newest video first with the time it was watched', () => {
    const history = recordInHistory(recordInHistory([], video('a'), NOW), video('b'), NOW);
    expect(ids(history)).toEqual(['b', 'a']);
    expect(history[0].watchedAt).toBe(NOW.toISOString());
  });

  it('moves a re-watched video to the top instead of listing it twice', () => {
    let history = [video('a'), video('b'), video('c')].reduce<HistoryEntry[]>((h, v) => recordInHistory(h, v, NOW), []);
    history = recordInHistory(history, video('a'), NOW);
    expect(ids(history)).toEqual(['a', 'c', 'b']);
  });

  it('drops the oldest videos once the limit is reached', () => {
    let history: HistoryEntry[] = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++) history = recordInHistory(history, video(`v${i}`), NOW);
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].video.id).toBe(`v${MAX_HISTORY + 4}`);
    expect(history.at(-1)?.video.id).toBe('v5');
  });
});
