import { describe, expect, it } from 'vitest';
import { isBlocked } from './review.js';
import { LOOSENED_FINDING, reviewResult } from './testing/reviewResult.js';

const FIXTURE = ['packages/fixtures/upstream/cad-empty.json'];
const MESSAGE_FINDING = { subject: 'PR description', problem: 'x', probability: null };

describe('isBlocked', () => {
  it.each([
    ['fixture changes', { fixtureFiles: FIXTURE }],
    ['a loosened tolerance', { tolerances: [LOOSENED_FINDING] }],
    ['both', { fixtureFiles: FIXTURE, tolerances: [LOOSENED_FINDING] }],
  ])('blocks %s until the user approves', (_name, findings) => {
    expect(isBlocked(reviewResult(findings))).toBe(true);
    expect(isBlocked(reviewResult({ ...findings, approved: true }))).toBe(false);
  });

  it('never blocks on message findings or an empty review', () => {
    const messages = { findings: [MESSAGE_FINDING], jevUnavailable: true, jevFailure: null };

    expect(isBlocked(reviewResult({ messages }))).toBe(false);
    expect(isBlocked(reviewResult())).toBe(false);
  });
});
