import type { JevClient, JevRequest, JevResult } from '../typesafe/jevClient.js';
import type { JevResponse } from '../typesafe/jevResponse.js';

export function fakeJev(
  answer: (request: JevRequest) => JevResult,
): JevClient & { requests: JevRequest[] } {
  const requests: JevRequest[] = [];
  return {
    requests,
    async ask(request) {
      requests.push(request);
      return answer(request);
    },
  };
}

const USAGE = { input_tokens: 500, output_tokens: 10 };

export function choiceAnswer(question: {
  id: string;
  choice: string;
  confidence: number;
}): JevResult {
  const response: JevResponse = {
    model: 'jev-1.13.0',
    answers: {
      [question.id]: {
        type: 'choice',
        choice: question.choice,
        confidence: question.confidence,
        probabilities: { [question.choice]: question.confidence },
      },
    },
    usage: USAGE,
  };
  return { ok: true, response };
}

export function noulAnswers(nouls: Record<string, number>): JevResult {
  const answers = Object.fromEntries(
    Object.entries(nouls).map(([id, noul]) => [id, { type: 'noul' as const, noul }]),
  );
  return { ok: true, response: { model: 'jev-1.13.0', answers, usage: USAGE } };
}
