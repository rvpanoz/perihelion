import { describe, expect, it } from 'vitest';
import {
  approvalFor,
  approvedFingerprintIn,
  approvedFingerprintMarker,
  fingerprintOf,
} from './approval.js';
import { numberChange } from './testing/numberChange.js';

const DIFF = 'diff --git a/packages/fixtures/upstream/cad-empty.json b/…\nindex 1111111..2222222';
const EVIDENCE = { protectedDiff: DIFF, numberChanges: [numberChange()] };
const FINGERPRINT = fingerprintOf(EVIDENCE);

describe('fingerprintOf', () => {
  it('is stable for the same evidence', () => {
    expect(fingerprintOf({ ...EVIDENCE })).toBe(FINGERPRINT);
    expect(FINGERPRINT).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when a protected file or a test number changes', () => {
    expect(fingerprintOf({ ...EVIDENCE, protectedDiff: `${DIFF}3` })).not.toBe(FINGERPRINT);
    const tighter = numberChange({ newLine: 'expect(error).toBeLessThan(1e-12);' });
    expect(fingerprintOf({ ...EVIDENCE, numberChanges: [tighter] })).not.toBe(FINGERPRINT);
  });
});

describe('approved fingerprint in the comment', () => {
  it('round-trips through the hidden marker', () => {
    const body = `<!-- perihelion-review -->\n${approvedFingerprintMarker(FINGERPRINT)}\nreport`;
    expect(approvedFingerprintIn(body)).toBe(FINGERPRINT);
  });

  it('is absent from a comment without it, or without a comment', () => {
    expect(approvedFingerprintIn('<!-- perihelion-review -->\nNothing to flag.')).toBeNull();
    expect(approvedFingerprintIn(null)).toBeNull();
  });
});

describe('approvalFor', () => {
  const base = { fingerprint: FINGERPRINT, labelJustApplied: false, previouslyApproved: null };

  it('approves nothing without the label', () => {
    expect(approvalFor({ ...base, labelApplied: false })).toEqual({
      approved: false,
      approvedFingerprint: null,
      approvalRevoked: false,
    });
  });

  it('approves what is in the PR at the moment the label is applied', () => {
    expect(approvalFor({ ...base, labelApplied: true, labelJustApplied: true })).toEqual({
      approved: true,
      approvedFingerprint: FINGERPRINT,
      approvalRevoked: false,
    });
  });

  it('keeps the approval while the evidence is unchanged', () => {
    const input = { ...base, labelApplied: true, previouslyApproved: FINGERPRINT };
    expect(approvalFor(input).approved).toBe(true);
  });

  it('revokes the approval once the evidence changed or its record is missing', () => {
    for (const previouslyApproved of ['0'.repeat(64), null]) {
      expect(approvalFor({ ...base, labelApplied: true, previouslyApproved })).toEqual({
        approved: false,
        approvedFingerprint: null,
        approvalRevoked: true,
      });
    }
  });
});
