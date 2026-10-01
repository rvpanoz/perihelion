# Phase 5: Shot 2: The Close Approach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pick a real asteroid from this week's CAD list and watch it pass Earth: the camera flies to it and follows
it through closest approach, with a trail, while a HUD shows JPL's own distance, speed and date.

**Architecture:** The server attaches an orbit to every CAD row (from its cached NEO catalog, or one SBDB lookup
per object the catalog lacks), so every listed approach is playable. The web app loads `/api/close-approaches`
through `loadDataset`, lists the rows in a side panel of a minimal app shell, and on selection sets the clock to just
before the approach and flies the camera rig to the asteroid. The asteroid is positioned every frame by the float64
engine (`stateAtTime`), never by the swarm shader. Every number in the list and HUD is a CAD value or an exact unit
conversion of one; the drawn geometry is a two-body illustration.

**Tech Stack:** TypeScript 6 (strict, ESM), React 19, three 0.186, @react-three/fiber 9.8, @react-three/drei 10.7,
Fastify, zod 4, Vitest 5, fast-check.

**Spec:** `PLAN.md` § Phase 5, plus decisions approved while planning (2026-10-01):

1. **App shell, partial.** Task 0 adds the shell layout (canvas full-bleed, top bar, side panel, bottom bar) and a
   data-status pill. Shot tabs, the event timeline and blurred panels are Phase 7. The mockup HTML is not used.
2. **No Earth-centred inset.** It needs a Moon model the engine lacks; deferred, to be decided later.
3. **Diameter.** CAD is asked for `diameter=true`; JPL's diameter (± sigma) is shown when present. Otherwise it is
   estimated from H with an assumed albedo and labelled "est.". No orbit class on the rows.
4. **Orbits for approaches (option B).** The server joins each CAD row to its cached NEO catalog by designation and
   looks up any miss individually in the SBDB API, so newly discovered objects are playable too. A lookup that
   finds no usable orbit drops that row (logged); a network failure fails the refresh, so the cache or snapshot is
   served instead of a silently shorter list. Recorded responses cover the lookups; tests stay offline.
5. **Accuracy.** The engine is two-body (no Earth gravity) and has the Earth–Moon barycentre, not Earth (~4,700 km
   offset). The drawn pass is therefore approximate: Task 4 measures the engine's closest distance against CAD's for
   the recorded rows and proposes a tolerance with that evidence for the user to approve. The HUD never shows an
   engine-derived distance.
6. **Units.** CAD reports AU. km uses `KM_PER_AU` (IAU 2012, exact); LD uses 1 LD = 384,398 km (JPL CNEOS; confirm
   the constant against CNEOS at Task 3 review). Conversions are exact multiplications, never re-derived distances.

## Global Constraints

- No AI/LLM calls anywhere in shipped code.
- Tests never touch the network. Server tests use recorded responses in `packages/fixtures/src/recorded`; web tests
  build approaches in code; nothing reads `apps/web/public/snapshot`.
- Recordings and the snapshot change only by running `npm run record` / `npm run snapshot` (network, dev only),
  committed as generated. Never hand-edit them; never loosen a tolerance to make a test pass.
- `packages/orbit` keeps zero runtime dependencies and gets no Phase 5 changes unless a task review approves one.
- The web app gets data only through `loadDataset` (server first, bundled snapshot second). Never JPL directly.
- Values shown as facts (distance, speed, date, JPL diameter) are CAD's, unrounded in storage; display formatting
  may round. The estimated diameter is always labelled "est."; the trail and the drawn pass are illustrative.
- The focused asteroid is positioned on the CPU in float64 (`packages/orbit`), not in the swarm shader.
- Never drive per-frame animation through React state: `useFrame` + refs only, ordered by `FRAME_PRIORITY`.
- TypeScript strict, ESM, no `any`, units in names (`distanceAu`, `diameterKm`, `jdTdb`). Degrees only at I/O.
- Functions < 20 lines, ≤ 2 arguments (wrap 3+ in an object; an optional trailing `out` follows the engine's
  convention), `try/catch` isolated in its own function.
- New dependencies: none planned. Any need found during a task is proposed at that task's review.

## Review Focus

1. **An approach whose asteroid is missing from the NEO catalog** (discovered after the catalog's last refresh, or
   only in the snapshot): it must still be listed and playable. Pinned in Task 1 (lookup path) and Task 7 (browser).
2. **An empty CAD window** (no approaches within 0.05 AU in ±7 days): the list shows an empty state, the shell and
   swarm keep working. Pinned in Task 3.
3. **Selecting an approach while a flight is running, or picking a second one mid-follow**: the camera retargets
   without jumping and the clock lands on the new approach. Pinned in Task 5.
4. **A snapshot-origin list whose approaches are all in the past**: rows stay playable (the clock moves to them)
   and the pill says the data is a snapshot. Pinned in Tasks 0 and 5.
5. **A very close pass** (distance below a few Earth radii, e.g. 2029 Apophis-like 2.5e-4 AU): the follow camera
   never ends up inside Earth's sphere. Pinned in Task 5.

---

## File structure

| File                                                  | Responsibility                                                   | Task |
| ----------------------------------------------------- | ---------------------------------------------------------------- | ---- |
| `apps/web/src/data/useDataset.ts` (new)               | Generic load-once hook over `loadDataset` (from `useNeoCatalog`) | 0    |
| `apps/web/src/data/useNeoCatalog.ts`                  | Becomes a thin wrapper over `useDataset('neos')`                 | 0    |
| `apps/web/src/shell/AppShell.tsx` (new)               | Layout regions around the full-bleed canvas                      | 0    |
| `apps/web/src/shell/dataStatus.ts` (new)              | Pure: dataset states → pill tone and text                        | 0    |
| `apps/web/src/shell/DataStatusPill.tsx` (new)         | Renders `dataStatus` output                                      | 0    |
| `packages/data/src/closeApproach.ts`                  | Adds `diameterKm`, `diameterSigmaKm`, `orbit` to the row schema  | 1    |
| `packages/data/src/upstream/cad.ts`                   | Reads `diameter`, `diameter_sigma`                               | 1    |
| `packages/data/src/upstream/queries.ts`               | `cadQuery` sends `diameter=true`; adds `sbdbObjectQuery`         | 1    |
| `packages/data/src/upstream/sbdbObject.ts` (new)      | Validates one `sbdb.api` response → `ApproachOrbit` or null      | 1    |
| `packages/data/src/approachOrbits.ts` (new)           | Catalog index by designation; catalog row → `ApproachOrbit`      | 1    |
| `apps/server/src/datasets/datasetRequests.ts`         | Close-approach fetch joins orbits, looks up misses               | 1    |
| `apps/server/scripts/recordUpstream.ts`               | Records the CAD (with diameters) and the SBDB lookups it needs   | 1    |
| `apps/web/src/approaches/diameter.ts` (new)           | JPL or estimated diameter, and its display text                  | 2    |
| `apps/web/src/approaches/*` (new)                     | List, formatting, selection store, HUD                           | 3, 6 |
| `apps/web/src/scene/approach/*` (new)                 | Engine position, trail, follow target                            | 4, 5 |
| `apps/web/src/scene/camera/cameraRig.ts`, `flight.ts` | Focus becomes "body or approach asteroid"                        | 5    |
| `apps/web/src/scene/orbitElements.ts` (new)           | Degrees → engine elements, shared by swarm and approach          | 4    |
| `apps/web/src/scene/swarm/swarmAttributes.ts`         | Uses `elementsFromDegrees`                                       | 4    |
| `apps/web/src/scene/sceneFrame.ts`                    | Optional `out` on `sceneAxesFromEcliptic`                        | 5    |

---

### Task 0: App shell and data-status pill

UI task: interfaces, test cases and acceptance checks; no full code (see the plan-format decision).

**Files:**

- Create: `apps/web/src/data/useDataset.ts`, `apps/web/src/shell/AppShell.tsx`, `apps/web/src/shell/dataStatus.ts`,
  `apps/web/src/shell/DataStatusPill.tsx`, tests beside each pure module
- Modify: `apps/web/src/data/useNeoCatalog.ts`, `apps/web/src/App.tsx`, the app stylesheet (locate at review)

**Interfaces:**

