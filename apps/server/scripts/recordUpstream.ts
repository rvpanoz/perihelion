import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  DEFAULT_CLOSE_APPROACH_DAYS,
  DEFAULT_CME_DAYS,
  type UpstreamQuery,
  cadQuery,
  closeApproachWindow,
  cmeWindow,
  donkiCmeQuery,
  sbdbNeoQuery,
} from '@perihelion/data';
import { redactedUrl, upstreamUrl } from '../src/upstream/upstreamUrl.js';

// Recordings are test ground truth (CLAUDE.md non-negotiable 3): regenerate with this script, never edit.
const RECORDINGS_DIR = new URL('../../../packages/fixtures/upstream/', import.meta.url);
// JPL and NASA ask API users for one request at a time; a pause keeps us well inside that.
const PAUSE_BETWEEN_REQUESTS_MS = 1_000;
const SAMPLE_ROW_LIMIT = '25';
const DAY_MS = 86_400_000;
// A day long ago with a ~1,500 km cut-off: a real CAD query certain to match nothing.
const EMPTY_CAD_WINDOW = { startDate: '2000-01-01', endDate: '2000-01-02' };
const EMPTY_CAD_MAX_DISTANCE_AU = '0.00001';
// DONKI cannot list CMEs that have not happened, so a day this far ahead is certain to be empty.
const EMPTY_CME_LEAD_DAYS = 30;

interface Recording {
  fileName: string;
  query: UpstreamQuery;
  gzip: boolean;
}

interface RecordedBody extends Recording {
  printedUrl: string;
  status: number;
  text: string;
}

function withParams(query: UpstreamQuery, extra: Record<string, string>): UpstreamQuery {
  return { ...query, params: { ...query.params, ...extra } };
}

function plannedRecordings(nowMs: number, apiKey: string): Recording[] {
  const futureDay = cmeWindow(nowMs + EMPTY_CME_LEAD_DAYS * DAY_MS, 0);
  const emptyCad = withParams(cadQuery(EMPTY_CAD_WINDOW), {
    'dist-max': EMPTY_CAD_MAX_DISTANCE_AU,
  });
  return [
    {
      fileName: 'sbdb-neo-sample.json',
      query: withParams(sbdbNeoQuery(), { limit: SAMPLE_ROW_LIMIT }),
      gzip: false,
    },
    { fileName: 'sbdb-neo-full.json.gz', query: sbdbNeoQuery(), gzip: true },
    {
      fileName: 'cad-window.json',
      query: cadQuery(closeApproachWindow(nowMs, DEFAULT_CLOSE_APPROACH_DAYS)),
      gzip: false,
    },
    { fileName: 'cad-empty.json', query: emptyCad, gzip: false },
    {
      fileName: 'donki-cme-window.json',
      query: donkiCmeQuery(cmeWindow(nowMs, DEFAULT_CME_DAYS), apiKey),
      gzip: false,
    },
    { fileName: 'donki-cme-empty.json', query: donkiCmeQuery(futureDay, apiKey), gzip: false },
  ];
}

async function record(recording: Recording): Promise<RecordedBody> {
  const url = upstreamUrl(recording.query);
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${redactedUrl(url)}`);
  // A body that is not JSON (an empty DONKI answer, an HTML error page) must be looked at, not recorded.
  JSON.parse(text);
  await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_REQUESTS_MS));
  return { ...recording, printedUrl: redactedUrl(url), status: response.status, text };
}

async function writeRecording(body: RecordedBody): Promise<void> {
  const target = new URL(body.fileName, RECORDINGS_DIR);
  await writeFile(target, body.gzip ? gzipSync(body.text) : body.text);
  console.log(`wrote ${fileURLToPath(target)}`);
}

function manifest(recordedAt: string, bodies: readonly RecordedBody[]): string {
  const files = Object.fromEntries(
    bodies.map((body) => [body.fileName, { url: body.printedUrl, status: body.status }]),
  );
  return `${JSON.stringify({ recordedAt, files }, null, 2)}\n`;
}

/** Everything is fetched before anything is written, so a failure never leaves a mixed set. */
async function main(): Promise<void> {
  const apiKey = process.env['NASA_API_KEY'] || 'DEMO_KEY';
  const nowMs = Date.now();
  const bodies: RecordedBody[] = [];
  for (const recording of plannedRecordings(nowMs, apiKey)) bodies.push(await record(recording));
  await mkdir(RECORDINGS_DIR, { recursive: true });
  for (const body of bodies) await writeRecording(body);
  await writeFile(
    new URL('manifest.json', RECORDINGS_DIR),
    manifest(new Date(nowMs).toISOString(), bodies),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
