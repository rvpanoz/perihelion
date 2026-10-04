import { readFile, writeFile } from 'node:fs/promises';
import { type Recording, messageExamplesSchema, toleranceExamplesSchema } from '../src/examples.js';
import { messageExampleRequest, toleranceExampleRequest } from '../src/exampleRequests.js';
import { type JevClient, type JevRequest, createJevClient } from '../src/typesafe/jevClient.js';

// Recordings are test ground truth (CONTRIBUTING.md non-negotiable 3): regenerate with this script, never edit.
// Dev only, uses the network and TYPESAFE_API_KEY from ../../.env; commit the result with the user's approval.
const EXAMPLES_DIR = new URL('../examples/', import.meta.url);
const RECORDED_DIR = new URL('../src/recorded/', import.meta.url);
// Far inside TypeSafe's published limits; recordings are rare, so being gentle costs nothing.
const PAUSE_BETWEEN_REQUESTS_MS = 1_000;
const TIMEOUT_MS = 30_000;

interface PlannedRequest {
  id: string;
  request: JevRequest;
}

async function readExamples<T>(fileName: string, parse: (value: unknown) => T): Promise<T> {
  return parse(JSON.parse(await readFile(new URL(fileName, EXAMPLES_DIR), 'utf8')));
}

async function plannedRequests(): Promise<Record<string, PlannedRequest[]>> {
  const tolerances = await readExamples('tolerances.json', (v) => toleranceExamplesSchema.parse(v));
  const messages = await readExamples('messages.json', (v) => messageExamplesSchema.parse(v));
  return {
    'tolerances.json': tolerances.map((e) => ({ id: e.id, request: toleranceExampleRequest(e) })),
    'messages.json': messages.map((e) => ({ id: e.id, request: messageExampleRequest(e) })),
  };
}

/** One at a time and all or nothing: a partial recording would make the cutoff meaningless. */
async function record(planned: readonly PlannedRequest[], jev: JevClient): Promise<Recording[]> {
  const recordings: Recording[] = [];
  for (const { id, request } of planned) {
    const result = await jev.ask(request);
    if (!result.ok) throw new Error(`${id}: ${result.reason}`);
    recordings.push({ id, request, response: result.response });
    await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_REQUESTS_MS));
  }
  return recordings;
}

async function main(): Promise<void> {
  const jev = createJevClient({
    apiKey: process.env.TYPESAFE_API_KEY,
    fetchImpl: fetch,
    timeoutMs: TIMEOUT_MS,
  });
  for (const [fileName, planned] of Object.entries(await plannedRequests())) {
    const recordings = await record(planned, jev);
    const inputTokens = recordings.reduce((sum, r) => sum + r.response.usage.input_tokens, 0);
    await writeFile(new URL(fileName, RECORDED_DIR), `${JSON.stringify(recordings, null, 2)}\n`);
    console.log(`${fileName}: ${recordings.length} recordings, ${inputTokens} input tokens`);
  }
}

await main();
