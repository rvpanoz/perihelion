import { describe, expect, it } from 'vitest';
import { choiceAnswer, fakeJev } from '../testing/fakeJev.js';
import { numberChange } from '../testing/numberChange.js';
import {
  MAX_JUDGED_CHANGES,
  NOT_A_TOLERANCE_MIN_CONFIDENCE,
  blockingTolerances,
} from './toleranceGuard.js';

const LOOSENED = numberChange();
const TIGHTENED = numberChange({
  oldValue: 1e-9,
  newValue: 1e-11,
  oldText: '1e-9',
  newText: '1e-11',
});

function answering(choice: string, confidence = 0.95) {
  return fakeJev(() => choiceAnswer({ id: 'kind', choice, confidence }));
}

async function reasonsFor(changes = [LOOSENED], jev = answering('upper-bound')) {
  return (await blockingTolerances(changes, jev)).map((finding) => finding.reason);
}

describe('blockingTolerances', () => {
  it('blocks a loosened tolerance and lets a tightened one through', async () => {
    expect(await reasonsFor([LOOSENED, TIGHTENED])).toEqual(['loosened']);
  });

  it('trusts a confident not-a-tolerance answer but not an unsure one', async () => {
    const unsure = NOT_A_TOLERANCE_MIN_CONFIDENCE - 0.01;

    expect(await reasonsFor([LOOSENED], answering('not-a-tolerance', 0.95))).toEqual([]);
    expect(await reasonsFor([LOOSENED], answering('not-a-tolerance', unsure))).toEqual([
      'uncertain',
    ]);
  });

  it('blocks an answer that is not one of the kinds', async () => {
    expect(await reasonsFor([LOOSENED], answering('precision'))).toEqual(['uncertain']);
  });

  it('blocks every change when Jev cannot answer', async () => {
    const down = fakeJev(() => ({ ok: false, reason: 'HTTP 529' }));
    const findings = await blockingTolerances([LOOSENED, TIGHTENED], down);

    expect(findings.map(({ reason, detail }) => [reason, detail])).toEqual([
      ['jev-unavailable', 'HTTP 529'],
      ['jev-unavailable', 'HTTP 529'],
    ]);
  });

  it('judges at most the limit and blocks the rest as too many', async () => {
    const jev = answering('not-a-tolerance');
    const changes = Array.from({ length: MAX_JUDGED_CHANGES + 5 }, () => TIGHTENED);
    const findings = await blockingTolerances(changes, jev);

    expect(jev.requests).toHaveLength(MAX_JUDGED_CHANGES);
    expect(findings.map((finding) => finding.reason)).toEqual(Array(5).fill('too-many'));
  });

  it('asks nothing when no numbers changed', async () => {
    const jev = answering('upper-bound');
    expect(await blockingTolerances([], jev)).toEqual([]);
    expect(jev.requests).toEqual([]);
  });

  it('explains a loosened finding with the kind and both values', async () => {
    const [finding] = await blockingTolerances([LOOSENED], answering('upper-bound', 0.8));

    expect(finding?.judgement).toEqual({ kind: 'upper-bound', confidence: 0.8 });
    expect(finding?.detail).toBe('upper-bound 1e-11 → 1e-9 is looser');
  });
});
