# Phase 5: Shot 2: The Close Approach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pick a real asteroid from this week's CAD list and watch it pass Earth: the camera flies to it and follows
it through closest approach, with a trail, while a HUD shows JPL's own distance, speed and date.

**Architecture:** The server attaches an orbit to every CAD row (from its cached NEO catalog, or one SBDB lookup
per object the catalog lacks), so every listed approach is playable. The web app loads `/api/close-approaches`
through `loadDataset` and lists the rows in the left column of an app shell styled after the mockup. Selecting a
row opens a focus card: **Follow** flies the camera rig to the asteroid, **Play approach** also sets the clock to
just before the pass. The asteroid is positioned every frame by the float64
engine (`stateAtTime`), never by the swarm shader. Every number in the list and HUD is a CAD value or an exact unit
conversion of one; the drawn geometry is a two-body illustration.

**Tech Stack:** TypeScript 6 (strict, ESM), React 19, three 0.186, @react-three/fiber 9.8, @react-three/drei 10.7,
Fastify, zod 4, Vitest 5, fast-check.

**Spec:** `PLAN.md` § Phase 5, plus decisions approved while planning (2026-10-01):

1. **App shell, partial, styled after the mockup.** Task 0 adds the shell layout (canvas full-bleed, top bar, left
   and right columns, bottom bar), the mockup's design tokens and panel style, and a data-status pill. The reference
   is `docs/design/perihelion-mockup.html` (added 2026-10-01), adapted as listed in decision 7. Shot tabs, the event
   timeline, the orbit-class legend, the icon buttons and optional panel blur are Phase 7.
2. **Earth-centred close-up without the Moon.** Task 6b draws the mockup's close-up as a 2D schematic of the Task 4
   trail around Earth with a 1 LD ring, labelled illustrative. The mockup's Moon waits for a Moon model.
