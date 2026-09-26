import { compactCountVi, relativeTimeVi } from './relative-time';

const NOW = new Date('2026-09-26T12:00:00Z');

describe('relativeTimeVi', () => {
  it.each([
    ['2026-09-26T11:59:30Z', 'vừa xong'],
    ['2026-09-26T11:55:00Z', '5 phút trước'],
    ['2026-09-26T09:00:00Z', '3 giờ trước'],
    ['2026-09-24T12:00:00Z', '2 ngày trước'],
    ['2026-09-10T12:00:00Z', '2 tuần trước'],
    ['2026-06-26T12:00:00Z', '3 tháng trước'],
    ['2024-09-01T12:00:00Z', '2 năm trước'],
    ['2026-09-27T12:00:00Z', 'vừa xong'],
  ])('%s → %s', (iso, expected) => {
    expect(relativeTimeVi(iso, NOW)).toBe(expected);
  });
});

describe('compactCountVi', () => {
  it.each([
    [999, '999'],
    [1000, '1 N'],
    [15300, '15,3 N'],
    [2_390_000, '2,4 tr'],
    [1_000_000, '1 tr'],
  ])('%d → %s', (n, expected) => {
    expect(compactCountVi(n)).toBe(expected);
  });
});
