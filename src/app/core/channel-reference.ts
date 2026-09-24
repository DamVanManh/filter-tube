export function parseChannelReference(input: string): { handle: string } | { id: string } | null {
  const text = input.trim();
  const idMatch = /(?:^|\/channel\/)(UC[\w-]{22})(?:$|[/?#])/.exec(text);
  if (idMatch?.[1]) return { id: idMatch[1] };
  const handleMatch = /(?:^|youtube\.com\/)(@[\p{L}\p{N}._-]+)/u.exec(text);
  if (handleMatch?.[1]) return { handle: handleMatch[1] };
  if (/^[\p{L}\p{N}._-]+$/u.test(text)) return { handle: `@${text}` };
  return null;
}
