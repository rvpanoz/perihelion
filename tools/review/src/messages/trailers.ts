// git interprets a closing paragraph of `Token: value` lines as trailers (git-interpret-trailers(1)); CLAUDE.md
// forbids them in commit messages.
const TRAILER_LINE = /^[A-Za-z][\w-]*: \S/;

export function trailerLines(message: string): string[] {
  const paragraphs = message.trim().split(/\n\s*\n/);
  const last = paragraphs.length > 1 ? paragraphs.at(-1) : undefined;
  if (!last) return [];
  const lines = last.split('\n');
  return lines.every((line) => TRAILER_LINE.test(line)) ? lines : [];
}
