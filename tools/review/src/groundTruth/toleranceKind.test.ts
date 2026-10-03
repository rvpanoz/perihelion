import { describe, expect, it } from 'vitest';
import { choiceAnswer } from '../testing/fakeJev.js';
import { numberChange } from '../testing/numberChange.js';
import type { JevResult } from '../typesafe/jevClient.js';
import { kindJudgementOf, numberKindRequest } from './toleranceKind.js';

function responseOf(result: JevResult) {
  if (!result.ok) throw new Error('expected an answer');
  return result.response;
}

describe('numberKindRequest', () => {
  it('states the one changed number and its surroundings', () => {
    const request = numberKindRequest(
      numberChange({ numberPosition: 2, nearbyLines: ['above', 'line', 'below'] }),
    );

    expect(request.state).toEqual({
      file: 'packages/orbit/src/elements.test.ts',
      oldLine: 'expect(error).toBeLessThan(1e-11);',
      newLine: 'expect(error).toBeLessThan(1e-9);',
      oldNumber: '1e-11',
      newNumber: '1e-9',
      numberPosition: 2,
      nearbyLines: 'above\nline\nbelow',
    });
  });

  it('asks one Choice with the kinds in a fixed order', () => {
    const question = numberKindRequest(numberChange()).questions.kind;

    expect(question?.type).toBe('choice');
    expect(Object.keys(question?.criteria ?? {})).toEqual([
      'upper-bound',
      'closeness-digits',
      'margin-multiplier',
      'lower-bound',
      'not-a-tolerance',
    ]);
  });
});

describe('kindJudgementOf', () => {
  it('reads a known kind with its confidence', () => {
    const response = responseOf(
      choiceAnswer({ id: 'kind', choice: 'upper-bound', confidence: 0.8 }),
    );
    expect(kindJudgementOf(response)).toEqual({ kind: 'upper-bound', confidence: 0.8 });
  });

  it('returns null for an unknown choice or a missing answer', () => {
    const unknown = responseOf(choiceAnswer({ id: 'kind', choice: 'precision', confidence: 0.8 }));
    const missing = responseOf(
      choiceAnswer({ id: 'other', choice: 'upper-bound', confidence: 0.8 }),
    );

    expect(kindJudgementOf(unknown)).toBeNull();
    expect(kindJudgementOf(missing)).toBeNull();
  });
});
