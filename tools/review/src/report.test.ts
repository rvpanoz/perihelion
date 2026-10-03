import { describe, expect, it } from 'vitest';
import { renderReport } from './report.js';
import { COMMENT_MARKER } from './review.js';
import { LOOSENED_FINDING, reviewResult } from './testing/reviewResult.js';

const FIXTURE = 'packages/fixtures/upstream/cad-empty.json';

describe('renderReport', () => {
  it('starts with the marker that finds the comment again', () => {
    expect(renderReport(reviewResult()).startsWith(COMMENT_MARKER)).toBe(true);
  });

  it('says there is nothing to flag when the review is empty', () => {
    const report = renderReport(reviewResult());

    expect(report).toContain('Nothing to flag.');
    expect(report).not.toContain('Blocked');
  });

  it('lists blocking fixture files and tolerances with their evidence', () => {
    const report = renderReport(
      reviewResult({ fixtureFiles: [FIXTURE], tolerances: [LOOSENED_FINDING] }),
    );

    expect(report).toContain('**Blocked**');
    expect(report).toContain('`ground-truth:approved`');
    expect(report).toContain(`- \`${FIXTURE}\``);
    expect(report).toContain(
      '| `packages/orbit/src/elements.test.ts:165` | `1e-11` → `1e-9` | upper-bound | 0.97 | loosened: upper-bound 1e-11 → 1e-9 is looser |',
    );
  });

  it('marks blocking findings as approved once the label is on', () => {
    const report = renderReport(reviewResult({ fixtureFiles: [FIXTURE], approved: true }));

    expect(report).toContain('**Approved**');
    expect(report).not.toContain('**Blocked**');
    expect(report).toContain(FIXTURE);
  });

  it('gives message findings as advice, with Jev probabilities when judged', () => {
    const messages = {
      jevUnavailable: false,
      findings: [
        { subject: '0123456 WIP', problem: 'may not be plain English', probability: 0.2 },
        { subject: 'PR description', problem: 'has no `Closes #N` link', probability: null },
      ],
    };
    const report = renderReport(reviewResult({ messages }));

    expect(report).toContain('Advice');
    expect(report).toContain('- **0123456 WIP**: may not be plain English (Jev 0.20)');
    expect(report).toContain('- **PR description**: has no `Closes #N` link');
    expect(report).not.toContain('**Blocked**');
  });

  it('says when the message check could not ask Jev', () => {
    const messages = { findings: [], jevUnavailable: true };
    expect(renderReport(reviewResult({ messages }))).toContain(
      'Message check skipped: Jev unavailable.',
    );
  });
});
