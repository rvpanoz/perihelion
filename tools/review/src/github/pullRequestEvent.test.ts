import { describe, expect, it } from 'vitest';
import { pullRequestEventSchema } from './pullRequestEvent.js';

function event(body: string | null) {
  return {
    action: 'labeled',
    pull_request: {
      number: 149,
      body,
      labels: [{ name: 'type:ci' }, { name: 'ground-truth:approved' }],
      base: { sha: 'base-sha', ref: 'main' },
      head: { sha: 'head-sha', ref: 'phase-7/jev-review' },
    },
  };
}

describe('pullRequestEventSchema', () => {
  it('keeps what the review needs from a pull_request event', () => {
    expect(pullRequestEventSchema.parse(event('Closes #148'))).toEqual({
      number: 149,
      body: 'Closes #148',
      labels: ['type:ci', 'ground-truth:approved'],
      baseSha: 'base-sha',
      headSha: 'head-sha',
    });
  });

  it('accepts a PR without a description', () => {
    expect(pullRequestEventSchema.parse(event(null)).body).toBeNull();
  });

  it('rejects an event that is not about a pull request', () => {
    expect(pullRequestEventSchema.safeParse({ action: 'opened', issue: {} }).success).toBe(false);
  });
});
