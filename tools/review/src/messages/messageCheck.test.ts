import { describe, expect, it } from 'vitest';
import { fakeJev, noulAnswers } from '../testing/fakeJev.js';
import type { JevRequest } from '../typesafe/jevClient.js';
import { type CommitMessage, reviewMessages } from './messageCheck.js';

const COMMIT: CommitMessage = {
  sha: '0123456789abcdef',
  message: 'Address review comments\n\nMore detail.',
};
const GOOD_BODY = 'Adds the review check.\n\nCloses #148';

function jevSaying(nouls: Record<string, number>) {
  return fakeJev((request: JevRequest) =>
    noulAnswers(
      Object.fromEntries(Object.keys(request.questions).map((id) => [id, nouls[id] ?? 1])),
    ),
  );
}

describe('reviewMessages', () => {
  it('reports a Noul below one half with its probability', async () => {
    const review = await reviewMessages(
      { commits: [COMMIT], prBody: GOOD_BODY },
      jevSaying({ functionalOnly: 0.3 }),
    );

    expect(review).toEqual({
      jevUnavailable: false,
      jevFailure: null,
      findings: [
        {
          subject: '0123456 Address review comments',
          problem: 'talks about how the change was made, not only what it does',
          probability: 0.3,
        },
      ],
    });
  });

  it('accepts a Noul of one half or more', async () => {
    const review = await reviewMessages(
      { commits: [COMMIT], prBody: GOOD_BODY },
      jevSaying({ functionalOnly: 0.5, plainEnglish: 0.9 }),
    );
    expect(review.findings).toEqual([]);
  });

  it('reports trailers without asking Jev about them', async () => {
    const commit = { sha: 'abcdef0123', message: 'Add x\n\nCo-Authored-By: Bot <b@x>' };
    const review = await reviewMessages({ commits: [commit], prBody: GOOD_BODY }, jevSaying({}));

    expect(review.findings).toEqual([
      {
        subject: 'abcdef0 Add x',
        problem: 'ends with trailers: Co-Authored-By: Bot <b@x>',
        probability: null,
      },
    ]);
  });

  it('handles an empty PR description without asking Jev about it', async () => {
    const jev = jevSaying({});
    const review = await reviewMessages({ commits: [], prBody: null }, jev);

    expect(jev.requests).toEqual([]);
    expect(review.findings).toEqual([
      {
        subject: 'PR description',
        problem: 'has no `Closes #N` link to its issue',
        probability: null,
      },
    ]);
  });

  it.each(['Closes #12', 'Fixes #3', 'resolves #9', 'closed #1'])(
    'accepts "%s" as the issue link',
    async (link) => {
      const review = await reviewMessages(
        { commits: [], prBody: `Text.\n\n${link}` },
        jevSaying({}),
      );
      expect(review.findings).toEqual([]);
    },
  );

  it('flags an unclear PR description', async () => {
    const review = await reviewMessages(
      { commits: [], prBody: GOOD_BODY },
      jevSaying({ plainEnglish: 0.2 }),
    );

    expect(review.findings).toEqual([
      { subject: 'PR description', problem: 'may not be plain English', probability: 0.2 },
    ]);
  });

  it('keeps the code-only findings when Jev is unavailable', async () => {
    const down = fakeJev(() => ({ ok: false, reason: 'HTTP 529' }));
    const review = await reviewMessages({ commits: [COMMIT], prBody: 'No link' }, down);

    expect(review.jevUnavailable).toBe(true);
    expect(review.jevFailure).toBe('HTTP 529');
    expect(review.findings.map((finding) => finding.problem)).toEqual([
      'has no `Closes #N` link to its issue',
    ]);
  });
});
