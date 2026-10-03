import type { JevClient, JevResult } from '../typesafe/jevClient.js';
import { directionOf, isToleranceKind } from './loosening.js';
import type { NumberChange } from './numberChanges.js';
import { type KindJudgement, kindJudgementOf, numberKindRequest } from './toleranceKind.js';

/**
 * The lowest cutoff that let no loosened example through on the recorded jev-1.13.0 answers (2026-10-03, 60
 * labelled edits: 59 kinds right, every loosening blocked at every cutoff from 0.50 to 0.99; `npm run evaluate`).
 * Below it a "not a tolerance" answer is too unsure to trust and the change blocks.
 */
export const NOT_A_TOLERANCE_MIN_CONFIDENCE = 0.5;
/** Plan deviation 4: a reformat must not fan out into hundreds of calls; the rest fail closed. */
export const MAX_JUDGED_CHANGES = 40;

export type ToleranceReason = 'loosened' | 'uncertain' | 'jev-unavailable' | 'too-many';

export interface ToleranceFinding {
  change: NumberChange;
  reason: ToleranceReason;
  judgement: KindJudgement | null;
  detail: string;
}

/** Everything that could hide a loosened tolerance blocks: an unsure, odd or missing answer included. */
export async function blockingTolerances(
  changes: readonly NumberChange[],
  jev: JevClient,
): Promise<ToleranceFinding[]> {
  const judged = changes.slice(0, MAX_JUDGED_CHANGES);
  const overLimit = changes.slice(MAX_JUDGED_CHANGES).map(tooMany);
  const results = await Promise.all(judged.map((change) => jev.ask(numberKindRequest(change))));
  const findings = judged.flatMap((change, index) => findingsFor(change, results[index]));
  return [...findings, ...overLimit];
}

function findingsFor(change: NumberChange, result: JevResult | undefined): ToleranceFinding[] {
  if (!result?.ok) {
    const detail = result?.reason ?? 'no answer';
    return [{ change, reason: 'jev-unavailable', judgement: null, detail }];
  }
  const judgement = kindJudgementOf(result.response);
  if (!judgement) {
    const detail = "Jev's answer was not one of the kinds";
    return [{ change, reason: 'uncertain', judgement: null, detail }];
  }
  return judgedFindings(change, judgement);
}

function judgedFindings(change: NumberChange, judgement: KindJudgement): ToleranceFinding[] {
  const { kind, confidence } = judgement;
  if (!isToleranceKind(kind)) {
    if (confidence >= NOT_A_TOLERANCE_MIN_CONFIDENCE) return [];
    const detail = `not-a-tolerance at confidence ${confidence}, below the ${NOT_A_TOLERANCE_MIN_CONFIDENCE} cutoff`;
    return [{ change, reason: 'uncertain', judgement, detail }];
  }
  const direction = directionOf(kind, change);
  const values = `${kind} ${change.oldText} → ${change.newText}`;
  if (direction === 'unknown') {
    const detail = `${values}: a term inside a bound; its direction is not judged`;
    return [{ change, reason: 'uncertain', judgement, detail }];
  }
  if (direction !== 'looser') return [];
  return [{ change, reason: 'loosened', judgement, detail: `${values} is looser` }];
}

function tooMany(change: NumberChange): ToleranceFinding {
  const detail = `more than ${MAX_JUDGED_CHANGES} changed numbers in tests; not judged`;
  return { change, reason: 'too-many', judgement: null, detail };
}
