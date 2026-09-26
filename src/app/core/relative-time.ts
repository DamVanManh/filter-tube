const UNITS: readonly { readonly seconds: number; readonly label: string }[] = [
  { seconds: 365 * 86400, label: 'năm' },
  { seconds: 30 * 86400, label: 'tháng' },
  { seconds: 7 * 86400, label: 'tuần' },
  { seconds: 86400, label: 'ngày' },
  { seconds: 3600, label: 'giờ' },
  { seconds: 60, label: 'phút' },
];

export function relativeTimeVi(iso: string, now: Date): string {
  const elapsed = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  for (const unit of UNITS) {
    const count = Math.floor(elapsed / unit.seconds);
    if (count >= 1) return `${count} ${unit.label} trước`;
  }
  return 'vừa xong';
}

export function compactCountVi(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} tr`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace('.0', '').replace('.', ',')} N`;
  return String(count);
}
