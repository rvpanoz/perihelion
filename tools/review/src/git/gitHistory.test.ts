import { describe, expect, it } from 'vitest';
import { parseCommitLog } from './gitHistory.js';

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
