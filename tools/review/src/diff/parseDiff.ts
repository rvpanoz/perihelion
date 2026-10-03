export interface DiffLine {
  kind: 'context' | 'removed' | 'added';
  text: string;
  newLineNumber: number | null;
}

export interface FileDiff {
  oldPath: string | null;
  newPath: string | null;
  lines: DiffLine[];
}

interface OpenFile {
  file: FileDiff;
  inHunk: boolean;
  nextNewLine: number;
}

interface Cursor {
  files: FileDiff[];
  open: OpenFile | null;
}

// Paths in this repo never contain spaces or quotes, so git never quotes them.
const FILE_HEADER = /^diff --git a\/(.+) b\/(.+)$/;
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
const LINE_KINDS: Readonly<Record<string, DiffLine['kind']>> = {
  ' ': 'context',
  '-': 'removed',
  '+': 'added',
};

/** Reads `git diff --find-renames` output. Header lines only count before a file's first hunk. */
export function parseDiff(diffText: string): FileDiff[] {
  const cursor: Cursor = { files: [], open: null };
  for (const line of diffText.split('\n')) readLine(line.replace(/\r$/, ''), cursor);
  return cursor.files;
}

function readLine(line: string, cursor: Cursor): void {
  const header = FILE_HEADER.exec(line);
  if (header) {
    const file: FileDiff = { oldPath: header[1] ?? null, newPath: header[2] ?? null, lines: [] };
    cursor.files.push(file);
    cursor.open = { file, inHunk: false, nextNewLine: 0 };
    return;
  }
  if (cursor.open) readFileLine(line, cursor.open);
}

function readFileLine(line: string, open: OpenFile): void {
  const hunk = HUNK_HEADER.exec(line);
  if (hunk) {
    open.inHunk = true;
    open.nextNewLine = Number(hunk[1]);
    return;
  }
  if (open.inHunk) return readHunkLine(line, open);
  if (line.startsWith('new file mode')) open.file.oldPath = null;
  if (line.startsWith('deleted file mode')) open.file.newPath = null;
}

function readHunkLine(line: string, open: OpenFile): void {
  const kind = LINE_KINDS[line.charAt(0)];
  if (!kind) return; // "\ No newline at end of file" and the empty last line
  const newLineNumber = kind === 'removed' ? null : open.nextNewLine++;
  open.file.lines.push({ kind, text: line.slice(1), newLineNumber });
}
