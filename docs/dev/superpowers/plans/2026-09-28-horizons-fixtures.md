# Horizons Fixture Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dev-only generator that queries JPL Horizons for planet and asteroid ground truth and writes committed JSON fixtures, plus typed, validated loaders the golden tests (issues #9, #10) will use.

**Architecture:** `packages/fixtures` gets small pure modules: query builder → response envelope check → CSV table parser → typed records → fixture assembly (against an injected `HorizonsClient`). Only `scripts/generateFixtures.ts` touches the network; every test runs on recorded responses, fake clients or the committed data.

**Tech Stack:** TypeScript (strict, ESM), Vitest, zod 4 (validation), tsx (runs the script), Horizons API `https://ssd.jpl.nasa.gov/api/horizons.api`.

**Spec:** `PLAN.md` (Phase 1: fixture generator, golden tests) and `PROGRESS.md` (decisions log: asteroid bodies, osculating elements at a fixed epoch, "Earth" = Earth–Moon barycentre).

**Issue:** #8 · **Branch:** `phase-1/horizons-fixtures` (already created off `main`).

## Global Constraints

- Tests never touch the network. Only `npm run fixtures` does.
- Never hand-edit fixture or recorded files; regenerate them. They are ground truth.
- `packages/orbit` is not touched by this plan.
- Every upstream response is validated with zod before use.
- Units in names: `jdTdb`, `distAu`/`…Au`, `…AuPerDay`, `…Deg` (degrees are allowed here: fixtures are an I/O boundary).
- Frame: heliocentric (`CENTER='500@10'`), ecliptic J2000 (`REF_PLANE=ECLIPTIC`, `REF_SYSTEM=ICRF`), `OUT_UNITS=AU-D`, `TIME_TYPE=TDB`.
- Functions < 20 lines, 0–2 arguments, `try/catch` isolated, no `any`.
- Commit messages: functional description only, plain English, no trailers.
- CLAUDE.md agent guardrails apply: at most 2 tool loops per turn, then pause; on any failing command, stop and report the output.
- `npm run check` must be green before the PR.

## Review Focus

1. **Horizons failure inside HTTP 200** (unknown body, multiple matches, "No matches found"): generation must throw with the Horizons text, never write an empty or partial fixture. Tests: Task 2 (`parseHorizonsTable` rejects text without `$$SOE`), Task 3 (generator rejects).
2. **Empty or non-numeric CSV fields** (trailing comma, `n.a.`): must throw, never become `0` (`Number('')` is `0`). Test: Task 2 (`toStateRecord` rejects).
3. **Exponent notation** (`-2.249851741486615E-01`) must parse to the exact float64. Test: Task 2 against the recorded response.
4. **Returned dates ≠ requested dates** (missing row, extra row, Horizons re-sorting the TLIST): must throw. Test: Task 3 (fake client drops a date).
5. **Small-body `;` in `COMMAND`** must be percent-encoded, or Horizons answers HTTP 400 "one or more query parameter was not recognized" (observed live 2026-09-28). Test: Task 1.

---

## File Structure

```
packages/fixtures/
  package.json                 + zod dep, tsx devDep, "generate" script
  tsconfig.json                include scripts/
  scripts/generateFixtures.ts  CLI: real fetch client, writes data/*.json (network, dev only)
  data/planets.json            committed output
  data/asteroids.json          committed output
  src/index.ts                 re-exports only
  src/horizonsQuery.ts         HORIZONS_API_URL, frame params, query builders, URL
  src/horizonsResponse.ts      HorizonsError, zod envelope check
  src/horizonsTable.ts         $$SOE/$$EOE CSV → rows keyed by header
  src/horizonsRecords.ts       rows → StateRecord / ElementsRecord
  src/fixtureSpec.ts           bodies, Horizons IDs, sample dates, epoch
  src/fixtureSchema.ts         zod schemas + types for records and fixture files
  src/generate.ts              HorizonsClient + fixture assembly
  src/loaders.ts               loadPlanetFixtures / loadAsteroidFixtures
  src/recorded/*.json          raw Horizons responses captured once for parser tests
package.json                   "fixtures" script → workspace generate
.prettierignore                ignore fixture data + recorded responses
eslint.config.js               Node globals for packages/fixtures
PROGRESS.md                    tick item, decisions
```

---

### Task 1: Query builder

**Files:**

- Create: `packages/fixtures/src/horizonsQuery.ts`, `packages/fixtures/src/horizonsQuery.test.ts`
- Modify: `packages/fixtures/src/index.ts` (move `HORIZONS_API_URL` out, re-export)

**Interfaces:**

- Produces:
  - `HORIZONS_API_URL: string`
  - `HORIZONS_FRAME_PARAMS: Readonly<Record<string, string>>`
  - `interface BodyQuery { command: string; jdTdbList: readonly number[] }`
  - `buildVectorsQuery(query: BodyQuery): URLSearchParams`
  - `buildElementsQuery(query: BodyQuery): URLSearchParams`
  - `horizonsUrl(params: URLSearchParams): string`

- [ ] **Step 1: Write the failing test** — `packages/fixtures/src/horizonsQuery.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { buildElementsQuery, buildVectorsQuery, horizonsUrl } from './horizonsQuery';

describe('buildVectorsQuery', () => {
  const params = buildVectorsQuery({ command: '3', jdTdbList: [2451545, 2378496.5] });

  it('asks for heliocentric ecliptic J2000 states in AU and AU/day on TDB', () => {
    expect(params.get('EPHEM_TYPE')).toBe('VECTORS');
    expect(params.get('VEC_TABLE')).toBe('2');
    expect(params.get('CENTER')).toBe("'500@10'");
    expect(params.get('REF_PLANE')).toBe('ECLIPTIC');
    expect(params.get('REF_SYSTEM')).toBe('ICRF');
    expect(params.get('OUT_UNITS')).toBe('AU-D');
    expect(params.get('TIME_TYPE')).toBe('TDB');
    expect(params.get('CSV_FORMAT')).toBe('YES');
    expect(params.get('format')).toBe('json');
  });

  it('quotes the command and each Julian Date in the time list', () => {
    expect(params.get('COMMAND')).toBe("'3'");
    expect(params.get('TLIST_TYPE')).toBe('JD');
    expect(params.get('TLIST')).toBe("'2451545' '2378496.5'");
  });
});

describe('buildElementsQuery', () => {
  it('asks for osculating elements in the same frame, without a vector table', () => {
    const params = buildElementsQuery({ command: '433;', jdTdbList: [2461000.5] });
    expect(params.get('EPHEM_TYPE')).toBe('ELEMENTS');
    expect(params.get('VEC_TABLE')).toBeNull();
    expect(params.get('CENTER')).toBe("'500@10'");
    expect(params.get('REF_PLANE')).toBe('ECLIPTIC');
  });
});

describe('horizonsUrl', () => {
  it('percent-encodes the small-body semicolon, which Horizons otherwise rejects as an unknown parameter', () => {
    const url = horizonsUrl(buildElementsQuery({ command: '433;', jdTdbList: [2461000.5] }));
    expect(url.startsWith('https://ssd.jpl.nasa.gov/api/horizons.api?')).toBe(true);
    expect(url).toContain('COMMAND=%27433%3B%27');
    expect(url).not.toContain(';');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/fixtures/src/horizonsQuery.test.ts`
