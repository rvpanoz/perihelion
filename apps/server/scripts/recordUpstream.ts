import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  DEFAULT_CLOSE_APPROACH_DAYS,
  DEFAULT_CME_DAYS,
  type UpstreamQuery,
  cadQuery,
  closeApproachWindow,
  cmeWindow,
  donkiCmeQuery,
  jplColumnarResponseSchema,
  sbdbNeoQuery,
  sbdbObjectQuery,
  toCloseApproaches,
  toNeoCatalog,
} from '@perihelion/data';
import {
  SBDB_NOT_FOUND_DESIGNATION,
  SBDB_OBJECT_LOOKUPS_FILE,
  type UpstreamManifestEntry,
  upstreamManifestSchema,
} from '@perihelion/fixtures/upstream-manifest';
import { redactedUrl, upstreamUrl } from '../src/upstream/upstreamUrl.js';

// Recordings are test ground truth (CONTRIBUTING.md non-negotiable 3): regenerate with this script, never edit.
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

/** Named so one upstream can be re-recorded while another is down (DONKI moved in 2026-10, #85). */
const RECORDING_GROUPS = ['sbdb-neo', 'cad', 'donki', 'sbdb-object'] as const;
type RecordingGroup = (typeof RECORDING_GROUPS)[number];

interface Recording {
  group: RecordingGroup;
  fileName: string;
  query: UpstreamQuery;
  gzip: boolean;
}

interface RecordedBody {
  fileName: string;
  gzip: boolean;
  text: string;
  manifestEntry: UpstreamManifestEntry;
}

interface FetchedText {
  status: number;
  text: string;
}

function withParams(query: UpstreamQuery, extra: Record<string, string>): UpstreamQuery {
  return { ...query, params: { ...query.params, ...extra } };
}

function plannedRecordings(nowMs: number): Recording[] {
  const futureDay = cmeWindow(nowMs + EMPTY_CME_LEAD_DAYS * DAY_MS, 0);
  const emptyCad = withParams(cadQuery(EMPTY_CAD_WINDOW), {
    'dist-max': EMPTY_CAD_MAX_DISTANCE_AU,
  });
  return [
    {
      group: 'sbdb-neo',
      fileName: 'sbdb-neo-sample.json',
      query: withParams(sbdbNeoQuery(), { limit: SAMPLE_ROW_LIMIT }),
      gzip: false,
    },
    { group: 'sbdb-neo', fileName: 'sbdb-neo-full.json.gz', query: sbdbNeoQuery(), gzip: true },
    {
      group: 'cad',
      fileName: 'cad-window.json',
      query: cadQuery(closeApproachWindow(nowMs, DEFAULT_CLOSE_APPROACH_DAYS)),
      gzip: false,
    },
    { group: 'cad', fileName: 'cad-empty.json', query: emptyCad, gzip: false },
    {
      group: 'donki',
      fileName: 'donki-cme-window.json',
      query: donkiCmeQuery(cmeWindow(nowMs, DEFAULT_CME_DAYS)),
      gzip: false,
    },
    {
      group: 'donki',
      fileName: 'donki-cme-empty.json',
      query: donkiCmeQuery(futureDay),
      gzip: false,
    },
  ];
}

/** No names records everything; an unknown name is a typo, not a request for nothing. */
function selectedGroups(names: readonly string[]): readonly RecordingGroup[] {
  if (names.length === 0) return RECORDING_GROUPS;
  return names.map((name) => {
    const group = RECORDING_GROUPS.find((known) => known === name);
    if (group === undefined)
      throw new Error(`Unknown recording "${name}": ${RECORDING_GROUPS.join(', ')}`);
    return group;
  });
}

