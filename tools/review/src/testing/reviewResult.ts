import type { ToleranceFinding } from '../groundTruth/toleranceGuard.js';
import type { ReviewResult } from '../review.js';
import { numberChange } from './numberChange.js';

export const LOOSENED_FINDING: ToleranceFinding = {
  change: numberChange(),
  reason: 'loosened',
  judgement: { kind: 'upper-bound', confidence: 0.97 },
  detail: 'upper-bound 1e-11 → 1e-9 is looser',
};

export function reviewResult(overrides: Partial<ReviewResult> = {}): ReviewResult {
  return {
    fixtureFiles: [],
    tolerances: [],
    messages: { findings: [], jevUnavailable: false },
    approved: false,
    approvedFingerprint: null,
    approvalRevoked: false,
    ...overrides,
  };
}