Expected: FAIL — cannot resolve `./horizonsQuery`.

- [ ] **Step 3: Write minimal implementation** — `packages/fixtures/src/horizonsQuery.ts`

```ts
/** JPL Horizons API endpoint; used only by the dev-time fixture generator, never by tests. */
export const HORIZONS_API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/**
 * Pins Horizons to the engine's conventions: Sun body centre (Standish elements and the engine are
 * heliocentric, not barycentric), ecliptic and equinox of J2000, AU and days, TDB.
 * https://ssd-api.jpl.nasa.gov/doc/horizons.html
 */
export const HORIZONS_FRAME_PARAMS: Readonly<Record<string, string>> = {
  format: 'json',
  CENTER: "'500@10'",
  REF_PLANE: 'ECLIPTIC',
  REF_SYSTEM: 'ICRF',
  OUT_UNITS: 'AU-D',
  TIME_TYPE: 'TDB',
  TLIST_TYPE: 'JD',
  CSV_FORMAT: 'YES',
  OBJ_DATA: 'NO',
  MAKE_EPHEM: 'YES',
};

export interface BodyQuery {
  /** Horizons COMMAND: a major-body ID such as "3", or a small-body number plus ";" such as "433;". */
  command: string;
  jdTdbList: readonly number[];
}

export function buildVectorsQuery(query: BodyQuery): URLSearchParams {
  return buildQuery(query, { EPHEM_TYPE: 'VECTORS', VEC_TABLE: '2' });
}

export function buildElementsQuery(query: BodyQuery): URLSearchParams {
  return buildQuery(query, { EPHEM_TYPE: 'ELEMENTS' });
}

/** URLSearchParams percent-encodes ";", which Horizons would otherwise split the query on. */
export function horizonsUrl(params: URLSearchParams): string {
  return `${HORIZONS_API_URL}?${params.toString()}`;
}

function buildQuery(query: BodyQuery, tableParams: Record<string, string>): URLSearchParams {
  return new URLSearchParams({
    ...HORIZONS_FRAME_PARAMS,
    ...tableParams,
    COMMAND: `'${query.command}'`,
    TLIST: query.jdTdbList.map((jdTdb) => `'${jdTdb}'`).join(' '),
  });
}
```

Replace `packages/fixtures/src/index.ts` with:

