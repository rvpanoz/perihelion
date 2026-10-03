import type { JevRequest } from '../typesafe/jevClient.js';
import { type JevResponse, choiceOf } from '../typesafe/jevResponse.js';
import { type NumberKind, TOLERANCE_KINDS } from './loosening.js';
import type { NumberChange } from './numberChanges.js';

export interface KindJudgement {
  kind: NumberKind;
  confidence: number;
}

const KIND_QUESTION_ID = 'kind';
const NUMBER_KINDS: readonly string[] = [...TOLERANCE_KINDS, 'not-a-tolerance'];

// The wording and the fixed option order are measured behaviour (Jev 1.13's choice can depend on option order,
// docs.typesafe.ai/model-jaggedness/jev-1.13): changing either means re-recording the examples.
const NUMBER_KIND_CRITERIA: Readonly<Record<NumberKind, string>> = {
  'upper-bound':
    'The number is itself the largest error, difference or value the test allows, such as a toBeLessThan limit or a named tolerance.',
  'closeness-digits':
    'The number-of-digits precision argument of toBeCloseTo (the second argument).',
  'margin-multiplier':
    'A factor that widens a measured error into the allowed error, such as a tolerance margin of 1.25.',
  'lower-bound':
    'The number is itself the smallest value the test requires, such as a toBeGreaterThan minimum on an accuracy or count.',
  'bound-term':
    'The number is part of a larger expression that forms a limit, not the limit itself: a divisor, a factor, or a small slack added to or subtracted from a limit, such as the 1000 in `edgeStep / 1000` or the 1e-12 in `(1 - 1e-12)`.',
  'not-a-tolerance':
    'Anything else: an expected value, an input, a count, an index, a time or a size used by the test.',
};

const KIND_INSTRUCTIONS =
  'In a test file, `oldLine` became `newLine`: the number at position `numberPosition` on the line changed from `oldNumber` to `newNumber`. `nearbyLines` shows the surrounding code. What role does that number play in the test?';

export function numberKindRequest(change: NumberChange): JevRequest {
  return {
    state: {
      file: change.path,
      oldLine: change.oldLine,
      newLine: change.newLine,
      oldNumber: change.oldText,
      newNumber: change.newText,
      numberPosition: change.numberPosition,
      nearbyLines: change.nearbyLines.join('\n'),
    },
    questions: {
      [KIND_QUESTION_ID]: {
        type: 'choice',
        instructions: KIND_INSTRUCTIONS,
        criteria: { ...NUMBER_KIND_CRITERIA },
      },
    },
  };
}

export function kindJudgementOf(response: JevResponse): KindJudgement | null {
  const answer = choiceOf(response, KIND_QUESTION_ID);
  if (!answer || !isNumberKind(answer.choice)) return null;
  return { kind: answer.choice, confidence: answer.confidence };
}

function isNumberKind(choice: string): choice is NumberKind {
  return NUMBER_KINDS.includes(choice);
}
