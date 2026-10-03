import type { MessageExample, Recording, ToleranceExample } from './examples.js';
import { directionBlocks, directionOf, isToleranceKind } from './groundTruth/loosening.js';
import { type KindJudgement, kindJudgementOf } from './groundTruth/toleranceKind.js';
import { noulOf } from './typesafe/jevResponse.js';

// Offline scoring of the recorded answers against the labelled examples: how the cutoff was chosen (Task 6).

export interface JudgedExample {
  example: ToleranceExample;
  judgement: KindJudgement | null;
  /** The label says this edit loosens a tolerance, so the review must block it. */
  mustBlock: boolean;
}

export function judgedExamples(
  examples: readonly ToleranceExample[],
  recordings: readonly Recording[],
): JudgedExample[] {
  const responses = new Map(recordings.map((r) => [r.id, r.response]));
  return examples.map((example) => {
    const response = responses.get(example.id);
    const judgement = response ? kindJudgementOf(response) : null;
    return { example, judgement, mustBlock: isLoosening(example) };
  });
}

function isLoosening({ expectedKind, change }: ToleranceExample): boolean {
  return isToleranceKind(expectedKind) && directionBlocks(directionOf(expectedKind, change));
}

/** Mirrors the guard's rule with the cutoff as a parameter. */
export function blocksAt(judged: JudgedExample, cutoff: number): boolean {
  const { judgement, example } = judged;
  if (!judgement) return true;
  if (!isToleranceKind(judgement.kind)) return judgement.confidence < cutoff;
  return directionBlocks(directionOf(judgement.kind, example.change));
}

export interface CutoffOutcome {
  cutoff: number;
  missedLoosenings: number;
  blockedHarmless: number;
}

export function cutoffOutcome(judged: readonly JudgedExample[], cutoff: number): CutoffOutcome {
  const blocked = judged.map((item) => ({ item, blocks: blocksAt(item, cutoff) }));
  return {
    cutoff,
    missedLoosenings: blocked.filter(({ item, blocks }) => item.mustBlock && !blocks).length,
    blockedHarmless: blocked.filter(({ item, blocks }) => !item.mustBlock && blocks).length,
  };
}

export interface MessageAgreement {
  questionId: 'functionalOnly' | 'plainEnglish';
  agreed: number;
  total: number;
  disagreements: string[];
}

export function messageAgreement(
  {
    examples,
    recordings,
  }: { examples: readonly MessageExample[]; recordings: readonly Recording[] },
  questionId: MessageAgreement['questionId'],
): MessageAgreement {
  const responses = new Map(recordings.map((r) => [r.id, r.response]));
  const asked = examples.filter((example) => example.expected[questionId] !== undefined);
  const disagreements = asked.filter((example) => {
    const response = responses.get(example.id);
    const noul = response ? noulOf(response, questionId) : null;
    return noul === null || noul >= 0.5 !== example.expected[questionId];
  });
  return {
    questionId,
    agreed: asked.length - disagreements.length,
    total: asked.length,
    disagreements: disagreements.map((example) => example.id),
  };
}