async function fetchJsonText(url: URL): Promise<FetchedText> {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${redactedUrl(url)}`);
  // A body that is not JSON (an empty DONKI answer, an HTML error page) must be looked at, not recorded.
  JSON.parse(text);
  await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_REQUESTS_MS));
  return { status: response.status, text };
}

async function record(recording: Recording, recordedAt: string): Promise<RecordedBody> {
  const url = upstreamUrl(recording.query);
  const { status, text } = await fetchJsonText(url);
  const manifestEntry = { recordedAt, status, url: redactedUrl(url) };
  return { fileName: recording.fileName, gzip: recording.gzip, text, manifestEntry };
}

/**
 * One lookup per CAD row the catalog lacks, plus the first row (so the lookup path is covered even when nothing
 * is missing) and a designation SBDB cannot know (the "not found" path).
 */
async function recordLookups(
  bodies: readonly RecordedBody[],
  recordedAt: string,
): Promise<RecordedBody> {
  const designations = lookupDesignations({
    cadText: await recordedText(bodies, 'cad-window.json'),
    catalogText: await recordedText(bodies, 'sbdb-neo-full.json.gz'),
  });
  const answers: Record<string, unknown> = {};
  const urls: string[] = [];
  for (const designation of designations) {
    const url = upstreamUrl(sbdbObjectQuery(designation));
    answers[designation] = JSON.parse((await fetchJsonText(url)).text);
    urls.push(redactedUrl(url));
  }
  const text = `${JSON.stringify(answers, null, 2)}\n`;
  return {
    fileName: SBDB_OBJECT_LOOKUPS_FILE,
    gzip: false,
    text,
    manifestEntry: { recordedAt, status: 200, urls },
  };
}

function lookupDesignations({
  cadText,
  catalogText,
}: {
  cadText: string;
  catalogText: string;
}): string[] {
  const approaches = toCloseApproaches(jplColumnarResponseSchema.parse(JSON.parse(cadText)));
  const catalog = toNeoCatalog(jplColumnarResponseSchema.parse(JSON.parse(catalogText)));
  const known = new Set(catalog.designation);
  const misses = approaches
    .map((a) => a.designation)
    .filter((designation) => !known.has(designation));
  const first = approaches.slice(0, 1).map((approach) => approach.designation);
  return [...new Set([...first, ...misses, SBDB_NOT_FOUND_DESIGNATION])];
}

/** This run's body if it re-recorded the file, else the committed one, so lookups match the CAD on disk. */
async function recordedText(bodies: readonly RecordedBody[], fileName: string): Promise<string> {
  const fresh = bodies.find((body) => body.fileName === fileName);
  if (fresh !== undefined) return fresh.text;
  const bytes = await readFile(new URL(fileName, RECORDINGS_DIR));
  return (fileName.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8');
}

async function writeRecording(body: RecordedBody): Promise<void> {
  const target = new URL(body.fileName, RECORDINGS_DIR);
  await writeFile(target, body.gzip ? gzipSync(body.text) : body.text);
  console.log(`wrote ${fileURLToPath(target)}`);
}

/** Entries this run did not re-record are kept, each with the time it was recorded. */
async function updatedManifest(bodies: readonly RecordedBody[]): Promise<string> {
  const files = await committedManifestFiles();
  for (const body of bodies) files[body.fileName] = body.manifestEntry;
  return `${JSON.stringify({ files }, null, 2)}\n`;
}

/** Older manifests carried one top-level `recordedAt`; it moves onto each of their entries. */
async function committedManifestFiles(): Promise<Record<string, UpstreamManifestEntry>> {
  const text = await readFile(new URL('manifest.json', RECORDINGS_DIR), 'utf8').catch(
    () => '{"files":{}}',
  );
  const { recordedAt, files } = upstreamManifestSchema.parse(JSON.parse(text));
  return Object.fromEntries(
    Object.entries(files).map(([name, entry]) => [name, { recordedAt, ...entry }]),
  );
}

async function recordGroups(groups: readonly RecordingGroup[]): Promise<RecordedBody[]> {
  const nowMs = Date.now();
  const recordedAt = new Date(nowMs).toISOString();
  const bodies: RecordedBody[] = [];
  for (const recording of plannedRecordings(nowMs)) {
    if (groups.includes(recording.group)) bodies.push(await record(recording, recordedAt));
  }
  if (groups.includes('sbdb-object')) bodies.push(await recordLookups(bodies, recordedAt));
  return bodies;
}

/** Everything is fetched before anything is written, so a failure never leaves a mixed set. */
async function main(): Promise<void> {
  const bodies = await recordGroups(selectedGroups(process.argv.slice(2)));
  const manifest = await updatedManifest(bodies);
  await mkdir(RECORDINGS_DIR, { recursive: true });
  for (const body of bodies) await writeRecording(body);
  await writeFile(new URL('manifest.json', RECORDINGS_DIR), manifest);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
