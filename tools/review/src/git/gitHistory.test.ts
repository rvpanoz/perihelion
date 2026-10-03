import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCommitLog, readProtectedDiff } from './gitHistory.js';

describe('parseCommitLog', () => {
  it('reads each record of git log --format=%H%x00%B%x1e', () => {
    const text = 'aaa111\0Add the client\n\nWith retries.\n\x1e\n' + 'bbb222\0Parse diffs\n\x1e\n';

    expect(parseCommitLog(text)).toEqual([
      { sha: 'aaa111', message: 'Add the client\n\nWith retries.' },
      { sha: 'bbb222', message: 'Parse diffs' },
    ]);
  });

  it('reads an empty log as no commits', () => {
    expect(parseCommitLog('')).toEqual([]);
  });
});

/** A throwaway repo (no network) with one commit that changes a protected file. */
function repoWithProtectedChange(): { root: string; baseSha: string; headSha: string } {
  const root = mkdtempSync(join(tmpdir(), 'review-git-'));
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  git('init', '-q');
  mkdirSync(join(root, 'packages/fixtures/data'), { recursive: true });
  mkdirSync(join(root, 'tools/review'), { recursive: true });
  writeFileSync(join(root, 'packages/fixtures/data/a.json'), '1\n');
  git('add', '.');
  git('commit', '-qm', 'base');
  const baseSha = git('rev-parse', 'HEAD');
  writeFileSync(join(root, 'packages/fixtures/data/a.json'), '2\n');
  git('commit', '-qam', 'head');
  return { root, baseSha, headSha: git('rev-parse', 'HEAD') };
}

describe('readProtectedDiff', () => {
  it('reads repo-root paths even when run from a workspace folder, as npm --workspace does', () => {
    const { root, baseSha, headSha } = repoWithProtectedChange();
    const startDir = process.cwd();
    try {
      process.chdir(join(root, 'tools/review'));
      const diff = readProtectedDiff({ baseSha, headSha }, ['packages/fixtures/data/']);
      expect(diff).toContain('packages/fixtures/data/a.json');
    } finally {
      process.chdir(startDir);
      rmSync(root, { recursive: true, force: true });
    }
  });
});
