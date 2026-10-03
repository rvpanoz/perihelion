import { describe, expect, it } from 'vitest';
import {
  binaryFile,
  deletedFile,
  modifiedFile,
  newFile,
  renamedFile,
} from '../testing/diffText.js';
import { parseDiff } from './parseDiff.js';

describe('parseDiff', () => {
  it('numbers new-file lines from each hunk header', () => {
    const text = modifiedFile('a.ts', [
      '@@ -1,2 +1,2 @@',
      ' kept',
      '-old',
      '+new',
      '@@ -40,1 +40,2 @@ function f() {',
      ' later',
      '+added',
    ]);
    const [file] = parseDiff(text);

    expect(file?.oldPath).toBe('a.ts');
    expect(file?.newPath).toBe('a.ts');
    expect(file?.lines).toEqual([
      { kind: 'context', text: 'kept', newLineNumber: 1 },
      { kind: 'removed', text: 'old', newLineNumber: null },
      { kind: 'added', text: 'new', newLineNumber: 2 },
      { kind: 'context', text: 'later', newLineNumber: 40 },
      { kind: 'added', text: 'added', newLineNumber: 41 },
    ]);
  });

  it('reads new, deleted, renamed and binary files', () => {
    const text = [
      newFile('n.ts', ['x']),
      deletedFile('d.ts', ['y']),
      renamedFile('from/r.json', 'to/r.json'),
      binaryFile('b.json.gz'),
    ].join('\n');

    expect(parseDiff(text).map(({ oldPath, newPath }) => [oldPath, newPath])).toEqual([
      [null, 'n.ts'],
      ['d.ts', null],
      ['from/r.json', 'to/r.json'],
      ['b.json.gz', 'b.json.gz'],
    ]);
  });

  it('keeps a removed line that starts with dashes inside a hunk', () => {
    const text = modifiedFile('a.ts', ['@@ -1,1 +1,1 @@', '--- a/heading', '+++ b/heading']);

    expect(parseDiff(text)[0]?.lines.map(({ kind, text: line }) => [kind, line])).toEqual([
      ['removed', '-- a/heading'],
      ['added', '++ b/heading'],
    ]);
  });

  it('drops carriage returns and the no-newline marker', () => {
    const text = modifiedFile('a.ts', [
      '@@ -1,1 +1,1 @@',
      '-old\r',
      '+new\r',
      '\\ No newline at end of file',
    ]);

    expect(parseDiff(text)[0]?.lines.map((line) => line.text)).toEqual(['old', 'new']);
  });
});
