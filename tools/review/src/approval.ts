import { createHash } from 'node:crypto';
import type { NumberChange } from './groundTruth/numberChanges.js';

// The approval label stays on a PR across pushes, so on its own it would approve whatever is pushed after it. The
// review records a fingerprint of exactly what was in front of the user when they applied it, and honours the label
// only while that fingerprint still matches.

const APPROVED_FINGERPRINT = /<!-- perihelion-review-approved: ([0-9a-f]{64}) -->/;

export interface GroundTruthEvidence {
  /** `git diff --full-index` of the protected paths: blob ids make binary changes count too. */
  protectedDiff: string;
  /** Every changed test number, judged or not, so a re-run with different Jev answers keeps the approval. */
  numberChanges: readonly NumberChange[];
}

export interface ApprovalInput {
  labelApplied: boolean;
  labelJustApplied: boolean;
  fingerprint: string;
  previouslyApproved: string | null;
}

export interface Approval {
  approved: boolean;
  approvedFingerprint: string | null;
  /** The label is on, but for something that has changed since; the review removes it. */
  approvalRevoked: boolean;
}

export function fingerprintOf({ protectedDiff, numberChanges }: GroundTruthEvidence): string {
  const changes = numberChanges.map((change) => [
    change.path,
    change.oldLine,
    change.newLine,
    change.numberPosition,
  ]);
  return createHash('sha256')
    .update(JSON.stringify([protectedDiff, changes]))
    .digest('hex');
}

export function approvedFingerprintMarker(fingerprint: string): string {
  return `<!-- perihelion-review-approved: ${fingerprint} -->`;
}

export function approvedFingerprintIn(commentBody: string | null): string | null {
  return APPROVED_FINGERPRINT.exec(commentBody ?? '')?.[1] ?? null;
}

export function approvalFor(input: ApprovalInput): Approval {
  if (!input.labelApplied) {
    return { approved: false, approvedFingerprint: null, approvalRevoked: false };
  }
  if (input.labelJustApplied || input.previouslyApproved === input.fingerprint) {
    return { approved: true, approvedFingerprint: input.fingerprint, approvalRevoked: false };
  }
  return { approved: false, approvedFingerprint: null, approvalRevoked: true };
}