```ts
export * from './horizonsQuery';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/fixtures`
Expected: PASS (new tests plus the existing `index.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add packages/fixtures/src
git commit -m "Add Horizons query builders for heliocentric ecliptic J2000 vectors and elements"
```

---

### Task 2: Response envelope, table parser and typed records

**Files:**

- Modify: `packages/fixtures/package.json` (add `zod`), `.prettierignore`, `packages/fixtures/src/index.ts`
- Create: `packages/fixtures/src/recorded/vectors-emb.json`, `packages/fixtures/src/recorded/elements-eros.json`
- Create: `packages/fixtures/src/horizonsResponse.ts`, `horizonsTable.ts`, `horizonsRecords.ts`, `fixtureSchema.ts` (record schemas only; file schemas come in Task 3)
- Test: `packages/fixtures/src/horizonsResponse.test.ts`, `horizonsTable.test.ts`, `horizonsRecords.test.ts`

**Interfaces:**

- Consumes: nothing from Task 1 at runtime (the recorded files are captured with curl).
- Produces:
  - `class HorizonsError extends Error`
  - `readHorizonsResultText(body: unknown): string`
  - `type HorizonsRow = Readonly<Record<string, string>>`
  - `parseHorizonsTable(text: string): HorizonsRow[]`
  - `stateRecordSchema`, `elementsRecordSchema`, `type StateRecord`, `type ElementsRecord`
  - `toStateRecord(row: HorizonsRow): StateRecord`
  - `toElementsRecord(row: HorizonsRow): ElementsRecord`

`StateRecord` = `{ jdTdb: number; positionAu: [number, number, number]; velocityAuPerDay: [number, number, number] }`.
`ElementsRecord` = `{ epochJdTdb, eccentricity, perihelionDistanceAu, inclinationDeg, longitudeOfAscendingNodeDeg, argumentOfPerihelionDeg, timeOfPerihelionJdTdb, meanMotionDegPerDay, meanAnomalyDeg, trueAnomalyDeg, semiMajorAxisAu }` (all `number`).

- [ ] **Step 1: Add zod, ignore recorded/generated data in Prettier, capture two recorded responses (dev-only network)**

```bash
npm i zod@^4.6.5 --workspace @perihelion/fixtures
printf '\n# Ground truth from JPL Horizons: regenerate, never reformat\npackages/fixtures/data/\npackages/fixtures/src/recorded/\n' >> .prettierignore
mkdir -p packages/fixtures/src/recorded
FRAME=(--data-urlencode "format=json" --data-urlencode "CENTER='500@10'" --data-urlencode "REF_PLANE=ECLIPTIC" \
  --data-urlencode "REF_SYSTEM=ICRF" --data-urlencode "OUT_UNITS=AU-D" --data-urlencode "TIME_TYPE=TDB" \
  --data-urlencode "TLIST_TYPE=JD" --data-urlencode "CSV_FORMAT=YES" --data-urlencode "OBJ_DATA=NO" --data-urlencode "MAKE_EPHEM=YES")
curl -s --get https://ssd.jpl.nasa.gov/api/horizons.api "${FRAME[@]}" --data-urlencode "EPHEM_TYPE=VECTORS" \
  --data-urlencode "VEC_TABLE=2" --data-urlencode "COMMAND='3'" --data-urlencode "TLIST='2451545' '2378496.5'" \
  > packages/fixtures/src/recorded/vectors-emb.json
curl -s --get https://ssd.jpl.nasa.gov/api/horizons.api "${FRAME[@]}" --data-urlencode "EPHEM_TYPE=ELEMENTS" \
  --data-urlencode "COMMAND='433;'" --data-urlencode "TLIST='2461000.5'" \
  > packages/fixtures/src/recorded/elements-eros.json
grep -c 'SOE' packages/fixtures/src/recorded/*.json
```

Expected: each file prints `1` (contains `$$SOE`). The vectors file's first row must start `2378496.500000000, A.D. 1800-Jan-01 00:00:00.0000, -2.249851741486615E-01`. The elements header line must contain `JDTDB, Calendar Date (TDB), EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR`. **If either file holds an `error`/`message` body instead, stop and report it; don't change query parameters without asking.**

- [ ] **Step 2: Write the failing tests**

`packages/fixtures/src/horizonsResponse.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import { HorizonsError, readHorizonsResultText } from './horizonsResponse';

describe('readHorizonsResultText', () => {
  it('returns the result text of a successful response', () => {
    expect(readHorizonsResultText(vectorsResponse)).toContain('$$SOE');
  });

  it('throws the Horizons error message', () => {
    expect(() => readHorizonsResultText({ error: 'bad COMMAND' })).toThrow(HorizonsError);
    expect(() => readHorizonsResultText({ error: 'bad COMMAND' })).toThrow('bad COMMAND');
  });

  it('throws on the HTTP 400 body Horizons sends for unrecognised parameters', () => {
    const body = { message: 'one or more query parameter was not recognized', code: '400' };
    expect(() => readHorizonsResultText(body)).toThrow('not recognized');
  });

  it('throws when there is no result at all', () => {
    expect(() => readHorizonsResultText({ signature: { version: '1.2' } })).toThrow(HorizonsError);
    expect(() => readHorizonsResultText('<html>')).toThrow();
  });
});
```

`packages/fixtures/src/horizonsTable.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import elementsResponse from './recorded/elements-eros.json' with { type: 'json' };
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import { HorizonsError } from './horizonsResponse';
import { parseHorizonsTable } from './horizonsTable';

describe('parseHorizonsTable', () => {
  it('keys each vector row by the header Horizons prints above the table', () => {
    const rows = parseHorizonsTable(vectorsResponse.result);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ JDTDB: '2378496.500000000', X: '-2.249851741486615E-01' });
    expect(rows[1]).toMatchObject({ JDTDB: '2451545.000000000', X: '-1.771587841839055E-01' });
  });

  it('reads the osculating-element columns', () => {
    const [row] = parseHorizonsTable(elementsResponse.result);
    expect(Object.keys(row ?? {})).toEqual(
      expect.arrayContaining(['JDTDB', 'EC', 'QR', 'IN', 'OM', 'W', 'Tp', 'N', 'MA', 'TA', 'A']),
    );
  });

  it('rejects a result with no ephemeris table, quoting what Horizons said', () => {
    const text =
      '\nMultiple major-bodies match string "MARS*"\n\n  ID#      Name\n  4        Mars Barycenter\n';
    expect(() => parseHorizonsTable(text)).toThrow(HorizonsError);
    expect(() => parseHorizonsTable(text)).toThrow('Multiple major-bodies');
  });

  it('rejects a row whose column count differs from the header', () => {
    const text = ['JDTDB, X, Y,', '*****', '$$SOE', '2451545.0, 1.0,', '$$EOE'].join('\n');
    expect(() => parseHorizonsTable(text)).toThrow('Expected 3 columns, got 2');
  });
});
```

`packages/fixtures/src/horizonsRecords.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import elementsResponse from './recorded/elements-eros.json' with { type: 'json' };
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import { toElementsRecord, toStateRecord } from './horizonsRecords';
import { HorizonsError } from './horizonsResponse';
import { parseHorizonsTable } from './horizonsTable';

const VECTOR_ROW = { JDTDB: '2451545.0', X: '1', Y: '2', Z: '3', VX: '4', VY: '5', VZ: '6' };

describe('toStateRecord', () => {
  it('parses exponent notation to the exact float64 Horizons printed', () => {
    const [first] = parseHorizonsTable(vectorsResponse.result);
    const state = toStateRecord(first ?? {});
    expect(state.jdTdb).toBe(2378496.5);
    expect(state.positionAu).toEqual([
      -0.2249851741486615, 0.957120808080457, 0.0004245450310084849,
    ]);
    expect(state.velocityAuPerDay[0]).toBe(-0.01703050204836069);
  });

  it('rejects empty, missing and non-numeric fields instead of reading them as zero', () => {
    expect(() => toStateRecord({ ...VECTOR_ROW, X: '' })).toThrow(HorizonsError);
    expect(() => toStateRecord({ ...VECTOR_ROW, Y: 'n.a.' })).toThrow('Column Y is not a number');
    const withoutVz = Object.fromEntries(
      Object.entries(VECTOR_ROW).filter(([column]) => column !== 'VZ'),
    );
    expect(() => toStateRecord(withoutVz)).toThrow('Column VZ');
  });
});

describe('toElementsRecord', () => {
  it("reads Eros's osculating elements at the requested epoch", () => {
    const [row] = parseHorizonsTable(elementsResponse.result);
    const elements = toElementsRecord(row ?? {});
    expect(elements.epochJdTdb).toBe(2461000.5);
    // Sanity ranges for 433 Eros (e ≈ 0.223, a ≈ 1.458 AU, i ≈ 10.8°), not tolerances.
    expect(elements.eccentricity).toBeGreaterThan(0.22);
    expect(elements.eccentricity).toBeLessThan(0.23);
    expect(elements.semiMajorAxisAu).toBeGreaterThan(1.45);
    expect(elements.semiMajorAxisAu).toBeLessThan(1.47);
    expect(elements.inclinationDeg).toBeGreaterThan(10);
    expect(elements.inclinationDeg).toBeLessThan(11.5);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run packages/fixtures`
Expected: FAIL — cannot resolve `./horizonsResponse`, `./horizonsTable`, `./horizonsRecords`.

- [ ] **Step 4: Write minimal implementation**

`packages/fixtures/src/horizonsResponse.ts`:

```ts
import { z } from 'zod';

export class HorizonsError extends Error {
  override name = 'HorizonsError';
}

// `error` is Horizons' own failure field; `message` is the gateway's HTTP 400 body.
const envelopeSchema = z.object({
  result: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

/** Horizons reports some failures inside an otherwise normal body, so every body is checked. */
export function readHorizonsResultText(body: unknown): string {
  const envelope = envelopeSchema.parse(body);
  const failure = envelope.error ?? envelope.message;
  if (failure !== undefined) throw new HorizonsError(failure);
  if (envelope.result === undefined) throw new HorizonsError('Horizons response has no result');
  return envelope.result;
}
```

`packages/fixtures/src/horizonsTable.ts`:

```ts
import { HorizonsError } from './horizonsResponse';

export type HorizonsRow = Readonly<Record<string, string>>;

const TABLE_START = '$$SOE';
const TABLE_END = '$$EOE';
// Horizons prints the CSV header, then a line of asterisks, then $$SOE.
const HEADER_OFFSET_ABOVE_START = 2;
const SUMMARY_LINE_COUNT = 12;

/**
 * Reads the CSV table between $$SOE and $$EOE. Columns are keyed by Horizons' own header, so an
 * upstream column change fails loudly instead of shifting values into the wrong field.
 */
export function parseHorizonsTable(text: string): HorizonsRow[] {
  const lines = text.split('\n');
  const start = lines.indexOf(TABLE_START);
  const end = lines.indexOf(TABLE_END);
  if (start < HEADER_OFFSET_ABOVE_START || end < start) {
    throw new HorizonsError(`No ephemeris table in Horizons result:\n${summarize(text)}`);
  }
  const header = splitCsvLine(lines[start - HEADER_OFFSET_ABOVE_START] ?? '');
  return lines.slice(start + 1, end).map((line) => toRow(header, splitCsvLine(line)));
}

/** Horizons ends every CSV line with a comma; drop the empty field that leaves. */
function splitCsvLine(line: string): string[] {
  const fields = line.split(',').map((field) => field.trim());
  return fields.at(-1) === '' ? fields.slice(0, -1) : fields;
}

function toRow(header: readonly string[], fields: readonly string[]): HorizonsRow {
  if (fields.length !== header.length) {
    throw new HorizonsError(`Expected ${header.length} columns, got ${fields.length}`);
  }
  return Object.fromEntries(header.map((name, index) => [name, fields[index] ?? '']));
}

function summarize(text: string): string {
  return text.trim().split('\n').slice(0, SUMMARY_LINE_COUNT).join('\n');
}
```

`packages/fixtures/src/fixtureSchema.ts`:

```ts
import { z } from 'zod';

const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const stateRecordSchema = z.object({
  jdTdb: z.number(),
  positionAu: vector3Schema,
  velocityAuPerDay: vector3Schema,
});

/** Horizons osculating elements, degrees as published (converted to radians by the tests). */
export const elementsRecordSchema = z.object({
  epochJdTdb: z.number(),
  eccentricity: z.number(),
  perihelionDistanceAu: z.number(),
  inclinationDeg: z.number(),
  longitudeOfAscendingNodeDeg: z.number(),
  argumentOfPerihelionDeg: z.number(),
  timeOfPerihelionJdTdb: z.number(),
  meanMotionDegPerDay: z.number(),
  meanAnomalyDeg: z.number(),
  trueAnomalyDeg: z.number(),
  semiMajorAxisAu: z.number(),
});

export type StateRecord = z.infer<typeof stateRecordSchema>;
export type ElementsRecord = z.infer<typeof elementsRecordSchema>;
```

`packages/fixtures/src/horizonsRecords.ts`:

```ts
import type { ElementsRecord, StateRecord } from './fixtureSchema';
import { HorizonsError } from './horizonsResponse';
import type { HorizonsRow } from './horizonsTable';

export function toStateRecord(row: HorizonsRow): StateRecord {
  return {
    jdTdb: readNumber(row, 'JDTDB'),
    positionAu: [readNumber(row, 'X'), readNumber(row, 'Y'), readNumber(row, 'Z')],
    velocityAuPerDay: [readNumber(row, 'VX'), readNumber(row, 'VY'), readNumber(row, 'VZ')],
  };
}

/** Column names from the Horizons elements table legend (EC, QR, IN, OM, W, Tp, N, MA, TA, A). */
export function toElementsRecord(row: HorizonsRow): ElementsRecord {
  return {
    epochJdTdb: readNumber(row, 'JDTDB'),
    eccentricity: readNumber(row, 'EC'),
    perihelionDistanceAu: readNumber(row, 'QR'),
    inclinationDeg: readNumber(row, 'IN'),
    longitudeOfAscendingNodeDeg: readNumber(row, 'OM'),
    argumentOfPerihelionDeg: readNumber(row, 'W'),
    timeOfPerihelionJdTdb: readNumber(row, 'Tp'),
    meanMotionDegPerDay: readNumber(row, 'N'),
    meanAnomalyDeg: readNumber(row, 'MA'),
    trueAnomalyDeg: readNumber(row, 'TA'),
    semiMajorAxisAu: readNumber(row, 'A'),
  };
}

/** Number('') is 0, so empty fields are rejected explicitly rather than read as zero. */
function readNumber(row: HorizonsRow, column: string): number {
  const field = row[column];
  const value = field === undefined || field === '' ? Number.NaN : Number(field);
  if (!Number.isFinite(value)) {
    throw new HorizonsError(`Column ${column} is not a number: "${field ?? ''}"`);
  }
  return value;
}
```

Append to `packages/fixtures/src/index.ts`:

```ts
export * from './horizonsResponse';
export * from './horizonsTable';
export * from './horizonsRecords';
export * from './fixtureSchema';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run packages/fixtures && npm run typecheck --workspace @perihelion/fixtures`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .prettierignore package-lock.json packages/fixtures
git commit -m "Parse Horizons responses into validated state and element records with recorded test responses"
```

---

### Task 3: Fixture spec and generator core

**Files:**

- Create: `packages/fixtures/src/fixtureSpec.ts`, `packages/fixtures/src/generate.ts`
- Modify: `packages/fixtures/src/fixtureSchema.ts` (file schemas), `packages/fixtures/src/index.ts`
- Test: `packages/fixtures/src/fixtureSpec.test.ts`, `packages/fixtures/src/generate.test.ts`

**Interfaces:**

- Consumes: `buildVectorsQuery`, `buildElementsQuery`, `BodyQuery`, `HORIZONS_API_URL`, `HORIZONS_FRAME_PARAMS` (Task 1); `parseHorizonsTable`, `toStateRecord`, `toElementsRecord`, `HorizonsError`, record schemas (Task 2).
- Produces:
  - `PLANET_NAMES` (tuple matching orbit's `PLANETS`), `type PlanetName`, `PLANET_HORIZONS_IDS: Readonly<Record<PlanetName, string>>`
  - `ASTEROID_NAMES`, `type AsteroidName`, `ASTEROID_HORIZONS_COMMANDS: Readonly<Record<AsteroidName, string>>`
  - `julianDateOfNewYear(year: number): number`
  - `PLANET_SAMPLE_JD_TDB: readonly number[]` (27 dates, ascending)
  - `ASTEROID_EPOCH_JD_TDB = 2461000.5`, `ASTEROID_OFFSET_DAYS`, `ASTEROID_SAMPLE_JD_TDB: readonly number[]`
  - `planetFixturesSchema`, `asteroidFixturesSchema`, `type PlanetFixtures`, `type AsteroidFixtures`
  - `interface HorizonsClient { fetchResultText(params: URLSearchParams): Promise<string> }`
  - `generatePlanetFixtures(client: HorizonsClient): Promise<PlanetFixtures>`
  - `generateAsteroidFixtures(client: HorizonsClient): Promise<AsteroidFixtures>`

Fixture file shapes:

```
PlanetFixtures   = { source: { api, settings }, planets: Record<PlanetName, { horizonsId, states: StateRecord[] }> }
AsteroidFixtures = { source: { api, settings }, epochJdTdb, asteroids: Record<AsteroidName, { horizonsCommand, elements: ElementsRecord, states: StateRecord[] }> }
```

- [ ] **Step 1: Write the failing tests**

`packages/fixtures/src/fixtureSpec.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_HORIZONS_COMMANDS,
  ASTEROID_SAMPLE_JD_TDB,
  PLANET_HORIZONS_IDS,
  PLANET_SAMPLE_JD_TDB,
  julianDateOfNewYear,
} from './fixtureSpec';

