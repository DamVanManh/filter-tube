import { DEFAULT_SETTINGS } from './defaults';
import { addTopic, editTopic, topicIdFor } from './topics';

describe('topicIdFor', () => {
  it('slugifies Vietnamese labels and avoids collisions', () => {
    expect(topicIdFor('Cải lương', new Set())).toBe('cai-luong');
    expect(topicIdFor('Đờn ca', new Set())).toBe('don-ca');
    expect(topicIdFor('Cải lương', new Set(['cai-luong']))).toBe('cai-luong-2');
    expect(topicIdFor('!!!', new Set())).toBe('chu-de');
  });
});

describe('addTopic', () => {
  it('uses the label as the query when the query is blank', () => {
    const next = addTopic(DEFAULT_SETTINGS, { label: ' Cải lương ', query: ' ' });
    expect(next.topics.at(-1)).toEqual({ id: 'cai-luong', label: 'Cải lương', query: 'Cải lương' });
  });

  it('ignores a blank label', () => {
    expect(addTopic(DEFAULT_SETTINGS, { label: '  ', query: 'x' })).toBe(DEFAULT_SETTINGS);
  });
});

describe('editTopic', () => {
  it('changes label and query but keeps the id so the tab and its place stay put', () => {
    const next = editTopic(DEFAULT_SETTINGS, 'nau-an', { label: 'Món chay', query: 'món chay dễ làm' });
    expect(next.topics[0]).toEqual({ id: 'nau-an', label: 'Món chay', query: 'món chay dễ làm' });
    expect(next.topics.slice(1)).toEqual(DEFAULT_SETTINGS.topics.slice(1));
  });

  it('refuses a blank label and leaves other topics untouched', () => {
    expect(editTopic(DEFAULT_SETTINGS, 'nau-an', { label: '', query: 'x' })).toBe(DEFAULT_SETTINGS);
  });
});
