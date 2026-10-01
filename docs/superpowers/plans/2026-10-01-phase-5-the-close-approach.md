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

### Tasks 3–7

Written in Part 2, after reading `stateAtTime`, the time store, `CameraRigUpdater`, `bodyCatalog` and the
stylesheet:

- **Task 3: Close-approach list.** `useDataset('close-approaches')` in the shell's side panel; rows show name, CAD
  date, distance (LD), relative speed and diameter text; empty state; the pill gains this dataset.
- **Task 4: The asteroid on the engine.** Full code: CAD row orbit → `OrbitalElements` (radians) → float64 position
  each frame; trail samples; the engine-vs-CAD closest-distance measurement and proposed tolerance (decision 5).
- **Task 5: Fly and follow.** The camera rig's focus widens from `BodyId` to body-or-approach; selecting a row sets
  the clock to just before the approach and flies in; follow framing keeps Earth in view and never inside it.
- **Task 6: HUD.** Distance in LD / AU / km, relative speed, CAD date (TDB) and diameter, all from the row.
- **Task 7: Exit verification and close-out.** Every listed approach played end to end in the browser; HUD values
  checked against `/api/close-approaches`; frame times; `PROGRESS.md`; release `v0.5.0`.