- Consumes: `loadDataset<N>(name)` and `DatasetResponse<N>`, `DatasetOrigin` from `@perihelion/data`.
- Produces:
  - `type DatasetState<N extends DatasetName> = { status: 'loading' } | { status: 'ready'; data: DatasetData<N>;
origin: DatasetOrigin; fetchedAt: string } | { status: 'unavailable' }`
  - `useDataset<N>(name: N, load?: () => Promise<DatasetResponse<N>>): DatasetState<N>` and the pure
    `loadDatasetState<N>(load): Promise<DatasetState<N>>` (the logic `loadNeoCatalog` has today, generalised).
    `useNeoCatalog` keeps its exported shape (`catalog` field) so `App`, `SwarmStatus` and their tests are unchanged.
  - `dataStatus(input: { datasets: readonly NamedDatasetState[]; nowMs: number }): DataStatus` where
    `DataStatus = { tone: 'live' | 'stale' | 'snapshot' | 'loading' | 'unavailable'; text: string; details: string[] }`.
    The pill shows the worst tone across datasets (unavailable > snapshot > stale > loading > live) and one
    `details` line per dataset for its tooltip / expanded view.
  - `<AppShell top={…} side={…} bottom={…}>{canvas}</AppShell>`: named slots; Task 3 fills `side`.

- [ ] **Step 1: Write failing tests for `loadDatasetState`** (move the existing `loadNeoCatalog` cases): ready with
      origin and `fetchedAt` passed through; a rejecting loader → `unavailable` (and a `console.warn`).
- [ ] **Step 2: Write failing tests for `dataStatus`:**
  - all `fresh` → tone `live`, text `Live JPL data`
  - one `stale` → tone `stale`, text `Cached data, refreshing`
  - one `snapshot` with `fetchedAt` 2026-09-28T10:00:00Z → tone `snapshot`, text `Offline snapshot from 28 Sep 2026`
  - one `unavailable` among ready ones → tone `unavailable`, text names that dataset (`Close approaches unavailable`)
  - any `loading`, none worse → tone `loading`
  - `details` has one line per dataset with its age, e.g. `NEO catalog: fetched 4 min ago` (from `nowMs`)
- [ ] **Step 3: Run** `npx vitest run apps/web/src/data apps/web/src/shell`, expect FAIL.
- [ ] **Step 4: Implement** `useDataset`, `loadDatasetState`, `dataStatus`; rewire `useNeoCatalog` over them.
- [ ] **Step 5: Run the tests again**, expect PASS.
- [ ] **Step 6: Build the shell.** `AppShell` + `DataStatusPill`; `App` renders the canvas full-bleed under the
      shell; `TimeControls` moves to `bottom`, `FocusPicker` and the pill to `top`, the `side` slot is empty for now.
      The pill reads `neos` only in this task; Task 3 adds `close-approaches`. Review checks whether `SwarmStatus`
      overlaps the pill and proposes keeping only its loading/unavailable message.
- [ ] **Step 7: Browser check** (`npm run dev`): pill reads `Live JPL data` with the server up; stop the server and
      reload → `Offline snapshot from …`. Overlays leave the canvas centre clear; Sun overview and Earth zoom still at
      the Phase 4 frame times (60 fps target). Note the numbers in the PR.
- [ ] **Step 8: `npm run check`**, then commit: `Add the app shell layout and a data-status pill`.

---

### Task 1: Orbits and JPL diameters on close-approach rows

Data and server task: interfaces, test cases and acceptance checks; no full code. Read `recordUpstream.ts`, the
server test helpers and `cells.ts` before starting; the review proposes exact names against them.

**Files:**

- Create: `packages/data/src/upstream/sbdbObject.ts`, `packages/data/src/approachOrbits.ts`, tests beside each
- Modify: `packages/data/src/closeApproach.ts`, `packages/data/src/upstream/cad.ts`,
  `packages/data/src/upstream/queries.ts`, `packages/data/src/index.ts`,
  `apps/server/src/datasets/datasetRequests.ts` (+ its wiring in `app.ts`), `apps/server/scripts/recordUpstream.ts`,
  their tests
- Regenerate (commands, not edits): `packages/fixtures/src/recorded/*` via `npm run record`;
  `apps/web/public/snapshot/close-approaches.json` via `npm run snapshot`

**Interfaces:**

- Consumes: `NeoCatalog` columns, `roundTo`, `readColumnarRows`/`readOptionalNumber`, `UpstreamQuery`,
  `HttpClient.getJson`, `DatasetService.read`.
- Produces:
  - `approachOrbitSchema` / `ApproachOrbit`: `{ epochJdTdb, eccentricity (0 ≤ e < 1), semiMajorAxisAu (> 0),
inclinationDeg, longitudeOfAscendingNodeDeg, argumentOfPerihelionDeg, meanAnomalyDeg }`, the same names and
    rounding as the NEO catalog columns, so a catalog row maps across 1:1.
  - `closeApproachSchema` gains `diameterKm: number > 0 | null`, `diameterSigmaKm: number ≥ 0 | null`,
    `orbit: ApproachOrbit`. `toCloseApproaches` returns `CadApproach = Omit<CloseApproach, 'orbit'>`.
  - `cadQuery(window)` adds `diameter: 'true'`; `CAD_FIELDS` adds `'diameter'`, `'diameter_sigma'`.
  - `SBDB_OBJECT_API_URL = 'https://ssd-api.jpl.nasa.gov/sbdb.api'`;
    `sbdbObjectQuery(designation): UpstreamQuery` → `{ sstr: designation, 'full-prec': 'true' }`.
  - `sbdbObjectResponseSchema` (zod over `orbit.epoch` and `orbit.elements[{ name, value }]`; extra fields allowed)
    and `toApproachOrbit(response): ApproachOrbit | null` (null when an element is missing or e ≥ 1 after rounding,
    as `toElements` does for the catalog).
  - `indexCatalogOrbits(catalog: NeoCatalog): ReadonlyMap<string, ApproachOrbit>` keyed by designation.
  - Server: `closeApproachRequest` takes a new dependency `readNeoCatalog: () => Promise<NeoCatalog>` (backed by
    `DatasetService.read(requests.neos())`), joins orbits, and calls `sbdbObjectQuery` sequentially for misses, at
    most `MAX_ORBIT_LOOKUPS = 25` per refresh (beyond that the refresh fails, as a format change would).

- [ ] **Step 1: Re-record.** Extend `recordUpstream.ts`: CAD with `diameter=true`, then one `sbdb.api` response for
      each recorded CAD designation absent from the recorded SBDB catalog, plus one known-not-found designation for
      the drop path. Run `npm run record` and commit the generated files as they are.
- [ ] **Step 2: Write failing data tests:**
  - `toCloseApproaches` on the new recording: `diameterKm`/`diameterSigmaKm` read when present, null when CAD leaves
    them null; existing CAD tests unchanged and still passing.
  - `toApproachOrbit` on a recorded lookup: elements equal the response's values rounded like the catalog
    (`ELEMENT_DECIMALS` / `ANGLE_DECIMALS`), `epochJdTdb` equals `orbit.epoch`.
  - `toApproachOrbit` on the same response with `e` = `1.2` or with `ma` removed → null; with `orbit` missing →
    the schema throws `ZodError`.
  - `indexCatalogOrbits` on a 2-row catalog built in code: both designations map to their columns' values.
- [ ] **Step 3: Write failing server tests** (recorded responses, fake `HttpClient`):
  - every CAD row found in the catalog → zero lookups, every row has `orbit`
  - one row missing from the catalog → exactly one `sbdb.api` request, for that designation; the row has the
    looked-up orbit (Review Focus 1)
  - lookup answers "not found" (recorded) → that row dropped, a warning logged, the rest served
  - lookup throws a network error → `fetchData` rejects (so `DatasetService` serves stale or snapshot)
  - 26 misses → rejects without making a 26th request
- [ ] **Step 4: Run** `npx vitest run packages/data apps/server`, expect FAIL.
- [ ] **Step 5: Implement** the schema, CAD fields, SBDB object query and normaliser, catalog index and the server
      join; wire `readNeoCatalog` in `app.ts`.