3. **Diameter and class.** CAD is asked for `diameter=true`; JPL's diameter (± sigma) is shown when present.
   Otherwise it is estimated from H as a range over geometric albedo 0.25–0.05 (the CNEOS convention) and labelled
   "est.", e.g. `est. 16–36 m`. Each row also carries its SBDB orbit class, from the catalog join or the lookup.
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
7. **Mockup adaptations** (approved 2026-10-01):
   - Times are shown in UTC, converted from CAD's TDB with the engine's `jdUtcFromJdTdb` and rounded to the
     minute; CAD's own TDB string stays in the tooltip.
   - The list covers ±7 days, grouped as "Passed" and "Coming" by the wall clock; the mockup's "next 7 days" is not
     what CAD is asked for.
   - One LD constant everywhere (the mockup's lens says 384,400 km).
   - The focus card leads with LD rounded to 2 decimals and keeps CAD's full AU on the line beneath, with km.
   - Orbit-class colours stay as shipped in Phase 4 (`SWARM_CLASS_COLORS`); the UI accent is ice white `#e8f4ff`,
     which matches no class (the mockup's cyan accent is also its Apollo colour).
   - Panels are near-opaque without `backdrop-filter`; blur becomes a Phase 7 quality option after measurement.
   - The layout is responsive (the mockup is fixed at 1600 × 1000); below 1100 px the columns collapse to drawers.
   - The mockup's `--faint` text is lightened to at least 4.5:1 contrast; rows, tabs and buttons are real buttons.
   - The focus card has two actions: **Follow** flies to the asteroid at the current time, **Play approach** also
     sets the clock to the pass. Selecting a row only selects it and opens the card.

## Global Constraints

- No AI/LLM calls anywhere in shipped code.
- Tests never touch the network. Server tests use recorded responses in `packages/fixtures/upstream` (`@perihelion/fixtures/upstream`); web tests
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
3. **Pressing Follow or Play approach while a flight is running, or for a second asteroid mid-follow**: the camera
   retargets without jumping and, for Play approach, the clock lands on the new pass. Pinned in Task 5.
4. **A snapshot-origin list whose approaches are all in the past**: rows stay playable (the clock moves to them)
   and the pill says the data is a snapshot. Pinned in Tasks 0 and 5.
5. **A very close pass** (distance below a few Earth radii, e.g. 2029 Apophis-like 2.5e-4 AU): the follow camera
   never ends up inside Earth's sphere. Pinned in Task 5.

---

## File structure

| File                                                    | Responsibility                                                   | Task     |
| ------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| `apps/web/src/data/useDataset.ts` (new)                 | Generic load-once hook over `loadDataset` (from `useNeoCatalog`) | 0        |
| `apps/web/src/data/useNeoCatalog.ts`                    | Becomes a thin wrapper over `useDataset('neos')`                 | 0        |
| `apps/web/src/shell/AppShell.tsx` (new)                 | Layout regions around the full-bleed canvas                      | 0        |
| `apps/web/src/shell/dataStatus.ts` (new)                | Pure: dataset states → pill tone and text                        | 0        |
| `apps/web/src/shell/DataStatusPill.tsx` (new)           | Renders `dataStatus` output                                      | 0        |
| `apps/web/src/shell/ShellColumn.tsx`, `Brand.tsx` (new) | Collapsible side column; the mockup's brand mark                 | 0        |
| `apps/web/src/data/useNowMs.ts` (new)                   | Wall clock refreshed on an interval, for the pill's age          | 0        |
| `packages/data/src/closeApproach.ts`                    | Adds `diameterKm`, `diameterSigmaKm`, `orbit` to the row schema  | 1        |
| `packages/data/src/upstream/cad.ts`                     | Reads `diameter`, `diameter_sigma`                               | 1        |
| `packages/data/src/upstream/queries.ts`                 | `cadQuery` sends `diameter=true`; adds `sbdbObjectQuery`         | 1        |
| `packages/data/src/upstream/sbdbObject.ts` (new)        | Validates one `sbdb.api` response → `ApproachOrbit` or null      | 1        |
| `packages/data/src/approachOrbits.ts` (new)             | Catalog index by designation; catalog row → `ApproachOrbit`      | 1        |
| `apps/server/src/datasets/datasetRequests.ts`           | Close-approach fetch joins orbits, looks up misses               | 1        |
| `apps/server/scripts/recordUpstream.ts`                 | Records the CAD (with diameters) and the SBDB lookups it needs   | 1        |
| `apps/web/src/approaches/diameter.ts` (new)             | JPL or estimated diameter, and its display text                  | 2        |
| `apps/web/src/approaches/*` (new)                       | List, formatting, selection store, focus card, close-up          | 3, 6, 6b |
| `packages/data/src/upstream/queries.ts`                 | Exports `CAD_MAX_DISTANCE_AU` as a number for the closeness bar  | 3        |
| `apps/web/src/scene/approach/*` (new)                   | Engine position, trail, follow target                            | 4, 5     |
| `apps/web/src/scene/camera/cameraRig.ts`, `flight.ts`   | Focus becomes "body or approach asteroid"                        | 5        |
| `apps/web/src/scene/orbitElements.ts` (new)             | Degrees → engine elements, shared by swarm and approach          | 4        |
| `apps/web/src/scene/swarm/swarmAttributes.ts`           | Uses `elementsFromDegrees`                                       | 4        |
| `apps/web/src/scene/sceneFrame.ts`                      | Optional `out` on `sceneAxesFromEcliptic`                        | 5        |

---

### Task 0: App shell and data-status pill

UI task: interfaces, test cases and acceptance checks; no full code (see the plan-format decision).

**Review (2026-10-01):** all 11 proposals approved ("include all proposals and go"); they are folded in below.

**Files:**

- Create: `apps/web/src/data/useDataset.ts`, `apps/web/src/data/useNowMs.ts`, `apps/web/src/shell/AppShell.tsx`,
  `apps/web/src/shell/ShellColumn.tsx`, `apps/web/src/shell/Brand.tsx`, `apps/web/src/shell/dataStatus.ts`,
  `apps/web/src/shell/DataStatusPill.tsx`, tests beside `useDataset`, `useNowMs`, `dataStatus` and the pill
- Modify: `apps/web/src/data/useNeoCatalog.ts`, `apps/web/src/App.tsx`, `apps/web/src/styles.css`,
  `TimeControls.tsx`, `FocusPicker.tsx`, `SwarmControls.tsx`, `OpeningCaption.tsx` (class names only)
- Delete: `apps/web/src/scene/swarm/SwarmStatus.tsx`, `swarmStatusText.ts` and its test (the pill replaces them)
- Found at the browser check: `SceneCanvas.tsx` gives drei's `<Stats />` a `fps-meter` class so the stylesheet can
  move it off the brand (it pins itself top-left with inline styles).

**Interfaces:**

- Consumes: `loadDataset<N>(name)` and `DatasetResponse<N>`, `DatasetOrigin` from `@perihelion/data`.
- Produces:
  - `type DatasetState<N extends DatasetName> = { status: 'loading' } | { status: 'ready'; data: DatasetData<N>;
origin: DatasetOrigin; fetchedAt: string } | { status: 'unavailable' }`
  - `useDataset<N>(name: N, load?: () => Promise<DatasetResponse<N>>): DatasetState<N>` and the pure
    `loadDatasetState<N>(load): Promise<DatasetState<N>>` (the logic `loadNeoCatalog` has today, generalised).
    `useNeoCatalog` becomes `useDataset('neos', load)`, so its state carries `data` instead of `catalog`; `App`
    and the hook's test follow (nothing else reads it once `SwarmStatus` is gone).
  - `type NamedDatasetState = { label: string; state: DatasetState<DatasetName>; summary?: string }`. `summary`
    carries what the dataset's detail line says beyond its age (the NEO count, `40,123 asteroids`), so the count
    `SwarmStatus` showed moves into the pill.
  - `dataStatus(input: { datasets: readonly NamedDatasetState[]; nowMs: number }): DataStatus` where
    `DataStatus = { tone: 'live' | 'stale' | 'snapshot' | 'loading' | 'unavailable'; text: string; details: string[] }`.
    The pill shows the worst tone across datasets (unavailable > snapshot > stale > loading > live) and one
    `details` line per dataset for its expanded view. One text pattern: `Live · JPL · updated 12 min ago`,
    `Cached · JPL · updated 3 h ago`, `Offline snapshot · JPL · from 28 Sep 2026`, `Loading JPL data…`,
    `NEO catalog unavailable`. The age is that of the oldest dataset with the pill's tone.
  - `useNowMs(intervalMs): number`: wall-clock ms refreshed every `intervalMs`. The pill uses `useNowMs(30_000)`
    so "updated … ago" stays current without per-frame renders.
  - `<DataStatusPill datasets={…} />`: a `<details>` whose summary is the pill text (head word bold, tone dot)
    and whose body lists `details`, so the per-dataset lines are reachable by keyboard, not only by hover.
  - `<AppShell top={…} left={…} right={…} bottom={…}>{canvas}</AppShell>`: named slots; Task 3 fills `left`,
    Task 6 fills `right`. One CSS grid laid over the full-bleed canvas with `pointer-events: none`; only panels
    (`.panel`) take events, so the scene stays draggable between them.
  - `<ShellColumn side label>`: each column is a `<details>`; at ≥ 1100 px it is forced open with its summary
    hidden, below that it collapses to a drawer that starts closed (remounted when the breakpoint flips).
  - `<Brand />`: the mockup's inline SVG mark (gradient id from `useId`), `PERIHELION` and the tagline.
  - Stylesheet tokens as CSS custom properties, taken from the mockup: `--bg`, `--panel` (raised to 0.85 opacity,
    no `backdrop-filter`), `--panel-border`, `--text`, `--muted`, `--faint`, `--accent: #e8f4ff`,
    `--radius-panel: 14px`, the mockup's type scale and a `.mono` class with tabular numerals. The old `.hud`
    class becomes the mockup's `.panel` on these tokens. `--faint` is lightened from `#5b6378` (3.24:1) to the
    computed value with ≥ 4.5:1 against `--panel` composited on `--bg`; the ratio goes in the PR.
    Class colours are not tokens here: the UI reads `SWARM_CLASS_COLORS` so the swarm and the UI cannot drift.

- [x] **Step 1: Write failing tests for `loadDatasetState`** (move the existing `loadNeoCatalog` cases): ready with
      origin and `fetchedAt` passed through; a rejecting loader → `unavailable` (and a `console.warn`). Plus
      `useNowMs`: the value advances only when the interval elapses (fake timers).
- [x] **Step 2: Write failing tests for `dataStatus`:**
  - all `fresh`, oldest fetched 12 min before `nowMs` → tone `live`, text `Live · JPL · updated 12 min ago`
    (the mockup's wording)
  - one `stale` → tone `stale`, text `Cached · JPL · updated 3 h ago`
  - one `snapshot` with `fetchedAt` 2026-09-28T10:00:00Z → tone `snapshot`, text
    `Offline snapshot · JPL · from 28 Sep 2026`
  - one `unavailable` among ready ones → tone `unavailable`, text names that dataset (`Close approaches unavailable`)
  - any `loading`, none worse → tone `loading`, text `Loading JPL data…`
  - `details` has one line per dataset with its age, e.g. `NEO catalog: 40,123 asteroids · fetched 4 min ago`
    (from `nowMs`)
  - and a render test for `DataStatusPill` (the `SwarmControls.test.tsx` static-markup setup): tone attribute,
    bold head word, one list item per detail line.
- [x] **Step 3: Run** `npx vitest run apps/web/src/data apps/web/src/shell`, expect FAIL.
- [x] **Step 4: Implement** `useDataset`, `loadDatasetState`, `useNowMs`, `dataStatus`; rewire `useNeoCatalog`.
- [x] **Step 5: Run the tests again**, expect PASS.
- [x] **Step 6: Build the shell.** `AppShell`, `ShellColumn`, `Brand` and `DataStatusPill`, placed as in the
      mockup: `Brand` left, `FocusPicker` top centre (the mockup's tab position) and the pill right in `top`;
      `SwarmControls` at the foot of the left column; today's `TimeControls` restyled inside the mockup's bottom
      timeline panel; `right` empty for now. The pill reads `neos` only in this task; Task 3 adds
      `close-approaches`. `SwarmStatus` is removed: its loading and unavailable states and the NEO count live in
      the pill. The opening caption takes the mockup's caption style, with its count still from the catalog.
- [x] **Step 7: Browser check** (`npm run dev`): pill reads `Live · JPL · updated … ago` with the server up; stop
      the server and reload → `Offline snapshot · JPL · from …`. At 1600 × 1000 the layout matches the mockup's
      regions; at 1024 px wide the columns collapse and nothing overlaps; keyboard Tab reaches every control;
      dragging the scene between panels still orbits the camera. Sun overview and Earth zoom still at the Phase 4
      frame times (60 fps target). Note the numbers in the PR.
- [x] **Step 8: `npm run check`**, then commit: `Add the app shell layout and a data-status pill`.

---

### Task 1: Orbits and JPL diameters on close-approach rows

Data and server task: interfaces, test cases and acceptance checks; no full code. Read `recordUpstream.ts`, the
server test helpers and `cells.ts` before starting; the review proposes exact names against them.

**Review (2026-10-01):** all 12 proposals approved ("Include all. Go"); they are folded in below and take precedence
over any older wording in this section.

1. Recordings live in `packages/fixtures/upstream/`, exported from `@perihelion/fixtures/upstream`.
2. The wiring is in `apps/server/src/datasets/createDatasets.ts`: `readNeoCatalog` parses
   `(await service.read(requests.neos())).dataJson` with `neoCatalogSchema`. `writeSnapshot.ts` has no service and
   uses one memoised `requests.neos().fetchData()`.
3. `DatasetRequestDependencies` gains `logger: DatasetLogger` for dropped rows; the snapshot script passes `console`.
4. Lookups use `des=<designation>` (exact), not `sstr` (a search string that can match names or several objects).
5. SBDB's not-found answer is HTTP 200 `{ code: "200", message: "specified object was not found" }` with no
   `orbit`: it drops the row (logged); any other body without `orbit` is a format error. Element `value`s and
   `orbit.epoch` are strings (e.g. `".637565170804427"`), converted with a finite check.
6. The 2026-09-28 recordings have no misses (all 32 CAD rows are in the full catalog), so the recorder saves a lookup
   for the first CAD row regardless, one for `SBDB_NOT_FOUND_DESIGNATION = '2099 ZZ999'`, and one per real miss, in
   one file `sbdb-object-lookups.json` keyed by designation. The miss test builds its catalog in code.
7. `FakeUpstream` serves `/sbdb.api` bodies by their `des` parameter.
8. DONKI moved (`api.nasa.gov/DONKI/CME` answers 301 to `ccmc.gsfc.nasa.gov/news/major-updates`), so the recorder
   and the snapshot script take optional names (`npm run record -- cad sbdb-object`,
   `npm run snapshot -- close-approaches`). The manifest keeps entries it did not re-record, each with its own
   `recordedAt`. The DONKI recordings and snapshot stay as committed; the move is a separate issue.
9. The join lives in `apps/server/src/datasets/approachOrbitJoin.ts`:
   `attachOrbits({ approaches, catalogOrbits, lookUpOrbit })`, tested without HTTP.
10. Misses are counted first: more than `MAX_ORBIT_LOOKUPS = 25` rejects before any lookup request.
11. `cadQuery` adds `kind: 'a'` (asteroids only; comets are parked and absent from the catalog).
12. `indexCatalogOrbits` maps each designation to `{ orbit, orbitClass }`.

Found during execution: the 2026-10-01 CAD window has no diameters, so "diameter present" is tested on a row built in
code; raw CAD rows validate against `cadApproachSchema` (the row before orbits), and the existing CAD tests' row gains
the two diameter cells. A dataset cached before this schema change is served unchanged until its TTL ends; the dev
cache was cleared by hand (user decision) and cache validation is proposed separately.

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
    `orbit: ApproachOrbit` and `orbitClass: NeoOrbitClass | null`. `toCloseApproaches` returns
    `CadApproach = Omit<CloseApproach, 'orbit' | 'orbitClass'>`. The class comes from the catalog's `orbitClass`
    column, or from the lookup's `object.orbit_class.code`; a code outside `NEO_ORBIT_CLASSES` gives `null`.
  - `cadQuery(window)` adds `diameter: 'true'` and `kind: 'a'`; `CAD_FIELDS` adds `'diameter'`, `'diameter_sigma'`.
  - `SBDB_OBJECT_API_URL = 'https://ssd-api.jpl.nasa.gov/sbdb.api'`;
    `sbdbObjectQuery(designation): UpstreamQuery` → `{ des: designation, 'full-prec': 'true' }`.
  - `sbdbObjectResponseSchema` (zod over `orbit.epoch` and `orbit.elements[{ name, value }]`; extra fields allowed)
    and `toApproachOrbit(response): ApproachOrbit | null` (null when an element is missing or e ≥ 1 after rounding,
    as `toElements` does for the catalog).
  - `indexCatalogOrbits(catalog: NeoCatalog): ReadonlyMap<string, CatalogOrbit>` keyed by designation, where
    `CatalogOrbit = { orbit: ApproachOrbit; orbitClass: NeoOrbitClass }`.
  - Server: `closeApproachRequest` takes a new dependency `readNeoCatalog: () => Promise<NeoCatalog>` (backed by
    `DatasetService.read(requests.neos())`), joins orbits, and calls `sbdbObjectQuery` sequentially for misses, at
    most `MAX_ORBIT_LOOKUPS = 25` per refresh (beyond that the refresh fails, as a format change would).

- [x] **Step 1: Re-record.** Extend `recordUpstream.ts`: CAD with `diameter=true`, then one `sbdb.api` response for
      each recorded CAD designation absent from the recorded SBDB catalog, plus one known-not-found designation for
      the drop path. Run `npm run record` and commit the generated files as they are.
- [x] **Step 2: Write failing data tests:**
  - `toCloseApproaches` on the new recording: `diameterKm`/`diameterSigmaKm` read when present, null when CAD leaves
    them null; existing CAD tests unchanged and still passing.
  - `toApproachOrbit` on a recorded lookup: elements equal the response's values rounded like the catalog
    (`ELEMENT_DECIMALS` / `ANGLE_DECIMALS`), `epochJdTdb` equals `orbit.epoch`.
  - `toApproachOrbit` on the same response with `e` = `1.2` or with `ma` removed → null; the recorded not-found
    answer → not found (row dropped); any other body without `orbit` → the schema throws `ZodError`.
  - `indexCatalogOrbits` on a 2-row catalog built in code: both designations map to their columns' values,
    including `orbitClass`.
  - The lookup's class: `APO` in the recorded response → `'APO'`; the same response with code `MBA` → `null`.
- [x] **Step 3: Write failing server tests** (recorded responses, fake `HttpClient`):
  - every CAD row found in the catalog → zero lookups, every row has `orbit`
  - one row missing from the catalog → exactly one `sbdb.api` request, for that designation; the row has the
    looked-up orbit (Review Focus 1)
  - lookup answers "not found" (recorded) → that row dropped, a warning logged, the rest served
  - lookup throws a network error → `fetchData` rejects (so `DatasetService` serves stale or snapshot)
  - 26 misses → rejects without making any lookup request
- [x] **Step 4: Run** `npx vitest run packages/data apps/server`, expect FAIL.
- [x] **Step 5: Implement** the schema, CAD fields, SBDB object query and normaliser, catalog index and the server
      join; wire `readNeoCatalog` in `app.ts`.
- [x] **Step 6: Run the tests again**, expect PASS.
- [x] **Step 7: Refresh the snapshot** with `npm run snapshot`; check the new `close-approaches.json` validates
      (the web's snapshot test, if any, or `loadDataset` against it in the browser) and commit it as generated.
- [x] **Step 8: Live check** (`npm run dev`): `curl -s localhost:<port>/api/close-approaches | jq '.data[0]'`
      shows `orbit` and the diameter fields; note in the PR how many rows needed a lookup.
- [x] **Step 9: `npm run check`**, then commit: `Attach orbits and JPL diameters to close-approach rows`.

---

### Task 2: Diameter, from JPL or estimated from H

Maths task: full code.

Review (2026-10-01): proposals 1–3 approved and applied below. The estimate is rounded once and its unit picked
from the rounded value (0.9996 km reads `1 km`, not `1000 m`); JPL diameters below 1 km are shown in metres by an
exact ×1000 (`0.0071` → `7.1 m`, `0.37 ± 0.02` → `370 ± 20 m`); `diameterLabel` and `diameterValueText` split
label from value for the card, and `diameterText` stays combined for the list.

**Files:**

- Create: `apps/web/src/approaches/diameter.ts`, `apps/web/src/approaches/diameter.test.ts`

**Interfaces:**

- Consumes: `CloseApproach` (`diameterKm`, `diameterSigmaKm`, `absoluteMagnitude`) from Task 1.
- Produces:
  - `ALBEDO_RANGE = { bright: 0.25, dark: 0.05 }`
  - `diameterAtAlbedoKm(absoluteMagnitude: number, albedo: number): number`
  - `estimatedDiameterRangeKm(absoluteMagnitude: number): DiameterRangeKm`, where
    `DiameterRangeKm = { minKm: number; maxKm: number }`
  - `type ApproachDiameter = { kind: 'jpl'; diameterKm: number; sigmaKm: number | null } | ({ kind: 'estimated' } &
DiameterRangeKm) | { kind: 'unknown' }`
  - `approachDiameter(approach: DiameterFields): ApproachDiameter`
  - `diameterLabel(diameter: ApproachDiameter): string` and `diameterValueText(diameter: ApproachDiameter): string`
    (the card in Task 6, split as the mockup does: `Est. diameter` / `16–36 m`)
  - `diameterText(diameter: ApproachDiameter): string` (label and value combined, for the list in Task 3:
    `est. 16–36 m`)

- [ ] **Step 1: Write the failing tests**

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ALBEDO_RANGE,
  approachDiameter,
  diameterAtAlbedoKm,
  diameterLabel,
  diameterText,
  diameterValueText,
  estimatedDiameterRangeKm,
} from './diameter';

describe('diameterAtAlbedoKm', () => {
  it('follows D = 1329 km / √p · 10^(−H/5)', () => {
    // At H = 15, 10^(−15/5) = 1e-3: 1329 / √0.25 = 2658 km and 1329 / √0.05 = 5943.469 km.
    expect(diameterAtAlbedoKm(15, 0.25)).toBeCloseTo(2.658, 12);
    expect(diameterAtAlbedoKm(15, 0.05)).toBeCloseTo(5.943469, 6);
  });

  it('shrinks tenfold for every 5 magnitudes', () => {
    fc.assert(
      fc.property(fc.double({ min: 5, max: 30, noNaN: true }), (h) => {
        const ratio = diameterAtAlbedoKm(h, 0.14) / diameterAtAlbedoKm(h + 5, 0.14);
        expect(ratio).toBeCloseTo(10, 9);
      }),
    );
  });
});

describe('estimatedDiameterRangeKm', () => {
  it('runs from the bright (small) to the dark (large) albedo', () => {
    const range = estimatedDiameterRangeKm(15);
    expect(range.minKm).toBe(diameterAtAlbedoKm(15, ALBEDO_RANGE.bright));
    expect(range.maxKm).toBe(diameterAtAlbedoKm(15, ALBEDO_RANGE.dark));
    // √(0.25 / 0.05) = √5: every estimate spans the same factor.
    expect(range.maxKm / range.minKm).toBeCloseTo(Math.sqrt(5), 12);
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

  it('estimates a range from H when JPL has no diameter', () => {
    const diameter = approachDiameter({
      diameterKm: null,
      diameterSigmaKm: null,
      absoluteMagnitude: 15,
    });
    expect(diameter).toEqual({ kind: 'estimated', ...estimatedDiameterRangeKm(15) });
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

describe('diameterValueText', () => {
  it("shows JPL's value unrounded, in metres below 1 km", () => {
    expect(diameterValueText({ kind: 'jpl', diameterKm: 0.37, sigmaKm: 0.02 })).toBe('370 ± 20 m');
    expect(diameterValueText({ kind: 'jpl', diameterKm: 0.0071, sigmaKm: null })).toBe('7.1 m');
    expect(diameterValueText({ kind: 'jpl', diameterKm: 1.1, sigmaKm: null })).toBe('1.1 km');
  });

  it('rounds estimates to two significant figures', () => {
    expect(diameterValueText({ kind: 'estimated', minKm: 2.658, maxKm: 5.943469 })).toBe(
      '2.7–5.9 km',
    );
    expect(diameterValueText({ kind: 'estimated', minKm: 0.016016, maxKm: 0.035813 })).toBe(
      '16–36 m',
    );
    expect(diameterValueText({ kind: 'estimated', minKm: 0.7, maxKm: 1.56 })).toBe('700 m–1.6 km');
  });

  it('picks the unit after rounding, at either end of the range', () => {
    expect(diameterValueText({ kind: 'estimated', minKm: 0.9996, maxKm: 2.235 })).toBe('1–2.2 km');
    expect(diameterValueText({ kind: 'estimated', minKm: 0.447, maxKm: 0.9996 })).toBe(
      '450 m–1 km',
    );
  });

  it('says unknown', () => {
    expect(diameterValueText({ kind: 'unknown' })).toBe('unknown');
  });
});

describe('diameterLabel', () => {
  it('names the source of the figure', () => {
    expect(diameterLabel({ kind: 'jpl', diameterKm: 1.1, sigmaKm: null })).toBe('Diameter (JPL)');
    expect(diameterLabel({ kind: 'estimated', minKm: 0.016, maxKm: 0.036 })).toBe('Est. diameter');
    expect(diameterLabel({ kind: 'unknown' })).toBe('Diameter');
  });
});

describe('diameterText', () => {
  it('marks estimates "est." inline for the list', () => {
    expect(diameterText({ kind: 'estimated', minKm: 0.016016, maxKm: 0.035813 })).toBe(
      'est. 16–36 m',
    );
  });

  it("leaves JPL's value and unknown as they are", () => {
    expect(diameterText({ kind: 'jpl', diameterKm: 0.37, sigmaKm: 0.02 })).toBe('370 ± 20 m');
    expect(diameterText({ kind: 'unknown' })).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run** `npx vitest run apps/web/src/approaches/diameter.test.ts`, expect FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { CloseApproach } from '@perihelion/data';

/**
 * CNEOS's convention for objects without a measured size: the diameters for geometric albedos 0.25 (bright, so
 * small) and 0.05 (dark, so large). The range is always a factor √5 ≈ 2.2 wide, hence "est.".
 */
export const ALBEDO_RANGE = { bright: 0.25, dark: 0.05 } as const;
/** D = 1329 km / √p · 10^(−H/5) (Fowler & Chillemi 1992; Pravec & Harris 2007, Icarus 190, 250). */
const DIAMETER_AT_H0_UNIT_ALBEDO_KM = 1329;
const ESTIMATE_SIGNIFICANT_FIGURES = 2;
/** Enough to clear ×1000 float noise (0.0071 × 1000 = 7.1000000000000005) without rounding JPL's figure. */
const EXACT_SIGNIFICANT_FIGURES = 15;
const METRES_PER_KM = 1000;

export type DiameterFields = Pick<
  CloseApproach,
  'diameterKm' | 'diameterSigmaKm' | 'absoluteMagnitude'
>;

export interface DiameterRangeKm {
  minKm: number;
  maxKm: number;
}

export type ApproachDiameter =
  | { kind: 'jpl'; diameterKm: number; sigmaKm: number | null }
  | ({ kind: 'estimated' } & DiameterRangeKm)
  | { kind: 'unknown' };

/** A length as printed: the number shown and its unit. */
interface Length {
  value: number;
  unit: 'm' | 'km';
}

export function diameterAtAlbedoKm(absoluteMagnitude: number, albedo: number): number {
  return (DIAMETER_AT_H0_UNIT_ALBEDO_KM / Math.sqrt(albedo)) * 10 ** (-absoluteMagnitude / 5);
}

export function estimatedDiameterRangeKm(absoluteMagnitude: number): DiameterRangeKm {
  return {
    minKm: diameterAtAlbedoKm(absoluteMagnitude, ALBEDO_RANGE.bright),
    maxKm: diameterAtAlbedoKm(absoluteMagnitude, ALBEDO_RANGE.dark),
  };
}

/** A measured diameter always wins: the estimate is only a fallback for objects JPL has not sized. */
export function approachDiameter(approach: DiameterFields): ApproachDiameter {
  if (approach.diameterKm !== null) {
    return { kind: 'jpl', diameterKm: approach.diameterKm, sigmaKm: approach.diameterSigmaKm };
  }
  if (approach.absoluteMagnitude === null) return { kind: 'unknown' };
  return { kind: 'estimated', ...estimatedDiameterRangeKm(approach.absoluteMagnitude) };
}

/** The card's label says where the figure comes from, so an estimate is never read as a measurement. */
export function diameterLabel(diameter: ApproachDiameter): string {
  switch (diameter.kind) {
    case 'jpl':
      return 'Diameter (JPL)';
    case 'estimated':
      return 'Est. diameter';
    case 'unknown':
      return 'Diameter';
  }
}

/** The value alone, for the card, whose label already carries the source. */
export function diameterValueText(diameter: ApproachDiameter): string {
  switch (diameter.kind) {
    case 'jpl':
      return jplDiameterText(diameter.diameterKm, diameter.sigmaKm);
    case 'estimated':
      return rangeText(diameter);
    case 'unknown':
      return 'unknown';
  }
}

/** The list has no label column, so an estimate carries its "est." inline. */
export function diameterText(diameter: ApproachDiameter): string {
  const value = diameterValueText(diameter);
  return diameter.kind === 'estimated' ? `est. ${value}` : value;
}

/**
 * JPL's figures are facts (CLAUDE.md), so never rounded: below 1 km they are rescaled exactly to metres, like the
 * estimates, and the sigma follows the value's unit so "370 ± 20 m" reads as one quantity.
 */
function jplDiameterText(diameterKm: number, sigmaKm: number | null): string {
  const unit = diameterKm < 1 ? 'm' : 'km';
  const value = exactlyIn(unit, diameterKm);
  return sigmaKm === null ? `${value} ${unit}` : `${value} ± ${exactlyIn(unit, sigmaKm)} ${unit}`;
}

/** Ends sharing a unit name it once ("16–36 m"); a range straddling 1 km names both ("700 m–1.6 km"). */
function rangeText({ minKm, maxKm }: DiameterRangeKm): string {
  const min = estimatedLength(minKm);
  const max = estimatedLength(maxKm);
  if (min.unit === max.unit) return `${min.value}–${max.value} ${max.unit}`;
  return `${min.value} ${min.unit}–${max.value} ${max.unit}`;
}

/**
 * Metres below 1 km, as CNEOS prints small objects. Rounded once, then the unit picked from the rounded value, so
 * 0.9996 km reads "1 km" rather than "1000 m".
 */
function estimatedLength(km: number): Length {
  const metres = significant(km * METRES_PER_KM, ESTIMATE_SIGNIFICANT_FIGURES);
  if (metres < METRES_PER_KM) return { value: metres, unit: 'm' };
  return { value: metres / METRES_PER_KM, unit: 'km' };
}

function exactlyIn(unit: Length['unit'], km: number): number {
  return unit === 'km' ? km : significant(km * METRES_PER_KM, EXACT_SIGNIFICANT_FIGURES);
}

/** Through Number, so 700 prints as "700" rather than toPrecision's "7.0e+2". */
function significant(value: number, figures: number): number {
  return Number(value.toPrecision(figures));
}
```

- [ ] **Step 4: Run the tests again**, expect PASS.
- [ ] **Step 5: `npm run check`**, then commit: `Show JPL's diameter, or an estimated range from H labelled est.`

---

### Task 3: Close-approach list

UI task with one fact-critical formatter (full code for `approachFormat.ts` only).

Review (2026-10-01): proposals 1–5 approved (6–7 were optional and not taken); the code blocks below are the
final files.

1. The left column always renders: `ApproachList` above `SwarmControls`, their interim home until the Phase 7
   legend.
2. `ApproachList` takes `selected`; `approachSelection` is built like `timeStore` and read through
   `useSelectedApproach()`.
3. The web tests have no DOM: `test/elementTree.ts`'s `findElementProps` (now shared with `SwarmControls`) reads
   the row's click handler; rows are an exported `ApproachRow`.
4. `NO_APPROACHES_TEXT` is built from `CAD_MAX_DISTANCE_AU` and `distanceTexts`.
5. Passed / Coming split on the wall clock (`useNowMs(30_000)`), not the scrubbed time.

Step 1 found CNEOS defines 1 LD as 384,400 km (cneos.jpl.nasa.gov/glossary/LD.html), not 384,398; the expected
strings are unchanged (19.46 and 4.80 LD). From the browser check (user decisions): Coming is listed before
Passed, so the next passes show without scrolling, and the dev FPS overlay moved out of the list's corner.
`SHORT_MONTHS` moved to `time/shortMonths.ts`, shared with `dataStatus`.

**Files:**

- Create: `apps/web/src/approaches/approachFormat.ts`, `apps/web/src/approaches/approachSelection.ts`,
  `apps/web/src/approaches/ApproachList.tsx`, tests beside each
- Modify: `apps/web/src/App.tsx` (side slot, pill datasets), the app stylesheet

**Interfaces:**

- Consumes: `useDataset('close-approaches')` and `DatasetState` (Task 0); `diameterText`/`approachDiameter`
  (Task 2); `KM_PER_AU`, `jdUtcFromJdTdb`, `calendarFromJulianDate` (read its `CalendarDateTime` fields at review)
  from `@perihelion/orbit`; `jdTdbFromUnixMs`; `NEO_ORBIT_CLASSES`, `NeoOrbitClass`, `CAD_MAX_DISTANCE_AU` from
  `@perihelion/data`; `SWARM_CLASS_COLORS` (check at review that its order is `NEO_ORBIT_CLASSES`'s).
- Produces:
  - `KM_PER_LUNAR_DISTANCE = 384_400`; `distanceTexts(distanceAu): { au: string; km: string; lunar: string }`;
    `speedText(kmPerS): string`; `approachDateText(approach): string` (CAD's TDB string, for tooltips);
    `approachLabel(approach): string`
  - `approachUtcText(approach): string`: `approachJdTdb` → UTC with `jdUtcFromJdTdb`, rounded to the nearest
    minute before the calendar conversion (so 59.5 s carries into the hour), printed `Sep 30 · 04:11 UTC`
  - `closenessFraction(distanceAu): number` = `1 − distanceAu / CAD_MAX_DISTANCE_AU`, clamped to [0, 1] (the
    mockup's bar; linear, so it reads as "how far inside CAD's 0.05 AU cut")
  - `orbitClassLabel(orbitClass: NeoOrbitClass | null): string`: `APO` → `Apollo`, `ATE` → `Aten`, `AMO` → `Amor`,
    `IEO` → `Atira`, `null` → `—`
  - `groupApproaches(request: { approaches: readonly CloseApproach[]; nowJdTdb: number }): { passed; coming }`,
    each in CAD order
  - `approachSelection`: `selected: CloseApproach | undefined`, `select(approach)`, `clear()`, `subscribe`
    (an external store like `timeStore`: notifies on user actions only)
  - `<ApproachList state={DatasetState<'close-approaches'>} selected={CloseApproach | undefined}
nowJdTdb={number} onSelect={(approach) => void} />`, rows as `ApproachRow`; `NO_APPROACHES_TEXT`;
    `useSelectedApproach()`. `App` passes
    `approachSelection.select`: selecting only selects and opens the card (decision 7); Task 6's card holds
    **Follow** and **Play approach**.

- [ ] **Step 1: Confirm the LD constant** against the CNEOS site (cneos.jpl.nasa.gov, "LD" definition). If CNEOS
      uses another value, use theirs and fix the expected strings below before writing the test.
- [ ] **Step 2: Write the failing formatter tests**

```ts
import type { NeoOrbitClass } from '@perihelion/data';
import { describe, expect, it } from 'vitest';
import {
  NO_APPROACHES_TEXT,
  approachDateText,
  approachLabel,
  approachUtcText,
  closenessFraction,
  distanceTexts,
  groupApproaches,
  orbitClassLabel,
  speedText,
} from './approachFormat';

describe('distanceTexts', () => {
  it("keeps CAD's AU exactly and converts with exact constants", () => {
    // 0.05 × 149,597,870.7 = 7,479,893.535 km; ÷ 384,400 = 19.4586… LD.
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

describe('NO_APPROACHES_TEXT', () => {
  it("states CAD's 0.05 AU cut in AU and LD", () => {
    expect(NO_APPROACHES_TEXT).toBe(
      'No asteroid passes within 0.05 AU (19.46 LD) of Earth in this window.',
    );
  });
});

describe('speedText', () => {
  it("prints CAD's value as given", () => {
    expect(speedText(12.345678)).toBe('12.345678 km/s');
  });
});

describe('approachDateText', () => {
  it("labels CAD's calendar string as TDB", () => {
    expect(approachDateText({ approachCalendarTdb: '2026-Sep-30 04:12' })).toBe(
      '2026-Sep-30 04:12 TDB',
    );
  });
});

describe('approachLabel', () => {
  it("trims CAD's padded full name", () => {
    expect(approachLabel({ fullName: '       (2024 XY1)' })).toBe('(2024 XY1)');
  });
});

describe('approachUtcText', () => {
  it('converts CAD’s TDB to UTC and rounds to the minute', () => {
    // 2026-Sep-30 04:12:00 TDB = JD 2461313.675; UTC = TDB − 69.184 s = 04:10:50.8 → 04:11.
    expect(approachUtcText({ approachJdTdb: 2_461_313.675 })).toBe('Sep 30 · 04:11 UTC');
  });

  it('carries a rounded minute into the next day', () => {
    // 2026-Oct-01 00:00:49.184 TDB = 2026-Sep-30 23:59:40 UTC, which rounds up to midnight.
    expect(approachUtcText({ approachJdTdb: 2_461_314.5 + 49.184 / 86_400 })).toBe(
      'Oct 1 · 00:00 UTC',
    );
  });
});

describe('closenessFraction', () => {
  it("is linear inside CAD's 0.05 AU cut and clamped outside it", () => {
    expect(closenessFraction(0)).toBe(1);
    expect(closenessFraction(0.0125)).toBeCloseTo(0.75, 12);
    expect(closenessFraction(0.05)).toBe(0);
    expect(closenessFraction(0.06)).toBe(0);
  });
});

describe('orbitClassLabel', () => {
  it('names the four NEO classes and marks a missing one', () => {
    expect(
      ['APO', 'ATE', 'AMO', 'IEO'].map((code) => orbitClassLabel(code as NeoOrbitClass)),
    ).toEqual(['Apollo', 'Aten', 'Amor', 'Atira']);
    expect(orbitClassLabel(null)).toBe('—');
  });
});

describe('groupApproaches', () => {
  it('splits at now, keeping CAD order in each group', () => {
    const early = { approachJdTdb: 1 };
    const late = { approachJdTdb: 3 };
    const atNow = { approachJdTdb: 2 };
    expect(groupApproaches({ approaches: [early, late, atNow], nowJdTdb: 2 })).toEqual({
      passed: [early],
      coming: [late, atNow],
    });
  });
});
```

Both blocks are the final files (see the review note above).

- [ ] **Step 3: Run** `npx vitest run apps/web/src/approaches`, expect FAIL.
- [ ] **Step 4: Implement**

```ts
import { CAD_MAX_DISTANCE_AU, type CloseApproach, type NeoOrbitClass } from '@perihelion/data';
import { KM_PER_AU, calendarFromJulianDate, jdUtcFromJdTdb } from '@perihelion/orbit';
import { SHORT_MONTHS } from '../time/shortMonths';

/**
 * One lunar distance as CNEOS defines it: "a mean semimajor axis for the moon of 384400 km"
 * (cneos.jpl.nasa.gov/glossary/LD.html). CAD reports AU only; LD and km are exact conversions of CAD's figure.
 */
export const KM_PER_LUNAR_DISTANCE = 384_400;
const LUNAR_DECIMALS = 2;
const GROUPED_KM = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const MINUTES_PER_DAY = 1440;
const ORBIT_CLASS_NAMES: Record<NeoOrbitClass, string> = {
  IEO: 'Atira',
  ATE: 'Aten',
  APO: 'Apollo',
  AMO: 'Amor',
};

export interface DistanceTexts {
  au: string;
  km: string;
  lunar: string;
}

export interface ApproachGroupsRequest<A> {
  approaches: readonly A[];
  nowJdTdb: number;
}

export interface ApproachGroups<A> {
  passed: A[];
  coming: A[];
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

/** Built from the query's own cut, so the empty state cannot drift from what the server asked CAD for. */
export const NO_APPROACHES_TEXT = noApproachesText();

function noApproachesText(): string {
  const { au, lunar } = distanceTexts(CAD_MAX_DISTANCE_AU);
  return `No asteroid passes within ${au} (${lunar}) of Earth in this window.`;
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

/** Rounded to the minute before the calendar split, so 04:10:59.5 carries into 04:11 (and 23:59:40 into tomorrow). */
export function approachUtcText(approach: Pick<CloseApproach, 'approachJdTdb'>): string {
  const jdUtc = jdUtcFromJdTdb(approach.approachJdTdb);
  const { month, day, hour, minute } = calendarFromJulianDate(
    Math.round(jdUtc * MINUTES_PER_DAY) / MINUTES_PER_DAY,
  );
  return `${SHORT_MONTHS[month - 1]} ${day} · ${twoDigits(hour)}:${twoDigits(minute)} UTC`;
}

/** Linear, so the bar reads as "how far inside CAD's 0.05 AU cut". */
export function closenessFraction(distanceAu: number): number {
  return Math.min(1, Math.max(0, 1 - distanceAu / CAD_MAX_DISTANCE_AU));
}

export function orbitClassLabel(orbitClass: NeoOrbitClass | null): string {
  return orbitClass === null ? '—' : ORBIT_CLASS_NAMES[orbitClass];
}

/** Both groups keep CAD's order, which is by approach time. */
export function groupApproaches<A extends Pick<CloseApproach, 'approachJdTdb'>>({
  approaches,
  nowJdTdb,
}: ApproachGroupsRequest<A>): ApproachGroups<A> {
  return {
    passed: approaches.filter((approach) => approach.approachJdTdb < nowJdTdb),
    coming: approaches.filter((approach) => approach.approachJdTdb >= nowJdTdb),
  };
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}
```

- [ ] **Step 5: Write failing tests for `approachSelection`:** `select` stores the same object and notifies once;
      `clear` empties it and notifies; an unsubscribed listener is not called.
- [ ] **Step 6: Write failing tests for `ApproachList`** (no DOM: `renderToStaticMarkup`, with the row's click
      handler read off the element tree by `test/elementTree.ts`'s `findElementProps`):
  - `loading` → `Loading close approaches…`
  - `unavailable` → `Close approaches unavailable`
  - ready with `[]` → `No asteroid passes within 0.05 AU (19.46 LD) of Earth in this window.` (Review Focus 2)
  - ready with 3 rows (one before `nowJdTdb`) → a `Passing Earth · ±7 days` header, a `Coming` group with 2
    buttons above a `Passed` group with 1, each in CAD order; each row shows label, `approachUtcText`, a closeness bar at
    `closenessFraction`, the `lunar` distance, diameter text and the class label with its `SWARM_CLASS_COLORS`
    swatch; the CAD TDB string is the row's tooltip; the selected row has `aria-pressed="true"`; clicking calls
    `onSelect` with that row object
- [ ] **Step 7: Run the tests**, expect FAIL; **implement** `approachSelection` and `ApproachList`; run, expect PASS.
- [ ] **Step 8: Wire up.** `App` loads `useDataset('close-approaches')`, renders `ApproachList` in the shell's
      `left` column (always, above `SwarmControls`; Passed / Coming split on `useNowMs(30_000)`) and adds the
      dataset to the pill (labelled `Close approaches`). `packages/data/src/upstream/queries.ts` exports
      `CAD_MAX_DISTANCE_AU = 0.05` as a number, and `cadQuery` sends `String(CAD_MAX_DISTANCE_AU)`, so the bar and the
      query cannot drift.
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
  `sceneAxesFromEcliptic`), their tests

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
  - In `apps/web/src/approaches/playApproach.ts`, both with `targets` defaulting to
    `{ selection: approachSelection, time: timeStore, camera: cameraRig }`:
    - `followApproach(approach, targets?)`: selects it and flies with chase at the current simulated time
    - `playApproach(approach, targets?)`: selects it, sets the clock with `approachPlayback`, then follows

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
- [ ] **Step 6: Write failing action tests** with fake targets:
  - `followApproach`: selection set; the clock untouched (no scrub, rate or play calls); then
    `flyTo({ focus: 'asteroid', distanceAu: followDistanceAu(row), chase: true })`
  - `playApproach`: selection set first; clock scrubbed to `approachPlayback(row).startJdTdb`, rate set, playing;
    then the same `flyTo`. A row whose approach is in the past still scrubs to before it (Review Focus 4).
- [ ] **Step 7: Run**, expect FAIL; **implement** the rig changes, `focusPositions` and both actions; run, PASS.
- [ ] **Step 8: Wire up.** `CameraRigUpdater` passes `focusPositions`; while `cameraRig.chasing`, it computes
      `writeGeocentricOffset` from `asteroidPositionAu − bodyPositions.earthMoonBarycenter`, then
      `writeChaseDirection`, maps it with `sceneAxesFromEcliptic(…, out)` and sets
      `camera.position = direction × distance` (the pose's distance in flight, the camera's current length after).
      `CameraControls` passes `onStart={() => cameraRig.stopChase()}` so a drag hands the view back; `minDistance`
      takes `FocusId`. `FocusPicker` shows bodies only (the card is the asteroid's control). Until Task 6 adds the
      card's buttons, a dev-only key (`F` follow, `P` play) on the selected row drives the browser check.
- [ ] **Step 9: Browser check:** Play approach on three rows (the closest, the farthest, one in the past): the
      flight lands on the asteroid, Earth stays in view through closest approach, a drag ends the chase without a
      jump, another row mid-flight retargets smoothly (note any hitch against the open question on carried
      velocity). Follow on one row leaves the clock where it was.
- [ ] **Step 10: `npm run check`**, then commit: `Fly to the selected asteroid and follow it past Earth`.

---

### Task 6: Focus card

UI task: interfaces, test cases and acceptance checks; the exactness check runs over every recorded CAD row. The
card follows the mockup's right column (decision 7).

**Files:**

- Create: `apps/web/src/approaches/approachCard.ts` (pure model), `apps/web/src/approaches/ApproachCard.tsx`,
  tests beside each
- Modify: `apps/web/src/App.tsx` (card in the shell's `right` slot, shown while a row is selected), the stylesheet

**Interfaces:**

- Consumes: `distanceTexts`, `speedText`, `approachDateText`, `approachUtcText`, `approachLabel`,
  `orbitClassLabel` (Task 3); `approachDiameter`, `diameterLabel`, `diameterValueText` (Task 2); `approachSelection` (Task 3);
  `followApproach`, `playApproach` (Task 5); `useTimeReadout()` (4 Hz).
- Produces:
  - `approachCard(request: { approach: CloseApproach; jdTdb: number }): ApproachCardModel`, where
    `ApproachCardModel = { title: string; badge: string; countdown: string; stats: CardStat[]; source: string }` and
    `CardStat = { label: string; value: string; detail: string; tooltip?: string }`
  - `countdownText(daysFromApproach: number): string`

- [ ] **Step 1: Write failing tests for `approachCard`**, for a row built in code (`fullName: '       (2026 RX7)'`,
      `orbitClass: 'APO'`, `distanceAu: 0.0123456789`, `relativeVelocityKmPerS: 12.345678`,
      `approachJdTdb: 2_461_313.675`, `approachCalendarTdb: '2026-Sep-30 04:12'`, `timeUncertainty: '< 00:01'`,
      `diameterKm: null`, `absoluteMagnitude: 26.1`):
  - `title` → `(2026 RX7)`; `badge` → `Apollo · NEO` (just `NEO` when `orbitClass` is null)
  - `Miss distance` → value `4.80 LD`, detail `1,846,887 km · 0.0123456789 AU`
  - `Relative speed` → value `12.345678 km/s`, detail `44,444 km/h`
  - label `diameterLabel(diameter)` (`Est. diameter` here) → value `diameterValueText(diameter)`, where
    `diameter = approachDiameter(row)`, detail `H = 26.1` (label `Diameter (JPL)` and detail `JPL` when JPL's
    diameter is present)
  - `Closest approach` → value `Sep 30 · 04:11 UTC`, detail `± < 00:01` (empty when `timeUncertainty` is null),
    tooltip `2026-Sep-30 04:12 TDB (JPL CAD)`
  - `countdown` → `countdownText(jdTdb − approachJdTdb)`
  - `source` → `Distances from JPL CAD · drawn positions are a two-body illustration`
- [ ] **Step 2: Write failing tests for `countdownText`:** `-1.5` → `Closest approach in 1d 12h 00m`;
      `0.25` → `Closest approach 0d 06h 00m ago`; `|Δ| < 1 min` → `Closest approach now`; minutes round down.
- [ ] **Step 3: Write the exactness test** (the exit criterion at unit level): for every row of the recorded CAD
      response, after `toCloseApproaches`, the card's distance detail ends with `${row.distanceAu} AU`, its speed
      value equals `${row.relativeVelocityKmPerS} km/s` and its date tooltip starts with `row.approachCalendarTdb`.
- [ ] **Step 4: Run**, expect FAIL; **implement**; run, expect PASS.
- [ ] **Step 5: `ApproachCard`** renders the model from `useTimeReadout()` (no per-frame React state) in the `right`
      slot; hidden when nothing is selected. Two real buttons: **Follow** → `followApproach(selected)`, **Play
      approach** → `playApproach(selected)`. A slot between the countdown and the stats holds Task 6b's close-up.
- [ ] **Step 6: Browser check:** for two rows, each card value matches the row in
      `curl -s localhost:<port>/api/close-approaches`; the countdown passes zero at the moment the drawn pass is
      closest (within the Task 4 tolerance's Δt); the layout matches the mockup's right column at 1600 × 1000.
- [ ] **Step 7: `npm run check`**, then commit: `Add the close-approach focus card`.

---

### Task 6b: Earth-centred close-up (illustrative)

UI task with light geometry: interfaces, exact test cases and acceptance checks. It replaces the mockup's lens
without the Moon (decision 2).

**Files:**

- Create: `apps/web/src/approaches/closeUp.ts` (pure), `apps/web/src/approaches/CloseUp.tsx` (SVG), tests beside
  `closeUp.ts`
- Modify: `apps/web/src/approaches/ApproachCard.tsx` (fills the close-up slot); `asteroidPosition.ts` gains
  `trailForApproach(approach)` (memoised by row identity like `elementsForApproach`), which `ApproachScene` then
  reuses instead of calling `writeTrail` itself

**Interfaces:**

- Consumes: `writeTrail`, `TRAIL_POINTS`, `TRAIL_HALF_WINDOW_CROSSINGS`, `trailIndexAt`, `crossingDays` (Task 4);
  `KM_PER_LUNAR_DISTANCE`, `distanceTexts` (Task 3); `KM_PER_AU`; `useTimeReadout()`.
- Produces:
  - `closeUpPath(trail: Float32Array): CloseUpPath`, where `CloseUpPath = { points: Float64Array; closestIndex:
number }`: the trail projected onto the pass plane, x along the motion at closest approach, y toward the closest
    point, Earth at the origin (AU, 2 numbers per sample)
  - `closeUpHalfWidthAu(distanceAu: number): number` = `max(4 · distanceAu, 1.25 LD)`, so the 1 LD ring is always in
    view

- [ ] **Step 1: Write failing tests for `closeUpPath`** on a straight-line trail built in code, offsets
      `(d, 0, 0) + t · (0, v, 0)` at the `trailOffsetDays` sample times:
  - `closestIndex` is the sample nearest `t = 0`
  - the closest point projects to `(≈0, d)`; every point has `y ≈ d` (a straight pass stays a straight line)
  - x increases with the sample index (the motion runs left to right)
  - a trail mirrored through Earth (`(−d, 0, 0) + t · (0, −v, 0)`) gives the same projected points (the frame is
    built from the trail, not from fixed axes)
- [ ] **Step 2: Write failing tests for `closeUpHalfWidthAu`:** `0.0123456789` → `4 × 0.0123456789`;
      `1e-4` → `1.25 × 384,398 / 149,597,870.7`.
- [ ] **Step 3: Run**, expect FAIL; **implement**; run, expect PASS.
- [ ] **Step 4: `CloseUp`** draws, in a 294 × 172 SVG like the mockup: Earth at the centre, a dashed 1 LD ring, the
      projected path (bright up to now, faint after, split at `trailIndexAt(now − approach)`), the asteroid's marker
      at that index, a dashed line from Earth to the closest point labelled with CAD's distance in LD (a fact, from
      `distanceTexts`), the header `FOCUS VIEW · EARTH-CENTRED · ILLUSTRATIVE` and the scale `1 LD = 384,398 km`.
      The path is computed once per selection; only the marker moves, at the 4 Hz readout.
- [ ] **Step 5: Browser check:** for the closest and the farthest row the path bends around Earth, the marker
      matches the main view's asteroid as time plays, and frame times are unchanged.
- [ ] **Step 6: `npm run check`**, then commit: `Add an Earth-centred close-up to the focus card`.

---

### Task 7: Exit verification and close-out

Verification task: no new code unless a check fails (then stop and report, as CLAUDE.md requires).

- [ ] **Step 1: Every listed approach plays end to end.** With live data: press Play approach on each row in the
      list. For each, record: flight lands, asteroid on its trail, Earth in view through closest approach, the card
      and the close-up match the `/api/close-approaches` row. Include the rows that needed an SBDB lookup in Task 1 (Review Focus 1). Repeat
      for two rows with the server stopped (snapshot origin; Review Focus 4).
- [ ] **Step 2: Frame times** as in Phase 4 (same machine and method): following the closest-approach row through
      its pass and the Sun overview with an approach selected. Target ≥ 60 fps, no frame over 20 ms apart from known
      ones.
- [ ] **Step 3: `PROGRESS.md`:** tick the Phase 5 items, add the evidence block (commit, CI run, browser, machine),
      decisions made during the phase and the cross-check tolerance row; mark Phase 5 done and Phase 6 current.
- [ ] **Step 4: `npm run check`**, commit, push, open the PR (`Closes #N` for the close-out issue).
- [ ] **Step 5: After the user merges and CI on `main` is green:** close the Phase 5 milestone, tag the merge
      commit `v0.5.0` (annotated) and publish the release with the phase summary and two stills (the list with the
      focus card, and a close pass with Earth in frame).
