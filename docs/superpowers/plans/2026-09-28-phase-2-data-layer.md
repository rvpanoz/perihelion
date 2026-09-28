# Phase 2: Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve normalized NEO, close-approach and CME data from `apps/server` with a SQLite cache, scheduled
refresh and a bundled snapshot fallback, so the web app keeps working when NASA/JPL is slow, rate-limited or gone.

**Architecture:** `packages/data` owns the upstream query definitions, the zod schemas for raw upstream bodies,
the normalizers, and the normalized API types shared with the web app. `apps/server` fetches through one small
`HttpClient` seam (gated to one request at a time per host), stores normalized JSON in `node:sqlite`, and serves
it fresh, stale-while-revalidate, or from the committed snapshot in `apps/web/public/snapshot/`. Tests run
against responses recorded by a dev-only script into `packages/fixtures/upstream/`.

**Tech Stack:** TypeScript 6 (strict, ESM), zod 4, Fastify 5 + `@fastify/compress`, `node:sqlite` (Node 24),
esbuild (server bundle), Vitest 5.

**Spec:** `PLAN.md` § Phase 2, plus decisions made while planning (2026-09-28):

- `/api/neos` is **columnar JSON with rounded values**; the ≤ 2 MB gzipped limit is proven by a test that
  runs a **committed, gzipped full SBDB recording** through the real route.
- Cache driver is **`node:sqlite`** (no dependency, no native build).
- The server is **bundled with esbuild**; npm dependencies stay external (settles the Phase 0 deferral).
- GitHub milestone and issues are created **after** this plan is approved (Task 0).

## Global Constraints

- No AI/LLM calls anywhere in shipped code.
- Tests never touch the network. Only `npm run record` and `npm run snapshot` do (dev only; commit the result).
- Recordings in `packages/fixtures/upstream/` and the snapshot in `apps/web/public/snapshot/` are ground truth:
  never edit them by hand; regenerate. Never loosen `NEO_PAYLOAD_BUDGET_BYTES` (2,000,000) to pass a test.
- The web app never calls NASA/JPL; it calls `/api/*` and falls back to `/snapshot/*.json`.
- `NASA_API_KEY` comes from the environment only and must never reach logs, error messages, recordings,
  snapshots or commits. Use `redactedUrl()` whenever a URL is printed.
- `packages/data` stays DOM- and Node-free (its tsconfig is `lib: ES2023`, `types: []`).
- Node ≥ 24 (`engines`, `.nvmrc`); `node:sqlite` needs it.
- TypeScript strict, ESM, no `any`, units in names (`distanceAu`, `speedKmPerS`, `epochJdTdb`, `…Deg`).
  Degrees are fine here: API payloads are an I/O boundary.
- Functions < 20 lines, ≤ 2 arguments (wrap 3+ in an object), `try/catch` isolated in its own function.
- **Guardrails (CLAUDE.md):** if a command fails unexpectedly, stop, show the output, and hand back. "Run it to
  see it fail" steps are expected failures; anything else is not. No full-file rewrites of existing files.
- **Per-task workflow:** branch `phase-2/<name>` off an up-to-date `main` (if the previous task's PR is not merged
  yet, branch off that branch and say so in the PR). Finish with `npm run format && npm run check` green, tick the
  item in `PROGRESS.md` and add the listed decisions, commit (functional description only, no trailers), push,
  `gh pr create --assignee @me --milestone "Phase 2: Data layer" --label <labels>` with `Closes #N` in a
  plain-English body, add the PR to project 1 and set the issue to In Progress. The user merges.

## Review Focus

1. **A hanging upstream** (connection accepted, no answer): a cold-cache request must not wait the full timeout on
   every call. After one failure the key is backed off for 60 s and the snapshot is served at once (Task 5).
2. **`NASA_API_KEY` leaks** into error messages, logs or recordings: every printed URL is redacted (Tasks 1, 2, 4).
3. **Empty upstream windows**: CAD `count: "0"` with no `fields`/`data`, DONKI `[]` or an empty body, must give
   `200` with `[]`, never a 500 (Tasks 3, 4).
4. **Malformed `days`**: `0`, `61`, `2.5`, `abc`, empty, or repeated (`?days=1&days=2`) gives 400, and cache keys
   stay bounded (1–60) (Tasks 3, 6).
5. **SBDB format drift**: a renamed column, or most rows unusable, must fail loudly (and fall back) instead of
   producing an empty or column-shifted catalog (Task 3).

---

### Task 0: Tracking setup (after plan approval)

**Files:**

- Modify: `PROGRESS.md` (Phase 2 checklist, status)

- [ ] **Step 1: Replace the Phase 2 checklist in `PROGRESS.md`** (one line per task below, so one issue each):

```markdown
## Phase 2: Data layer

- [ ] Upstream query definitions + esbuild server bundle
- [ ] Recorded upstream responses (SBDB, CAD, DONKI) + `npm run record`
- [ ] zod schemas + normalizers (SBDB, CAD, DONKI) and API types
- [ ] Upstream HTTP client with per-host rate limiting
- [ ] SQLite cache + stale-while-revalidate + scheduled refresh
- [ ] `/api/neos`, `/api/close-approaches`, `/api/cmes` with recorded-response tests
- [ ] Bundled snapshot + offline fallback verified
```

Also set `**Current phase:** Phase 2: Data layer (in progress)` and the status table row to `🟨 In progress`.

- [ ] **Step 2: Create the milestone**

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
gh api "repos/$REPO/milestones" -f title='Phase 2: Data layer' \
  -f description='Normalized NEO, close-approach and CME data behind a caching server with snapshot fallback.'
```

- [ ] **Step 3: Create one issue per checklist item** and add each to the board:

| Title                                                                 | Labels                                                          |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| Upstream query definitions + esbuild server bundle                    | `type:feature`,`phase:2`,`area:data`,`area:server`,`area:infra` |
| Recorded upstream responses (SBDB, CAD, DONKI) + `npm run record`     | `type:test`,`phase:2`,`area:fixtures`,`area:server`             |
| zod schemas + normalizers (SBDB, CAD, DONKI) and API types            | `type:feature`,`phase:2`,`area:data`                            |
| Upstream HTTP client with per-host rate limiting                      | `type:feature`,`phase:2`,`area:server`                          |
| SQLite cache + stale-while-revalidate + scheduled refresh             | `type:feature`,`phase:2`,`area:server`                          |
| `/api/neos`, `/api/close-approaches`, `/api/cmes` with recorded tests | `type:feature`,`phase:2`,`area:server`,`area:data`              |
| Bundled snapshot + offline fallback verified                          | `type:feature`,`phase:2`,`area:server`,`area:web`               |

```bash
URL=$(gh issue create --title "<title>" --body "<one-paragraph scope from this plan>" \
  --label "<labels>" --milestone "Phase 2: Data layer")
gh project item-add 1 --owner rvpanoz --url "$URL"
```

Set each item's Status to Todo (`gh project field-list 1 --owner rvpanoz --format json` gives the field and
option ids for `gh project item-edit`).

- [ ] **Step 4: Commit the plan and PROGRESS on `phase-2/plan`, open a `type:docs` PR** (`phase:2`, `area:infra`).

```bash
git add docs/superpowers/plans/2026-09-28-phase-2-data-layer.md PROGRESS.md
git commit -m "Add the Phase 2 data layer plan and expand its checklist"
git push -u origin phase-2/plan
```

---

### Task 1: Upstream query definitions + esbuild server bundle

Branch: `phase-2/upstream-queries`

**Files:**

- Create: `packages/data/src/upstream/queries.ts`, `packages/data/src/upstream/queries.test.ts`
- Modify: `packages/data/src/index.ts`
- Create: `apps/server/src/upstream/upstreamUrl.ts`, `apps/server/src/upstream/upstreamUrl.test.ts`
- Create: `apps/server/scripts/build.mjs`
- Modify: `apps/server/package.json`, `apps/server/tsconfig.json`
- Delete: `apps/server/tsconfig.build.json`

**Interfaces:**

- Produces (data): `UpstreamQuery { baseUrl: string; params: Readonly<Record<string,string>> }`,
  `DateWindow { startDate: string; endDate: string }` (UTC `YYYY-MM-DD`), `SBDB_NEO_FIELDS`, `SbdbNeoField`,
  `sbdbNeoQuery()`, `cadQuery(window)`, `donkiCmeQuery(window, apiKey)`, `closeApproachWindow(nowMs, days)`,
  `cmeWindow(nowMs, days)`, `DEFAULT_CLOSE_APPROACH_DAYS = 7`, `DEFAULT_CME_DAYS = 30`.
- Produces (server): `upstreamUrl(query: UpstreamQuery): URL`, `redactedUrl(url: URL): string`.

- [ ] **Step 1: Write the failing data test** `packages/data/src/upstream/queries.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  SBDB_NEO_FIELDS,
  cadQuery,
  closeApproachWindow,
  cmeWindow,
  donkiCmeQuery,
  sbdbNeoQuery,
} from './queries';

const NOW_MS = Date.UTC(2026, 8, 28, 23, 59);

describe('sbdbNeoQuery', () => {
  it('asks for near-Earth asteroids at full precision with the fields the normalizer reads', () => {
    const { baseUrl, params } = sbdbNeoQuery();
    expect(baseUrl).toBe('https://ssd-api.jpl.nasa.gov/sbdb_query.api');
    expect(params).toEqual({
      fields: SBDB_NEO_FIELDS.join(','),
      'sb-group': 'neo',
      'sb-kind': 'a',
      'full-prec': 'true',
    });
  });
});

describe('cadQuery', () => {
  it('pins the distance cut-off and asks for full names over the window', () => {
    const { baseUrl, params } = cadQuery({ startDate: '2026-09-21', endDate: '2026-10-05' });
    expect(baseUrl).toBe('https://ssd-api.jpl.nasa.gov/cad.api');
    expect(params).toEqual({
      'date-min': '2026-09-21',
      'date-max': '2026-10-05',
      'dist-max': '0.05',
      fullname: 'true',
    });
  });
});

describe('donkiCmeQuery', () => {
  it('passes the window and the API key', () => {
    const query = donkiCmeQuery({ startDate: '2026-08-29', endDate: '2026-09-28' }, 'KEY');
    expect(query.baseUrl).toBe('https://api.nasa.gov/DONKI/CME');
    expect(query.params).toEqual({
      startDate: '2026-08-29',
      endDate: '2026-09-28',
      api_key: 'KEY',
    });
  });
});