- [ ] **Step 6: Run the tests again**, expect PASS.
- [ ] **Step 7: Refresh the snapshot** with `npm run snapshot`; check the new `close-approaches.json` validates
      (the web's snapshot test, if any, or `loadDataset` against it in the browser) and commit it as generated.
- [ ] **Step 8: Live check** (`npm run dev`): `curl -s localhost:<port>/api/close-approaches | jq '.data[0]'`
      shows `orbit` and the diameter fields; note in the PR how many rows needed a lookup.
- [ ] **Step 9: `npm run check`**, then commit: `Attach orbits and JPL diameters to close-approach rows`.

---

### Task 2: Diameter, from JPL or estimated from H

Maths task: full code.

**Files:**

- Create: `apps/web/src/approaches/diameter.ts`, `apps/web/src/approaches/diameter.test.ts`

**Interfaces:**

- Consumes: `CloseApproach` (`diameterKm`, `diameterSigmaKm`, `absoluteMagnitude`) from Task 1.
- Produces:
  - `estimatedDiameterKm(absoluteMagnitude: number): number`
  - `type ApproachDiameter = { kind: 'jpl'; diameterKm: number; sigmaKm: number | null } | { kind: 'estimated';
diameterKm: number } | { kind: 'unknown' }`
  - `approachDiameter(approach: DiameterFields): ApproachDiameter`
  - `diameterText(diameter: ApproachDiameter): string` (used by the list in Task 3 and the HUD in Task 6)

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { approachDiameter, diameterText, estimatedDiameterKm } from './diameter';

describe('estimatedDiameterKm', () => {
  it('follows D = 1329 km / √p · 10^(−H/5) with p = 0.14', () => {
    // 1329 / √0.14 = 3551.902 km at H = 0; 10^(−15/5) = 1e-3.
    expect(estimatedDiameterKm(15)).toBeCloseTo(3.551902, 6);
  });

  it('shrinks tenfold for every 5 magnitudes', () => {
    fc.assert(
      fc.property(fc.double({ min: 5, max: 30, noNaN: true }), (h) => {
        const ratio = estimatedDiameterKm(h) / estimatedDiameterKm(h + 5);
        expect(ratio).toBeCloseTo(10, 9);
      }),
    );
  });
});

describe('approachDiameter', () => {
  it("prefers JPL's diameter, with its sigma", () => {
    const diameter = approachDiameter({
      diameterKm: 0.37,
      diameterSigmaKm: 0.02,
      absoluteMagnitude: 19.1,
    });
    expect(diameter).toEqual({ kind: 'jpl', diameterKm: 0.37, sigmaKm: 0.02 });
  });

  it('estimates from H when JPL has no diameter', () => {
    const diameter = approachDiameter({
      diameterKm: null,
      diameterSigmaKm: null,
      absoluteMagnitude: 15,
    });
    expect(diameter).toEqual({ kind: 'estimated', diameterKm: estimatedDiameterKm(15) });
  });

  it('is unknown with neither', () => {
    const diameter = approachDiameter({
      diameterKm: null,
      diameterSigmaKm: null,
      absoluteMagnitude: null,
    });
    expect(diameter).toEqual({ kind: 'unknown' });
  });
});

describe('diameterText', () => {
  it("prints JPL's value as given, in km", () => {
    expect(diameterText({ kind: 'jpl', diameterKm: 0.37, sigmaKm: 0.02 })).toBe('0.37 ± 0.02 km');
    expect(diameterText({ kind: 'jpl', diameterKm: 1.1, sigmaKm: null })).toBe('1.1 km');
  });

  it('labels estimates and keeps two significant figures', () => {
    expect(diameterText({ kind: 'estimated', diameterKm: 3.551902 })).toBe('est. 3.6 km');
    expect(diameterText({ kind: 'estimated', diameterKm: 0.35519 })).toBe('est. 360 m');
    expect(diameterText({ kind: 'estimated', diameterKm: 0.0355 })).toBe('est. 36 m');
  });

  it('says unknown', () => {
    expect(diameterText({ kind: 'unknown' })).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run** `npx vitest run apps/web/src/approaches/diameter.test.ts`, expect FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { CloseApproach } from '@perihelion/data';

/**
 * Debiased mean geometric albedo of near-Earth asteroids (Stuart & Binzel 2004, Icarus 170, 295). Real albedos
 * run ~0.05–0.5, so an estimate can be off by a factor of ~2 either way: hence "est." and two significant figures.
 */
export const ASSUMED_ALBEDO = 0.14;
/** D = 1329 km / √p · 10^(−H/5) (Fowler & Chillemi 1992; Pravec & Harris 2007, Icarus 190, 250). */
const DIAMETER_AT_H0_UNIT_ALBEDO_KM = 1329;
const ESTIMATE_SIGNIFICANT_FIGURES = 2;
const METRES_PER_KM = 1000;

export type DiameterFields = Pick<
  CloseApproach,
  'diameterKm' | 'diameterSigmaKm' | 'absoluteMagnitude'
>;

export type ApproachDiameter =
  | { kind: 'jpl'; diameterKm: number; sigmaKm: number | null }
  | { kind: 'estimated'; diameterKm: number }
  | { kind: 'unknown' };

export function estimatedDiameterKm(absoluteMagnitude: number): number {
  return (
    (DIAMETER_AT_H0_UNIT_ALBEDO_KM / Math.sqrt(ASSUMED_ALBEDO)) * 10 ** (-absoluteMagnitude / 5)
  );
}

/** A measured diameter always wins: the estimate is only a fallback for objects JPL has not sized. */
export function approachDiameter(approach: DiameterFields): ApproachDiameter {
  if (approach.diameterKm !== null) {
    return { kind: 'jpl', diameterKm: approach.diameterKm, sigmaKm: approach.diameterSigmaKm };
  }
  if (approach.absoluteMagnitude === null) return { kind: 'unknown' };
  return { kind: 'estimated', diameterKm: estimatedDiameterKm(approach.absoluteMagnitude) };
}

export function diameterText(diameter: ApproachDiameter): string {
  switch (diameter.kind) {
    case 'jpl':
      return jplDiameterText(diameter.diameterKm, diameter.sigmaKm);
    case 'estimated':
      return `est. ${estimateText(diameter.diameterKm)}`;
    case 'unknown':
      return 'unknown';
  }
}

/** JPL's figures are facts (CLAUDE.md): printed as given, in JPL's unit, never rescaled or rounded. */
function jplDiameterText(diameterKm: number, sigmaKm: number | null): string {
  return sigmaKm === null ? `${diameterKm} km` : `${diameterKm} ± ${sigmaKm} km`;
}

function estimateText(diameterKm: number): string {
  return diameterKm < 1
    ? `${significant(diameterKm * METRES_PER_KM)} m`
    : `${significant(diameterKm)} km`;
}

/** Through Number, so 355.19 prints as "360" rather than toPrecision's "3.6e+2". */
function significant(value: number): string {
  return String(Number(value.toPrecision(ESTIMATE_SIGNIFICANT_FIGURES)));
}
```

- [ ] **Step 4: Run the tests again**, expect PASS.
- [ ] **Step 5: `npm run check`**, then commit: `Show JPL's diameter, or an estimate from H labelled est.`

---

### Task 3: Close-approach list

UI task with one fact-critical formatter (full code for `approachFormat.ts` only).

**Files:**

- Create: `apps/web/src/approaches/approachFormat.ts`, `apps/web/src/approaches/approachSelection.ts`,
  `apps/web/src/approaches/ApproachList.tsx`, tests beside each
- Modify: `apps/web/src/App.tsx` (side slot, pill datasets), the app stylesheet

**Interfaces:**

- Consumes: `useDataset('close-approaches')` and `DatasetState` (Task 0); `diameterText`/`approachDiameter`
  (Task 2); `KM_PER_AU` from `@perihelion/orbit`.
- Produces:
  - `KM_PER_LUNAR_DISTANCE = 384_398`; `distanceTexts(distanceAu): { au: string; km: string; lunar: string }`;
    `speedText(kmPerS): string`; `approachDateText(approach): string`; `approachLabel(approach): string`
  - `approachSelection`: `selected: CloseApproach | undefined`, `select(approach)`, `clear()`, `subscribe`
    (an external store like `timeStore`: notifies on user actions only)
  - `<ApproachList state={DatasetState<'close-approaches'>} onSelect={(approach) => void} />`. Until Task 5,
    `App` passes `approachSelection.select`; Task 5 swaps in `playApproach`.

- [ ] **Step 1: Confirm the LD constant** against the CNEOS site (cneos.jpl.nasa.gov, "LD" definition). If CNEOS
      uses another value, use theirs and fix the expected strings below before writing the test.
- [ ] **Step 2: Write the failing formatter tests**

```ts
import { describe, expect, it } from 'vitest';
import { approachLabel, distanceTexts, speedText } from './approachFormat';

describe('distanceTexts', () => {
  it("keeps CAD's AU exactly and converts with exact constants", () => {
    // 0.05 × 149,597,870.7 = 7,479,893.535 km; ÷ 384,398 = 19.4587… LD.
    expect(distanceTexts(0.05)).toEqual({
      au: '0.05 AU',
      km: '7,479,894 km',
      lunar: '19.46 LD',
    });
  });

  it('never rounds the AU figure', () => {
    // 0.0123456789 AU = 1,846,887.276 km = 4.8046 LD.
    expect(distanceTexts(0.0123456789)).toEqual({
      au: '0.0123456789 AU',
      km: '1,846,887 km',
      lunar: '4.80 LD',
    });
  });
});

describe('speedText', () => {
  it("prints CAD's value as given", () => {
    expect(speedText(12.345678)).toBe('12.345678 km/s');
  });
});

describe('approachLabel', () => {
  it("trims CAD's padded full name", () => {
    expect(approachLabel({ fullName: '       (2024 XY1)' })).toBe('(2024 XY1)');
  });
});
```

- [ ] **Step 3: Run** `npx vitest run apps/web/src/approaches`, expect FAIL.
- [ ] **Step 4: Implement**

```ts
import type { CloseApproach } from '@perihelion/data';
import { KM_PER_AU } from '@perihelion/orbit';

/** JPL CNEOS's lunar distance. CAD reports AU only; LD and km are exact conversions of CAD's figure. */
export const KM_PER_LUNAR_DISTANCE = 384_398;
const LUNAR_DECIMALS = 2;
const GROUPED_KM = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export interface DistanceTexts {
  au: string;
  km: string;
  lunar: string;
}

/** AU is CAD's own number, printed in full; km and LD are rounded for reading, never re-derived. */
export function distanceTexts(distanceAu: number): DistanceTexts {
  const distanceKm = distanceAu * KM_PER_AU;
  return {
    au: `${distanceAu} AU`,
    km: `${GROUPED_KM.format(distanceKm)} km`,
    lunar: `${(distanceKm / KM_PER_LUNAR_DISTANCE).toFixed(LUNAR_DECIMALS)} LD`,
  };
}

export function speedText(kmPerS: number): string {
  return `${kmPerS} km/s`;
}

/** CAD's calendar date is TDB, not UTC (they differ by ~69 s); the label says so. */
export function approachDateText(approach: Pick<CloseApproach, 'approachCalendarTdb'>): string {
  return `${approach.approachCalendarTdb} TDB`;
}

export function approachLabel(approach: Pick<CloseApproach, 'fullName'>): string {
  return approach.fullName.trim();
}
```

- [ ] **Step 5: Write failing tests for `approachSelection`:** `select` stores the same object and notifies once;
      `clear` empties it and notifies; an unsubscribed listener is not called.
- [ ] **Step 6: Write failing tests for `ApproachList`** (use the same component-test setup as `SwarmStatus`'s
      test; locate it at review):
  - `loading` → `Loading close approaches…`
  - `unavailable` → `Close approaches unavailable`
  - ready with `[]` → `No asteroid passes within 0.05 AU (19.46 LD) of Earth in this window.` (Review Focus 2)
  - ready with 3 rows → 3 buttons in CAD order, each showing label, date text, `lunar` distance, speed and
    diameter text; the selected row has `aria-pressed="true"`; clicking calls `onSelect` with that row object
- [ ] **Step 7: Run the tests**, expect FAIL; **implement** `approachSelection` and `ApproachList`; run, expect PASS.
- [ ] **Step 8: Wire up.** `App` loads `useDataset('close-approaches')`, renders `ApproachList` in the shell's
      `side` slot and adds the dataset to the pill (labelled `Close approaches`).
- [ ] **Step 9: Browser check:** the list matches `curl -s localhost:<port>/api/close-approaches | jq '.data'` row
      for row; the pill reflects both datasets; frame times unchanged.
- [ ] **Step 10: `npm run check`**, then commit: `Add the close-approach list`.

---

### Task 4: The asteroid on the engine

Maths task: full code. The cross-check tolerance is measured, not chosen (decision 5).

**Files:**

- Create: `apps/web/src/scene/orbitElements.ts`, `apps/web/src/scene/approach/approachTiming.ts`,
  `apps/web/src/scene/approach/approachGeometry.ts`, `apps/web/src/scene/approach/approachTrail.ts`,
  `apps/web/src/scene/approach/asteroidPosition.ts`, `apps/web/src/scene/approach/ApproachScene.tsx`
  (marker, trail line and the per-frame updater), tests beside each pure module, and
  `apps/web/src/scene/approach/approachCrossCheck.test.ts`
- Modify: `apps/web/src/scene/swarm/swarmAttributes.ts` (use `elementsFromDegrees`),
  `apps/web/src/scene/SceneContents.tsx` (mount `ApproachScene`)

**Interfaces:**

- Consumes: `stateAtTime(elements, jdTdb, out)`, `planetStateAt(planet, jdTdb, out)`, `createStateVector()`,
  `norm`, `KM_PER_AU`, `OrbitalElements`, `Vector3` from `@perihelion/orbit`; `ApproachOrbit`, `CloseApproach`
  (Task 1); `approachSelection` (Task 3); `sceneAxesFromEcliptic`, `writeSceneOffset`, `FRAME_PRIORITY`,
  `bodyPositions`.
- Produces:
  - `elementsFromDegrees(orbit: DegreeElements): OrbitalElements` (shared with the swarm)
  - `crossingDays(approach): number` (τ = d / v, used by the trail here and by playback in Task 5)
  - `writeGeocentricOffset(request: { elements; jdTdb }, out: Vector3): Vector3`
  - `findClosestApproach(search: { distanceAtJd; aroundJdTdb }): ClosestApproach` and
    `closestApproach(elements, aroundJdTdb): ClosestApproach`, where `ClosestApproach = { jdTdb; distanceAu }`
  - `TRAIL_POINTS`, `trailOffsetDays(index, halfWindowDays)`, `trailIndexAt(offsetDays, halfWindowDays)`,
    `writeTrail(request: { elements; approachJdTdb; halfWindowDays }, out: Float32Array)`
  - `asteroidPositionAu: Vector3` (float64, heliocentric) and `elementsForApproach(approach)` (memoised by object
    identity, so selection and the frame loop share one conversion, synchronously)

- [ ] **Step 1: Write the failing tests for the shared conversion and timing**

```ts
// orbitElements.test.ts
import { describe, expect, it } from 'vitest';
import { elementsFromDegrees } from './orbitElements';

describe('elementsFromDegrees', () => {
  it('converts the four angles to radians and passes the rest through', () => {
    const elements = elementsFromDegrees({
      epochJdTdb: 2_461_000.5,
      eccentricity: 0.2,
      semiMajorAxisAu: 1.1,
      inclinationDeg: 90,
      longitudeOfAscendingNodeDeg: 180,
      argumentOfPerihelionDeg: 45,
      meanAnomalyDeg: 360,
    });
    expect(elements).toEqual({
      epochJdTdb: 2_461_000.5,
      eccentricity: 0.2,
      semiMajorAxisAu: 1.1,
      inclinationRad: Math.PI / 2,
      longitudeOfAscendingNodeRad: Math.PI,
      argumentOfPerihelionRad: Math.PI / 4,
      meanAnomalyRad: 2 * Math.PI,
    });
  });
});
```

```ts
// approachTiming.test.ts
import { describe, expect, it } from 'vitest';
import { crossingDays } from './approachTiming';

describe('crossingDays', () => {
  it('is the time to cover the miss distance at the relative speed', () => {
    // 0.01 AU = 1,495,978.707 km; at 10 km/s that is 149,597.87 s = 1.731457 d.
    expect(crossingDays({ distanceAu: 0.01, relativeVelocityKmPerS: 10 })).toBeCloseTo(1.731457, 6);
  });

  it('guards a zero speed and caps very slow passes at 10 days', () => {
    expect(crossingDays({ distanceAu: 1e-4, relativeVelocityKmPerS: 0 })).toBeCloseTo(
      (1e-4 * 149_597_870.7) / 0.1 / 86_400,
      9,
    );
    expect(crossingDays({ distanceAu: 0.05, relativeVelocityKmPerS: 0.5 })).toBe(10);
  });
});
```

- [ ] **Step 2: Write the failing geometry and trail tests**

```ts
// approachGeometry.test.ts
import { norm, planetElementsAt } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { findClosestApproach, writeGeocentricOffset } from './approachGeometry';

const JD_TDB = 2_461_000.5;

describe('writeGeocentricOffset', () => {
  it("is zero for an object on the Earth–Moon barycentre's own orbit", () => {
    const elements = planetElementsAt('earthMoonBarycenter', JD_TDB);
    const offset = writeGeocentricOffset({ elements, jdTdb: JD_TDB }, [0, 0, 0]);
    expect(norm(offset)).toBeLessThan(1e-12);
  });
});

describe('findClosestApproach', () => {
  // A straight-line flyby, |r(t)| = √(d² + v²(t − t₀)²): the shape of every CAD pass near closest approach.
  const flyby = (closestJdTdb: number) => (jdTdb: number) =>
    Math.hypot(2.5e-4, 0.004 * (jdTdb - closestJdTdb));

  it('finds a minimum between hourly samples to well under a second', () => {
    const closestJdTdb = JD_TDB + 1.3712345;
    const found = findClosestApproach({ distanceAtJd: flyby(closestJdTdb), aroundJdTdb: JD_TDB });
    expect(Math.abs(found.jdTdb - closestJdTdb)).toBeLessThan(1e-6);
    expect(found.distanceAu).toBeCloseTo(2.5e-4, 12);
  });

  it('finds a minimum before the guess too', () => {
    const closestJdTdb = JD_TDB - 2.04;
    const found = findClosestApproach({ distanceAtJd: flyby(closestJdTdb), aroundJdTdb: JD_TDB });
    expect(Math.abs(found.jdTdb - closestJdTdb)).toBeLessThan(1e-6);
  });
});
```

```ts
// approachTrail.test.ts
import { planetElementsAt } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { writeGeocentricOffset } from './approachGeometry';
import { TRAIL_POINTS, trailIndexAt, trailOffsetDays, writeTrail } from './approachTrail';

const HALF_WINDOW_DAYS = 5;

describe('trailOffsetDays', () => {
  it('spans the window, symmetric and increasing', () => {
    expect(trailOffsetDays(0, HALF_WINDOW_DAYS)).toBe(-HALF_WINDOW_DAYS);
    expect(trailOffsetDays(TRAIL_POINTS - 1, HALF_WINDOW_DAYS)).toBe(HALF_WINDOW_DAYS);
    for (let index = 1; index < TRAIL_POINTS; index += 1) {
      const offset = trailOffsetDays(index, HALF_WINDOW_DAYS);
      expect(offset).toBeGreaterThan(trailOffsetDays(index - 1, HALF_WINDOW_DAYS));
      expect(offset).toBeCloseTo(-trailOffsetDays(TRAIL_POINTS - 1 - index, HALF_WINDOW_DAYS), 12);
    }
  });

  it('is densest at closest approach', () => {
    const middle = TRAIL_POINTS / 2;
    const centreStep = trailOffsetDays(middle, 1) - trailOffsetDays(middle - 1, 1);
    const edgeStep = trailOffsetDays(TRAIL_POINTS - 1, 1) - trailOffsetDays(TRAIL_POINTS - 2, 1);
    expect(centreStep).toBeLessThan(edgeStep / 1000);
  });
});

describe('trailIndexAt', () => {
  it('inverts trailOffsetDays and clamps outside the window', () => {
    for (let index = 0; index < TRAIL_POINTS; index += 1) {
      expect(trailIndexAt(trailOffsetDays(index, HALF_WINDOW_DAYS), HALF_WINDOW_DAYS)).toBe(index);
    }
    expect(trailIndexAt(-99, HALF_WINDOW_DAYS)).toBe(0);
    expect(trailIndexAt(99, HALF_WINDOW_DAYS)).toBe(TRAIL_POINTS - 1);
  });
});

describe('writeTrail', () => {
  it('writes each sample as the geocentric offset at its time, in scene axes', () => {
    const elements = { ...planetElementsAt('mars', 2_461_000.5) };
    const request = { elements, approachJdTdb: 2_461_000.5, halfWindowDays: HALF_WINDOW_DAYS };
    const trail = writeTrail(request, new Float32Array(TRAIL_POINTS * 3));
    for (const index of [0, 100, TRAIL_POINTS - 1]) {
      const jdTdb = request.approachJdTdb + trailOffsetDays(index, HALF_WINDOW_DAYS);
      const [x, y, z] = writeGeocentricOffset({ elements, jdTdb }, [0, 0, 0]);
      // Scene axes are ecliptic (x, z, −y); float32 keeps ~7 significant figures.
      expect(trail[index * 3]).toBeCloseTo(x, 6);
      expect(trail[index * 3 + 1]).toBeCloseTo(z, 6);
      expect(trail[index * 3 + 2]).toBeCloseTo(-y, 6);
    }
  });
});
```

- [ ] **Step 3: Run** `npx vitest run apps/web/src/scene/orbitElements.test.ts apps/web/src/scene/approach`,
      expect FAIL.
- [ ] **Step 4: Implement**

```ts
// apps/web/src/scene/orbitElements.ts
import type { ApproachOrbit } from '@perihelion/data';
import type { OrbitalElements } from '@perihelion/orbit';

/** SBDB gives angles in degrees; the engine works in radians. Converted here, at the I/O boundary. */
const RAD_PER_DEG = Math.PI / 180;

/** The NEO catalog's column names; a catalog row and an approach orbit both have this shape. */
export type DegreeElements = ApproachOrbit;

export function elementsFromDegrees(orbit: DegreeElements): OrbitalElements {
  return {
    epochJdTdb: orbit.epochJdTdb,
    eccentricity: orbit.eccentricity,
    semiMajorAxisAu: orbit.semiMajorAxisAu,
    inclinationRad: orbit.inclinationDeg * RAD_PER_DEG,
    longitudeOfAscendingNodeRad: orbit.longitudeOfAscendingNodeDeg * RAD_PER_DEG,
    argumentOfPerihelionRad: orbit.argumentOfPerihelionDeg * RAD_PER_DEG,
    meanAnomalyRad: orbit.meanAnomalyDeg * RAD_PER_DEG,
  };
}
```

`swarmAttributes.ts` then builds a `DegreeElements` row from the columns and calls `elementsFromDegrees` instead of
its own `RAD_PER_DEG` lines; its tests must pass unchanged.

```ts
// apps/web/src/scene/approach/approachTiming.ts
import type { CloseApproach } from '@perihelion/data';
import { KM_PER_AU } from '@perihelion/orbit';

const SECONDS_PER_DAY = 86_400;
/** CAD's schema allows 0; 0.1 km/s is far below any real Earth encounter, so it only guards the division. */
const MIN_RELATIVE_SPEED_KM_PER_S = 0.1;
/** A very slow, distant pass would otherwise play over months; ten days keeps the shot one sweep. */
const MAX_CROSSING_DAYS = 10;

/** τ = d / v: how long the asteroid takes to cover its own miss distance, the natural clock of a flyby. */
export function crossingDays(
  approach: Pick<CloseApproach, 'distanceAu' | 'relativeVelocityKmPerS'>,
): number {
  const distanceKm = approach.distanceAu * KM_PER_AU;
  const speedKmPerS = Math.max(approach.relativeVelocityKmPerS, MIN_RELATIVE_SPEED_KM_PER_S);
  return Math.min(distanceKm / speedKmPerS / SECONDS_PER_DAY, MAX_CROSSING_DAYS);
}
```

```ts
// apps/web/src/scene/approach/approachGeometry.ts
import {
  type OrbitalElements,
  type Vector3,
  createStateVector,
  norm,
  planetStateAt,
  stateAtTime,
} from '@perihelion/orbit';

export interface ClosestApproach {
  jdTdb: number;
  distanceAu: number;
}

export interface MinimumSearch {
  distanceAtJd: (jdTdb: number) => number;
  aroundJdTdb: number;
}

/** CAD's t_sigma can be days; ±3 d at hourly steps brackets the engine's minimum even when it drifts from CAD's. */
const SEARCH_HALF_WINDOW_DAYS = 3;
const SEARCH_STEP_DAYS = 1 / 24;
/** ≈ 9 ms. JD near 2.46e6 resolves to ~4e-10 d in float64, so this is well above rounding. */
const REFINE_TOLERANCE_DAYS = 1e-7;
const INVERSE_GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

const scratchAsteroid = createStateVector();
const scratchEarth = createStateVector();
const scratchOffset: Vector3 = [0, 0, 0];

/** Asteroid minus the Earth–Moon barycentre: Standish has no Earth, so this is ≈ 4,670 km from geocentric. */
export function writeGeocentricOffset(
  request: { elements: OrbitalElements; jdTdb: number },
  out: Vector3,
): Vector3 {
  const asteroid = stateAtTime(request.elements, request.jdTdb, scratchAsteroid).positionAu;
  const earth = planetStateAt('earthMoonBarycenter', request.jdTdb, scratchEarth).positionAu;
  for (const axis of [0, 1, 2] as const) out[axis] = asteroid[axis] - earth[axis];
  return out;
}

export function closestApproach(elements: OrbitalElements, aroundJdTdb: number): ClosestApproach {
  const distanceAtJd = (jdTdb: number) =>
    norm(writeGeocentricOffset({ elements, jdTdb }, scratchOffset));
  return findClosestApproach({ distanceAtJd, aroundJdTdb });
}

/** Hourly scan for the bracket, then golden-section search inside it (Press et al., Numerical Recipes §10.2). */
export function findClosestApproach(search: MinimumSearch): ClosestApproach {
  const coarseJdTdb = coarseMinimumJdTdb(search);
  const jdTdb = goldenSectionMinimum(search.distanceAtJd, {
    lowJdTdb: coarseJdTdb - SEARCH_STEP_DAYS,
    highJdTdb: coarseJdTdb + SEARCH_STEP_DAYS,
  });
  return { jdTdb, distanceAu: search.distanceAtJd(jdTdb) };
}

/** Steps counted in integers so the samples land exactly on the grid instead of accumulating rounding. */
function coarseMinimumJdTdb({ distanceAtJd, aroundJdTdb }: MinimumSearch): number {
  const steps = Math.round((2 * SEARCH_HALF_WINDOW_DAYS) / SEARCH_STEP_DAYS);
  let bestJdTdb = aroundJdTdb;
  let bestDistanceAu = Number.POSITIVE_INFINITY;
  for (let step = 0; step <= steps; step += 1) {
    const jdTdb = aroundJdTdb - SEARCH_HALF_WINDOW_DAYS + step * SEARCH_STEP_DAYS;
    const distanceAu = distanceAtJd(jdTdb);
    if (distanceAu < bestDistanceAu) [bestJdTdb, bestDistanceAu] = [jdTdb, distanceAu];
  }
  return bestJdTdb;
}

function goldenSectionMinimum(
  distanceAtJd: (jdTdb: number) => number,
  bracket: { lowJdTdb: number; highJdTdb: number },
): number {
  let { lowJdTdb, highJdTdb } = bracket;
  while (highJdTdb - lowJdTdb > REFINE_TOLERANCE_DAYS) {
    const span = INVERSE_GOLDEN_RATIO * (highJdTdb - lowJdTdb);
    const leftJdTdb = highJdTdb - span;
    const rightJdTdb = lowJdTdb + span;
    if (distanceAtJd(leftJdTdb) < distanceAtJd(rightJdTdb)) highJdTdb = rightJdTdb;
    else lowJdTdb = leftJdTdb;
  }
  return (lowJdTdb + highJdTdb) / 2;
}
```

```ts
// apps/web/src/scene/approach/approachTrail.ts
import type { OrbitalElements, Vector3 } from '@perihelion/orbit';
import { sceneAxesFromEcliptic } from '../sceneFrame';
import { writeGeocentricOffset } from './approachGeometry';

export const TRAIL_POINTS = 512;
/** The trail covers ±8 crossing times: the bend of the pass and the straight run-in either side of it. */
export const TRAIL_HALF_WINDOW_CROSSINGS = 8;

const scratchOffset: Vector3 = [0, 0, 0];

export interface TrailRequest {
  elements: OrbitalElements;
  approachJdTdb: number;
  halfWindowDays: number;
}

/**
 * Offsets go as u³ for u evenly spaced in [−1, 1]: dense at closest approach, where a grazing pass bends within
 * minutes, and sparse days away, where the path is nearly straight.
 */
export function trailOffsetDays(index: number, halfWindowDays: number): number {
  const u = (2 * index) / (TRAIL_POINTS - 1) - 1;
  return halfWindowDays * u ** 3;
}

/** The sample nearest a time offset, so the bright "past" part of the trail ends at the asteroid. */
export function trailIndexAt(offsetDays: number, halfWindowDays: number): number {
  const u = Math.cbrt(offsetDays / halfWindowDays);
  const index = Math.round(((u + 1) * (TRAIL_POINTS - 1)) / 2);
  return Math.min(Math.max(index, 0), TRAIL_POINTS - 1);
}

/**
 * The path relative to Earth, not the Sun: drawn anchored at Earth it is the flyby's bend, and the asteroid's
 * current position always lies on it. Float32 relative to Earth keeps ~1e-7 of the offset, metres for a close pass.
 */
export function writeTrail(request: TrailRequest, out: Float32Array): Float32Array {
  for (let index = 0; index < TRAIL_POINTS; index += 1) {
    const jdTdb = request.approachJdTdb + trailOffsetDays(index, request.halfWindowDays);
    writeGeocentricOffset({ elements: request.elements, jdTdb }, scratchOffset);
    out.set(sceneAxesFromEcliptic(scratchOffset), index * 3);
  }
  return out;
}
```

```ts
// apps/web/src/scene/approach/asteroidPosition.ts
import type { CloseApproach } from '@perihelion/data';
import {
  type OrbitalElements,
  type Vector3,
  createStateVector,
  stateAtTime,
} from '@perihelion/orbit';
import { elementsFromDegrees } from '../orbitElements';

/** Heliocentric ecliptic J2000, float64: written at `FRAME_PRIORITY.bodyPositions`, read by the rig and marker. */
export const asteroidPositionAu: Vector3 = [0, 0, 0];

const elementsCache = new WeakMap<CloseApproach, OrbitalElements>();
const scratchState = createStateVector();

/** Memoised by row identity, so a click and the next frame see the same elements without waiting on React. */
export function elementsForApproach(approach: CloseApproach): OrbitalElements {
  const cached = elementsCache.get(approach);
  if (cached !== undefined) return cached;
  const elements = elementsFromDegrees(approach.orbit);
  elementsCache.set(approach, elements);
  return elements;
}

export function updateAsteroidPosition(approach: CloseApproach, jdTdb: number): void {
  const [x, y, z] = stateAtTime(elementsForApproach(approach), jdTdb, scratchState).positionAu;
  asteroidPositionAu[0] = x;
  asteroidPositionAu[1] = y;
  asteroidPositionAu[2] = z;
}
```

- [ ] **Step 5: Run the tests again**, expect PASS, including the swarm's unchanged tests.
- [ ] **Step 6: Measure engine vs CAD.** Write `approachCrossCheck.test.ts` over the recorded CAD rows joined to
      their recorded orbits (Task 1's normalisers on the recorded files; check at review that `apps/web` may import
      `packages/fixtures`, else place the test in `apps/server`). For each row it computes
      `closestApproach(elements, row.approachJdTdb)` and records `|Δd|`, `|Δd| / d` and `|Δt|` in minutes. First run
      it as a measurement that prints a table (designation, CAD d, engine d, Δd in km, relative Δd, Δt); add the table
      to the PR.
- [ ] **Step 7: Stop and propose a tolerance** with that evidence (measured worst × 1.25, as in Phases 1 and 4;
      likely an absolute km term for the barycentre offset plus a relative term for Earth's gravity). Wait for the
      user's approval, then write the assertions and record the row in `PROGRESS.md` "Calibrated tolerances".
- [ ] **Step 8: Draw it.** `ApproachScene` (mounted in `SceneContents` when `approachSelection.selected` is set):
  - an updater at `FRAME_PRIORITY.bodyPositions`, mounted after `BodyPositionsUpdater`, calls
    `updateAsteroidPosition(selected, timeStore.state.jdTdb)`
  - a marker: one `Points` vertex with `sizeAttenuation={false}`, placed with `writeSceneOffset(asteroidPositionAu)`
    at `sceneObjects` priority (illustrative size; the real body is metres to kilometres)
  - the trail: `writeTrail` once per selection with `halfWindowDays = TRAIL_HALF_WINDOW_CROSSINGS ×
crossingDays(selected)`, anchored with `writeSceneOffset(bodyPositions.earthMoonBarycenter)` each frame; a faint
    full line plus a brighter line sharing the buffer with `setDrawRange(0, trailIndexAt(now − approach) + 1)`
- [ ] **Step 9: Browser check:** select a row; time-scrub through its approach: the marker stays on the trail, the
      bright part ends at the marker, nothing jitters at Earth zoom. Frame times unchanged within noise.
- [ ] **Step 10: `npm run check`**, then commit: `Position the selected asteroid with the engine and draw its trail`.

---

### Task 5: Fly and follow

Maths parts full code (`approachPlayback`, `followDistanceAu`, `writeChaseDirection`); rig and wiring as
interfaces and tests.

**Files:**

- Create: `apps/web/src/scene/approach/approachCamera.ts`, `apps/web/src/approaches/playApproach.ts`, tests beside
  each
- Modify: `apps/web/src/scene/camera/cameraRig.ts`, `flight.ts`, `viewDistances.ts`, `CameraRigUpdater.tsx`,
  `CameraControls.tsx`, `FocusPicker.tsx`, `apps/web/src/scene/sceneFrame.ts` (optional `out` on
  `sceneAxesFromEcliptic`), `apps/web/src/App.tsx` (list `onSelect` → `playApproach`), their tests

**Interfaces:**

- Consumes: `crossingDays`, `asteroidPositionAu`, `writeGeocentricOffset` (Task 4); `approachSelection` (Task 3);
  `timeStore.scrubTo/setRate/setPlaying`; `cameraRig.flyTo`; `dot`, `norm` from `@perihelion/orbit`.
- Produces:
  - `approachPlayback(approach): { startJdTdb: number; rateDaysPerSecond: number }`
  - `followDistanceAu(approach): number`
  - `writeChaseDirection(geocentricOffsetAu: Readonly<Vector3>, out: Vector3): Vector3` (ecliptic, unit)
  - `type FocusId = BodyId | 'asteroid'`; `type FocusPositions = Readonly<Record<FocusId, Readonly<Vector3>>>`;
    `focusPositions = { ...bodyPositions, asteroid: asteroidPositionAu }` (the spread copies references, so it reads
    the same arrays the updaters write)
  - `CameraRig`: `focus: FocusId`; `update({ positions: FocusPositions; cameraDistanceAu })`;
    `FlightRequest.chase?: boolean`; `chasing: boolean`; `stopChase()`. `flyTo` without `chase` ends any chase.
  - `playApproach(approach, targets?)` where `targets` defaults to `{ selection: approachSelection, time: timeStore,
camera: cameraRig }`

- [ ] **Step 1: Write the failing camera-maths tests**

```ts
import fc from 'fast-check';
import { dot, norm, type Vector3 } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import {
  CHASE_ELEVATION_RAD,
  approachPlayback,
  followDistanceAu,
  writeChaseDirection,
} from './approachCamera';
import { crossingDays } from './approachTiming';

const APOPHIS_LIKE = {
  approachJdTdb: 2_462_240.4,
  distanceAu: 2.5e-4,
  relativeVelocityKmPerS: 7.42,
};
const nonZeroOffset = fc
  .tuple(
    fc.double({ min: -1, max: 1, noNaN: true }),
    fc.double({ min: -1, max: 1, noNaN: true }),
    fc.double({ min: -1, max: 1, noNaN: true }),
  )
  .filter((vector) => norm(vector) > 1e-6);

describe('approachPlayback', () => {
  it('starts three crossing times early and plays six of them in 12 s', () => {
    const tau = crossingDays(APOPHIS_LIKE);
    const playback = approachPlayback(APOPHIS_LIKE);
    expect(playback.startJdTdb).toBeCloseTo(APOPHIS_LIKE.approachJdTdb - 3 * tau, 9);
    expect(playback.rateDaysPerSecond).toBeCloseTo((6 * tau) / 12, 12);
  });

  it('works the same for an approach in the past', () => {
    const past = { ...APOPHIS_LIKE, approachJdTdb: 2_461_000.5 };
    expect(approachPlayback(past).startJdTdb).toBeLessThan(past.approachJdTdb);
  });
});

describe('followDistanceAu', () => {
  it('is a fixed fraction of the miss distance', () => {
    expect(followDistanceAu(APOPHIS_LIKE)).toBeCloseTo(0.6 * 2.5e-4, 15);
  });
});

describe('writeChaseDirection', () => {
  it('is a unit vector 20° from the Earth→asteroid line, tilted north', () => {
    fc.assert(
      fc.property(nonZeroOffset, (offset) => {
        const away: Vector3 = [
          offset[0] / norm(offset),
          offset[1] / norm(offset),
          offset[2] / norm(offset),
        ];
        // Below 70° elevation, so the 20° tilt cannot pass the pole.
        fc.pre(Math.abs(away[2]) < 0.9);
        const direction = writeChaseDirection(offset, [0, 0, 0]);
        expect(norm(direction)).toBeCloseTo(1, 12);
        expect(dot(direction, away)).toBeCloseTo(Math.cos(CHASE_ELEVATION_RAD), 12);
        expect(direction[2]).toBeGreaterThan(away[2]);
      }),
    );
  });

  it('never puts the camera nearer Earth than the asteroid (Review Focus 5)', () => {
    fc.assert(
      fc.property(
        nonZeroOffset,
        fc.double({ min: 1e-9, max: 1, noNaN: true }),
        (offset, distanceAu) => {
          const direction = writeChaseDirection(offset, [0, 0, 0]);
          const camera: Vector3 = [
            offset[0] + distanceAu * direction[0],
            offset[1] + distanceAu * direction[1],
            offset[2] + distanceAu * direction[2],
          ];
          expect(norm(camera)).toBeGreaterThan(norm(offset));
        },
      ),
    );
  });

  it('looks straight along the line when the asteroid is over the pole', () => {
    expect(writeChaseDirection([0, 0, 1e-3], [0, 0, 0])).toEqual([0, 0, 1]);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run apps/web/src/scene/approach/approachCamera.test.ts`, expect FAIL.
- [ ] **Step 3: Implement**

```ts
// apps/web/src/scene/approach/approachCamera.ts
import type { CloseApproach } from '@perihelion/data';
import { type Vector3, norm } from '@perihelion/orbit';
import { crossingDays } from './approachTiming';

/** The clock starts 3τ before closest approach and ±3τ plays in 12 s: grazing and distant passes read alike. */
export const LEAD_CROSSINGS = 3;
export const PASS_SECONDS = 12;
/** Close enough that the asteroid's motion against Earth is obvious, far enough to see Earth beside it. */
export const FOLLOW_DISTANCE_FRACTION = 0.6;
/** Looking straight down the Earth→asteroid line would hide Earth behind the asteroid; 20° shows both. */
export const CHASE_ELEVATION_RAD = (20 * Math.PI) / 180;
/** Below this the line is within ~0.06° of ecliptic north, and "north of it" has no direction. */
const MIN_NORTH_PERPENDICULAR = 1e-3;

const scratchAway: Vector3 = [0, 0, 0];
const scratchNorth: Vector3 = [0, 0, 0];

type Pass = Pick<CloseApproach, 'approachJdTdb' | 'distanceAu' | 'relativeVelocityKmPerS'>;

export interface ApproachPlayback {
  startJdTdb: number;
  rateDaysPerSecond: number;
}

export function approachPlayback(approach: Pass): ApproachPlayback {
  const tau = crossingDays(approach);
  return {
    startJdTdb: approach.approachJdTdb - LEAD_CROSSINGS * tau,
    rateDaysPerSecond: (2 * LEAD_CROSSINGS * tau) / PASS_SECONDS,
  };
}

export function followDistanceAu(approach: Pick<CloseApproach, 'distanceAu'>): number {
  return approach.distanceAu * FOLLOW_DISTANCE_FRACTION;
}

/**
 * From the asteroid toward the camera: away from Earth, rotated toward ecliptic north. Its component along the
 * Earth→asteroid line is cos 20° > 0, so the camera is always farther from Earth than the asteroid is.
 */
export function writeChaseDirection(geocentricOffsetAu: Readonly<Vector3>, out: Vector3): Vector3 {
  writeUnit(geocentricOffsetAu, scratchAway);
  writeNorthPerpendicular(scratchAway, scratchNorth);
  const northLength = norm(scratchNorth);
  const canTilt = northLength >= MIN_NORTH_PERPENDICULAR;
  const awayWeight = canTilt ? Math.cos(CHASE_ELEVATION_RAD) : 1;
  const northWeight = canTilt ? Math.sin(CHASE_ELEVATION_RAD) / northLength : 0;
  for (const axis of [0, 1, 2] as const) {
    out[axis] = awayWeight * scratchAway[axis] + northWeight * scratchNorth[axis];
  }
  return out;
}

function writeUnit(vector: Readonly<Vector3>, out: Vector3): Vector3 {
  const length = norm(vector);
  for (const axis of [0, 1, 2] as const) out[axis] = vector[axis] / length;
  return out;
}

/** n − (n·û)û with n = ecliptic north (0, 0, 1): the part of north perpendicular to the line of sight. */
function writeNorthPerpendicular(unit: Readonly<Vector3>, out: Vector3): Vector3 {
  const northAlong = unit[2];
  out[0] = -northAlong * unit[0];
  out[1] = -northAlong * unit[1];
  out[2] = 1 - northAlong * unit[2];
  return out;
}
```

- [ ] **Step 4: Run the tests again**, expect PASS.
- [ ] **Step 5: Write failing rig tests** (extend `cameraRig.test.ts`):
  - `update({ positions: focusPositions, … })` with focus `'asteroid'` puts the origin at `asteroidPositionAu`
  - `flyTo({ focus: 'asteroid', distanceAu, chase: true })` → `chasing` true; `flyTo({ focus: 'mars' })` → false;
    `stopChase()` → false and notifies once
  - retarget mid-flight (Review Focus 3): a second `flyTo` halfway through the first starts from the pose at that
    moment (origin and distance continuous: equal to the last `update`'s pose)
  - `minViewDistanceAu('asteroid')` is `1e-7` AU (15 km); `defaultViewDistanceAu('asteroid')` is `1e-3` AU
- [ ] **Step 6: Write failing `playApproach` tests** with fake targets: selection set first; clock scrubbed to
      `approachPlayback(row).startJdTdb`, rate set, playing; then `flyTo({ focus: 'asteroid', distanceAu:
followDistanceAu(row), chase: true })`. A row whose approach is in the past still scrubs to before it (Review
      Focus 4).
- [ ] **Step 7: Run**, expect FAIL; **implement** the rig changes, `focusPositions` and `playApproach`; run, PASS.
- [ ] **Step 8: Wire up.** `CameraRigUpdater` passes `focusPositions`; while `cameraRig.chasing`, it computes
      `writeGeocentricOffset` from `asteroidPositionAu − bodyPositions.earthMoonBarycenter`, then
      `writeChaseDirection`, maps it with `sceneAxesFromEcliptic(…, out)` and sets
      `camera.position = direction × distance` (the pose's distance in flight, the camera's current length after).
      `CameraControls` passes `onStart={() => cameraRig.stopChase()}` so a drag hands the view back; `minDistance`
      takes `FocusId`. `FocusPicker` shows bodies only (the list is the asteroid's control). `App` passes
      `playApproach` to `ApproachList`.
- [ ] **Step 9: Browser check:** play three rows (the closest, the farthest, one in the past): the flight lands on
      the asteroid, Earth stays in view through closest approach, a drag ends the chase without a jump, choosing
      another row mid-flight retargets smoothly (note any hitch against the open question on carried velocity).
- [ ] **Step 10: `npm run check`**, then commit: `Fly to the selected asteroid and follow it past Earth`.

---

### Task 6: HUD

UI task: interfaces, test cases and acceptance checks; the exactness check runs over every recorded CAD row.

**Files:**

- Create: `apps/web/src/approaches/approachHud.ts` (pure lines), `apps/web/src/approaches/ApproachHud.tsx`,
  tests beside each
- Modify: `apps/web/src/App.tsx` (HUD in the shell, shown while a row is selected), the app stylesheet

**Interfaces:**

- Consumes: `distanceTexts`, `speedText`, `approachDateText`, `approachLabel` (Task 3); `approachDiameter`,
  `diameterText` (Task 2); `approachSelection` (Task 3); `useTimeReadout()` (4 Hz).
- Produces:
  - `approachHudLines(request: { approach: CloseApproach; jdTdb: number }): HudLine[]`, where
    `HudLine = { label: string; value: string }`
  - `countdownText(daysFromApproach: number): string`

- [ ] **Step 1: Write failing tests for `approachHudLines`**, for a row built in code (`distanceAu: 0.0123456789`,
      `relativeVelocityKmPerS: 12.345678`, `approachCalendarTdb: '2026-Oct-03 14:22'`, `timeUncertainty: '< 00:01'`,
      `diameterKm: null`, `absoluteMagnitude: 25.1`):
  - `Closest approach` → `2026-Oct-03 14:22 TDB (± < 00:01)`; with `timeUncertainty: null`, no bracket
  - `Distance` → `0.0123456789 AU · 1,846,887 km · 4.80 LD`
  - `Relative speed` → `12.345678 km/s`
  - `Diameter` → `diameterText(approachDiameter(row))`
  - `Countdown` → `countdownText(jdTdb − approachJdTdb)`
  - a final note line: `Figures: JPL CAD. Drawn path and marker: two-body illustration.`
- [ ] **Step 2: Write failing tests for `countdownText`:** `-1.5` → `T−1 d 12 h 00 m`; `0.25` → `T+0 d 06 h 00 m`;
      `|Δ| < 1 min` → `Closest approach now`; minutes round down, not to nearest.
- [ ] **Step 3: Write the exactness test** (the exit criterion at unit level): for every row of the recorded CAD
      response, after `toCloseApproaches`, the HUD's distance value starts with `String(row.distanceAu)`, its speed
      equals `${row.relativeVelocityKmPerS} km/s` and its date starts with `row.approachCalendarTdb`.
- [ ] **Step 4: Run**, expect FAIL; **implement**; run, expect PASS.
- [ ] **Step 5: `ApproachHud`** renders the lines from `useTimeReadout()` (no per-frame React state) inside the
      shell; hidden when nothing is selected.
- [ ] **Step 6: Browser check:** for two rows, each HUD value matches the row in
      `curl -s localhost:<port>/api/close-approaches`; the countdown passes zero at the moment the drawn pass is
      closest (within the Task 4 tolerance's Δt).
- [ ] **Step 7: `npm run check`**, then commit: `Add the close-approach HUD`.

---

### Task 7: Exit verification and close-out

Verification task: no new code unless a check fails (then stop and report, as CLAUDE.md requires).

- [ ] **Step 1: Every listed approach plays end to end.** With live data: play each row in the list. For each,
      record: flight lands, asteroid on its trail, Earth in view through closest approach, HUD matches the
      `/api/close-approaches` row. Include the rows that needed an SBDB lookup in Task 1 (Review Focus 1). Repeat
      for two rows with the server stopped (snapshot origin; Review Focus 4).
- [ ] **Step 2: Frame times** as in Phase 4 (same machine and method): following the closest-approach row through
      its pass and the Sun overview with an approach selected. Target ≥ 60 fps, no frame over 20 ms apart from known
      ones.
- [ ] **Step 3: `PROGRESS.md`:** tick the Phase 5 items, add the evidence block (commit, CI run, browser, machine),
      decisions made during the phase and the cross-check tolerance row; mark Phase 5 done and Phase 6 current.
- [ ] **Step 4: `npm run check`**, commit, push, open the PR (`Closes #N` for the close-out issue).
- [ ] **Step 5: After the user merges and CI on `main` is green:** close the Phase 5 milestone, tag the merge
      commit `v0.5.0` (annotated) and publish the release with the phase summary and two stills (the list with the
      HUD, and a close pass with Earth in frame).
