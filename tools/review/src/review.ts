import type { Approval } from './approval.js';
import type { ToleranceFinding } from './groundTruth/toleranceGuard.js';
import type { MessageReview } from './messages/messageCheck.js';

/** Only the user applies it (CONTRIBUTING.md non-negotiable 3): it says they reviewed the ground-truth changes. */
export const APPROVAL_LABEL = 'ground-truth:approved';
/** Hidden in the rendered comment; finds the review's own comment so each run edits it instead of adding one. */
export const COMMENT_MARKER = '<!-- perihelion-review -->';

export interface ReviewResult extends Approval {
  fixtureFiles: string[];
  tolerances: ToleranceFinding[];
  messages: MessageReview;
}

export function hasGroundTruthFindings(result: ReviewResult): boolean {
  return result.fixtureFiles.length > 0 || result.tolerances.length > 0;
}

/** Message findings only advise; ground-truth findings block until approved. */
export function isBlocked(result: ReviewResult): boolean {
  return !result.approved && hasGroundTruthFindings(result);
}