describe('julianDateOfNewYear', () => {
  it('matches the Standish Table 1 range ends and the Meeus J2000 anchor', () => {
    expect(julianDateOfNewYear(1800)).toBe(2378496.5);
    expect(julianDateOfNewYear(2000)).toBe(2451544.5);
    expect(julianDateOfNewYear(2050)).toBe(2469807.5);
  });
});

describe('fixture spec', () => {
  it('samples every decade of 1800–2050 plus J2000, ascending', () => {
    expect(PLANET_SAMPLE_JD_TDB).toHaveLength(27);
    expect(PLANET_SAMPLE_JD_TDB).toContain(2451545);
    expect(PLANET_SAMPLE_JD_TDB).toEqual([...PLANET_SAMPLE_JD_TDB].sort((a, b) => a - b));
  });

  it('uses Horizons planet-system barycentres 1–8 (Standish "EM Bary" is body 3)', () => {
    expect(Object.values(PLANET_HORIZONS_IDS)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('marks every asteroid command as a small-body lookup', () => {
    for (const command of Object.values(ASTEROID_HORIZONS_COMMANDS))
      expect(command).toMatch(/^\d+;$/);
  });

  it('samples asteroids around their osculating epoch', () => {
    expect(ASTEROID_SAMPLE_JD_TDB).toContain(ASTEROID_EPOCH_JD_TDB);
    expect(ASTEROID_SAMPLE_JD_TDB[0]).toBe(ASTEROID_EPOCH_JD_TDB - 120);
    expect(ASTEROID_SAMPLE_JD_TDB.at(-1)).toBe(ASTEROID_EPOCH_JD_TDB + 120);
  });
});
```

`packages/fixtures/src/generate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_NAMES,
  ASTEROID_SAMPLE_JD_TDB,
  PLANET_NAMES,
  PLANET_SAMPLE_JD_TDB,
} from './fixtureSpec';
import { type HorizonsClient, generateAsteroidFixtures, generatePlanetFixtures } from './generate';
import { HorizonsError } from './horizonsResponse';

const VECTOR_HEADER = 'JDTDB, Calendar Date (TDB), X, Y, Z, VX, VY, VZ,';
const ELEMENTS_HEADER = 'JDTDB, Calendar Date (TDB), EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR,';

function table(header: string, rows: readonly string[]): string {
  return [header, '*****', '$$SOE', ...rows, '$$EOE'].join('\n');
}

function requestedJds(params: URLSearchParams): number[] {
  return (params.get('TLIST') ?? '').split(' ').map((jd) => Number(jd.replaceAll("'", '')));
}

function fakeResult(params: URLSearchParams): string {
  const jds = requestedJds(params);
  if (params.get('EPHEM_TYPE') === 'ELEMENTS') {
    return table(ELEMENTS_HEADER, [
      `${jds[0]}, A.D., 0.2, 1.1, 10, 300, 170, 2461100, 0.5, 300, 280, 1.4, 1.7, 700,`,
    ]);
  }
  return table(
    VECTOR_HEADER,
    jds.map((jd) => `${jd}, A.D., 1.0E+00, 2.0E+00, 3.0E+00, 4.0E-03, 5.0E-03, 6.0E-03,`),
  );
}

function recordingClient(answer: (params: URLSearchParams) => string = fakeResult) {
  const commands: string[] = [];
  const client: HorizonsClient = {
    async fetchResultText(params) {
      commands.push(params.get('COMMAND') ?? '');
      return answer(params);
    },
  };
  return { client, commands };
}

describe('generatePlanetFixtures', () => {
  it('queries each planet barycentre and keeps a state for every sample date', async () => {
    const { client, commands } = recordingClient();
    const fixtures = await generatePlanetFixtures(client);
    expect(commands).toEqual(["'1'", "'2'", "'3'", "'4'", "'5'", "'6'", "'7'", "'8'"]);
    for (const name of PLANET_NAMES) {
      expect(fixtures.planets[name].states.map((state) => state.jdTdb)).toEqual(
        PLANET_SAMPLE_JD_TDB,
      );
    }
    expect(fixtures.source.settings.CENTER).toBe("'500@10'");
  });

  it('rejects a response that is missing a requested date', async () => {
    const dropLast = (params: URLSearchParams) => {
      const jds = requestedJds(params).slice(0, -1);
      return table(
        VECTOR_HEADER,
        jds.map((jd) => `${jd}, A.D., 1, 2, 3, 4, 5, 6,`),
      );
    };
    await expect(generatePlanetFixtures(recordingClient(dropLast).client)).rejects.toThrow(
      /Requested JDs/,
    );
  });

  it('rejects when Horizons answers without an ephemeris table', async () => {
    const noMatch = () => '\nNo matches found.\n';
    await expect(generatePlanetFixtures(recordingClient(noMatch).client)).rejects.toThrow(
      HorizonsError,
    );
  });
});

describe('generateAsteroidFixtures', () => {
  it('keeps elements at the epoch and states at every offset for each asteroid', async () => {
    const fixtures = await generateAsteroidFixtures(recordingClient().client);
    expect(fixtures.epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
    for (const name of ASTEROID_NAMES) {
      expect(fixtures.asteroids[name].elements.epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
      expect(fixtures.asteroids[name].states.map((state) => state.jdTdb)).toEqual(
        ASTEROID_SAMPLE_JD_TDB,
      );
    }
  });

  it('rejects elements returned for a different epoch', async () => {
    const wrongEpoch = (params: URLSearchParams) =>
      params.get('EPHEM_TYPE') === 'ELEMENTS'
        ? table(ELEMENTS_HEADER, [
            '2460000.5, A.D., 0.2, 1.1, 10, 300, 170, 2461100, 0.5, 300, 280, 1.4, 1.7, 700,',
          ])
        : fakeResult(params);
    await expect(generateAsteroidFixtures(recordingClient(wrongEpoch).client)).rejects.toThrow(
      /epoch/,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/fixtures`
Expected: FAIL — cannot resolve `./fixtureSpec`, `./generate`.

- [ ] **Step 3: Write minimal implementation**

`packages/fixtures/src/fixtureSpec.ts`:

```ts
/** Names match `PLANETS` in packages/orbit so golden tests can index both by the same key. */
export const PLANET_NAMES = [
  'mercury',
  'venus',
  'earthMoonBarycenter',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;
export type PlanetName = (typeof PLANET_NAMES)[number];

/** Planet-system barycentres, which is what Standish Table 1 fits (its "EM Bary" is body 3). */
export const PLANET_HORIZONS_IDS: Readonly<Record<PlanetName, string>> = {
  mercury: '1',
  venus: '2',
  earthMoonBarycenter: '3',
  mars: '4',
  jupiter: '5',
  saturn: '6',
  uranus: '7',
  neptune: '8',
};

export const ASTEROID_NAMES = [
  'eros',
  'apophis',
  'bennu',
  'ryugu',
  'phaethon',
  'aten',
  'atira',
] as const;
export type AsteroidName = (typeof ASTEROID_NAMES)[number];

/** The trailing ";" makes Horizons look the number up as a small body, not a major-body ID. */
export const ASTEROID_HORIZONS_COMMANDS: Readonly<Record<AsteroidName, string>> = {
  eros: '433;',
  apophis: '99942;',
  bennu: '101955;',
  ryugu: '162173;',
  phaethon: '3200;',
  aten: '2062;',
  atira: '163693;',
};

const J2000_JD_TDB = 2_451_545;
const UNIX_EPOCH_JD = 2_440_587.5;
const MS_PER_DAY = 86_400_000;
const STANDISH_FIRST_YEAR = 1800;
const DECADES_IN_STANDISH_RANGE = 26; // 1800, 1810, …, 2050

/** Julian Date of 0h on 1 January of `year` (proleptic Gregorian, as Date.UTC counts). */
export function julianDateOfNewYear(year: number): number {
  return Date.UTC(year, 0, 1) / MS_PER_DAY + UNIX_EPOCH_JD;
}

/** Every decade across Standish Table 1's 1800–2050 fit, plus J2000 where its elements are anchored. */
export const PLANET_SAMPLE_JD_TDB: readonly number[] = [
  ...Array.from({ length: DECADES_IN_STANDISH_RANGE }, (_, decade) =>
    julianDateOfNewYear(STANDISH_FIRST_YEAR + 10 * decade),
  ),
  J2000_JD_TDB,
].toSorted((a, b) => a - b);

/** 2025-11-21, the current standard epoch for published small-body osculating elements. */
export const ASTEROID_EPOCH_JD_TDB = 2_461_000.5;

/** Covers PLAN.md's ±60-day target, with ±120 days of headroom for calibrating the tolerance. */
export const ASTEROID_OFFSET_DAYS = [-120, -60, -30, -10, 0, 10, 30, 60, 120] as const;

export const ASTEROID_SAMPLE_JD_TDB: readonly number[] = ASTEROID_OFFSET_DAYS.map(
  (offsetDays) => ASTEROID_EPOCH_JD_TDB + offsetDays,
);
```

Append to `packages/fixtures/src/fixtureSchema.ts` (add `import { ASTEROID_NAMES, PLANET_NAMES } from './fixtureSpec';` at the top):

```ts
const sourceSchema = z.object({
  api: z.string(),
  settings: z.record(z.string(), z.string()),
});

export const planetFixturesSchema = z.object({
  source: sourceSchema,
  planets: z.record(
    z.enum(PLANET_NAMES),
    z.object({ horizonsId: z.string(), states: z.array(stateRecordSchema) }),
  ),
});

export const asteroidFixturesSchema = z.object({
  source: sourceSchema,
  epochJdTdb: z.number(),
  asteroids: z.record(
    z.enum(ASTEROID_NAMES),
    z.object({
      horizonsCommand: z.string(),
      elements: elementsRecordSchema,
      states: z.array(stateRecordSchema),
    }),
  ),
});

export type PlanetFixtures = z.infer<typeof planetFixturesSchema>;
export type AsteroidFixtures = z.infer<typeof asteroidFixturesSchema>;
export type PlanetFixture = PlanetFixtures['planets'][PlanetName];
export type AsteroidFixture = AsteroidFixtures['asteroids'][AsteroidName];
```

(also import `type AsteroidName, type PlanetName` from `./fixtureSpec`.)

`packages/fixtures/src/generate.ts`:

```ts
import {
  type AsteroidFixture,
  type AsteroidFixtures,
  type ElementsRecord,
  type PlanetFixture,
  type PlanetFixtures,
  type StateRecord,
  asteroidFixturesSchema,
  planetFixturesSchema,
} from './fixtureSchema';
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_HORIZONS_COMMANDS,
  ASTEROID_NAMES,
  ASTEROID_SAMPLE_JD_TDB,
  type AsteroidName,
  PLANET_HORIZONS_IDS,
  PLANET_NAMES,
  PLANET_SAMPLE_JD_TDB,
  type PlanetName,
} from './fixtureSpec';
import {
  type BodyQuery,
  HORIZONS_API_URL,
  HORIZONS_FRAME_PARAMS,
  buildElementsQuery,
  buildVectorsQuery,
} from './horizonsQuery';
import { toElementsRecord, toStateRecord } from './horizonsRecords';
import { HorizonsError } from './horizonsResponse';
import { parseHorizonsTable } from './horizonsTable';

/** The only network seam: the CLI passes a fetch-backed client, tests pass a fake. */
export interface HorizonsClient {
  fetchResultText(params: URLSearchParams): Promise<string>;
}

const FIXTURE_SOURCE = { api: HORIZONS_API_URL, settings: HORIZONS_FRAME_PARAMS };

// Loops await one body at a time on purpose: Horizons asks API users not to send parallel queries.
export async function generatePlanetFixtures(client: HorizonsClient): Promise<PlanetFixtures> {
  const planets: Partial<Record<PlanetName, PlanetFixture>> = {};
  for (const name of PLANET_NAMES) {
    const horizonsId = PLANET_HORIZONS_IDS[name];
    const states = await fetchStates(client, {
      command: horizonsId,
      jdTdbList: PLANET_SAMPLE_JD_TDB,
    });
    planets[name] = { horizonsId, states };
  }
  return planetFixturesSchema.parse({ source: FIXTURE_SOURCE, planets });
}

export async function generateAsteroidFixtures(client: HorizonsClient): Promise<AsteroidFixtures> {
  const asteroids: Partial<Record<AsteroidName, AsteroidFixture>> = {};
  for (const name of ASTEROID_NAMES) {
    asteroids[name] = await fetchAsteroid(client, ASTEROID_HORIZONS_COMMANDS[name]);
  }
  return asteroidFixturesSchema.parse({
    source: FIXTURE_SOURCE,
    epochJdTdb: ASTEROID_EPOCH_JD_TDB,
    asteroids,
  });
}

async function fetchAsteroid(
  client: HorizonsClient,
  horizonsCommand: string,
): Promise<AsteroidFixture> {
  const elements = await fetchElements(client, horizonsCommand);
  const states = await fetchStates(client, {
    command: horizonsCommand,
    jdTdbList: ASTEROID_SAMPLE_JD_TDB,
  });
  return { horizonsCommand, elements, states };
}

async function fetchStates(client: HorizonsClient, query: BodyQuery): Promise<StateRecord[]> {
  const text = await client.fetchResultText(buildVectorsQuery(query));
  const states = parseHorizonsTable(text).map(toStateRecord);
  assertCoversRequestedDates(query.jdTdbList, states);
  return states;
}

async function fetchElements(
  client: HorizonsClient,
  horizonsCommand: string,
): Promise<ElementsRecord> {
  const query = { command: horizonsCommand, jdTdbList: [ASTEROID_EPOCH_JD_TDB] };
  const rows = parseHorizonsTable(await client.fetchResultText(buildElementsQuery(query)));
  const [row] = rows;
  if (rows.length !== 1 || row === undefined)
    throw new HorizonsError(`Expected one elements row, got ${rows.length}`);
  const elements = toElementsRecord(row);
  if (elements.epochJdTdb !== ASTEROID_EPOCH_JD_TDB) {
    throw new HorizonsError(
      `Elements epoch ${elements.epochJdTdb} is not ${ASTEROID_EPOCH_JD_TDB}`,
    );
  }
  return elements;
}

/** Horizons returns rows in time order whatever the TLIST order, so compare against the sorted request. */
function assertCoversRequestedDates(
  requested: readonly number[],
  states: readonly StateRecord[],
): void {
  const expected = requested.toSorted((a, b) => a - b);
  const received = states.map((state) => state.jdTdb);
  if (
    received.length !== expected.length ||
    expected.some((jdTdb, index) => jdTdb !== received[index])
  ) {
    throw new HorizonsError(
      `Requested JDs ${expected.join(', ')} but received ${received.join(', ')}`,
    );
  }
}
```

Append to `packages/fixtures/src/index.ts`:

```ts
export * from './fixtureSpec';
export * from './generate';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/fixtures && npm run typecheck --workspace @perihelion/fixtures && npx eslint packages/fixtures`
Expected: PASS, no type or lint errors.

- [ ] **Step 5: Commit**

```bash
git add packages/fixtures/src
git commit -m "Assemble planet and asteroid fixtures from Horizons with date and epoch coverage checks"
```

---

### Task 4: Generator CLI, committed fixtures and loaders

**Files:**

- Create: `packages/fixtures/scripts/generateFixtures.ts`, `packages/fixtures/src/loaders.ts`
- Create (generated): `packages/fixtures/data/planets.json`, `packages/fixtures/data/asteroids.json`
- Modify: `packages/fixtures/package.json`, `packages/fixtures/tsconfig.json`, root `package.json`, `eslint.config.js`, `packages/fixtures/src/index.ts`
- Test: `packages/fixtures/src/loaders.test.ts`

**Interfaces:**

- Consumes: `generatePlanetFixtures`, `generateAsteroidFixtures`, `HorizonsClient` (Task 3); `horizonsUrl` (Task 1); `readHorizonsResultText` (Task 2); schemas (Tasks 2–3).
- Produces (for issues #9 and #10):
  - `loadPlanetFixtures(): PlanetFixtures`
  - `loadAsteroidFixtures(): AsteroidFixtures`

- [ ] **Step 1: Wire the script**

```bash
npm i -D tsx@^4.23.15 --workspace @perihelion/fixtures
npm pkg set scripts.generate="tsx scripts/generateFixtures.ts" --workspace @perihelion/fixtures
npm pkg set scripts.fixtures="npm run generate --workspace @perihelion/fixtures"
```

`packages/fixtures/tsconfig.json`: change `"include": ["src"]` to `"include": ["src", "scripts"]`.

`eslint.config.js`: change `files: ['apps/server/**/*.ts', 'scripts/**/*.mjs']` to
`files: ['apps/server/**/*.ts', 'packages/fixtures/**/*.ts', 'scripts/**/*.mjs']`.

`packages/fixtures/scripts/generateFixtures.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  type HorizonsClient,
  generateAsteroidFixtures,
  generatePlanetFixtures,
  horizonsUrl,
  readHorizonsResultText,
} from '../src/index';

// Horizons asks API users to send one query at a time; a pause keeps us well inside that.
const PAUSE_BETWEEN_QUERIES_MS = 1_000;
const DATA_DIR = new URL('../data/', import.meta.url);

const horizonsClient: HorizonsClient = {
  async fetchResultText(params) {
    const response = await fetch(horizonsUrl(params));
    const body: unknown = await response.json();
    await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_QUERIES_MS));
    return readHorizonsResultText(body);
  },
};

async function writeFixture(fileName: string, data: unknown): Promise<void> {
  const target = new URL(fileName, DATA_DIR);
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${fileURLToPath(target)}`);
}

/** Both sets are fetched before either is written, so a failure never leaves a mismatched pair. */
async function main(): Promise<void> {
  const planets = await generatePlanetFixtures(horizonsClient);
  const asteroids = await generateAsteroidFixtures(horizonsClient);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFixture('planets.json', planets);
  await writeFixture('asteroids.json', asteroids);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Generate the fixtures (network, dev only)**

Run: `npm run fixtures`
Expected: about 22 queries over ~30 s, then `wrote …/data/planets.json` and `wrote …/data/asteroids.json`. **On any error, stop and report the output; don't retry with changed parameters.**

- [ ] **Step 3: Write the failing test** — `packages/fixtures/src/loaders.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_NAMES,
  ASTEROID_SAMPLE_JD_TDB,
  PLANET_NAMES,
  PLANET_SAMPLE_JD_TDB,
} from './fixtureSpec';
import { toStateRecord } from './horizonsRecords';
import { HORIZONS_FRAME_PARAMS } from './horizonsQuery';
import { parseHorizonsTable } from './horizonsTable';
import { loadAsteroidFixtures, loadPlanetFixtures } from './loaders';

describe('committed Horizons fixtures', () => {
  it('have a state for every planet at every sample date', () => {
    const { planets } = loadPlanetFixtures();
    for (const name of PLANET_NAMES) {
      expect(planets[name].states.map((state) => state.jdTdb)).toEqual(PLANET_SAMPLE_JD_TDB);
    }
  });

  it('have elements at the epoch and states at every offset for every asteroid', () => {
    const { asteroids, epochJdTdb } = loadAsteroidFixtures();
    expect(epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
    for (const name of ASTEROID_NAMES) {
      expect(asteroids[name].elements.epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
      expect(asteroids[name].states.map((state) => state.jdTdb)).toEqual(ASTEROID_SAMPLE_JD_TDB);
    }
  });

  it('record the frame settings they were generated with', () => {
    expect(loadPlanetFixtures().source.settings).toEqual(HORIZONS_FRAME_PARAMS);
    expect(loadAsteroidFixtures().source.settings).toEqual(HORIZONS_FRAME_PARAMS);
  });

  it('agree with the independently recorded Earth–Moon barycentre response at J2000', () => {
    const recordedJ2000 = toStateRecord(parseHorizonsTable(vectorsResponse.result)[1] ?? {});
    const generated = loadPlanetFixtures().planets.earthMoonBarycenter.states;
    expect(generated.find((state) => state.jdTdb === 2451545)).toEqual(recordedJ2000);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run packages/fixtures/src/loaders.test.ts`
Expected: FAIL — cannot resolve `./loaders`.

- [ ] **Step 5: Write minimal implementation** — `packages/fixtures/src/loaders.ts`

```ts
import asteroidsJson from '../data/asteroids.json' with { type: 'json' };
import planetsJson from '../data/planets.json' with { type: 'json' };
import {
  type AsteroidFixtures,
  type PlanetFixtures,
  asteroidFixturesSchema,
  planetFixturesSchema,
} from './fixtureSchema';

/** Validated on load so a hand-edited or truncated fixture fails here, not deep in a golden test. */
export function loadPlanetFixtures(): PlanetFixtures {
  return planetFixturesSchema.parse(planetsJson);
}

export function loadAsteroidFixtures(): AsteroidFixtures {
  return asteroidFixturesSchema.parse(asteroidsJson);
}
```

Append to `packages/fixtures/src/index.ts`: `export * from './loaders';`

- [ ] **Step 6: Run the full check**

Run: `npm run check`
Expected: green (typecheck, lint incl. `prettier --check`, all tests, build).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json eslint.config.js packages/fixtures
git commit -m "Add Horizons fixture generator script and commit planet and asteroid fixtures with typed loaders"
```

---

### Task 5: Progress, PR and tracking

**Files:**

- Modify: `PROGRESS.md`
- Add: this plan file

- [ ] **Step 1: Update `PROGRESS.md`**

- Tick `- [x] Horizons fixture generator + committed fixtures`.
- Decisions log entries (dated 2026-09-28):
  - Fixtures query Horizons planet-system barycentres 1–8 (what Standish Table 1 fits), heliocentric `500@10`, ecliptic J2000, AU-D, TDB.
  - Planet samples: 1 January of every decade 1800–2050 plus J2000 (27 dates). Asteroid elements at JD 2461000.5 (2025-11-21), states at 0, ±10, ±30, ±60, ±120 days.
  - Fixtures are JSON in `packages/fixtures/data/`, validated by zod on load; data and recorded responses are Prettier-ignored so they are never reformatted.
  - `packages/fixtures` depends on zod (validation) and tsx (dev, runs the generator); orbit stays dependency-free.
- Known external issues: Horizons rejects an unencoded `;` with HTTP 400 "parameter not recognized"; rows come back in time order regardless of TLIST order.

- [ ] **Step 2: Verify and commit**

```bash
npm run check
git add PROGRESS.md docs/superpowers/plans/2026-09-28-horizons-fixtures.md
git commit -m "Record Horizons fixture decisions in progress log"
```

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin phase-1/horizons-fixtures
gh pr create --assignee @me --milestone "Phase 1: Orbit engine" \
  --label type:feature --label phase:1 --label area:fixtures \
  --title "Horizons fixture generator and committed fixtures" \
  --body "Adds a dev-only generator that queries JPL Horizons for heliocentric ecliptic J2000 states of the eight planet barycentres (1800-2050) and osculating elements plus states for seven near-Earth asteroids, and commits the results as validated JSON fixtures with typed loaders for the golden tests. Tests run only on recorded responses, fake clients and the committed data.

Closes #8"
```

- [ ] **Step 4: Project board**

```bash
gh project item-add 1 --owner rvpanoz --url <PR URL from step 3>
gh project field-list 1 --owner rvpanoz --format json   # find the Status field and option IDs
gh project item-list 1 --owner rvpanoz --format json    # find item IDs for the PR and issue #8
gh project item-edit --project-id <id> --id <PR item id> --field-id <Status id> --single-select-option-id <In Progress id>
```

Set issue #8 to In Progress as well. The user reviews and merges; don't merge.
