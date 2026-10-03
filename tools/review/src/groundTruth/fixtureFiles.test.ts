import { describe, expect, it } from 'vitest';
import { parseDiff } from '../diff/parseDiff.js';
import {
  binaryFile,
  deletedFile,
  modifiedFile,
  newFile,
  renamedFile,
} from '../testing/diffText.js';
import { protectedFiles } from './fixtureFiles.js';

const SMALL_HUNK = ['@@ -1,1 +1,1 @@', '-1', '+2'];

function protectedIn(...diffs: string[]): string[] {
  return protectedFiles(parseDiff(diffs.join('\n')));
}

describe('protectedFiles', () => {
  it('lists changes under every protected root, sorted', () => {
    expect(
      protectedIn(
        modifiedFile('tools/review/src/recorded/tolerances.json', SMALL_HUNK),
        modifiedFile('packages/fixtures/upstream/cad-empty.json', SMALL_HUNK),
        modifiedFile('packages/fixtures/src/recorded/vectors-emb.json', SMALL_HUNK),
        newFile('packages/fixtures/data/comets.json', ['[]']),
      ),
    ).toEqual([
      'packages/fixtures/data/comets.json',
      'packages/fixtures/src/recorded/vectors-emb.json',
      'packages/fixtures/upstream/cad-empty.json',
      'tools/review/src/recorded/tolerances.json',
    ]);
  });

  it('blocks a binary recording even though its diff has no lines', () => {
    expect(protectedIn(binaryFile('packages/fixtures/upstream/sbdb-neo-full.json.gz'))).toEqual([
      'packages/fixtures/upstream/sbdb-neo-full.json.gz',
    ]);
  });

  it('blocks a recording renamed out of a protected directory or deleted', () => {
    expect(
      protectedIn(
        renamedFile('packages/fixtures/upstream/a.json', 'packages/fixtures/a.json'),
        deletedFile('packages/fixtures/data/planets.json', ['{}']),
      ),
    ).toEqual(['packages/fixtures/data/planets.json', 'packages/fixtures/upstream/a.json']);
  });

  it('leaves the web snapshot and the fixture package code alone', () => {
    expect(
      protectedIn(
        modifiedFile('apps/web/public/snapshot/neos.json', SMALL_HUNK),
        modifiedFile('packages/fixtures/src/index.ts', SMALL_HUNK),
        modifiedFile('packages/fixtures/scripts/generateFixtures.ts', SMALL_HUNK),
      ),
    ).toEqual([]);
  });
});
