import { readFileSync } from 'node:fs';
import {
  type JudgedExample,
  cutoffOutcome,
  judgedExamples,
  messageAgreement,
} from '../src/evaluation.js';
import {
  messageExamplesSchema,
  recordingsSchema,
  toleranceExamplesSchema,
} from '../src/examples.js';

// Prints how the recorded answers score against the labels (no network). Used to choose
// NOT_A_TOLERANCE_MIN_CONFIDENCE: the lowest cutoff that lets no loosened example through.

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

function printConfusion(judged: readonly JudgedExample[]): void {
  console.log('expected kind → Jev kind (count, mean confidence)');
  const cells = new Map<string, number[]>();
  for (const { example, judgement } of judged) {
    const key = `${example.expectedKind} → ${judgement?.kind ?? 'unreadable'}`;
    cells.set(key, [...(cells.get(key) ?? []), judgement?.confidence ?? 0]);
  }
  for (const [key, confidences] of [...cells].sort()) {
    const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    console.log(
      `  ${key.padEnd(42)} ${String(confidences.length).padStart(3)}  ${mean.toFixed(3)}`,
    );
  }
}

function printCutoffs(judged: readonly JudgedExample[]): void {
  console.log('cutoff  missed loosenings  blocked harmless');
  for (let hundredths = 50; hundredths <= 99; hundredths += 1) {
    const { cutoff, missedLoosenings, blockedHarmless } = cutoffOutcome(judged, hundredths / 100);
    console.log(
      `  ${cutoff.toFixed(2)}  ${String(missedLoosenings).padStart(5)}  ${String(blockedHarmless).padStart(5)}`,
    );
  }
}

function printDetails(judged: readonly JudgedExample[]): void {
  for (const { example, judgement, mustBlock } of judged) {
    const answer = judgement
      ? `${judgement.kind} ${judgement.confidence.toFixed(3)}`
      : 'unreadable';
    console.log(
      `  ${mustBlock ? 'MUST' : '    '} ${example.id.padEnd(30)} ${example.expectedKind.padEnd(18)} ${answer}`,
    );
  }
}

const tolerances = toleranceExamplesSchema.parse(readJson('../examples/tolerances.json'));
const messages = messageExamplesSchema.parse(readJson('../examples/messages.json'));
const judged = judgedExamples(
  tolerances,
  recordingsSchema.parse(readJson('../src/recorded/tolerances.json')),
);
const messageRecordings = recordingsSchema.parse(readJson('../src/recorded/messages.json'));

printDetails(judged);
printConfusion(judged);
printCutoffs(judged);
for (const questionId of ['functionalOnly', 'plainEnglish'] as const) {
  const { agreed, total, disagreements } = messageAgreement(
    { examples: messages, recordings: messageRecordings },
    questionId,
  );
  console.log(
    `${questionId}: ${agreed}/${total} agree; disagree: ${disagreements.join(', ') || 'none'}`,
  );
}
