export interface KeywordRelease {
  readonly version: number;
  readonly words: readonly string[];
}

export const KEYWORD_RELEASES: readonly KeywordRelease[] = [
  { version: 2, words: ['thảm họa', 'bí truyền', 'tuyệt chiêu'] },
];

export const LATEST_KEYWORD_VERSION = KEYWORD_RELEASES.reduce((max, r) => Math.max(max, r.version), 1);

export function withNewKeywordReleases(
  keywords: readonly string[],
  storedVersion: number,
): { keywords: string[]; version: number } {
  const additions = KEYWORD_RELEASES.filter((r) => r.version > storedVersion).flatMap((r) => r.words);
  return { keywords: [...new Set([...keywords, ...additions])], version: Math.max(storedVersion, LATEST_KEYWORD_VERSION) };
}
