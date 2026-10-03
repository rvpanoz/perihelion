import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cutoffOutcome, judgedExamples, messageAgreement } from './evaluation.js';
import { messageExampleRequest, toleranceExampleRequest } from './exampleRequests.js';
import {
  type MessageExample,
  messageExamplesSchema,
  recordingsSchema,
  toleranceExamplesSchema,
} from './examples.js';
import { directionOf, isToleranceKind } from './groundTruth/loosening.js';
import {
  NOT_A_TOLERANCE_MIN_CONFIDENCE,
  blockingTolerances,
} from './groundTruth/toleranceGuard.js';
import { reviewMessages } from './messages/messageCheck.js';
import { recordedJev } from './testing/recordedJev.js';
import { JEV_MODEL } from './typesafe/jevClient.js';

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

const toleranceExamples = toleranceExamplesSchema.parse(readJson('../examples/tolerances.json'));
const messageExamples = messageExamplesSchema.parse(readJson('../examples/messages.json'));
const toleranceRecordings = recordingsSchema.parse(readJson('./recorded/tolerances.json'));
const messageRecordings = recordingsSchema.parse(readJson('./recorded/messages.json'));
const judged = judgedExamples(toleranceExamples, toleranceRecordings);

describe('recorded Jev answers', () => {
  it('all come from the pinned model', () => {
    const models = new Set(
      [...toleranceRecordings, ...messageRecordings].map((r) => r.response.model),
    );
    expect([...models]).toEqual([JEV_MODEL]);
  });

  it('cover every example with the request the code builds today', () => {
    const recorded = new Map(
      [...toleranceRecordings, ...messageRecordings].map((r) => [r.id, r.request]),
    );
    for (const example of toleranceExamples) {
      expect(recorded.get(example.id), example.id).toEqual(toleranceExampleRequest(example));
    }
    for (const example of messageExamples) {
      expect(recorded.get(example.id), example.id).toEqual(messageExampleRequest(example));
    }
  });
});

describe('the tolerance guard on recorded answers', () => {
  const jev = recordedJev(toleranceRecordings);

  async function blocks(id: string): Promise<boolean> {
    const example = toleranceExamples.find((candidate) => candidate.id === id);
    if (!example) throw new Error(`no example ${id}`);
    return (await blockingTolerances([example.change], jev)).length > 0;
  }

  it.each(judged.filter((item) => item.mustBlock).map((item) => item.example.id))(
    'blocks the loosening %s',
    async (id) => {
      expect(await blocks(id)).toBe(true);
    },
  );

  it.each(
    toleranceExamples
      .filter(
        ({ expectedKind, change }) =>
          isToleranceKind(expectedKind) && directionOf(expectedKind, change) === 'tighter',
      )
      .map((example) => example.id),
  )('lets the tightening %s through', async (id) => {
    expect(await blocks(id)).toBe(false);
  });

  it.each(
    judged
      .filter(
        ({ judgement }) =>
          judgement?.kind === 'not-a-tolerance' &&
          judgement.confidence >= NOT_A_TOLERANCE_MIN_CONFIDENCE,
      )
      .map((item) => item.example.id),
  )('lets %s through when Jev is sure it is not a tolerance', async (id) => {
    expect(await blocks(id)).toBe(false);
  });

  it('uses a cutoff that misses no loosening in the examples', () => {
    expect(cutoffOutcome(judged, NOT_A_TOLERANCE_MIN_CONFIDENCE).missedLoosenings).toBe(0);
  });
});

const MESSAGE_DATA = { examples: messageExamples, recordings: messageRecordings };
const functionalAgreement = messageAgreement(MESSAGE_DATA, 'functionalOnly');
const englishAgreement = messageAgreement(MESSAGE_DATA, 'plainEnglish');

describe(`the message check on recorded answers (functionalOnly ${functionalAgreement.agreed}/${functionalAgreement.total}, plainEnglish ${englishAgreement.agreed}/${englishAgreement.total} agree with the labels)`, () => {
  const jev = recordedJev(messageRecordings);

  async function problemsFor(example: MessageExample): Promise<string[]> {
    const input =
      example.kind === 'commit'
        ? { commits: [{ sha: '0000000', message: example.text }], prBody: null }
        : { commits: [], prBody: example.text };
    const review = await reviewMessages(input, jev);
    return review.findings.map((finding) => finding.problem);
  }

  it.each(
    messageExamples
      .filter((example) => example.expected.functionalOnly === false)
      .map((example) => [example.id, example] as const),
  )('flags the process talk in %s', async (_id, example) => {
    const problems = await problemsFor(example);
    expect(
      problems.some(
        (problem) => problem.startsWith('talks about') || problem.startsWith('ends with trailers'),
      ),
    ).toBe(true);
  });
});
