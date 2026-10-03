import { z } from 'zod';

// Answer shapes from https://docs.typesafe.ai/api (2026-10-03). Only Noul and Choice are asked; a Score answer
// would be a contract change, so it fails validation instead of passing unread.
const noulAnswerSchema = z.object({ type: z.literal('noul'), noul: z.number().min(0).max(1) });
const choiceAnswerSchema = z.object({
  type: z.literal('choice'),
  choice: z.string(),
  confidence: z.number().min(0).max(1),
  probabilities: z.record(z.string(), z.number().min(0).max(1)),
});

export const jevResponseSchema = z.object({
  model: z.string(),
  answers: z.record(
    z.string(),
    z.discriminatedUnion('type', [noulAnswerSchema, choiceAnswerSchema]),
  ),
  usage: z.object({ input_tokens: z.number().int(), output_tokens: z.number().int() }),
});

export type JevResponse = z.infer<typeof jevResponseSchema>;

export function noulOf(response: JevResponse, questionId: string): number | null {
  const answer = response.answers[questionId];
  return answer?.type === 'noul' ? answer.noul : null;
}

export function choiceOf(
  response: JevResponse,
  questionId: string,
): { choice: string; confidence: number } | null {
  const answer = response.answers[questionId];
  return answer?.type === 'choice'
    ? { choice: answer.choice, confidence: answer.confidence }
    : null;
}
