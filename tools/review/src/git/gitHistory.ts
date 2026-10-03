import { execFileSync } from 'node:child_process';
import type { CommitMessage } from '../messages/messageCheck.js';

export interface CommitRange {
  baseSha: string;
  headSha: string;
}

const RECORD_SEPARATOR = '\x1e';
const FIELD_SEPARATOR = '\0';
// A refreshed recording can be megabytes of JSON; the default 1 MB buffer would throw.
const MAX_GIT_OUTPUT_BYTES = 64 * 1024 * 1024;

/** Three dots: only what the PR's commits changed since they left the base branch. */
export function readDiff({ baseSha, headSha }: CommitRange): string {
  return git(['diff', '--unified=3', '--find-renames', `${baseSha}...${headSha}`]);
}

export function readCommits({ baseSha, headSha }: CommitRange): CommitMessage[] {
  return parseCommitLog(
    git(['log', '--no-merges', '--format=%H%x00%B%x1e', `${baseSha}..${headSha}`]),
  );
}

export function parseCommitLog(text: string): CommitMessage[] {
  return text.split(RECORD_SEPARATOR).flatMap((record) => {
    const [sha, message] = record.trimStart().split(FIELD_SEPARATOR);
    return sha && message !== undefined ? [{ sha, message: message.trim() }] : [];
  });
}

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: MAX_GIT_OUTPUT_BYTES });
}
