import { DEFAULT_SETTINGS } from './defaults';
import { LATEST_KEYWORD_VERSION, withNewKeywordReleases } from './keyword-releases';
import { parseSettings } from './settings-io';

describe('keyword releases', () => {
  it('adds words released after the stored version and keeps the user list otherwise untouched', () => {
    const upgraded = withNewKeywordReleases(['sốc', 'tùy chỉnh'], 1);
    expect(upgraded.keywords).toEqual(['sốc', 'tùy chỉnh', 'thảm họa', 'bí truyền', 'tuyệt chiêu']);
    expect(upgraded.version).toBe(LATEST_KEYWORD_VERSION);
  });

  it('does not re-add a released word the user removed after upgrading', () => {
    expect(withNewKeywordReleases(['sốc'], LATEST_KEYWORD_VERSION).keywords).toEqual(['sốc']);
  });

  it('upgrades a saved install that predates releases when its settings are read', () => {
    const { keywordsVersion: _v, ...legacy } = DEFAULT_SETTINGS;
    const parsed = parseSettings({ ...legacy, bannedKeywords: ['sốc'] });
    expect(parsed?.bannedKeywords).toEqual(['sốc', 'thảm họa', 'bí truyền', 'tuyệt chiêu']);
    expect(parsed?.keywordsVersion).toBe(LATEST_KEYWORD_VERSION);
  });

  it('ships fresh installs with every released word already included', () => {
    expect(DEFAULT_SETTINGS.keywordsVersion).toBe(LATEST_KEYWORD_VERSION);
    expect(DEFAULT_SETTINGS.bannedKeywords).toEqual(expect.arrayContaining(['thảm họa', 'bí truyền', 'tuyệt chiêu']));
  });
});