describe('date windows', () => {
  it('spans days either side of today (UTC) for close approaches', () => {
    expect(closeApproachWindow(NOW_MS, 7)).toEqual({
      startDate: '2026-09-21',
      endDate: '2026-10-05',
    });
  });

  it('crosses month and year boundaries', () => {
    expect(closeApproachWindow(Date.UTC(2026, 11, 30), 7)).toEqual({
      startDate: '2026-12-23',
      endDate: '2027-01-06',
    });
  });

  it('ends today for CMEs, which are only known after they happen', () => {
    expect(cmeWindow(NOW_MS, 30)).toEqual({ startDate: '2026-08-29', endDate: '2026-09-28' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run packages/data/src/upstream/queries.test.ts`
Expected: FAIL, cannot resolve `./queries`.

- [ ] **Step 3: Implement** `packages/data/src/upstream/queries.ts`

```ts
/** An upstream endpoint and the exact parameters we send it; the server and the recorder share these. */
export interface UpstreamQuery {
  baseUrl: string;
  params: Readonly<Record<string, string>>;
}

/** Inclusive UTC calendar dates, `YYYY-MM-DD`, as SBDB, CAD and DONKI all accept them. */
export interface DateWindow {
  startDate: string;
  endDate: string;
}

export const SBDB_QUERY_API_URL = 'https://ssd-api.jpl.nasa.gov/sbdb_query.api';
export const CAD_API_URL = 'https://ssd-api.jpl.nasa.gov/cad.api';
export const DONKI_CME_API_URL = 'https://api.nasa.gov/DONKI/CME';

/**
 * Designation, name, osculating elements (epoch as JD TDB, e, a in AU, i/Ω/ω/M in degrees),
 * absolute magnitude H and SBDB orbit class. https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html
 */
export const SBDB_NEO_FIELDS = [
  'pdes',
  'name',
  'epoch',
  'e',
  'a',
  'i',
  'om',
  'w',
  'ma',
  'H',
  'class',
] as const;
export type SbdbNeoField = (typeof SBDB_NEO_FIELDS)[number];

export const DEFAULT_CLOSE_APPROACH_DAYS = 7;
export const DEFAULT_CME_DAYS = 30;

/** CAD's documented default, sent explicitly so an upstream default change cannot alter the list. */
const CAD_MAX_DISTANCE_AU = '0.05';
const DAY_MS = 86_400_000;

// Asteroids only: comets are parked (PLAN.md) and the engine rejects e ≥ 1. `full-prec` stops SBDB
// rounding the elements for us; we round deliberately in the normalizer instead.
export function sbdbNeoQuery(): UpstreamQuery {
  return {
    baseUrl: SBDB_QUERY_API_URL,
    params: {
      fields: SBDB_NEO_FIELDS.join(','),
      'sb-group': 'neo',
      'sb-kind': 'a',
      'full-prec': 'true',
    },
  };
}

export function cadQuery(window: DateWindow): UpstreamQuery {
  return {
    baseUrl: CAD_API_URL,
    params: {
      'date-min': window.startDate,
      'date-max': window.endDate,
      'dist-max': CAD_MAX_DISTANCE_AU,
      fullname: 'true',
    },
  };
}

/** DONKI takes the key in the query string, so any printed URL must go through redaction. */
export function donkiCmeQuery(window: DateWindow, apiKey: string): UpstreamQuery {
  return {
    baseUrl: DONKI_CME_API_URL,
    params: { startDate: window.startDate, endDate: window.endDate, api_key: apiKey },
  };
}

/** Days either side of today, so an approach that has just happened can still be replayed. */
export function closeApproachWindow(nowMs: number, days: number): DateWindow {
  return { startDate: utcDate(nowMs - days * DAY_MS), endDate: utcDate(nowMs + days * DAY_MS) };
}

export function cmeWindow(nowMs: number, days: number): DateWindow {
  return { startDate: utcDate(nowMs - days * DAY_MS), endDate: utcDate(nowMs) };
}

function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
```

Append to `packages/data/src/index.ts`: `export * from './upstream/queries';`

- [ ] **Step 4: Run the data test to verify it passes**

Run: `npx vitest run packages/data/src/upstream/queries.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Switch the server to an esbuild bundle and Bundler resolution**

```bash
npm i -D esbuild -w @perihelion/server
npm i @perihelion/data@* -w @perihelion/server
git rm apps/server/tsconfig.build.json
```

`apps/server/tsconfig.json` becomes (esbuild compiles; `tsc` only typechecks, so the base's Bundler resolution
applies and workspace packages' extensionless imports typecheck):

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src", "scripts"]
}
```

In `apps/server/package.json` set `"build": "node scripts/build.mjs"`. Create `apps/server/scripts/build.mjs`:

```js
import { build } from 'esbuild';
import packageJson from '../package.json' with { type: 'json' };

// Workspace packages export TypeScript source, so they must be bundled; npm dependencies stay
// external and load from node_modules at runtime. `node:` built-ins are external on platform node.
const external = Object.keys(packageJson.dependencies).filter(
  (name) => !name.startsWith('@perihelion/'),
);

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: 'dist/main.js',
  external,
  sourcemap: true,
  logLevel: 'info',
});
```

- [ ] **Step 6: Write the failing server test** `apps/server/src/upstream/upstreamUrl.test.ts`

```ts
import { donkiCmeQuery } from '@perihelion/data';
import { describe, expect, it } from 'vitest';
import { redactedUrl, upstreamUrl } from './upstreamUrl.js';

const QUERY = donkiCmeQuery({ startDate: '2026-08-29', endDate: '2026-09-28' }, 'SECRET-KEY');

describe('upstreamUrl', () => {
  it('puts every query parameter on the base URL', () => {
    const url = upstreamUrl(QUERY);
    expect(url.origin + url.pathname).toBe('https://api.nasa.gov/DONKI/CME');
    expect(url.searchParams.get('startDate')).toBe('2026-08-29');
    expect(url.searchParams.get('api_key')).toBe('SECRET-KEY');
  });
});

describe('redactedUrl', () => {
  it('hides the API key and keeps everything else', () => {
    const printed = redactedUrl(upstreamUrl(QUERY));
    expect(printed).not.toContain('SECRET-KEY');
    expect(printed).toContain('api_key=REDACTED');
    expect(printed).toContain('endDate=2026-09-28');
  });

  it('leaves the original URL untouched', () => {
    const url = upstreamUrl(QUERY);
    redactedUrl(url);
    expect(url.searchParams.get('api_key')).toBe('SECRET-KEY');
  });
});
```

Run: `npx vitest run apps/server/src/upstream/upstreamUrl.test.ts` — Expected: FAIL, cannot resolve module.

- [ ] **Step 7: Implement** `apps/server/src/upstream/upstreamUrl.ts`

```ts
import type { UpstreamQuery } from '@perihelion/data';

export function upstreamUrl(query: UpstreamQuery): URL {
  const url = new URL(query.baseUrl);
  for (const [name, value] of Object.entries(query.params)) url.searchParams.set(name, value);
  return url;
}

/** Every URL we print goes through here: DONKI's key rides in the query string (CLAUDE.md #6). */
export function redactedUrl(url: URL): string {
  const copy = new URL(url);
  if (copy.searchParams.has('api_key')) copy.searchParams.set('api_key', 'REDACTED');
  return copy.toString();
}
```

Run the test again — Expected: PASS (3 tests).

- [ ] **Step 8: Smoke-test the bundle**

```bash
npm run build -w @perihelion/server
(cd apps/server && PORT=8799 node dist/main.js & echo $! > /tmp/perihelion-server.pid)
curl -s localhost:8799/health   # expect {"status":"ok"}
kill "$(cat /tmp/perihelion-server.pid)"
```

- [ ] **Step 9: Finish** per the Global Constraints workflow. PROGRESS decisions to add:
  - Server is bundled by esbuild (`apps/server/scripts/build.mjs`); workspace packages are bundled, npm
    dependencies stay external. `tsc` only typechecks the server, with Bundler resolution. (Settles the Phase 0
    "bundle vs. emit" question.)
  - Upstream queries live in `packages/data` so the server and the recorder send identical requests. SBDB is
    asked for asteroids only (`sb-kind=a`) at full precision; CAD's `dist-max=0.05` is pinned explicitly.
  - Close-approach window is today ± `days` (a just-passed approach stays replayable); CME window is the last
    `days` days.

Commit: `git commit -m "Add upstream query definitions and bundle the server with esbuild"`

---

### Task 2: Recorded upstream responses + `npm run record`

Branch: `phase-2/upstream-recordings`

**Files:**

- Create: `apps/server/scripts/recordUpstream.ts`
- Create (generated, committed): `packages/fixtures/upstream/{sbdb-neo-sample.json, sbdb-neo-full.json.gz,
cad-window.json, cad-empty.json, donki-cme-window.json, donki-cme-empty.json, manifest.json}`
- Create: `packages/fixtures/src/upstream.ts`, `packages/fixtures/src/upstream.test.ts`
- Create: `packages/fixtures/src/upstreamFull.ts`, `packages/fixtures/src/upstreamFull.test.ts`
- Modify: `packages/fixtures/package.json` (exports), `apps/server/package.json`, root `package.json`,
  `.prettierignore`, `CLAUDE.md` (Commands)

**Interfaces:**

- Consumes: `sbdbNeoQuery`, `cadQuery`, `donkiCmeQuery`, `closeApproachWindow`, `cmeWindow`, defaults (Task 1);
  `upstreamUrl`, `redactedUrl` (Task 1).
- Produces: `@perihelion/fixtures/upstream` exporting `RECORDED_SBDB_NEO_SAMPLE`, `RECORDED_CAD_WINDOW`,
  `RECORDED_CAD_EMPTY`, `RECORDED_DONKI_CME_WINDOW`, `RECORDED_DONKI_CME_EMPTY`, `RECORDED_UPSTREAM_MANIFEST`
  (all `unknown`); `@perihelion/fixtures/upstream-full` exporting `loadFullSbdbNeoResponse(): unknown` (Node only).

- [ ] **Step 1: Write the recorder** `apps/server/scripts/recordUpstream.ts`

```ts
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
```

Scripts: in `apps/server/package.json` add
`"record": "tsx --env-file-if-exists=../../.env scripts/recordUpstream.ts"`; in the root `package.json` add
`"record": "npm run record --workspace @perihelion/server"`. Add `packages/fixtures/upstream/` under the
"Ground truth" block of `.prettierignore`. In `CLAUDE.md` Commands add:
`npm run record    # re-record upstream API responses for server tests (network; dev only; commit the result)`.

- [ ] **Step 2: Record (network, dev only)**

Run: `npm run record`
Expected: seven `wrote …` lines. If any request fails or a body is not JSON, **stop and report** the output
(e.g. DONKI answering an empty window with an empty body); do not work around it.

- [ ] **Step 3: Check the recordings for secrets and ignore rules**

```bash
[ -n "$NASA_API_KEY" ] && grep -rl "$NASA_API_KEY" packages/fixtures/upstream && echo "KEY LEAKED"
git check-ignore -v packages/fixtures/upstream/*   # expect no output
ls -l packages/fixtures/upstream                   # expect sbdb-neo-full.json.gz roughly 1–3 MB
```

Expected: no `KEY LEAKED`, no ignore matches. Stop and report otherwise.

- [ ] **Step 4: Write the failing loader tests** `packages/fixtures/src/upstream.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  RECORDED_CAD_EMPTY,
  RECORDED_DONKI_CME_EMPTY,
  RECORDED_SBDB_NEO_SAMPLE,
  RECORDED_UPSTREAM_MANIFEST,
} from './upstream';

const manifestSchema = z.object({
  recordedAt: z.iso.datetime(),
  files: z.record(z.string(), z.object({ url: z.url(), status: z.literal(200) })),
});

describe('recorded upstream responses', () => {
  it('include an SBDB sample carrying the requested element fields', () => {
    expect(RECORDED_SBDB_NEO_SAMPLE).toMatchObject({
      fields: expect.arrayContaining(['pdes', 'epoch', 'e', 'a', 'i', 'om', 'w', 'ma', 'class']),
    });
  });

  it('include a CAD answer with no matches', () => {
    expect(z.object({ count: z.coerce.number() }).parse(RECORDED_CAD_EMPTY).count).toBe(0);
  });

  it('include an empty DONKI window', () => {
    expect(RECORDED_DONKI_CME_EMPTY).toEqual([]);
  });

  it('list every recording in the manifest without an API key', () => {
    const { files } = manifestSchema.parse(RECORDED_UPSTREAM_MANIFEST);
    expect(Object.keys(files)).toHaveLength(6);
    for (const { url } of Object.values(files)) {
      expect(new URL(url).searchParams.get('api_key') ?? 'REDACTED').toBe('REDACTED');
    }
  });
});
```

And `packages/fixtures/src/upstreamFull.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loadFullSbdbNeoResponse } from './upstreamFull';

describe('loadFullSbdbNeoResponse', () => {
  it('returns the whole near-Earth asteroid catalogue', () => {
    const { data } = z.object({ data: z.array(z.unknown()) }).parse(loadFullSbdbNeoResponse());
    // Sanity floor, not a tolerance: ~40k NEAs were known when Phase 2 was planned.
    expect(data.length).toBeGreaterThan(30_000);
  });
});
```

Run: `npx vitest run packages/fixtures/src/upstream` — Expected: FAIL, modules not found.

- [ ] **Step 5: Implement the loaders**

`packages/fixtures/src/upstream.ts`:

```ts
// Raw upstream bodies recorded by `npm run record` (apps/server/scripts/recordUpstream.ts).
// Typed as unknown on purpose: consumers must validate them exactly as the server validates live data.
import cadEmpty from '../upstream/cad-empty.json' with { type: 'json' };
import cadWindow from '../upstream/cad-window.json' with { type: 'json' };
import donkiCmeEmpty from '../upstream/donki-cme-empty.json' with { type: 'json' };
import donkiCmeWindow from '../upstream/donki-cme-window.json' with { type: 'json' };
import manifest from '../upstream/manifest.json' with { type: 'json' };
import sbdbNeoSample from '../upstream/sbdb-neo-sample.json' with { type: 'json' };

export const RECORDED_SBDB_NEO_SAMPLE: unknown = sbdbNeoSample;
export const RECORDED_CAD_WINDOW: unknown = cadWindow;
export const RECORDED_CAD_EMPTY: unknown = cadEmpty;
export const RECORDED_DONKI_CME_WINDOW: unknown = donkiCmeWindow;
export const RECORDED_DONKI_CME_EMPTY: unknown = donkiCmeEmpty;
export const RECORDED_UPSTREAM_MANIFEST: unknown = manifest;
```

`packages/fixtures/src/upstreamFull.ts`:

```ts
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

// Kept out of ./upstream: that entry must stay Node-free for packages/data's tests to typecheck.
const FULL_SBDB_NEO_RECORDING = new URL('../upstream/sbdb-neo-full.json.gz', import.meta.url);

/** The whole NEO catalogue as SBDB sent it (~40k rows); only the payload-budget test needs it. */
export function loadFullSbdbNeoResponse(): unknown {
  return JSON.parse(gunzipSync(readFileSync(FULL_SBDB_NEO_RECORDING)).toString('utf8'));
}
```

Add to `packages/fixtures/package.json` `exports`:
`"./upstream": "./src/upstream.ts", "./upstream-full": "./src/upstreamFull.ts"`.

Run: `npx vitest run packages/fixtures/src/upstream` — Expected: PASS (5 tests). If `donki-cme-empty.json` is not
`[]` or the CAD empty count is not 0, **stop and report**: the recording is the truth, the test's assumption is
what needs discussing.

- [ ] **Step 6: Finish** per the workflow. PROGRESS decisions to add:
  - Upstream recordings live in `packages/fixtures/upstream/` (Prettier-ignored), written by `npm run record` with a
    `manifest.json` (redacted URLs, status, `recordedAt`). The full SBDB NEO answer is committed gzipped for the
    payload-budget test; everything else is small.
  - Loaders return `unknown`; `@perihelion/fixtures/upstream` is environment-free, `/upstream-full` needs Node.

Commit: `git commit -m "Record SBDB, CAD and DONKI responses for offline server tests"`

---

### Task 3: zod schemas + normalizers (SBDB, CAD, DONKI) and API types

Branch: `phase-2/data-schemas`

**Files (all under `packages/data/`):**

- Create: `src/upstream/upstreamFormatError.ts`, `src/upstream/cells.ts` (+ `cells.test.ts`)
- Create: `src/neoCatalog.ts`, `src/upstream/sbdb.ts` (+ `sbdb.test.ts`)
- Create: `src/closeApproach.ts`, `src/upstream/cad.ts` (+ `cad.test.ts`)
- Create: `src/cme.ts`, `src/upstream/donki.ts` (+ `donki.test.ts`)
- Create: `src/datasets.ts` (+ `datasets.test.ts`)
- Modify: `src/index.ts`, `package.json` (`zod` dependency, `@perihelion/fixtures` devDependency)

**Interfaces:**

- Consumes: `SBDB_NEO_FIELDS`, `SbdbNeoField`, `DEFAULT_*_DAYS` (Task 1); `RECORDED_*` (Task 2).
- Produces:
  - `UpstreamFormatError`; `jplColumnarResponseSchema`, `JplColumnarResponse`, `Cell`,
    `readColumnarRows(response, requiredFields)`, `readNumber`, `readOptionalNumber`, `readFiniteOrNull`,
    `readString`, `readOptionalString`.
  - `NEO_ORBIT_CLASSES`, `NeoOrbitClass`, `NEO_PAYLOAD_BUDGET_BYTES = 2_000_000`, `neoCatalogSchema`,
    `NeoCatalog` (columnar: `count`, `designation[]`, `name[]`, `epochJdTdb[]`, `eccentricity[]`,
    `semiMajorAxisAu[]`, `inclinationDeg[]`, `longitudeOfAscendingNodeDeg[]`, `argumentOfPerihelionDeg[]`,
    `meanAnomalyDeg[]`, `absoluteMagnitude[]`, `orbitClass[]`), `toNeoCatalog(response): NeoCatalog`,
    `roundTo(value, decimals)`.
  - `closeApproachSchema`, `CloseApproach`, `CAD_FIELDS`, `toCloseApproaches(response): CloseApproach[]`.
  - `cmeSchema`, `Cme`, `CmeAnalysis`, `donkiCmeResponseSchema`, `DonkiCmeAnalysis`, `toCmes(response): Cme[]`,
    `mostAccurateAnalysis(analyses): CmeAnalysis | null`.
  - `API_BASE_PATH`, `SNAPSHOT_BASE_PATH`, `DATASET_NAMES`, `DatasetName`, `DATASET_DATA_SCHEMAS`,
    `DatasetData<N>`, `DATASET_ORIGINS` (`'fresh' | 'stale' | 'snapshot'`), `DatasetOrigin`,
    `datasetSnapshotSchema(name)`, `datasetResponseSchema(name)`, `DatasetSnapshot<N>`, `DatasetResponse<N>`,
    `datasetApiPath(name)`, `snapshotFileName(name)`, `MAX_WINDOW_DAYS = 60`, `daysQuerySchema(defaultDays)`.

- [ ] **Step 1: Add dependencies**

```bash
npm i zod@^4.6.5 -w @perihelion/data
npm i -D @perihelion/fixtures@* -w @perihelion/data
```

- [ ] **Step 2: Write the failing cell-reader tests** `src/upstream/cells.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { readColumnarRows, readNumber, readOptionalNumber, readOptionalString } from './cells';
import { UpstreamFormatError } from './upstreamFormatError';

const response = (fields: string[], data: (string | null)[][]) => ({
  signature: { version: '1.0' },
  count: data.length,
  fields,
  data,
});

describe('readColumnarRows', () => {
  it('keys each row by field name, whatever order upstream sends the columns in', () => {
    const rows = readColumnarRows(response(['b', 'a'], [['2', '1']]), ['a', 'b']);
    expect(rows).toEqual([{ a: '1', b: '2' }]);
  });

  it('returns no rows for an empty answer that carries no fields', () => {
    expect(readColumnarRows({ ...response([], []), count: 0 }, ['a'])).toEqual([]);
  });

  it('fails loudly when a required field is missing', () => {
    expect(() => readColumnarRows(response(['b'], [['2']]), ['a'])).toThrow(UpstreamFormatError);
  });

  it('rejects a row whose length differs from the field list', () => {
    expect(() => readColumnarRows(response(['a', 'b'], [['1']]), ['a'])).toThrow(
      'Expected 2 cells, got 1',
    );
  });
});

describe('cell parsing', () => {
  it('reads numbers from strings and numbers', () => {
    expect(readNumber('0.0123', 'dist')).toBe(0.0123);
    expect(readNumber(7, 'h')).toBe(7);
  });

  it('never reads an empty, blank or null cell as zero', () => {
    for (const cell of ['', '  ', null]) expect(() => readNumber(cell, 'dist')).toThrow('dist');
    expect(readOptionalNumber(' ', 'h')).toBeNull();
    expect(() => readNumber('n/a', 'dist')).toThrow(UpstreamFormatError);
  });

  it('trims strings and treats blank as absent', () => {
    expect(readOptionalString('   (2026 AB)')).toBe('(2026 AB)');
    expect(readOptionalString('  ')).toBeNull();
  });
});
```

Run: `npx vitest run packages/data/src/upstream/cells.test.ts` — Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** `src/upstream/upstreamFormatError.ts` and `src/upstream/cells.ts`

```ts
/** Upstream sent something we cannot trust; the server treats it like an outage and falls back. */
export class UpstreamFormatError extends Error {
  override name = 'UpstreamFormatError';
}
```

```ts
import { z } from 'zod';
import { UpstreamFormatError } from './upstreamFormatError';

/** SBDB and CAD send cells as strings; numbers are accepted too, since the docs do not promise it. */
const cellSchema = z.union([z.string(), z.number()]).nullable();
export type Cell = z.infer<typeof cellSchema>;

/**
 * The envelope SBDB Query and CAD share. Both omit `fields` and `data` when nothing matches, and CAD
 * sends `count` as a string. https://ssd-api.jpl.nasa.gov/doc/cad.html
 */
export const jplColumnarResponseSchema = z.object({
  signature: z.object({ version: z.string() }),
  count: z.coerce.number().int().nonnegative(),
  fields: z.array(z.string()).default([]),
  data: z.array(z.array(cellSchema)).default([]),
});
export type JplColumnarResponse = z.infer<typeof jplColumnarResponseSchema>;

/**
 * Keys each row by the field names the API echoed back, so a renamed or reordered column fails here
 * instead of shifting values into the wrong property.
 */
export function readColumnarRows<F extends string>(
  response: JplColumnarResponse,
  required: readonly F[],
): Record<F, Cell>[] {
  if (response.data.length === 0) return [];
  const columns = required.map((field) => [field, columnIndex(response.fields, field)] as const);
  return response.data.map((row) => {
    if (row.length !== response.fields.length) {
      throw new UpstreamFormatError(`Expected ${response.fields.length} cells, got ${row.length}`);
    }
    // Every required field gets an entry, so the record is complete despite fromEntries' wider type.
    return Object.fromEntries(
      columns.map(([field, index]) => [field, row[index] ?? null]),
    ) as Record<F, Cell>;
  });
}

function columnIndex(fields: readonly string[], field: string): number {
  const index = fields.indexOf(field);
  if (index === -1) throw new UpstreamFormatError(`Response has no "${field}" field`);
  return index;
}

/** Number('') and Number(null) are 0, so blank cells are treated as absent, never as zero. */
export function readFiniteOrNull(cell: Cell): number | null {
  if (readOptionalString(cell) === null) return null;
  const value = Number(cell);
  return Number.isFinite(value) ? value : null;
}

export function readNumber(cell: Cell, field: string): number {
  const value = readFiniteOrNull(cell);
  if (value === null)
    throw new UpstreamFormatError(`Field ${field} is not a number: ${JSON.stringify(cell)}`);
  return value;
}

export function readOptionalNumber(cell: Cell, field: string): number | null {
  return readOptionalString(cell) === null ? null : readNumber(cell, field);
}

export function readString(cell: Cell, field: string): string {
  const text = readOptionalString(cell);
  if (text === null) throw new UpstreamFormatError(`Field ${field} is empty`);
  return text;
}

/** CAD pads `fullname` with leading spaces; blank means absent. */
export function readOptionalString(cell: Cell): string | null {
  const text = cell === null ? '' : String(cell).trim();
  return text === '' ? null : text;
}
```

Run the test again — Expected: PASS (7 tests).

- [ ] **Step 4: Write the failing SBDB tests** `src/upstream/sbdb.test.ts`

```ts
import { RECORDED_SBDB_NEO_SAMPLE } from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { NEO_ORBIT_CLASSES, neoCatalogSchema } from '../neoCatalog';
import { jplColumnarResponseSchema } from './cells';
import { type SbdbNeoField, SBDB_NEO_FIELDS } from './queries';
import { roundTo, toNeoCatalog } from './sbdb';
import { UpstreamFormatError } from './upstreamFormatError';

type SbdbRow = Record<SbdbNeoField, string | null>;

// Horizons' osculating elements for 433 Eros at JD 2461000.5 (packages/fixtures), as SBDB would send them.
const EROS: SbdbRow = {
  pdes: '433',
  name: 'Eros',
  epoch: '2461000.5',
  e: '0.2228359405976197',
  a: '1.458120998504457',
  i: '10.82846651482517',
  om: '304.270102574398',
  w: '178.9297536745088',
  ma: '310.5543275803852',
  H: '10.38',
  class: 'AMO',
};

// Reversed on purpose: rows are keyed by field name, not position.
const FIELDS = [...SBDB_NEO_FIELDS].reverse();

function sbdbResponse(rows: readonly SbdbRow[]) {
  const data = rows.map((row) => FIELDS.map((field) => row[field]));
  return jplColumnarResponseSchema.parse({
    signature: { version: '1.0' },
    count: rows.length,
    fields: FIELDS,
    data,
  });
}

const copies = (row: SbdbRow, count: number) => Array.from({ length: count }, () => row);

describe('toNeoCatalog', () => {
  it('normalizes every row of the recorded SBDB sample into a valid columnar catalog', () => {
    const response = jplColumnarResponseSchema.parse(RECORDED_SBDB_NEO_SAMPLE);
    const catalog = neoCatalogSchema.parse(toNeoCatalog(response));
    expect(catalog.count).toBe(response.data.length);
    expect(catalog.orbitClass.every((orbitClass) => NEO_ORBIT_CLASSES.includes(orbitClass))).toBe(
      true,
    );
  });

  it('rounds elements to about a kilometre and keeps the epoch exact', () => {
    const catalog = toNeoCatalog(sbdbResponse([EROS]));
    expect(catalog).toEqual({
      count: 1,
      designation: ['433'],
      name: ['Eros'],
      epochJdTdb: [2461000.5],
      eccentricity: [0.22283594],
      semiMajorAxisAu: [1.458121],
      inclinationDeg: [10.828467],
      longitudeOfAscendingNodeDeg: [304.270103],
      argumentOfPerihelionDeg: [178.929754],
      meanAnomalyDeg: [310.554328],
      absoluteMagnitude: [10.38],
      orbitClass: ['AMO'],
    });
  });

  it('keeps unnamed objects and unknown magnitudes as null', () => {
    const catalog = toNeoCatalog(sbdbResponse([{ ...EROS, name: null, H: null }]));
    expect(catalog.name).toEqual([null]);
    expect(catalog.absoluteMagnitude).toEqual([null]);
  });

  it('skips a rare unusable row: unbound orbit, unknown class or missing element', () => {
    const bad = [
      { ...EROS, e: '1.2' },
      { ...EROS, class: 'MBA' },
      { ...EROS, ma: null },
    ];
    for (const row of bad) {
      expect(toNeoCatalog(sbdbResponse([...copies(EROS, 200), row])).count).toBe(200);
    }
  });

  it('fails loudly when more than 1% of rows are unusable, which means the format changed', () => {
    const rows = [...copies(EROS, 98), { ...EROS, a: null }, { ...EROS, a: null }];
    expect(() => toNeoCatalog(sbdbResponse(rows))).toThrow(UpstreamFormatError);
  });

  it('returns an empty catalog for an empty answer', () => {
    expect(toNeoCatalog(sbdbResponse([])).count).toBe(0);
  });
});

describe('roundTo', () => {
  it('lands on the short decimal despite float noise', () => {
    expect(roundTo(1.458120998504457, 8)).toBe(1.458121);
    expect(String(roundTo(0.1 + 0.2, 8))).toBe('0.3');
  });
});

describe('neoCatalogSchema', () => {
  it('rejects columns whose length differs from count', () => {
    const catalog = { ...toNeoCatalog(sbdbResponse([EROS])), designation: [] };
    expect(neoCatalogSchema.safeParse(catalog).success).toBe(false);
  });
});
```

Run: `npx vitest run packages/data/src/upstream/sbdb.test.ts` — Expected: FAIL, modules not found.

- [ ] **Step 5: Implement** `src/neoCatalog.ts`

```ts
import { z } from 'zod';

/** SBDB orbit classes of near-Earth asteroids: Atira (IEO), Aten, Apollo, Amor. */
export const NEO_ORBIT_CLASSES = ['IEO', 'ATE', 'APO', 'AMO'] as const;
export type NeoOrbitClass = (typeof NEO_ORBIT_CLASSES)[number];

/** Most gzip may leave of /api/neos on the wire (PLAN.md Phase 2 exit criterion). Never loosen. */
export const NEO_PAYLOAD_BUDGET_BYTES = 2_000_000;

// Columnar, not one object per NEO: field names once instead of 40k times, and arrays map straight
// onto the swarm's instanced GPU attributes in Phase 4.
const NEO_COLUMNS = {
  designation: z.array(z.string()),
  name: z.array(z.string().nullable()),
  epochJdTdb: z.array(z.number()),
  eccentricity: z.array(z.number().min(0).lt(1)),
  semiMajorAxisAu: z.array(z.number().positive()),
  inclinationDeg: z.array(z.number()),
  longitudeOfAscendingNodeDeg: z.array(z.number()),
  argumentOfPerihelionDeg: z.array(z.number()),
  meanAnomalyDeg: z.array(z.number()),
  absoluteMagnitude: z.array(z.number().nullable()),
  orbitClass: z.array(z.enum(NEO_ORBIT_CLASSES)),
};
const NEO_COLUMN_NAMES = Object.keys(NEO_COLUMNS) as (keyof typeof NEO_COLUMNS)[];

export const neoCatalogSchema = z
  .object({ count: z.number().int().nonnegative(), ...NEO_COLUMNS })
  .refine((catalog) => NEO_COLUMN_NAMES.every((name) => catalog[name].length === catalog.count), {
    message: 'Every column must have `count` entries',
  });
export type NeoCatalog = z.infer<typeof neoCatalogSchema>;
```

- [ ] **Step 6: Implement** `src/upstream/sbdb.ts`

```ts
import { type NeoCatalog, type NeoOrbitClass, NEO_ORBIT_CLASSES } from '../neoCatalog';
import {
  type Cell,
  type JplColumnarResponse,
  readColumnarRows,
  readFiniteOrNull,
  readOptionalString,
} from './cells';
import { type SbdbNeoField, SBDB_NEO_FIELDS } from './queries';
import { UpstreamFormatError } from './upstreamFormatError';

/** More unusable rows than this means the format changed, not that a few orbits are odd. */
const MAX_SKIPPED_FRACTION = 0.01;

// Rounded to about a kilometre at 1 AU (a: 1e-8 AU ≈ 1.5 km; e: 1e-8; angles: 1e-6° ≈ 2.6 km), far
// below anything visible, so ~40k rows fit the gzip budget. Displayed facts never come from here.
const ELEMENT_DECIMALS = 8;
const ANGLE_DECIMALS = 6;
const MAGNITUDE_DECIMALS = 2;

type SbdbCells = Record<SbdbNeoField, Cell>;

interface RawElements {
  epoch: number;
  e: number;
  a: number;
  i: number;
  om: number;
  w: number;
  ma: number;
}

interface NeoRow {
  designation: string;
  name: string | null;
  epochJdTdb: number;
  eccentricity: number;
  semiMajorAxisAu: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPerihelionDeg: number;
  meanAnomalyDeg: number;
  absoluteMagnitude: number | null;
  orbitClass: NeoOrbitClass;
}

type Elements = Omit<NeoRow, 'designation' | 'name' | 'absoluteMagnitude' | 'orbitClass'>;

export function toNeoCatalog(response: JplColumnarResponse): NeoCatalog {
  const cells = readColumnarRows(response, SBDB_NEO_FIELDS);
  const rows = cells.flatMap((row) => toNeoRow(row) ?? []);
  assertFewSkipped(cells.length, rows.length);
  return toColumns(rows);
}

/** Math.round on a scaled value, then one division: the result prints as the short decimal. */
export function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function toNeoRow(cells: SbdbCells): NeoRow | null {
  const orbitClass = NEO_ORBIT_CLASSES.find((neoClass) => neoClass === cells.class);
  const elements = toElements(readRawElements(cells));
  const designation = readOptionalString(cells.pdes);
  if (orbitClass === undefined || elements === null || designation === null) return null;
  const magnitude = readFiniteOrNull(cells.H);
  const absoluteMagnitude = magnitude === null ? null : roundTo(magnitude, MAGNITUDE_DECIMALS);
  return {
    designation,
    name: readOptionalString(cells.name),
    ...elements,
    absoluteMagnitude,
    orbitClass,
  };
}

function readRawElements(cells: SbdbCells): RawElements | null {
  const raw = {
    epoch: readFiniteOrNull(cells.epoch),
    e: readFiniteOrNull(cells.e),
    a: readFiniteOrNull(cells.a),
    i: readFiniteOrNull(cells.i),
    om: readFiniteOrNull(cells.om),
    w: readFiniteOrNull(cells.w),
    ma: readFiniteOrNull(cells.ma),
  };
  // Checked at runtime just above, so the narrowing cast is sound.
  return Object.values(raw).every((value) => value !== null) ? (raw as RawElements) : null;
}

/** The engine rejects e ≥ 1 (Phase 1 decision), so unbound orbits are skipped here. */
function toElements(raw: RawElements | null): Elements | null {
  if (raw === null || raw.e >= 1 || raw.a <= 0) return null;
  return {
    epochJdTdb: raw.epoch,
    eccentricity: roundTo(raw.e, ELEMENT_DECIMALS),
    semiMajorAxisAu: roundTo(raw.a, ELEMENT_DECIMALS),
    inclinationDeg: roundTo(raw.i, ANGLE_DECIMALS),
    longitudeOfAscendingNodeDeg: roundTo(raw.om, ANGLE_DECIMALS),
    argumentOfPerihelionDeg: roundTo(raw.w, ANGLE_DECIMALS),
    meanAnomalyDeg: roundTo(raw.ma, ANGLE_DECIMALS),
  };
}

function assertFewSkipped(total: number, kept: number): void {
  if (total - kept > total * MAX_SKIPPED_FRACTION) {
    throw new UpstreamFormatError(`Skipped ${total - kept} of ${total} SBDB rows`);
  }
}

function toColumns(rows: readonly NeoRow[]): NeoCatalog {
  return {
    count: rows.length,
    designation: rows.map((row) => row.designation),
    name: rows.map((row) => row.name),
    epochJdTdb: rows.map((row) => row.epochJdTdb),
    eccentricity: rows.map((row) => row.eccentricity),
    semiMajorAxisAu: rows.map((row) => row.semiMajorAxisAu),
    inclinationDeg: rows.map((row) => row.inclinationDeg),
    longitudeOfAscendingNodeDeg: rows.map((row) => row.longitudeOfAscendingNodeDeg),
    argumentOfPerihelionDeg: rows.map((row) => row.argumentOfPerihelionDeg),
    meanAnomalyDeg: rows.map((row) => row.meanAnomalyDeg),
    absoluteMagnitude: rows.map((row) => row.absoluteMagnitude),
    orbitClass: rows.map((row) => row.orbitClass),
  };
}
```

Run: `npx vitest run packages/data/src/upstream/sbdb.test.ts` — Expected: PASS (8 tests). If the recorded sample
test fails, **stop and report** what the recording contains; do not change the recording.

- [ ] **Step 7: Write the failing CAD tests** `src/upstream/cad.test.ts`

```ts
import { RECORDED_CAD_EMPTY, RECORDED_CAD_WINDOW } from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { closeApproachSchema } from '../closeApproach';
import { CAD_FIELDS, toCloseApproaches } from './cad';
import { jplColumnarResponseSchema } from './cells';
import { UpstreamFormatError } from './upstreamFormatError';

const ROW = [
  '2026 AB',
  '5',
  '2461312.5',
  '2026-Sep-28 12:00',
  '0.0123',
  '0.0122',
  '0.0124',
  '8.5',
  null,
  '< 00:01',
  null,
  '       (2026 AB)',
];

function cadResponse(rows: (string | null)[][]) {
  return jplColumnarResponseSchema.parse({
    signature: { version: '1.5' },
    count: String(rows.length),
    fields: CAD_FIELDS,
    data: rows,
  });
}

describe('toCloseApproaches', () => {
  it('keeps every recorded approach, with distances exactly as CAD printed them', () => {
    const response = jplColumnarResponseSchema.parse(RECORDED_CAD_WINDOW);
    const approaches = toCloseApproaches(response);
    const distIndex = response.fields.indexOf('dist');
    expect(approaches).toHaveLength(response.data.length);
    expect(approaches.map((a) => a.distanceAu).toSorted()).toEqual(
      response.data.map((row) => Number(row[distIndex])).toSorted(),
    );
    for (const approach of approaches) closeApproachSchema.parse(approach);
  });

  it('sorts approaches by time', () => {
    const approaches = toCloseApproaches(jplColumnarResponseSchema.parse(RECORDED_CAD_WINDOW));
    const times = approaches.map((a) => a.approachJdTdb);
    expect(times).toEqual(times.toSorted((a, b) => a - b));
  });

  it('returns no approaches for the recorded empty answer', () => {
    expect(toCloseApproaches(jplColumnarResponseSchema.parse(RECORDED_CAD_EMPTY))).toEqual([]);
  });

  it('maps one row field by field, trimming the padded full name', () => {
    expect(toCloseApproaches(cadResponse([ROW]))).toEqual([
      {
        designation: '2026 AB',
        fullName: '(2026 AB)',
        orbitId: '5',
        approachJdTdb: 2461312.5,
        approachCalendarTdb: '2026-Sep-28 12:00',
        distanceAu: 0.0123,
        distanceMinAu: 0.0122,
        distanceMaxAu: 0.0124,
        relativeVelocityKmPerS: 8.5,
        infinityVelocityKmPerS: null,
        timeUncertainty: '< 00:01',
        absoluteMagnitude: null,
      },
    ]);
  });

  it('rejects a row whose distance is not a number rather than guessing', () => {
    const bad = ROW.map((cell, index) => (index === CAD_FIELDS.indexOf('dist') ? 'n/a' : cell));
    expect(() => toCloseApproaches(cadResponse([bad]))).toThrow(UpstreamFormatError);
  });
});
```

Run: `npx vitest run packages/data/src/upstream/cad.test.ts` — Expected: FAIL, modules not found.

- [ ] **Step 8: Implement** `src/closeApproach.ts` and `src/upstream/cad.ts`

```ts
import { z } from 'zod';

/**
 * One CAD row. These values are shown to the user as facts (CLAUDE.md), so they are kept exactly as
 * CAD printed them: never rounded, never recomputed by our engine. https://ssd-api.jpl.nasa.gov/doc/cad.html
 */
export const closeApproachSchema = z.object({
  designation: z.string(),
  fullName: z.string(),
  orbitId: z.string(),
  approachJdTdb: z.number(),
  /** CAD's own calendar string, TDB, e.g. "2026-Sep-28 12:00". */
  approachCalendarTdb: z.string(),
  distanceAu: z.number().nonnegative(),
  distanceMinAu: z.number().nonnegative(),
  distanceMaxAu: z.number().nonnegative(),
  relativeVelocityKmPerS: z.number().nonnegative(),
  infinityVelocityKmPerS: z.number().nonnegative().nullable(),
  /** 3-sigma uncertainty in the approach time as CAD formats it, e.g. "< 00:01" or "2_03:15". */
  timeUncertainty: z.string().nullable(),
  absoluteMagnitude: z.number().nullable(),
});
export type CloseApproach = z.infer<typeof closeApproachSchema>;
```

```ts
import type { CloseApproach } from '../closeApproach';
import {
  type Cell,
  type JplColumnarResponse,
  readColumnarRows,
  readNumber,
  readOptionalNumber,
  readOptionalString,
  readString,
} from './cells';

/** Fields CAD returns with `fullname=true`. */
export const CAD_FIELDS = [
  'des',
  'orbit_id',
  'jd',
  'cd',
  'dist',
  'dist_min',
  'dist_max',
  'v_rel',
  'v_inf',
  't_sigma_f',
  'h',
  'fullname',
] as const;
type CadCells = Record<(typeof CAD_FIELDS)[number], Cell>;

/** A bad row fails the whole list: these are displayed facts, so a partial list is worse than a fallback. */
export function toCloseApproaches(response: JplColumnarResponse): CloseApproach[] {
  return readColumnarRows(response, CAD_FIELDS)
    .map(toCloseApproach)
    .toSorted((a, b) => a.approachJdTdb - b.approachJdTdb);
}

function toCloseApproach(cells: CadCells): CloseApproach {
  return {
    designation: readString(cells.des, 'des'),
    fullName: readString(cells.fullname, 'fullname'),
    orbitId: readString(cells.orbit_id, 'orbit_id'),
    approachJdTdb: readNumber(cells.jd, 'jd'),
    approachCalendarTdb: readString(cells.cd, 'cd'),
    distanceAu: readNumber(cells.dist, 'dist'),
    distanceMinAu: readNumber(cells.dist_min, 'dist_min'),
    distanceMaxAu: readNumber(cells.dist_max, 'dist_max'),
    relativeVelocityKmPerS: readNumber(cells.v_rel, 'v_rel'),
    infinityVelocityKmPerS: readOptionalNumber(cells.v_inf, 'v_inf'),
    timeUncertainty: readOptionalString(cells.t_sigma_f),
    absoluteMagnitude: readOptionalNumber(cells.h, 'h'),
  };
}
```

Run the CAD test again — Expected: PASS (5 tests).

- [ ] **Step 9: Write the failing DONKI tests** `src/upstream/donki.test.ts`

```ts
import { RECORDED_DONKI_CME_EMPTY, RECORDED_DONKI_CME_WINDOW } from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { cmeSchema } from '../cme';
import { donkiCmeResponseSchema, mostAccurateAnalysis, toCmes } from './donki';
import { UpstreamFormatError } from './upstreamFormatError';

const ANALYSIS = {
  time21_5: '2026-09-01T18:30Z',
  latitude: -12,
  longitude: 30,
  halfAngle: 25,
  speed: 650,
  type: 'C',
  isMostAccurate: true,
};
const CME = {
  activityID: '2026-09-01T12:00:00-CME-001',
  startTime: '2026-09-01T12:00Z',
  sourceLocation: 'N12W30',
  note: '',
  link: 'https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/CME/1/-1',
  cmeAnalyses: [ANALYSIS],
};
const parse = (body: unknown) => donkiCmeResponseSchema.parse(body);

describe('toCmes', () => {
  it('keeps recorded CMEs that have a complete most-accurate analysis, in time order', () => {
    const cmes = toCmes(parse(RECORDED_DONKI_CME_WINDOW));
    expect(cmes.length).toBeGreaterThan(0);
    for (const cme of cmes) cmeSchema.parse(cme);
    const starts = cmes.map((cme) => cme.startTime);
    expect(starts).toEqual(starts.toSorted());
  });

  it('returns no CMEs for the recorded empty window, or an empty body', () => {
    expect(toCmes(parse(RECORDED_DONKI_CME_EMPTY))).toEqual([]);
    expect(toCmes(parse(null))).toEqual([]);
  });

  it('normalizes one CME, turning DONKI minute timestamps into full ISO and blanks into null', () => {
    expect(toCmes(parse([CME]))).toEqual([
      {
        activityId: '2026-09-01T12:00:00-CME-001',
        startTime: '2026-09-01T12:00:00.000Z',
        sourceLocation: 'N12W30',
        note: null,
        link: CME.link,
        analysis: {
          time21_5: '2026-09-01T18:30:00.000Z',
          latitudeDeg: -12,
          longitudeDeg: 30,
          halfAngleDeg: 25,
          speedKmPerS: 650,
          type: 'C',
        },
      },
    ]);
  });

  it('leaves out a CME with no analyses at all', () => {
    expect(toCmes(parse([{ ...CME, cmeAnalyses: null }]))).toEqual([]);
  });

  it('rejects an unreadable start time', () => {
    expect(() => toCmes(parse([{ ...CME, startTime: 'yesterday' }]))).toThrow(UpstreamFormatError);
  });
});

describe('mostAccurateAnalysis', () => {
  it('ignores analyses not flagged most accurate', () => {
    expect(
      mostAccurateAnalysis(
        parse([{ ...CME, cmeAnalyses: [{ ...ANALYSIS, isMostAccurate: false }] }])[0]
          ?.cmeAnalyses ?? [],
      ),
    ).toBeNull();
  });

  it('ignores a flagged analysis missing speed, direction or width', () => {
    const incomplete = { ...ANALYSIS, halfAngle: null };
    expect(
      mostAccurateAnalysis(parse([{ ...CME, cmeAnalyses: [incomplete] }])[0]?.cmeAnalyses ?? []),
    ).toBeNull();
  });

  it('takes the latest when several are flagged', () => {
    const later = { ...ANALYSIS, time21_5: '2026-09-01T20:00Z', speed: 700 };
    const analyses = parse([{ ...CME, cmeAnalyses: [later, ANALYSIS] }])[0]?.cmeAnalyses ?? [];
    expect(mostAccurateAnalysis(analyses)?.speedKmPerS).toBe(700);
  });
});
```

Run: `npx vitest run packages/data/src/upstream/donki.test.ts` — Expected: FAIL, modules not found.

- [ ] **Step 10: Implement** `src/cme.ts` and `src/upstream/donki.ts`

```ts
import { z } from 'zod';

/**
 * DONKI's CME analysis, measured when the front reaches 21.5 solar radii. Latitude and longitude are
 * Stonyhurst heliographic (HEEQ) degrees of the cone axis; the half-angle is the cone's angular half-width.
 * https://ccmc.gsfc.nasa.gov/tools/DONKI/
 */
export const cmeAnalysisSchema = z.object({
  time21_5: z.iso.datetime(),
  latitudeDeg: z.number(),
  longitudeDeg: z.number(),
  halfAngleDeg: z.number().positive(),
  speedKmPerS: z.number().positive(),
  type: z.string().nullable(),
});
export type CmeAnalysis = z.infer<typeof cmeAnalysisSchema>;

export const cmeSchema = z.object({
  activityId: z.string(),
  startTime: z.iso.datetime(),
  sourceLocation: z.string().nullable(),
  note: z.string().nullable(),
  link: z.string().nullable(),
  analysis: cmeAnalysisSchema,
});
export type Cme = z.infer<typeof cmeSchema>;
```

```ts
import { z } from 'zod';
import type { Cme, CmeAnalysis } from '../cme';
import { UpstreamFormatError } from './upstreamFormatError';

const donkiAnalysisSchema = z.object({
  time21_5: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  halfAngle: z.number().nullable(),
  speed: z.number().nullable(),
  type: z.string().nullable().optional(),
  isMostAccurate: z.boolean(),
});
export type DonkiCmeAnalysis = z.infer<typeof donkiAnalysisSchema>;

const donkiCmeSchema = z.object({
  activityID: z.string(),
  startTime: z.string(),
  sourceLocation: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  cmeAnalyses: z.array(donkiAnalysisSchema).nullable().optional(),
});
type DonkiCme = z.infer<typeof donkiCmeSchema>;

/** The server's HTTP client reads an empty body as null; DONKI has answered empty windows both ways. */
export const donkiCmeResponseSchema = z
  .union([z.array(donkiCmeSchema), z.null()])
  .transform((cmes) => cmes ?? []);

export function toCmes(response: readonly DonkiCme[]): Cme[] {
  return response.flatMap(toCme).toSorted((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * DONKI can hold several analyses per CME; PLAN.md asks for the most accurate. If several are flagged,
 * the latest measurement wins. A CME with no complete flagged analysis is left out: Phase 6 cannot
 * place a CME without its speed, direction and width.
 */
export function mostAccurateAnalysis(analyses: readonly DonkiCmeAnalysis[]): CmeAnalysis | null {
  return analyses
    .filter((analysis) => analysis.isMostAccurate)
    .flatMap(toCmeAnalysis)
    .reduce<CmeAnalysis | null>(
      (latest, analysis) =>
        latest === null || analysis.time21_5 > latest.time21_5 ? analysis : latest,
      null,
    );
}

function toCme(cme: DonkiCme): Cme[] {
  const analysis = mostAccurateAnalysis(cme.cmeAnalyses ?? []);
  if (analysis === null) return [];
  return [
    {
      activityId: cme.activityID,
      startTime: toIsoTimestamp(cme.startTime, 'startTime'),
      sourceLocation: blankToNull(cme.sourceLocation),
      note: blankToNull(cme.note),
      link: blankToNull(cme.link),
      analysis,
    },
  ];
}

function toCmeAnalysis(analysis: DonkiCmeAnalysis): CmeAnalysis[] {
  const { time21_5, latitude, longitude, halfAngle, speed } = analysis;
  if (
    time21_5 === null ||
    latitude === null ||
    longitude === null ||
    halfAngle === null ||
    speed === null
  )
    return [];
  return [
    {
      time21_5: toIsoTimestamp(time21_5, 'time21_5'),
      latitudeDeg: latitude,
      longitudeDeg: longitude,
      halfAngleDeg: halfAngle,
      speedKmPerS: speed,
      type: analysis.type ?? null,
    },
  ];
}

/** DONKI writes minute precision ("2026-09-01T12:00Z"); normalized so strings compare as times. */
function toIsoTimestamp(text: string, field: string): string {
  const ms = Date.parse(text);
  if (!Number.isFinite(ms))
    throw new UpstreamFormatError(`Field ${field} is not a time: "${text}"`);
  return new Date(ms).toISOString();
}

function blankToNull(text: string | null | undefined): string | null {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}
```

Run the DONKI test again — Expected: PASS (8 tests). If the recorded window yields no CMEs, **stop and report**.

- [ ] **Step 11: Write the failing dataset tests** `src/datasets.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLOSE_APPROACH_DAYS,
  datasetApiPath,
  datasetResponseSchema,
  daysQuerySchema,
  snapshotFileName,
} from './index';

describe('dataset paths', () => {
  it('serves each dataset under /api and snapshots it as <name>.json', () => {
    expect(datasetApiPath('close-approaches')).toBe('/api/close-approaches');
    expect(snapshotFileName('neos')).toBe('neos.json');
  });
});

describe('daysQuerySchema', () => {
  const schema = daysQuerySchema(DEFAULT_CLOSE_APPROACH_DAYS);

  it('defaults when days is absent and reads a whole number otherwise', () => {
    expect(schema.parse({}).days).toBe(7);
    expect(schema.parse({ days: '3' }).days).toBe(3);
  });

  it.each(['0', '61', '2.5', 'abc', '', ['1', '2']])('rejects days=%j', (days) => {
    expect(schema.safeParse({ days }).success).toBe(false);
  });
});

describe('datasetResponseSchema', () => {
  it('accepts an empty CME list served from the snapshot', () => {
    const body = { fetchedAt: '2026-09-28T12:00:00.000Z', origin: 'snapshot', data: [] };
    expect(datasetResponseSchema('cmes').parse(body)).toEqual(body);
  });

  it('rejects an origin the server never sends', () => {
    const body = { fetchedAt: '2026-09-28T12:00:00.000Z', origin: 'live', data: [] };
    expect(datasetResponseSchema('cmes').safeParse(body).success).toBe(false);
  });
});
```

Run: `npx vitest run packages/data/src/datasets.test.ts` — Expected: FAIL (exports missing).

- [ ] **Step 12: Implement** `src/datasets.ts` and update `src/index.ts`

```ts
import { z } from 'zod';
import { closeApproachSchema } from './closeApproach';
import { cmeSchema } from './cme';
import { neoCatalogSchema } from './neoCatalog';

/** Path prefix for every data route served by apps/server; the web app only ever calls these. */
export const API_BASE_PATH = '/api';
/** Where the web app finds the committed fallback copies (apps/web/public/snapshot/). */
export const SNAPSHOT_BASE_PATH = '/snapshot';

export const DATASET_NAMES = ['neos', 'close-approaches', 'cmes'] as const;
export type DatasetName = (typeof DATASET_NAMES)[number];

export const DATASET_DATA_SCHEMAS = {
  neos: neoCatalogSchema,
  'close-approaches': z.array(closeApproachSchema),
  cmes: z.array(cmeSchema),
} as const satisfies Record<DatasetName, z.ZodType>;
export type DatasetData<N extends DatasetName> = z.infer<(typeof DATASET_DATA_SCHEMAS)[N]>;

/** fresh: within its TTL; stale: past it while a refresh runs; snapshot: the committed fallback. */
export const DATASET_ORIGINS = ['fresh', 'stale', 'snapshot'] as const;
export type DatasetOrigin = (typeof DATASET_ORIGINS)[number];

/** The shape of apps/web/public/snapshot/<name>.json. */
export function datasetSnapshotSchema<N extends DatasetName>(name: N) {
  return z.object({ fetchedAt: z.iso.datetime(), data: DATASET_DATA_SCHEMAS[name] });
}

/** The shape of GET /api/<name>; the web app validates it, trusting our server no more than NASA. */
export function datasetResponseSchema<N extends DatasetName>(name: N) {
  return datasetSnapshotSchema(name).extend({ origin: z.enum(DATASET_ORIGINS) });
}

export type DatasetSnapshot<N extends DatasetName> = z.infer<
  ReturnType<typeof datasetSnapshotSchema<N>>
>;
export type DatasetResponse<N extends DatasetName> = z.infer<
  ReturnType<typeof datasetResponseSchema<N>>
>;

export function datasetApiPath(name: DatasetName): string {
  return `${API_BASE_PATH}/${name}`;
}

export function snapshotFileName(name: DatasetName): string {
  return `${name}.json`;
}

/** Bounds `days` so a caller cannot create unbounded cache keys or upstream queries. */
export const MAX_WINDOW_DAYS = 60;

export function daysQuerySchema(defaultDays: number) {
  return z.object({
    days: z.coerce.number().int().min(1).max(MAX_WINDOW_DAYS).default(defaultDays),
  });
}
```

`src/index.ts` becomes (the `API_BASE_PATH` constant moves into `datasets.ts`; `index.test.ts` still passes):

```ts
export * from './datasets';
export * from './neoCatalog';
export * from './closeApproach';
export * from './cme';
export * from './upstream/queries';
export * from './upstream/cells';
export * from './upstream/sbdb';
export * from './upstream/cad';
export * from './upstream/donki';
export * from './upstream/upstreamFormatError';
```

Run: `npx vitest run packages/data` — Expected: PASS (all data tests). Note: `z.coerce.number()` turns `['1','2']`
into `NaN`, which is why the repeated-parameter case is rejected; if it is not, stop and report.

- [ ] **Step 13: Finish** per the workflow. PROGRESS decisions to add:
  - `/api/neos` is columnar JSON: e and a rounded to 1e-8, angles to 1e-6°, H to 0.01 (≈ 1–3 km at 1 AU). Rows
    that are unbound, unclassified or missing an element are skipped; more than 1% skipped is a format error.
  - CAD values are kept exactly as printed (facts); one bad row fails the list so the server falls back.
  - A CME is served only with a complete `isMostAccurate` analysis; if several are flagged, the latest wins.
  - API responses are `{ fetchedAt, origin: fresh | stale | snapshot, data }`; snapshots are `{ fetchedAt, data }`.
  - `days` is a whole number 1–60 (defaults: close approaches 7, CMEs 30).

Commit: `git commit -m "Add zod schemas and normalizers for SBDB, CAD and DONKI data"`

---

### Task 4: Upstream HTTP client with per-host rate limiting

Branch: `phase-2/upstream-client`

**Files (under `apps/server/src/`):**

- Create: `clock.ts`, `testing/testClock.ts`
- Create: `upstream/httpClient.ts` (+ `httpClient.test.ts`)
- Create: `upstream/upstreamGate.ts` (+ `upstreamGate.test.ts`)

**Interfaces:**

- Consumes: `redactedUrl` (Task 1).
- Produces: `Clock { now(): number }`, `systemClock`; `TestClock` (`nowMs`, `now()`, `advance(ms)`);
  `UpstreamError(message, retryAfterMs: number | null = null)`; `HttpClient { getJson(url: URL): Promise<unknown> }`;
  `createHttpClient({ fetchImpl, timeoutMs }): HttpClient` (empty body → `null`);
  `UpstreamGate` (`new UpstreamGate({ minIntervalMs, clock, sleep? })`, `run(task)`);
  `gatedHttpClient(client, gate): HttpClient`.

- [ ] **Step 1: Create the clocks**

`apps/server/src/clock.ts`:

```ts
/** Injected wherever time matters (TTLs, date windows, back-off) so tests control it. */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };
```

`apps/server/src/testing/testClock.ts`:

```ts
import type { Clock } from '../clock.js';

export class TestClock implements Clock {
  constructor(public nowMs: number) {}

  now(): number {
    return this.nowMs;
  }

  advance(ms: number): void {
    this.nowMs += ms;
  }
}
```

- [ ] **Step 2: Write the failing HTTP client tests** `apps/server/src/upstream/httpClient.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { UpstreamError, createHttpClient } from './httpClient.js';

const URL_WITH_KEY = new URL(
  'https://api.nasa.gov/DONKI/CME?startDate=2026-09-01&api_key=SECRET-KEY',
);

function clientAnswering(respond: () => Response | Promise<Response>) {
  return createHttpClient({ fetchImpl: async () => respond(), timeoutMs: 1_000 });
}

async function failureOf(promise: Promise<unknown>): Promise<UpstreamError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(UpstreamError);
  return error as UpstreamError;
}

describe('createHttpClient', () => {
  it('returns the parsed JSON body', async () => {
    const client = clientAnswering(() => Response.json({ count: 1 }));
    await expect(client.getJson(URL_WITH_KEY)).resolves.toEqual({ count: 1 });
  });

  it('reads an empty body as null', async () => {
    await expect(clientAnswering(() => new Response('')).getJson(URL_WITH_KEY)).resolves.toBeNull();
  });

  it('turns HTTP 429 into a back-off using Retry-After seconds, or a minute without it', async () => {
    const withHeader = clientAnswering(
      () => new Response('', { status: 429, headers: { 'retry-after': '120' } }),
    );
    expect((await failureOf(withHeader.getJson(URL_WITH_KEY))).retryAfterMs).toBe(120_000);
    const without = clientAnswering(() => new Response('', { status: 429 }));
    expect((await failureOf(without.getJson(URL_WITH_KEY))).retryAfterMs).toBe(60_000);
  });

  it('reports other HTTP failures with the key redacted', async () => {
    const error = await failureOf(
      clientAnswering(() => new Response('', { status: 500 })).getJson(URL_WITH_KEY),
    );
    expect(error.message).toContain('HTTP 500');
    expect(error.message).not.toContain('SECRET-KEY');
    expect(error.retryAfterMs).toBeNull();
  });

  it('rejects a body that is not JSON', async () => {
    await failureOf(clientAnswering(() => new Response('<html>')).getJson(URL_WITH_KEY));
  });

  it('reports a network failure without the key', async () => {
    const error = await failureOf(
      clientAnswering(() => Promise.reject(new TypeError('fetch failed'))).getJson(URL_WITH_KEY),
    );
    expect(error.message).not.toContain('SECRET-KEY');
  });

  it('gives up on an upstream that never answers', async () => {
    const hanging: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });
    await failureOf(createHttpClient({ fetchImpl: hanging, timeoutMs: 10 }).getJson(URL_WITH_KEY));
  });
});
```

Run: `npx vitest run apps/server/src/upstream/httpClient.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `apps/server/src/upstream/httpClient.ts`

```ts
import { redactedUrl } from './upstreamUrl.js';

/** Anything that stops an upstream answer from being usable; callers fall back instead of failing. */
export class UpstreamError extends Error {
  override name = 'UpstreamError';

  /** Set only when upstream asked us to slow down (HTTP 429). */
  constructor(
    message: string,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

/** The only network seam: production passes global fetch, tests pass recordings. */
export interface HttpClient {
  getJson(url: URL): Promise<unknown>;
}

interface HttpClientOptions {
  fetchImpl: typeof fetch;
  timeoutMs: number;
}

const HTTP_TOO_MANY_REQUESTS = 429;
const DEFAULT_RETRY_AFTER_MS = 60_000;
const MS_PER_SECOND = 1_000;

export function createHttpClient(options: HttpClientOptions): HttpClient {
  return {
    async getJson(url) {
      const response = await fetchOrThrow(url, options);
      if (!response.ok) throw statusError(response, url);
      return parseBody(await response.text(), url);
    },
  };
}

async function fetchOrThrow(
  url: URL,
  { fetchImpl, timeoutMs }: HttpClientOptions,
): Promise<Response> {
  try {
    return await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new UpstreamError(`Request to ${redactedUrl(url)} failed: ${messageOf(error)}`);
  }
}

function statusError(response: Response, url: URL): UpstreamError {
  const message = `HTTP ${response.status} from ${redactedUrl(url)}`;
  if (response.status !== HTTP_TOO_MANY_REQUESTS) return new UpstreamError(message);
  const retryAfterSeconds = Number(response.headers.get('retry-after') ?? Number.NaN);
  const retryAfterMs = Number.isFinite(retryAfterSeconds)
    ? retryAfterSeconds * MS_PER_SECOND
    : DEFAULT_RETRY_AFTER_MS;
  return new UpstreamError(message, retryAfterMs);
}

/** DONKI has answered an empty window with an empty body; null lets its schema decide. */
function parseBody(text: string, url: URL): unknown {
  if (text.trim() === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new UpstreamError(`Body from ${redactedUrl(url)} is not JSON`);
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```

Run the test again — Expected: PASS (7 tests).

- [ ] **Step 4: Write the failing gate tests** `apps/server/src/upstream/upstreamGate.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { TestClock } from '../testing/testClock.js';
import { UpstreamError } from './httpClient.js';
import { UpstreamGate } from './upstreamGate.js';

function gateWithFakeTime(minIntervalMs = 1_000) {
  const clock = new TestClock(0);
  const sleeps: number[] = [];
  const sleep = async (ms: number) => {
    sleeps.push(ms);
    clock.advance(ms);
  };
  return { gate: new UpstreamGate({ minIntervalMs, clock, sleep }), clock, sleeps };
}

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

describe('UpstreamGate', () => {
  it('spaces consecutive requests by the minimum interval', async () => {
    const { gate, sleeps } = gateWithFakeTime();
    await gate.run(async () => 'first');
    await gate.run(async () => 'second');
    expect(sleeps).toEqual([1_000]);
  });

  it('runs one request at a time', async () => {
    const { gate } = gateWithFakeTime(0);
    const first = deferred();
    const started: string[] = [];
    const one = gate.run(async () => {
      started.push('one');
      await first.promise;
    });
    const two = gate.run(async () => {
      started.push('two');
    });
    await vi.waitFor(() => expect(started).toEqual(['one']));
    // Give the second task every chance to jump the queue before releasing the first.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(started).toEqual(['one']);
    first.resolve();
    await Promise.all([one, two]);
    expect(started).toEqual(['one', 'two']);
  });

  it('refuses requests while backing off after a 429, then resumes', async () => {
    const { gate, clock } = gateWithFakeTime(0);
    await expect(
      gate.run(() => Promise.reject(new UpstreamError('HTTP 429', 30_000))),
    ).rejects.toThrow('HTTP 429');
    let called = false;
    await expect(gate.run(async () => (called = true))).rejects.toThrow(/back off/);
    expect(called).toBe(false);
    clock.advance(30_000);
    await expect(gate.run(async () => 'ok')).resolves.toBe('ok');
  });

  it('keeps the queue moving after a failed request', async () => {
    const { gate } = gateWithFakeTime(0);
    await expect(gate.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(gate.run(async () => 'ok')).resolves.toBe('ok');
  });
});
```

Run: `npx vitest run apps/server/src/upstream/upstreamGate.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 5: Implement** `apps/server/src/upstream/upstreamGate.ts`

```ts
import type { Clock } from '../clock.js';
import { type HttpClient, UpstreamError } from './httpClient.js';

interface UpstreamGateOptions {
  minIntervalMs: number;
  clock: Clock;
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One request at a time per upstream host, spaced out, and none at all while the host has asked us to
 * back off (HTTP 429). Refused callers fall back to cached or snapshot data instead of waiting.
 */
export class UpstreamGate {
  readonly #options: Required<UpstreamGateOptions>;
  #queue: Promise<unknown> = Promise.resolve();
  #nextAllowedAtMs = 0;
  #backOffUntilMs = 0;

  constructor(options: UpstreamGateOptions) {
    this.#options = { sleep: realSleep, ...options };
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(() => this.#runInTurn(task));
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async #runInTurn<T>(task: () => Promise<T>): Promise<T> {
    const { clock, sleep, minIntervalMs } = this.#options;
    if (clock.now() < this.#backOffUntilMs) {
      throw new UpstreamError(
        `Upstream asked us to back off until ${new Date(this.#backOffUntilMs).toISOString()}`,
      );
    }
    const waitMs = this.#nextAllowedAtMs - clock.now();
    if (waitMs > 0) await sleep(waitMs);
    try {
      return await task();
    } catch (error) {
      this.#noteBackOff(error);
      throw error;
    } finally {
      this.#nextAllowedAtMs = clock.now() + minIntervalMs;
    }
  }

  #noteBackOff(error: unknown): void {
    if (error instanceof UpstreamError && error.retryAfterMs !== null) {
      this.#backOffUntilMs = this.#options.clock.now() + error.retryAfterMs;
    }
  }
}

export function gatedHttpClient(client: HttpClient, gate: UpstreamGate): HttpClient {
  return { getJson: (url) => gate.run(() => client.getJson(url)) };
}
```

Run the test again — Expected: PASS (4 tests).

- [ ] **Step 6: Finish** per the workflow. PROGRESS decisions to add:
  - One `UpstreamGate` per host (JPL SSD, api.nasa.gov): one request at a time, ≥ 1 s apart; after a 429 the host
    is refused until `Retry-After` (default 60 s) and callers fall back rather than queue.
  - Upstream failures of every kind (network, timeout, HTTP status, non-JSON) become `UpstreamError` with the key
    redacted.

Commit: `git commit -m "Add an upstream HTTP client with timeouts and per-host rate limiting"`

---

### Task 5: SQLite cache + stale-while-revalidate + scheduled refresh

Branch: `phase-2/dataset-cache`

**Files (under `apps/server/src/`):**

- Create: `errors.ts`, `datasets/types.ts`
- Create: `datasets/sqliteDatasetCache.ts` (+ `sqliteDatasetCache.test.ts`)
- Create: `datasets/datasetService.ts` (+ `datasetService.test.ts`)
- Create: `datasets/scheduledRefresh.ts` (+ `scheduledRefresh.test.ts`)
- Create: `testing/fakeSnapshots.ts`
- Modify: `.gitignore` (add `.cache/`)

**Interfaces:**

- Consumes: `Clock`, `TestClock`, `UpstreamError` (Task 4); `DatasetName`, `DatasetOrigin` (Task 3).
- Produces:
  - `errors.ts`: `DatasetUnavailableError`, `InvalidQueryError`.
  - `types.ts`: `CachedDataset { dataJson: string; fetchedAtMs: number }`,
    `ServedDataset extends CachedDataset { origin: DatasetOrigin }`,
    `DatasetCache { read(key): CachedDataset | undefined; write(key, dataset): void }`,
    `SnapshotReader { read(name: DatasetName): Promise<CachedDataset | undefined> }`,
    `DatasetRequest { cacheKey; ttlMs; snapshotName: DatasetName; fetchData(): Promise<unknown> }`,
    `DatasetLogger { warn(details: object, message: string): void }`.
  - `SqliteDatasetCache(database: DatabaseSync)`, `openDatasetDatabase(path): DatabaseSync`.
  - `DatasetService({ cache, snapshots, clock, logger })` with `read(request): Promise<ServedDataset>` and
    `refreshIfStale(request): Promise<void>` (never rejects); `FAILURE_BACKOFF_MS = 60_000`.
  - `startScheduledRefresh({ service, requests, intervalMs }): () => void`.
  - `testing/fakeSnapshots.ts`: `NO_SNAPSHOTS`, `snapshotsOf(datasets)`.

- [ ] **Step 1: Create the shared types and errors**

`apps/server/src/errors.ts`:

```ts
/** Upstream failed and there is no cached or snapshot copy to fall back to (HTTP 503). */
export class DatasetUnavailableError extends Error {
  override name = 'DatasetUnavailableError';
}

/** The caller's query string is invalid (HTTP 400). */
export class InvalidQueryError extends Error {
  override name = 'InvalidQueryError';
}
```

`apps/server/src/datasets/types.ts`:

```ts
import type { DatasetName, DatasetOrigin } from '@perihelion/data';

/** Validated, normalized data kept as JSON text so megabyte payloads are never re-parsed per request. */
export interface CachedDataset {
  dataJson: string;
  fetchedAtMs: number;
}

export interface ServedDataset extends CachedDataset {
  origin: DatasetOrigin;
}

export interface DatasetCache {
  read(cacheKey: string): CachedDataset | undefined;
  write(cacheKey: string, dataset: CachedDataset): void;
}

export interface SnapshotReader {
  read(name: DatasetName): Promise<CachedDataset | undefined>;
}

/** One dataset query: `fetchData` resolves to data already validated against its API schema. */
export interface DatasetRequest {
  cacheKey: string;
  ttlMs: number;
  snapshotName: DatasetName;
  fetchData(): Promise<unknown>;
}

/** The slice of Fastify's pino logger the service needs, so tests can pass a plain recorder. */
export interface DatasetLogger {
  warn(details: object, message: string): void;
}
```

`apps/server/src/testing/fakeSnapshots.ts`:

```ts
import type { DatasetName } from '@perihelion/data';
import type { CachedDataset, SnapshotReader } from '../datasets/types.js';

export const NO_SNAPSHOTS: SnapshotReader = { read: async () => undefined };

export function snapshotsOf(datasets: Partial<Record<DatasetName, CachedDataset>>): SnapshotReader {
  return { read: async (name) => datasets[name] };
}
```

- [ ] **Step 2: Write the failing cache tests** `apps/server/src/datasets/sqliteDatasetCache.test.ts`

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { SqliteDatasetCache, openDatasetDatabase } from './sqliteDatasetCache.js';

const DATASET = { dataJson: '[1,2,3]', fetchedAtMs: Date.UTC(2026, 8, 28) };

describe('SqliteDatasetCache', () => {
  it('misses a key it has never stored', () => {
    expect(new SqliteDatasetCache(new DatabaseSync(':memory:')).read('neos')).toBeUndefined();
  });

  it('reads back what it wrote, and a second write replaces the first', () => {
    const cache = new SqliteDatasetCache(new DatabaseSync(':memory:'));
    cache.write('neos', DATASET);
    expect(cache.read('neos')).toEqual(DATASET);
    cache.write('neos', { dataJson: '[]', fetchedAtMs: DATASET.fetchedAtMs + 1 });
    expect(cache.read('neos')).toEqual({ dataJson: '[]', fetchedAtMs: DATASET.fetchedAtMs + 1 });
  });

  it('survives a restart, which is what keeps data flowing with the network down', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'perihelion-')), 'nested', 'cache.sqlite');
    const first = openDatasetDatabase(path);
    new SqliteDatasetCache(first).write('cmes?days=30', DATASET);
    first.close();
    expect(new SqliteDatasetCache(openDatasetDatabase(path)).read('cmes?days=30')).toEqual(DATASET);
  });
});
```

Run: `npx vitest run apps/server/src/datasets/sqliteDatasetCache.test.ts` — Expected: FAIL, module not found.
(If Vitest cannot resolve `node:sqlite` itself, **stop and report**: that is a toolchain issue, not ours to hack.)

- [ ] **Step 3: Implement** `apps/server/src/datasets/sqliteDatasetCache.ts`

```ts
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { CachedDataset, DatasetCache } from './types.js';

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS dataset_cache (
  cache_key TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  fetched_at_ms INTEGER NOT NULL
) STRICT`;
const SELECT = 'SELECT data_json, fetched_at_ms FROM dataset_cache WHERE cache_key = ?';
const UPSERT = `INSERT INTO dataset_cache (cache_key, data_json, fetched_at_ms) VALUES (?, ?, ?)
  ON CONFLICT (cache_key) DO UPDATE SET data_json = excluded.data_json, fetched_at_ms = excluded.fetched_at_ms`;

/** Creates the parent directory, since the default path (.cache/) does not exist on a fresh checkout. */
export function openDatasetDatabase(path: string): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  return new DatabaseSync(path);
}

export class SqliteDatasetCache implements DatasetCache {
  readonly #select: StatementSync;
  readonly #upsert: StatementSync;

  constructor(database: DatabaseSync) {
    database.exec(CREATE_TABLE);
    this.#select = database.prepare(SELECT);
    this.#upsert = database.prepare(UPSERT);
  }

  read(cacheKey: string): CachedDataset | undefined {
    const row = this.#select.get(cacheKey);
    if (row === undefined) return undefined;
    const { data_json: dataJson, fetched_at_ms: fetchedAtMs } = row;
    if (typeof dataJson !== 'string' || typeof fetchedAtMs !== 'number') {
      throw new TypeError(`Corrupt cache row for ${cacheKey}`);
    }
    return { dataJson, fetchedAtMs };
  }

  write(cacheKey: string, dataset: CachedDataset): void {
    this.#upsert.run(cacheKey, dataset.dataJson, dataset.fetchedAtMs);
  }
}
```

Add `.cache/` to `.gitignore` (`*.sqlite` is already there). Run the test again — Expected: PASS (3 tests).

- [ ] **Step 4: Write the failing service tests** `apps/server/src/datasets/datasetService.test.ts`

```ts
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { DatasetUnavailableError } from '../errors.js';
import { NO_SNAPSHOTS, snapshotsOf } from '../testing/fakeSnapshots.js';
import { TestClock } from '../testing/testClock.js';
import { UpstreamError } from '../upstream/httpClient.js';
import { DatasetService, FAILURE_BACKOFF_MS } from './datasetService.js';
import { SqliteDatasetCache } from './sqliteDatasetCache.js';
import type { DatasetRequest, SnapshotReader } from './types.js';

const HOUR_MS = 3_600_000;
const SNAPSHOT = { dataJson: '["snapshot"]', fetchedAtMs: Date.UTC(2026, 8, 1) };

function setup(snapshots: SnapshotReader = NO_SNAPSHOTS) {
  const clock = new TestClock(Date.UTC(2026, 8, 28, 12));
  const cache = new SqliteDatasetCache(new DatabaseSync(':memory:'));
  const warnings: string[] = [];
  const logger = { warn: (_details: object, message: string) => void warnings.push(message) };
  return {
    service: new DatasetService({ cache, snapshots, clock, logger }),
    cache,
    clock,
    warnings,
  };
}

/** A request whose upstream answers with the call number, so tests can tell fetches apart. */
function countingRequest(fetchData?: () => Promise<unknown>) {
  let calls = 0;
  const request: DatasetRequest = {
    cacheKey: 'cmes?days=30',
    ttlMs: HOUR_MS,
    snapshotName: 'cmes',
    fetchData: async () => {
      calls += 1;
      return fetchData === undefined ? [calls] : fetchData();
    },
  };
  return { request, calls: () => calls };
}

const offline = () => Promise.reject(new UpstreamError('network is off'));

describe('DatasetService.read', () => {
  it('fetches on a cold cache, stores the result and serves it fresh', async () => {
    const { service, cache } = setup();
    const { request } = countingRequest();
    await expect(service.read(request)).resolves.toMatchObject({
      dataJson: '[1]',
      origin: 'fresh',
    });
    expect(cache.read(request.cacheKey)?.dataJson).toBe('[1]');
  });

  it('serves a fresh cached copy without calling upstream', async () => {
    const { service } = setup();
    const { request, calls } = countingRequest();
    await service.read(request);
    await expect(service.read(request)).resolves.toMatchObject({ origin: 'fresh' });
    expect(calls()).toBe(1);
  });

  it('serves a stale copy at once and refreshes it in the background', async () => {
    const { service, cache, clock } = setup();
    const { request } = countingRequest();
    await service.read(request);
    clock.advance(HOUR_MS);
    await expect(service.read(request)).resolves.toMatchObject({
      dataJson: '[1]',
      origin: 'stale',
    });
    await vi.waitFor(() => expect(cache.read(request.cacheKey)?.dataJson).toBe('[2]'));
  });

  it('shares one upstream request between concurrent cold reads', async () => {
    const { service } = setup();
    const { request, calls } = countingRequest();
    const [first, second] = await Promise.all([service.read(request), service.read(request)]);
    expect(calls()).toBe(1);
    expect(second).toEqual(first);
  });

  it('falls back to the snapshot when upstream fails on a cold cache, and says why', async () => {
    const { service, warnings } = setup(snapshotsOf({ cmes: SNAPSHOT }));
    await expect(service.read(countingRequest(offline).request)).resolves.toEqual({
      ...SNAPSHOT,
      origin: 'snapshot',
    });
    expect(warnings).toEqual(['Dataset refresh failed']);
  });

  it('answers unavailable when upstream fails and there is no snapshot', async () => {
    const { service } = setup();
    await expect(service.read(countingRequest(offline).request)).rejects.toThrow(
      DatasetUnavailableError,
    );
  });

  it('does not retry a failed upstream on every request, only after the back-off', async () => {
    const { service, clock } = setup(snapshotsOf({ cmes: SNAPSHOT }));
    const { request, calls } = countingRequest(offline);
    await service.read(request);
    await service.read(request);
    expect(calls()).toBe(1);
    clock.advance(FAILURE_BACKOFF_MS);
    await service.read(request);
    expect(calls()).toBe(2);
  });

  it('keeps serving the stale copy when the background refresh fails', async () => {
    const { service, clock, warnings } = setup();
    let failing = false;
    const { request } = countingRequest(async () => (failing ? offline() : ['cached']));
    await service.read(request);
    failing = true;
    clock.advance(HOUR_MS);
    await expect(service.read(request)).resolves.toMatchObject({
      dataJson: '["cached"]',
      origin: 'stale',
    });
    await vi.waitFor(() => expect(warnings).toEqual(['Dataset refresh failed']));
  });
});

describe('DatasetService.refreshIfStale', () => {
  it('skips a fresh copy, refreshes a stale one, and never rejects', async () => {
    const { service, clock } = setup();
    const { request, calls } = countingRequest();
    await service.refreshIfStale(request);
    await service.refreshIfStale(request);
    expect(calls()).toBe(1);
    clock.advance(HOUR_MS);
    await service.refreshIfStale(request);
    expect(calls()).toBe(2);
    await expect(service.refreshIfStale(countingRequest(offline).request)).resolves.toBeUndefined();
  });
});
```

Run: `npx vitest run apps/server/src/datasets/datasetService.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 5: Implement** `apps/server/src/datasets/datasetService.ts`

```ts
import type { Clock } from '../clock.js';
import { DatasetUnavailableError } from '../errors.js';
import type {
  CachedDataset,
  DatasetCache,
  DatasetLogger,
  DatasetRequest,
  ServedDataset,
  SnapshotReader,
} from './types.js';

/** After an upstream failure, cold reads go straight to the snapshot for this long (Review Focus 1). */
export const FAILURE_BACKOFF_MS = 60_000;

interface DatasetServiceDependencies {
  cache: DatasetCache;
  snapshots: SnapshotReader;
  clock: Clock;
  logger: DatasetLogger;
}

/**
 * Serves each dataset from the SQLite cache while fresh; once stale, serves it anyway and refreshes in
 * the background (stale-while-revalidate). With no cached copy it fetches upstream, and falls back to
 * the bundled snapshot when that fails, so a dead upstream API degrades the app instead of breaking it.
 */
export class DatasetService {
  readonly #deps: DatasetServiceDependencies;
  readonly #inFlight = new Map<string, Promise<CachedDataset>>();
  readonly #lastFailureAtMs = new Map<string, number>();

  constructor(dependencies: DatasetServiceDependencies) {
    this.#deps = dependencies;
  }

  async read(request: DatasetRequest): Promise<ServedDataset> {
    const cached = this.#deps.cache.read(request.cacheKey);
    if (cached === undefined) return this.#fetchOrFallBack(request);
    if (this.#isFresh(cached, request)) return { ...cached, origin: 'fresh' };
    this.#refresh(request).catch((error: unknown) => this.#recordFailure(request, error));
    return { ...cached, origin: 'stale' };
  }

  /** For the scheduler: refreshes only what has gone stale, and logs rather than rejects. */
  async refreshIfStale(request: DatasetRequest): Promise<void> {
    const cached = this.#deps.cache.read(request.cacheKey);
    if (cached !== undefined && this.#isFresh(cached, request)) return;
    await this.#refresh(request).catch((error: unknown) => this.#recordFailure(request, error));
  }

  #isFresh(cached: CachedDataset, request: DatasetRequest): boolean {
    return this.#deps.clock.now() - cached.fetchedAtMs < request.ttlMs;
  }

  async #fetchOrFallBack(request: DatasetRequest): Promise<ServedDataset> {
    if (this.#failedRecently(request)) return this.#snapshotOrThrow(request);
    try {
      return { ...(await this.#refresh(request)), origin: 'fresh' };
    } catch (error) {
      this.#recordFailure(request, error);
      return this.#snapshotOrThrow(request);
    }
  }

  async #snapshotOrThrow(request: DatasetRequest): Promise<ServedDataset> {
    const snapshot = await this.#deps.snapshots.read(request.snapshotName);
    if (snapshot === undefined) {
      throw new DatasetUnavailableError(
        `${request.cacheKey} is unavailable: upstream failed and there is no snapshot`,
      );
    }
    return { ...snapshot, origin: 'snapshot' };
  }

  /** Concurrent callers share one upstream request per cache key. */
  #refresh(request: DatasetRequest): Promise<CachedDataset> {
    const pending = this.#inFlight.get(request.cacheKey);
    if (pending !== undefined) return pending;
    const refresh = this.#fetchAndStore(request).finally(() =>
      this.#inFlight.delete(request.cacheKey),
    );
    this.#inFlight.set(request.cacheKey, refresh);
    return refresh;
  }

  async #fetchAndStore(request: DatasetRequest): Promise<CachedDataset> {
    const dataset = {
      dataJson: JSON.stringify(await request.fetchData()),
      fetchedAtMs: this.#deps.clock.now(),
    };
    this.#deps.cache.write(request.cacheKey, dataset);
    this.#lastFailureAtMs.delete(request.cacheKey);
    return dataset;
  }

  #failedRecently(request: DatasetRequest): boolean {
    const failedAtMs = this.#lastFailureAtMs.get(request.cacheKey);
    return failedAtMs !== undefined && this.#deps.clock.now() - failedAtMs < FAILURE_BACKOFF_MS;
  }

  #recordFailure(request: DatasetRequest, error: unknown): void {
    this.#lastFailureAtMs.set(request.cacheKey, this.#deps.clock.now());
    this.#deps.logger.warn({ cacheKey: request.cacheKey, err: error }, 'Dataset refresh failed');
  }
}
```

Run the test again — Expected: PASS (9 tests).

- [ ] **Step 6: Write the failing scheduler test** `apps/server/src/datasets/scheduledRefresh.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startScheduledRefresh } from './scheduledRefresh.js';
import type { DatasetRequest } from './types.js';

const request = (cacheKey: string): DatasetRequest => ({
  cacheKey,
  ttlMs: 1,
  snapshotName: 'neos',
  fetchData: async () => [],
});

afterEach(() => vi.useRealTimers());

describe('startScheduledRefresh', () => {
  it('refreshes every dataset at start and on each interval until stopped', async () => {
    vi.useFakeTimers();
    const refreshed: string[] = [];
    const service = {
      refreshIfStale: async (r: DatasetRequest) => void refreshed.push(r.cacheKey),
    };
    const stop = startScheduledRefresh({
      service,
      requests: () => [request('a'), request('b')],
      intervalMs: 1_000,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshed).toEqual(['a', 'b']);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(refreshed).toEqual(['a', 'b', 'a', 'b']);
    stop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(refreshed).toHaveLength(4);
  });
});
```

Run: `npx vitest run apps/server/src/datasets/scheduledRefresh.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 7: Implement** `apps/server/src/datasets/scheduledRefresh.ts`

```ts
import type { DatasetRequest } from './types.js';

interface ScheduledRefreshOptions {
  service: { refreshIfStale(request: DatasetRequest): Promise<void> };
  /** Rebuilt on every tick: date windows move with the clock. */
  requests: () => readonly DatasetRequest[];
  intervalMs: number;
}

/**
 * Warms the cache at start-up and keeps it warm, so visitors rarely wait on upstream. One dataset at a
 * time: the upstream gates would serialize them anyway. Returns a function that stops the schedule.
 */
export function startScheduledRefresh(options: ScheduledRefreshOptions): () => void {
  const tick = () => refreshInTurn(options);
  void tick();
  const timer = setInterval(() => void tick(), options.intervalMs);
  // Never keep the process alive just for a refresh.
  timer.unref();
  return () => clearInterval(timer);
}

async function refreshInTurn({ service, requests }: ScheduledRefreshOptions): Promise<void> {
  for (const request of requests()) await service.refreshIfStale(request);
}
```

Run the test again — Expected: PASS.

- [ ] **Step 8: Finish** per the workflow. PROGRESS decisions to add:
  - Cache is one `node:sqlite` table (`dataset_cache`: key, validated JSON, fetch time) at `DATABASE_PATH`
    (default `.cache/perihelion.sqlite`, git-ignored). Data is stored as JSON text so `/api/neos` is never re-parsed
    per request.
  - Read path: fresh → cache; stale → cache now + background refresh; cold → upstream, else snapshot, else 503.
    Concurrent cold reads share one fetch; after a failure, cold reads go straight to the snapshot for 60 s.
  - The scheduler refreshes the default queries at start-up and every 10 minutes (wired in Task 6), skipping
    anything still fresh.

Commit: `git commit -m "Add a SQLite dataset cache with stale-while-revalidate and scheduled refresh"`

---

### Task 6: `/api/neos`, `/api/close-approaches`, `/api/cmes` with recorded-response tests

Branch: `phase-2/api-routes`

**Files (under `apps/server/`):**

- Create: `src/config.ts` (+ `config.test.ts`)
- Create: `src/upstream/upstreamClients.ts`
- Create: `src/datasets/snapshotReader.ts` (+ `snapshotReader.test.ts`)
- Create: `src/datasets/datasetRequests.ts` (+ `datasetRequests.test.ts`)
- Create: `src/datasets/createDatasets.ts`
- Create: `src/routes/datasetRoutes.ts` (+ `datasetRoutes.test.ts`, `neoPayload.test.ts`)
- Create: `src/testing/fakeUpstream.ts`, `src/testing/testServer.ts`
- Modify: `src/app.ts`, `src/app.test.ts`, `src/main.ts`, `package.json`

**Interfaces:**

- Consumes: everything from Tasks 1–5; `RECORDED_*` and `loadFullSbdbNeoResponse` (Task 2).
- Produces:
  - `readServerConfig(env): ServerConfig { port; nasaApiKey; usingDemoKey; databasePath; snapshotDirectory }`.
  - `createUpstreamClients(clock): { jpl: HttpClient; donki: HttpClient }`.
  - `createFileSnapshotReader(directory): SnapshotReader`.
  - `DATASET_TTL_MS`, `DatasetRequests { neos(); closeApproaches(days); cmes(days) }`,
    `createDatasetRequests({ jpl, donki, clock, nasaApiKey })`, `defaultDatasetRequests(requests):
Record<DatasetName, DatasetRequest>`.
  - `createDatasets(config, logger): { service; requests; close() }`.
  - `registerDatasetRoutes(app, { service, requests })`; `buildApp(options?): Promise<FastifyInstance>`.
  - Test helpers: `FakeUpstream`, `RECORDED_BODIES`, `createTestServer(options?)`, `TEST_NOW_MS`, `TEST_API_KEY`.

- [ ] **Step 1: Add dependencies and scripts**

```bash
npm i @fastify/compress -w @perihelion/server
npm i -D @perihelion/fixtures@* -w @perihelion/server
```

In `apps/server/package.json` set `"dev": "tsx watch --env-file-if-exists=../../.env src/main.ts"`.

- [ ] **Step 2: Write the failing config test** `apps/server/src/config.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { readServerConfig } from './config.js';

describe('readServerConfig', () => {
  it('uses development defaults', () => {
    expect(readServerConfig({})).toEqual({
      port: 8787,
      nasaApiKey: 'DEMO_KEY',
      usingDemoKey: true,
      databasePath: '.cache/perihelion.sqlite',
      snapshotDirectory: '../web/public/snapshot',
    });
  });

  it('reads the environment, treating blank values as unset', () => {
    const config = readServerConfig({
      PORT: '9000',
      NASA_API_KEY: 'abc',
      DATABASE_PATH: '',
      SNAPSHOT_DIR: '/srv/snap',
    });
    expect(config).toMatchObject({
      port: 9000,
      nasaApiKey: 'abc',
      usingDemoKey: false,
      snapshotDirectory: '/srv/snap',
    });
    expect(config.databasePath).toBe('.cache/perihelion.sqlite');
  });

  it('rejects a port that is not a port', () => {
    expect(() => readServerConfig({ PORT: 'http' })).toThrow(RangeError);
  });
});
```

Run: `npx vitest run apps/server/src/config.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `apps/server/src/config.ts`

```ts
type Environment = Readonly<Record<string, string | undefined>>;

export interface ServerConfig {
  port: number;
  nasaApiKey: string;
  usingDemoKey: boolean;
  /** Relative paths resolve against the working directory; `npm run dev|start -w` runs in apps/server. */
  databasePath: string;
  snapshotDirectory: string;
}

const DEFAULT_PORT = 8787;
const MAX_PORT = 65_535;
// NASA's public shared key: enough for an hourly cached refresh, but heavily rate-limited (PROGRESS.md).
const DEMO_API_KEY = 'DEMO_KEY';

export function readServerConfig(env: Environment): ServerConfig {
  const nasaApiKey = nonBlank(env['NASA_API_KEY']);
  return {
    port: readPort(nonBlank(env['PORT'])),
    nasaApiKey: nasaApiKey ?? DEMO_API_KEY,
    usingDemoKey: nasaApiKey === undefined,
    databasePath: nonBlank(env['DATABASE_PATH']) ?? '.cache/perihelion.sqlite',
    snapshotDirectory: nonBlank(env['SNAPSHOT_DIR']) ?? '../web/public/snapshot',
  };
}

function readPort(text: string | undefined): number {
  const port = Number(text ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 0 || port > MAX_PORT)
    throw new RangeError(`PORT is not a port: ${text}`);
  return port;
}

function nonBlank(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}
```

Run the test again — Expected: PASS (3 tests).

- [ ] **Step 4: Write the failing snapshot-reader test** `apps/server/src/datasets/snapshotReader.test.ts`

```ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFileSnapshotReader } from './snapshotReader.js';

function snapshotDir(files: Record<string, string>): string {
  const directory = mkdtempSync(join(tmpdir(), 'perihelion-snapshot-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(directory, name), text);
  return directory;
}

describe('createFileSnapshotReader', () => {
  it('reads a valid snapshot as a cached dataset', async () => {
    const directory = snapshotDir({
      'cmes.json': '{"fetchedAt":"2026-09-01T00:00:00.000Z","data":[]}',
    });
    await expect(createFileSnapshotReader(directory).read('cmes')).resolves.toEqual({
      dataJson: '[]',
      fetchedAtMs: Date.UTC(2026, 8, 1),
    });
  });

  it('has nothing to offer when the file is missing', async () => {
    await expect(createFileSnapshotReader(snapshotDir({})).read('neos')).resolves.toBeUndefined();
  });

  it('fails loudly on an invalid snapshot, which would be a bug in our own repo', async () => {
    const directory = snapshotDir({ 'cmes.json': '{"fetchedAt":"yesterday","data":[]}' });
    await expect(createFileSnapshotReader(directory).read('cmes')).rejects.toThrow();
  });
});
```

Run: `npx vitest run apps/server/src/datasets/snapshotReader.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 5: Implement** `apps/server/src/datasets/snapshotReader.ts`

```ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type DatasetName, datasetSnapshotSchema, snapshotFileName } from '@perihelion/data';
import type { CachedDataset, SnapshotReader } from './types.js';

/** Reads each committed fallback copy once; it only changes when `npm run snapshot` is re-run. */
export function createFileSnapshotReader(directory: string): SnapshotReader {
  const loaded = new Map<DatasetName, Promise<CachedDataset | undefined>>();
  return {
    read(name) {
      const snapshot = loaded.get(name) ?? loadSnapshot(directory, name);
      loaded.set(name, snapshot);
      return snapshot;
    },
  };
}

async function loadSnapshot(
  directory: string,
  name: DatasetName,
): Promise<CachedDataset | undefined> {
  const text = await readOptionalFile(join(directory, snapshotFileName(name)));
  if (text === undefined) return undefined;
  const snapshot = datasetSnapshotSchema(name).parse(JSON.parse(text));
  return { dataJson: JSON.stringify(snapshot.data), fetchedAtMs: Date.parse(snapshot.fetchedAt) };
}

async function readOptionalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingFile(error)) return undefined;
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
```

Run the test again — Expected: PASS (3 tests).

- [ ] **Step 6: Write the test helpers**

`apps/server/src/testing/fakeUpstream.ts`:

```ts
import {
  RECORDED_CAD_WINDOW,
  RECORDED_DONKI_CME_WINDOW,
  RECORDED_SBDB_NEO_SAMPLE,
} from '@perihelion/fixtures/upstream';
import { type HttpClient, UpstreamError } from '../upstream/httpClient.js';

/** Recorded bodies by upstream path; the query string does not matter to a recording. */
export const RECORDED_BODIES: Readonly<Record<string, unknown>> = {
  '/sbdb_query.api': RECORDED_SBDB_NEO_SAMPLE,
  '/cad.api': RECORDED_CAD_WINDOW,
  '/DONKI/CME': RECORDED_DONKI_CME_WINDOW,
};

/** Stands in for both JPL and DONKI clients; `offline` simulates a dead network. */
export class FakeUpstream implements HttpClient {
  readonly requests: URL[] = [];
  offline = false;
  readonly #bodies: ReadonlyMap<string, unknown>;

  constructor(bodies: Readonly<Record<string, unknown>> = RECORDED_BODIES) {
    this.#bodies = new Map(Object.entries(bodies));
  }

  async getJson(url: URL): Promise<unknown> {
    this.requests.push(url);
    if (this.offline) throw new UpstreamError('network is off');
    if (!this.#bodies.has(url.pathname))
      throw new UpstreamError(`No recording for ${url.pathname}`);
    return this.#bodies.get(url.pathname);
  }
}
```

`apps/server/src/testing/testServer.ts`:

```ts
import { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { createDatasetRequests } from '../datasets/datasetRequests.js';
import { DatasetService } from '../datasets/datasetService.js';
import { SqliteDatasetCache } from '../datasets/sqliteDatasetCache.js';
import type { SnapshotReader } from '../datasets/types.js';
import { registerDatasetRoutes } from '../routes/datasetRoutes.js';
import { NO_SNAPSHOTS } from './fakeSnapshots.js';
import { FakeUpstream } from './fakeUpstream.js';
import { TestClock } from './testClock.js';

export const TEST_NOW_MS = Date.UTC(2026, 8, 28, 12);
export const TEST_API_KEY = 'TEST-KEY';

interface TestServerOptions {
  upstream?: FakeUpstream;
  snapshots?: SnapshotReader;
}

export interface TestServer {
  app: FastifyInstance;
  upstream: FakeUpstream;
  clock: TestClock;
  warnings: string[];
}

/** The real app, routes, service and SQLite cache; only the network, clock and snapshots are fake. */
export async function createTestServer(options: TestServerOptions = {}): Promise<TestServer> {
  const upstream = options.upstream ?? new FakeUpstream();
  const clock = new TestClock(TEST_NOW_MS);
  const warnings: string[] = [];
  const service = new DatasetService({
    cache: new SqliteDatasetCache(new DatabaseSync(':memory:')),
    snapshots: options.snapshots ?? NO_SNAPSHOTS,
    clock,
    logger: { warn: (_details, message) => void warnings.push(message) },
  });
  const requests = createDatasetRequests({
    jpl: upstream,
    donki: upstream,
    clock,
    nasaApiKey: TEST_API_KEY,
  });
  const app = await buildApp();
  registerDatasetRoutes(app, { service, requests });
  return { app, upstream, clock, warnings };
}
```

- [ ] **Step 7: Write the failing request tests** `apps/server/src/datasets/datasetRequests.test.ts`

```ts
import { RECORDED_CAD_EMPTY, RECORDED_DONKI_CME_EMPTY } from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { FakeUpstream } from '../testing/fakeUpstream.js';
import { TEST_API_KEY, TEST_NOW_MS } from '../testing/testServer.js';
import { TestClock } from '../testing/testClock.js';
import {
  DATASET_TTL_MS,
  createDatasetRequests,
  defaultDatasetRequests,
} from './datasetRequests.js';

function requestsWith(upstream = new FakeUpstream()) {
  const clock = new TestClock(TEST_NOW_MS);
  return {
    upstream,
    requests: createDatasetRequests({
      jpl: upstream,
      donki: upstream,
      clock,
      nasaApiKey: TEST_API_KEY,
    }),
  };
}

describe('createDatasetRequests', () => {
  it('keys each query by name and window, with its TTL', () => {
    const { requests } = requestsWith();
    expect(requests.neos()).toMatchObject({
      cacheKey: 'neos',
      ttlMs: DATASET_TTL_MS.neos,
      snapshotName: 'neos',
    });
    expect(requests.closeApproaches(3).cacheKey).toBe('close-approaches?days=3');
    expect(requests.cmes(30)).toMatchObject({ cacheKey: 'cmes?days=30', snapshotName: 'cmes' });
  });

  it('asks CAD for today ± days and DONKI for the last days, with the key', async () => {
    const { upstream, requests } = requestsWith();
    await requests.closeApproaches(7).fetchData();
    await requests.cmes(30).fetchData();
    const [cad, donki] = upstream.requests;
    expect([cad?.searchParams.get('date-min'), cad?.searchParams.get('date-max')]).toEqual([
      '2026-09-21',
      '2026-10-05',
    ]);
    expect([donki?.searchParams.get('startDate'), donki?.searchParams.get('endDate')]).toEqual([
      '2026-08-29',
      '2026-09-28',
    ]);
    expect(donki?.searchParams.get('api_key')).toBe(TEST_API_KEY);
  });

  it('rejects an upstream body that fails validation, so it never reaches the cache', async () => {
    const { requests } = requestsWith(new FakeUpstream({ '/cad.api': { unexpected: true } }));
    await expect(requests.closeApproaches(7).fetchData()).rejects.toThrow();
  });

  it('serves empty upstream windows as empty lists', async () => {
    const { requests } = requestsWith(
      new FakeUpstream({ '/cad.api': RECORDED_CAD_EMPTY, '/DONKI/CME': RECORDED_DONKI_CME_EMPTY }),
    );
    await expect(requests.closeApproaches(7).fetchData()).resolves.toEqual([]);
    await expect(requests.cmes(30).fetchData()).resolves.toEqual([]);
  });
});

describe('defaultDatasetRequests', () => {
  it('covers every dataset with its default window', () => {
    const defaults = defaultDatasetRequests(requestsWith().requests);
    expect(Object.values(defaults).map((request) => request.cacheKey)).toEqual([
      'neos',
      'close-approaches?days=7',
      'cmes?days=30',
    ]);
  });
});
```

Run: `npx vitest run apps/server/src/datasets/datasetRequests.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 8: Implement** `apps/server/src/datasets/datasetRequests.ts`

```ts
import {
  DATASET_DATA_SCHEMAS,
  DEFAULT_CLOSE_APPROACH_DAYS,
  DEFAULT_CME_DAYS,
  type DatasetName,
  type UpstreamQuery,
  cadQuery,
  closeApproachWindow,
  cmeWindow,
  donkiCmeQuery,
  donkiCmeResponseSchema,
  jplColumnarResponseSchema,
  sbdbNeoQuery,
  toCloseApproaches,
  toCmes,
  toNeoCatalog,
} from '@perihelion/data';
import type { Clock } from '../clock.js';
import type { HttpClient } from '../upstream/httpClient.js';
import { upstreamUrl } from '../upstream/upstreamUrl.js';
import type { DatasetRequest } from './types.js';

const HOUR_MS = 3_600_000;

/** NEO orbits change slowly; close approaches and CMEs are news. */
export const DATASET_TTL_MS = {
  neos: 24 * HOUR_MS,
  'close-approaches': HOUR_MS,
  cmes: HOUR_MS,
} as const satisfies Record<DatasetName, number>;

export interface DatasetRequests {
  neos(): DatasetRequest;
  closeApproaches(days: number): DatasetRequest;
  cmes(days: number): DatasetRequest;
}

interface DatasetRequestDependencies {
  jpl: HttpClient;
  donki: HttpClient;
  clock: Clock;
  nasaApiKey: string;
}

export function createDatasetRequests(deps: DatasetRequestDependencies): DatasetRequests {
  const getJson = (client: HttpClient, query: UpstreamQuery) => client.getJson(upstreamUrl(query));
  return {
    neos: () =>
      datasetRequest('neos', 'neos', async () =>
        toNeoCatalog(jplColumnarResponseSchema.parse(await getJson(deps.jpl, sbdbNeoQuery()))),
      ),
    closeApproaches: (days) =>
      datasetRequest('close-approaches', `close-approaches?days=${days}`, async () => {
        const query = cadQuery(closeApproachWindow(deps.clock.now(), days));
        return toCloseApproaches(jplColumnarResponseSchema.parse(await getJson(deps.jpl, query)));
      }),
    cmes: (days) =>
      datasetRequest('cmes', `cmes?days=${days}`, async () => {
        const query = donkiCmeQuery(cmeWindow(deps.clock.now(), days), deps.nasaApiKey);
        return toCmes(donkiCmeResponseSchema.parse(await getJson(deps.donki, query)));
      }),
  };
}

/** The final schema check guarantees the cache only ever holds what the API promises. */
function datasetRequest(
  name: DatasetName,
  cacheKey: string,
  fetchData: () => Promise<unknown>,
): DatasetRequest {
  return {
    cacheKey,
    ttlMs: DATASET_TTL_MS[name],
    snapshotName: name,
    fetchData: async () => DATASET_DATA_SCHEMAS[name].parse(await fetchData()),
  };
}

/** What the scheduler keeps warm and what `npm run snapshot` writes. */
export function defaultDatasetRequests(
  requests: DatasetRequests,
): Record<DatasetName, DatasetRequest> {
  return {
    neos: requests.neos(),
    'close-approaches': requests.closeApproaches(DEFAULT_CLOSE_APPROACH_DAYS),
    cmes: requests.cmes(DEFAULT_CME_DAYS),
  };
}
```

(`createDatasetRequests` runs past 20 lines because it is three one-line factories; if review objects, split each
into `neoRequest(deps)`, `closeApproachRequest(deps, days)`, `cmeRequest(deps, days)`.)

Run the test again — Expected: PASS (5 tests).

- [ ] **Step 9: Implement the production wiring** (covered by the route tests and the smoke test)

`apps/server/src/upstream/upstreamClients.ts`:

```ts
import type { Clock } from '../clock.js';
import { type HttpClient, createHttpClient } from './httpClient.js';
import { UpstreamGate, gatedHttpClient } from './upstreamGate.js';

// The full SBDB NEO query returns megabytes and can take a while; the others are small.
const JPL_TIMEOUT_MS = 60_000;
const DONKI_TIMEOUT_MS = 30_000;
const MIN_REQUEST_INTERVAL_MS = 1_000;

/** One gate per host: SBDB and CAD share JPL SSD's; DONKI is on api.nasa.gov. */
export function createUpstreamClients(clock: Clock): { jpl: HttpClient; donki: HttpClient } {
  const gated = (timeoutMs: number) =>
    gatedHttpClient(
      createHttpClient({ fetchImpl: fetch, timeoutMs }),
      new UpstreamGate({ minIntervalMs: MIN_REQUEST_INTERVAL_MS, clock }),
    );
  return { jpl: gated(JPL_TIMEOUT_MS), donki: gated(DONKI_TIMEOUT_MS) };
}
```

`apps/server/src/datasets/createDatasets.ts`:

```ts
import { systemClock } from '../clock.js';
import type { ServerConfig } from '../config.js';
import { createUpstreamClients } from '../upstream/upstreamClients.js';
import { type DatasetRequests, createDatasetRequests } from './datasetRequests.js';
import { DatasetService } from './datasetService.js';
import { createFileSnapshotReader } from './snapshotReader.js';
import { SqliteDatasetCache, openDatasetDatabase } from './sqliteDatasetCache.js';
import type { DatasetLogger } from './types.js';

export interface Datasets {
  service: DatasetService;
  requests: DatasetRequests;
  close(): void;
}

export function createDatasets(config: ServerConfig, logger: DatasetLogger): Datasets {
  const database = openDatasetDatabase(config.databasePath);
  const service = new DatasetService({
    cache: new SqliteDatasetCache(database),
    snapshots: createFileSnapshotReader(config.snapshotDirectory),
    clock: systemClock,
    logger,
  });
  const clients = createUpstreamClients(systemClock);
  const requests = createDatasetRequests({
    ...clients,
    clock: systemClock,
    nasaApiKey: config.nasaApiKey,
  });
  return { service, requests, close: () => database.close() };
}
```

- [ ] **Step 10: Write the failing route tests** `apps/server/src/routes/datasetRoutes.test.ts`

```ts
import { datasetResponseSchema } from '@perihelion/data';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { snapshotsOf } from '../testing/fakeSnapshots.js';
import { FakeUpstream } from '../testing/fakeUpstream.js';
import { type TestServer, createTestServer } from '../testing/testServer.js';

const DAY_MS = 86_400_000;
let server: TestServer | undefined;

async function start(options?: Parameters<typeof createTestServer>[0]): Promise<TestServer> {
  server = await createTestServer(options);
  return server;
}

const get = (url: string) => {
  if (server === undefined) throw new Error('start() first');
  return server.app.inject({ method: 'GET', url });
};

afterEach(async () => {
  await server?.app.close();
  server = undefined;
});

describe('GET /api/neos', () => {
  it('serves the recorded SBDB sample as a validated columnar catalog', async () => {
    await start();
    const response = await get('/api/neos');
    expect(response.statusCode).toBe(200);
    const body = datasetResponseSchema('neos').parse(response.json());
    expect(body).toMatchObject({ origin: 'fresh', fetchedAt: '2026-09-28T12:00:00.000Z' });
    expect(body.data.count).toBeGreaterThan(0);
  });

  it('answers a repeat from the cache, then serves stale and refreshes once a day has passed', async () => {
    const { upstream, clock } = await start();
    await get('/api/neos');
    expect((await get('/api/neos')).json()).toMatchObject({ origin: 'fresh' });
    expect(upstream.requests).toHaveLength(1);
    clock.advance(DAY_MS);
    expect((await get('/api/neos')).json()).toMatchObject({ origin: 'stale' });
    await vi.waitFor(() => expect(upstream.requests).toHaveLength(2));
  });
});

describe('GET /api/close-approaches', () => {
  it('serves validated approaches for today ± 7 days by default', async () => {
    const { upstream } = await start();
    const response = await get('/api/close-approaches');
    expect(response.statusCode).toBe(200);
    datasetResponseSchema('close-approaches').parse(response.json());
    expect(upstream.requests[0]?.searchParams.get('date-min')).toBe('2026-09-21');
  });

  it('honours ?days=3', async () => {
    const { upstream } = await start();
    await get('/api/close-approaches?days=3');
    expect(upstream.requests[0]?.searchParams.get('date-max')).toBe('2026-10-01');
  });

  it.each(['0', '61', '2.5', 'abc', '', '1&days=2'])(
    'rejects days=%s with 400 without calling upstream',
    async (days) => {
      const { upstream } = await start();
      const response = await get(`/api/close-approaches?days=${days}`);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'days must be a whole number from 1 to 60' });
      expect(upstream.requests).toHaveLength(0);
    },
  );
});

describe('GET /api/cmes', () => {
  it('serves validated CMEs for the last 30 days by default', async () => {
    const { upstream } = await start();
    const response = await get('/api/cmes');
    expect(response.statusCode).toBe(200);
    expect(datasetResponseSchema('cmes').parse(response.json()).data.length).toBeGreaterThan(0);
    expect(upstream.requests[0]?.searchParams.get('startDate')).toBe('2026-08-29');
  });
});

describe('when upstream is down', () => {
  const offline = () => Object.assign(new FakeUpstream(), { offline: true });
  const SNAPSHOT = { dataJson: '[]', fetchedAtMs: Date.UTC(2026, 8, 1) };

  it('serves the snapshot, marked as such', async () => {
    await start({ upstream: offline(), snapshots: snapshotsOf({ cmes: SNAPSHOT }) });
    const response = await get('/api/cmes');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      fetchedAt: '2026-09-01T00:00:00.000Z',
      origin: 'snapshot',
      data: [],
    });
  });

  it('answers 503 when there is no snapshot either', async () => {
    await start({ upstream: offline() });
    const response = await get('/api/cmes');
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: expect.stringContaining('unavailable') });
  });

  it('keeps serving what it cached before the network went down', async () => {
    const { upstream, clock } = await start();
    await get('/api/cmes');
    upstream.offline = true;
    clock.advance(DAY_MS);
    expect((await get('/api/cmes')).json()).toMatchObject({ origin: 'stale' });
  });
});
```

And `apps/server/src/routes/neoPayload.test.ts` (the exit-criterion test on the full recording):

```ts
import {
  NEO_PAYLOAD_BUDGET_BYTES,
  datasetResponseSchema,
  jplColumnarResponseSchema,
} from '@perihelion/data';
import { loadFullSbdbNeoResponse } from '@perihelion/fixtures/upstream-full';
import { describe, expect, it } from 'vitest';
import { FakeUpstream } from '../testing/fakeUpstream.js';
import { createTestServer } from '../testing/testServer.js';

describe('GET /api/neos with the full recorded catalogue', () => {
  it('stays inside the 2 MB gzip budget on the wire and keeps at least 99% of the NEOs', async () => {
    const recorded = loadFullSbdbNeoResponse();
    const { app } = await createTestServer({
      upstream: new FakeUpstream({ '/sbdb_query.api': recorded }),
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/neos',
      headers: { 'accept-encoding': 'gzip' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.rawPayload.byteLength).toBeLessThanOrEqual(NEO_PAYLOAD_BUDGET_BYTES);
    const unzipped = await app.inject({ method: 'GET', url: '/api/neos' });
    const { data } = datasetResponseSchema('neos').parse(unzipped.json());
    expect(data.count).toBeGreaterThanOrEqual(
      0.99 * jplColumnarResponseSchema.parse(recorded).data.length,
    );
    await app.close();
  });
});
```

Run: `npx vitest run apps/server/src/routes` — Expected: FAIL, `datasetRoutes.js` not found.

- [ ] **Step 11: Implement** `apps/server/src/routes/datasetRoutes.ts`

```ts
import {
  DEFAULT_CLOSE_APPROACH_DAYS,
  DEFAULT_CME_DAYS,
  MAX_WINDOW_DAYS,
  datasetApiPath,
  daysQuerySchema,
} from '@perihelion/data';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { DatasetRequests } from '../datasets/datasetRequests.js';
import type { DatasetService } from '../datasets/datasetService.js';
import type { ServedDataset } from '../datasets/types.js';
import { InvalidQueryError } from '../errors.js';

interface DatasetRouteDependencies {
  service: Pick<DatasetService, 'read'>;
  requests: DatasetRequests;
}

export function registerDatasetRoutes(
  app: FastifyInstance,
  { service, requests }: DatasetRouteDependencies,
): void {
  app.get(datasetApiPath('neos'), async (_request, reply) =>
    sendDataset(reply, await service.read(requests.neos())),
  );
  app.get(datasetApiPath('close-approaches'), async (request, reply) => {
    const days = readDays(request.query, DEFAULT_CLOSE_APPROACH_DAYS);
    return sendDataset(reply, await service.read(requests.closeApproaches(days)));
  });
  app.get(datasetApiPath('cmes'), async (request, reply) => {
    const days = readDays(request.query, DEFAULT_CME_DAYS);
    return sendDataset(reply, await service.read(requests.cmes(days)));
  });
}

function readDays(query: unknown, defaultDays: number): number {
  const parsed = daysQuerySchema(defaultDays).safeParse(query);
  if (!parsed.success)
    throw new InvalidQueryError(`days must be a whole number from 1 to ${MAX_WINDOW_DAYS}`);
  return parsed.data.days;
}

/** The cached JSON is spliced in unparsed: /api/neos is megabytes, and it was validated before caching. */
function sendDataset(reply: FastifyReply, dataset: ServedDataset): FastifyReply {
  const fetchedAt = new Date(dataset.fetchedAtMs).toISOString();
  const body = `{"fetchedAt":"${fetchedAt}","origin":"${dataset.origin}","data":${dataset.dataJson}}`;
  return reply.type('application/json; charset=utf-8').send(body);
}
```

- [ ] **Step 12: Update** `apps/server/src/app.ts` and its test

```ts
import compress from '@fastify/compress';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { DatasetUnavailableError, InvalidQueryError } from './errors.js';

export async function buildApp(options: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify(options);
  // /api/neos is ~40k rows; gzip on the wire is what keeps it inside the 2 MB budget.
  await app.register(compress);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof InvalidQueryError) return reply.code(400).send({ error: error.message });
    if (error instanceof DatasetUnavailableError)
      return reply.code(503).send({ error: error.message });
    return reply.send(error);
  });
  app.get('/health', async () => ({ status: 'ok' }));
  return app;
}
```

In `apps/server/src/app.test.ts` change `const app = buildApp();` to `const app = await buildApp();`.

Run: `npx vitest run apps/server` — Expected: PASS (all server tests). If the payload test exceeds the budget,
**stop and report the measured size**: the fix is in the rounding or the format (a user decision), never the budget.

- [ ] **Step 13: Wire** `apps/server/src/main.ts`

```ts
import { buildApp } from './app.js';
import { readServerConfig } from './config.js';
import { createDatasets } from './datasets/createDatasets.js';
import { defaultDatasetRequests } from './datasets/datasetRequests.js';
import { startScheduledRefresh } from './datasets/scheduledRefresh.js';
import { registerDatasetRoutes } from './routes/datasetRoutes.js';

const REFRESH_INTERVAL_MS = 10 * 60_000;

const config = readServerConfig(process.env);
const app = await buildApp({ logger: true });
if (config.usingDemoKey)
  app.log.warn('NASA_API_KEY is not set; DONKI uses the rate-limited DEMO_KEY');

const datasets = createDatasets(config, app.log);
registerDatasetRoutes(app, datasets);
const stopRefresh = startScheduledRefresh({
  service: datasets.service,
  requests: () => Object.values(defaultDatasetRequests(datasets.requests)),
  intervalMs: REFRESH_INTERVAL_MS,
});
app.addHook('onClose', async () => {
  stopRefresh();
  datasets.close();
});

try {
  await app.listen({ port: config.port, host: '127.0.0.1' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
```

- [ ] **Step 14: Smoke-test the bundle against live upstream (network, dev only)**

```bash
npm run build -w @perihelion/server
grep -E "from ['\"]@perihelion/" apps/server/dist/main.js   # expect no output: workspace code is bundled
(cd apps/server && PORT=8799 DATABASE_PATH=/tmp/perihelion-smoke.sqlite node dist/main.js & echo $! > /tmp/perihelion-server.pid)
sleep 20
for d in neos close-approaches cmes; do curl -s "localhost:8799/api/$d" | head -c 120; echo; done
curl -s -H 'accept-encoding: gzip' -o /dev/null -w '%{size_download}\n' localhost:8799/api/neos
kill "$(cat /tmp/perihelion-server.pid)"; rm -f /tmp/perihelion-smoke.sqlite
```

Expected: three `{"fetchedAt":…,"origin":"fresh",…` lines and a gzipped `/api/neos` size ≤ 2000000. If `node:sqlite`
prints an ExperimentalWarning, note it in PROGRESS "Known external issues"; anything else unexpected: stop and report.

- [ ] **Step 15: Finish** per the workflow. PROGRESS decisions to add:
  - `/api/neos`, `/api/close-approaches?days=`, `/api/cmes?days=` return `{ fetchedAt, origin, data }`; bad `days`
    is 400, no data at all is 503. Responses are gzip-compressed (`@fastify/compress`).
  - TTLs: NEOs 24 h, close approaches and CMEs 1 h; the scheduler keeps the default queries warm every 10 minutes.
  - Missing `NASA_API_KEY` falls back to `DEMO_KEY` with a warning at start-up.
  - The snapshot answers for any `days` value when upstream is down (labelled `origin: "snapshot"`).
  - Measured: gzipped `/api/neos` on the full recording is `<N>` bytes (record the number).

Commit: `git commit -m "Serve NEOs, close approaches and CMEs from the cache with snapshot fallback"`

---

### Task 7: Bundled snapshot + offline fallback verified

Branch: `phase-2/snapshot-fallback`

**Files:**

- Create: `apps/server/scripts/writeSnapshot.ts`
- Create (generated, committed): `apps/web/public/snapshot/{neos,close-approaches,cmes}.json`
- Create: `apps/server/src/datasets/committedSnapshot.test.ts`
- Create: `apps/web/src/data/loadDataset.ts` (+ `loadDataset.test.ts`)
- Modify: `apps/server/package.json`, root `package.json` (`snapshot` script), `apps/web/package.json`,
  `.prettierignore`, `CLAUDE.md` (Commands comment if needed)

**Interfaces:**

- Consumes: `createDatasetRequests`, `defaultDatasetRequests`, `createUpstreamClients`, `readServerConfig`,
  `createFileSnapshotReader` (Task 6); `DATASET_NAMES`, `snapshotFileName`, `NEO_PAYLOAD_BUDGET_BYTES`,
  `datasetApiPath`, `SNAPSHOT_BASE_PATH`, `datasetResponseSchema`, `datasetSnapshotSchema`, `DatasetResponse`
  (Task 3).
- Produces: `loadDataset(name, fetchImpl?): Promise<DatasetResponse<N>>`, `DatasetLoadError` (web; used from
  Phase 3 on).

- [ ] **Step 1: Write the snapshot script** `apps/server/scripts/writeSnapshot.ts`

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  DATASET_NAMES,
  type DatasetName,
  NEO_PAYLOAD_BUDGET_BYTES,
  snapshotFileName,
} from '@perihelion/data';
import { systemClock } from '../src/clock.js';
import { readServerConfig } from '../src/config.js';
import { createDatasetRequests, defaultDatasetRequests } from '../src/datasets/datasetRequests.js';
import { createUpstreamClients } from '../src/upstream/upstreamClients.js';

// Served by Vite as /snapshot/*.json and read by the server when upstream and cache both fail.
const SNAPSHOT_DIR = new URL('../../web/public/snapshot/', import.meta.url);

type SnapshotTexts = Record<DatasetName, string>;

/** Same queries, validation and normalization as the live server, so a snapshot is a real answer. */
async function fetchAll(): Promise<SnapshotTexts> {
  const config = readServerConfig(process.env);
  const clients = createUpstreamClients(systemClock);
  const requests = defaultDatasetRequests(
    createDatasetRequests({ ...clients, clock: systemClock, nasaApiKey: config.nasaApiKey }),
  );
  const texts: Partial<SnapshotTexts> = {};
  for (const name of DATASET_NAMES) {
    const data = await requests[name].fetchData();
    texts[name] = `${JSON.stringify({ fetchedAt: new Date().toISOString(), data })}\n`;
  }
  return texts as SnapshotTexts;
}

function assertNeoBudget(text: string): void {
  const gzippedBytes = gzipSync(text).byteLength;
  console.log(`neos snapshot: ${gzippedBytes} bytes gzipped (budget ${NEO_PAYLOAD_BUDGET_BYTES})`);
  if (gzippedBytes > NEO_PAYLOAD_BUDGET_BYTES)
    throw new Error('NEO snapshot exceeds the gzip budget');
}

/** Everything is fetched and checked before anything is written, so a failure never leaves a mixed set. */
async function main(): Promise<void> {
  const texts = await fetchAll();
  assertNeoBudget(texts.neos);
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  for (const name of DATASET_NAMES) {
    const target = new URL(snapshotFileName(name), SNAPSHOT_DIR);
    await writeFile(target, texts[name]);
    console.log(`wrote ${fileURLToPath(target)}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

Scripts: `apps/server/package.json` `"snapshot": "tsx --env-file-if-exists=../../.env scripts/writeSnapshot.ts"`;
root `package.json` replaces the placeholder with `"snapshot": "npm run snapshot --workspace @perihelion/server"`.
Add `apps/web/public/snapshot/` to `.prettierignore` (generated; never reformat).

- [ ] **Step 2: Write the snapshot (network, dev only) and check it**

```bash
npm run snapshot
[ -n "$NASA_API_KEY" ] && grep -rl "$NASA_API_KEY" apps/web/public/snapshot && echo "KEY LEAKED"
git check-ignore -v apps/web/public/snapshot/*   # expect no output
```

Expected: the gzipped-size line within budget, three `wrote …` lines, no leak, no ignore match. Otherwise stop and report.

- [ ] **Step 3: Write the committed-snapshot test** `apps/server/src/datasets/committedSnapshot.test.ts`

```ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { DATASET_NAMES, NEO_PAYLOAD_BUDGET_BYTES, snapshotFileName } from '@perihelion/data';
import { describe, expect, it } from 'vitest';
import { createFileSnapshotReader } from './snapshotReader.js';

const SNAPSHOT_DIR = fileURLToPath(new URL('../../../web/public/snapshot/', import.meta.url));

describe('the snapshot committed to apps/web', () => {
  it.each(DATASET_NAMES)('has a valid %s snapshot', async (name) => {
    await expect(createFileSnapshotReader(SNAPSHOT_DIR).read(name)).resolves.toBeDefined();
  });

  it('keeps the NEO snapshot inside the gzip budget', async () => {
    const text = await readFile(join(SNAPSHOT_DIR, snapshotFileName('neos')));
    expect(gzipSync(text).byteLength).toBeLessThanOrEqual(NEO_PAYLOAD_BUDGET_BYTES);
  });
});
```

Run: `npx vitest run apps/server/src/datasets/committedSnapshot.test.ts` — Expected: PASS (4 tests). (It guards
the committed files; it was not written first because it needs real data to exist.)

- [ ] **Step 4: Write the failing web fallback tests** `apps/web/src/data/loadDataset.test.ts`

First: `npm i @perihelion/data@* -w @perihelion/web`.

```ts
import { describe, expect, it } from 'vitest';
import { DatasetLoadError, loadDataset } from './loadDataset';

const CME = {
  activityId: '2026-09-01T12:00:00-CME-001',
  startTime: '2026-09-01T12:00:00.000Z',
  sourceLocation: 'N12W30',
  note: null,
  link: null,
  analysis: {
    time21_5: '2026-09-01T18:30:00.000Z',
    latitudeDeg: -12,
    longitudeDeg: 30,
    halfAngleDeg: 25,
    speedKmPerS: 650,
    type: 'C',
  },
};
const FETCHED_AT = '2026-09-28T12:00:00.000Z';

/** A fake fetch that answers each path from a table and records what was asked. */
function fakeFetch(answers: Record<string, () => Response>) {
  const paths: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const path = String(input);
    paths.push(path);
    const answer = answers[path];
    if (answer === undefined) throw new TypeError('Failed to fetch');
    return answer();
  };
  return { fetchImpl, paths };
}

const serverOk = () => Response.json({ fetchedAt: FETCHED_AT, origin: 'fresh', data: [CME] });
const snapshotOk = () => Response.json({ fetchedAt: '2026-09-01T00:00:00.000Z', data: [CME] });

describe('loadDataset', () => {
  it('uses the server when it answers', async () => {
    const { fetchImpl, paths } = fakeFetch({
      '/api/cmes': serverOk,
      '/snapshot/cmes.json': snapshotOk,
    });
    await expect(loadDataset('cmes', fetchImpl)).resolves.toEqual({
      fetchedAt: FETCHED_AT,
      origin: 'fresh',
      data: [CME],
    });
    expect(paths).toEqual(['/api/cmes']);
  });

  it.each([
    ['is unreachable', undefined],
    ['answers 503', () => Response.json({ error: 'unavailable' }, { status: 503 })],
    ['answers something invalid', () => Response.json({ origin: 'fresh' })],
  ])('falls back to the bundled snapshot when the server %s', async (_case, server) => {
    const answers: Record<string, () => Response> = { '/snapshot/cmes.json': snapshotOk };
    if (server !== undefined) answers['/api/cmes'] = server;
    const result = await loadDataset('cmes', fakeFetch(answers).fetchImpl);
    expect(result).toMatchObject({ origin: 'snapshot', fetchedAt: '2026-09-01T00:00:00.000Z' });
  });

  it('fails clearly when neither the server nor the snapshot has data', async () => {
    await expect(loadDataset('cmes', fakeFetch({}).fetchImpl)).rejects.toThrow(DatasetLoadError);
  });
});
```

Run: `npx vitest run apps/web/src/data/loadDataset.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 5: Implement** `apps/web/src/data/loadDataset.ts`

```ts
import {
  type DatasetName,
  type DatasetResponse,
  SNAPSHOT_BASE_PATH,
  datasetApiPath,
  datasetResponseSchema,
  datasetSnapshotSchema,
  snapshotFileName,
} from '@perihelion/data';

export class DatasetLoadError extends Error {
  override name = 'DatasetLoadError';
}

/**
 * Asks our server first, then the snapshot bundled with the web app, so the scene still has data when
 * the server itself is unreachable. Both answers are validated: neither is trusted blindly.
 */
export async function loadDataset<N extends DatasetName>(
  name: N,
  fetchImpl: typeof fetch = fetch,
): Promise<DatasetResponse<N>> {
  const fromServer = await tryLoad(fetchImpl, datasetApiPath(name), (body) =>
    datasetResponseSchema(name).parse(body),
  );
  if (fromServer !== undefined) return fromServer;
  const snapshotPath = `${SNAPSHOT_BASE_PATH}/${snapshotFileName(name)}`;
  const fromSnapshot = await tryLoad(fetchImpl, snapshotPath, (body) =>
    datasetResponseSchema(name).parse({
      ...datasetSnapshotSchema(name).parse(body),
      origin: 'snapshot',
    }),
  );
  if (fromSnapshot !== undefined) return fromSnapshot;
  throw new DatasetLoadError(`No ${name} data: the server and the bundled snapshot both failed`);
}

async function tryLoad<T>(
  fetchImpl: typeof fetch,
  path: string,
  parse: (body: unknown) => T,
): Promise<T | undefined> {
  try {
    const response = await fetchImpl(path);
    return response.ok ? parse(await response.json()) : undefined;
  } catch (error) {
    console.warn(`Could not load ${path}`, error);
    return undefined;
  }
}
```

Run the test again — Expected: PASS (5 tests). If TypeScript cannot relate the parsed type to
`DatasetResponse<N>` under the generic, stop and report the error rather than casting it away.

- [ ] **Step 6: Verify the offline fallback end to end** (manual; the user toggles the network)

```bash
npm run build -w @perihelion/server
# 1. Online, empty cache: expect origin "fresh"
(cd apps/server && PORT=8799 DATABASE_PATH=/tmp/perihelion-offline.sqlite node dist/main.js & echo $! > /tmp/perihelion-server.pid)
sleep 20; curl -s localhost:8799/api/cmes | head -c 80; echo
kill "$(cat /tmp/perihelion-server.pid)"
```

Ask the user to **turn the network off**, then:

```bash
# 2. Offline, warm cache (restart proves SQLite persistence): expect "fresh" or "stale", not an error
(cd apps/server && PORT=8799 DATABASE_PATH=/tmp/perihelion-offline.sqlite node dist/main.js & echo $! > /tmp/perihelion-server.pid)
sleep 3; curl -s localhost:8799/api/cmes | head -c 80; echo
kill "$(cat /tmp/perihelion-server.pid)"
# 3. Offline, cold cache: expect origin "snapshot" for all three
(cd apps/server && PORT=8799 DATABASE_PATH=/tmp/perihelion-cold.sqlite node dist/main.js & echo $! > /tmp/perihelion-server.pid)
sleep 3; for d in neos close-approaches cmes; do curl -s "localhost:8799/api/$d" | head -c 80; echo; done
kill "$(cat /tmp/perihelion-server.pid)"; rm -f /tmp/perihelion-offline.sqlite /tmp/perihelion-cold.sqlite
# 4. Server down: the web build still serves the snapshot files
npm run build -w @perihelion/web && (cd apps/web && npx vite preview --port 4173 & echo $! > /tmp/perihelion-web.pid)
sleep 3; curl -s localhost:4173/snapshot/cmes.json | head -c 80; echo
kill "$(cat /tmp/perihelion-web.pid)"
```

Record the four observed `origin` values in the PR description. Ask the user to turn the network back on.

- [ ] **Step 7: Finish** per the workflow. PROGRESS decisions to add:
  - `npm run snapshot` writes `apps/web/public/snapshot/<name>.json` (`{ fetchedAt, data }`) through the same queries
    and validation as the server, and refuses a NEO snapshot over the gzip budget. The snapshot is committed and
    Prettier-ignored; a server test keeps it valid.
  - The web app loads data with `loadDataset(name)`: server first, bundled snapshot second, both validated.
  - Offline verified by hand (four cases above) on `<date>`.

Commit: `git commit -m "Add the bundled data snapshot and web fallback, and verify offline behaviour"`

---

### Task 8: Phase 2 close-out

Branch: `phase-2/close-out`

- [ ] **Step 1: Check every exit criterion on `main`** after all Phase 2 PRs are merged and CI is green:
  - Server tests use recorded upstream responses only (`grep -rn "fetch(" apps/server/src` shows only
    `upstreamClients.ts` passing global `fetch`, never called in tests).
  - Offline behaviour verified (Task 7 Step 6 results in PROGRESS).
  - `/api/neos` ≤ 2 MB gzipped (Task 6 payload test and measured size).
- [ ] **Step 2: Update `PROGRESS.md`**: Phase 2 ✅ with "Exit criteria verified on `main` at `<sha>`", current phase
      → Phase 3, and expand the Phase 3 checklist from `PLAN.md`.
- [ ] **Step 3:** PR (`type:docs`, `phase:2`, `area:infra`). After the user merges and `main` CI is green: close the
      milestone, tag `v0.2.0` (annotated) on the merge commit, and publish a release summarising Phase 2.
