import type { JevRequest, NoulQuestion } from '../typesafe/jevClient.js';
import { type JevResponse, noulOf } from '../typesafe/jevResponse.js';

/** A Noul below one half means Jev leans towards "no"; message findings only advise, so no tuning is needed. */
export const MESSAGE_NOUL_THRESHOLD = 0.5;

// The wording is measured behaviour: changing it means re-recording the examples.
const FUNCTIONAL_ONLY: NoulQuestion = {
  type: 'noul',
  instructions:
    'Is every sentence of the commit message in `message` about what the change does to the code, data, documentation or tooling?',
  criteria: {
    true: 'Every sentence describes the effect of the change.',
    false:
      'Some part talks about how the change was made: review feedback, requests or discussions, attempts, work in progress, making tests pass, or who or what wrote it.',
  },
};

const PROBLEMS: Readonly<Record<string, string>> = {
  functionalOnly: 'talks about how the change was made, not only what it does',
  plainEnglish: 'may not be plain English',
};

function plainEnglish(field: string): NoulQuestion {
  return {
    type: 'noul',
    instructions: `Is the text in \`${field}\` written in plain English that a developer new to the project could read?`,
    criteria: {
      true: 'Ordinary English sentences; code identifiers, units and technical terms are fine.',
      false: 'Not English, or mostly shorthand, emoji or abbreviations instead of sentences.',
    },
  };
}

export function commitMessageRequest(message: string): JevRequest {
  return {
    state: { message },
    questions: { functionalOnly: FUNCTIONAL_ONLY, plainEnglish: plainEnglish('message') },
  };
}

export function prBodyRequest(body: string): JevRequest {
  return { state: { description: body }, questions: { plainEnglish: plainEnglish('description') } };
}

export function lowAnswers(response: JevResponse): { problem: string; probability: number }[] {
  return Object.entries(PROBLEMS).flatMap(([questionId, problem]) => {
    const probability = noulOf(response, questionId);
    return probability !== null && probability < MESSAGE_NOUL_THRESHOLD
      ? [{ problem, probability }]
      : [];
  });
}
