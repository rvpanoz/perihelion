# Phase 6: Shot 3: The Eruption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pick a real CME from the last 30 days and watch it leave the Sun and travel outward along DONKI's measured
direction and cone width, timed to the real event; if it reaches Earth, show the impact (illustrative).

**Architecture:** The server fetches CMEs from DONKI's new CCMC API (no key), keeps each CME's most accurate analysis
and, when DONKI ran ENLIL for it, ENLIL's predicted Earth arrival. `packages/orbit` turns the analysis into a
heliocentric ecliptic J2000 cone axis and a leading-edge distance over time. The web app draws the cone as a GPU
particle shell driven by the time controller. Times and speeds shown are DONKI's; the drawn shell is an illustration
of DONKI's cone model.

**Tech Stack:** TypeScript 6 (strict, ESM), React 19, three 0.186, @react-three/fiber 9.8, @react-three/drei 10.7,
Fastify, zod 4, Vitest 5, fast-check.

**Spec:** `PLAN.md` § Phase 6 (ten tasks, PR #98), plus decisions approved while planning (2026-10-02):

1. **DONKI's new home.** CME data comes from `https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME`, which replaced
   `api.nasa.gov/DONKI/CME` on 2026-09-30 (CCMC "Major Updates"; parameters and JSON unchanged, checked live:
   107 CMEs for 2026-09-02 → 2026-10-01, same top-level fields as our recording). It needs no API key.
2. **`NASA_API_KEY` is retired.** DONKI was its only user. The key, the `DEMO_KEY` fallback and its start-up warning
   go; CLAUDE.md's data notes and non-negotiable 6 are updated to match. The redaction helper stays (generic).
3. **Own gate for CCMC.** The new host gets its own `UpstreamGate` at ≥ 1 s between requests (no rate-limit headers
   seen).
4. **Time strictness.** Upstream times must carry an explicit `Z` (DONKI prints minute precision, `2026-09-02T00:08Z`);
   a time without a zone is a format error, never local time.
5. **Links.** `cmeSchema.link` accepts only `http:`/`https:` URLs.
6. **Cache validation on read.** Each SQLite cache entry is validated against its dataset schema the first time a
   process reads it; a failure counts as a miss.
7. **ENLIL arrival is kept.** A CME's chosen analysis carries ENLIL's predicted Earth arrival
   (`analysis.earthArrival`, with its glancing-blow and minor-impact flags) when it has an ENLIL run that predicts
   one, else `null`; ENLIL runs belong to an analysis (Task 1b review, 2026-10-02). When present it is the arrival time shown as fact and the time the drawn
   front reaches Earth (Task 3).
8. **Ground truth for the CME direction (Task 2):** JPL Horizons, not Hapgood's worked examples (changed
   2026-10-02: no published worked values could be verified). Horizons gives Earth's heliocentric ecliptic J2000
   position and Earth's heliographic latitude B0 (the Sun's sub-observer latitude seen from Earth); with the IAU Sun
   pole these fix the HEEQ frame. Hapgood (1992) stays the cited source of the formulas.
9. **Arrival timing (Task 3, revised 2026-10-02 from the recorded CMEs):** with an ENLIL arrival, the drawn front
   moves at the mean transit speed that meets `time21_5` and ENLIL's arrival, and the arrival is shown even if the
   cone misses Earth; without one, the front moves at the analysis speed and no computed arrival is shown (a
   constant-speed estimate differs from ENLIL by −39 h to +45 h). Details in Task 3.

## Tasks

| #   | Task                                       | Issue | Format    | Status        |
| --- | ------------------------------------------ | ----- | --------- | ------------- |
| 1a  | DONKI on CCMC, key retired, re-recorded    | #85   | light     | ✅ #111       |
| 1c  | Validate cache entries on first read       | #85   | light     | ✅ #112       |
| 1b  | Strict times, http(s) links, ENLIL arrival | #85   | light     | ✅ #113       |
| 2   | Engine: CME direction and Earth-in-cone    | #99   | full code | ✅ #115, #116 |
| 3   | Engine: CME kinematics and arrival         | #100  | full code | ✅ #118, #119 |
| 4   | CME picker + selected-CME store            | #101  | light     | ✅            |
| 5   | CME particle shell                         | #102  | full code | ✅            |
| 6   | Sun look                                   | #103  | full code | ✅            |
| 7   | Earth look                                 | #104  | full code | ✅            |
| 8   | Earth impact (illustrative)                | #105  | light     | ✅            |
| 9   | Shot choreography                          | #106  | light     | ✅            |
| 10  | Exit verification                          | #107  | light     | ✅            |

Task 1 is one issue (#85) delivered in three PRs, in the order 1a → 1c → 1b (`phase-6/donki-ccmc`,
`phase-6/cache-validation`, `phase-6/donki-strict`): 1c goes before 1b so the CME schema change lands with cache
validation already in place (approved 2026-10-02). 1b closes #85.

---

## Task 1a: DONKI on CCMC, key retired, re-recorded

**Files:**

- Modify: `packages/data/src/upstream/queries.ts` (+ test): `DONKI_CME_API_URL` →
  `https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME`; `donkiCmeQuery(window)` drops its `apiKey` argument and the
  `api_key` parameter.
- Modify: `apps/server/src/upstream/upstreamClients.ts`: the DONKI client's comment names CCMC; keep
  `DONKI_TIMEOUT_MS`.
- Modify: `apps/server/src/config.ts` (+ test), `apps/server/src/main.ts`: remove `nasaApiKey`, `usingDemoKey`,
  `DEMO_API_KEY` and the warning.
- Modify the key's call sites (review item 4): `apps/server/src/datasets/datasetRequests.ts` (`nasaApiKey`
  dependency), `createDatasets.ts`, `apps/server/scripts/writeSnapshot.ts`, `apps/server/src/testing/testServer.ts`
  and `testConstants.ts` (`TEST_API_KEY` goes).
- Modify: `apps/server/src/testing/fakeUpstream.ts`: the DONKI recording is served under `/DONKI-API/get/CME`
  (review item 1).
- Modify: `apps/server/scripts/recordUpstream.ts`: no key.
- Modify: `apps/server/src/upstream/upstreamUrl.test.ts`, `httpClient.test.ts`: new host; the redaction tests keep a
  made-up `api_key` URL (the helper stays generic).
- Re-record: `npm run record -- donki` (the recorder's group; writes `donki-cme-window.json`, `donki-cme-empty.json`
  and their manifest entries; review item 3).
- Modify: `CLAUDE.md` (review item 5): non-negotiable 6 reads "**Never commit secrets.** Credentials come from the
  environment only."; the data note reads "JPL SSD APIs (SBDB query, CAD, Horizons) and DONKI (CCMC `DONKI-API`)
  need no key." `.env.example` lists the optional server settings instead of `NASA_API_KEY` (review item 6).
  `PROGRESS.md`: remove the `DEMO_KEY` known issue.

**Tests (agreed changes, review item 2; the rest pass unchanged):**

- `queries.test.ts`: "asks CCMC for the window, with no key": the base URL is CCMC's and the params are exactly
  `{ startDate, endDate }`.
- `config.test.ts`: the defaults lose `nasaApiKey`/`usingDemoKey`; a new test shows a leftover `NASA_API_KEY` changes
  nothing.
- `datasetRequests.test.ts`: DONKI is asked on `/DONKI-API/get/CME` with no `api_key`.
- `donki.test.ts` (approved after the re-record, 2026-10-02): the recorded-CME count is 77 of 110 (33 have no
  longitude in their flagged analysis), was 86 of 126. Same rule, new recording.
- If any other test fails on the new recording, stop and report it; never edit the recording.

**Acceptance:**

- [x] `grep -rn "NASA_API_KEY\|DEMO_KEY\|api.nasa.gov" apps packages CLAUDE.md` finds nothing outside committed
      recordings' history.
- [x] `npm run dev`: `/api/cmes` answers `origin: "fresh"` and the server logs no DONKI error (2026-10-01T22:20Z:
      77 CMEs).
- [x] `npm run check` green.

## Task 1b: Strict times, http(s) links, ENLIL arrival

Runs after Task 1c (see above). Review changes approved 2026-10-02 are folded in.

**Files:**

- Modify: `packages/data/src/upstream/donki.ts` (+ test): every DONKI time must end in `Z` (decision 4): `startTime`,
  `time21_5` and ENLIL's `modelCompletionTime` and `estimatedShockArrivalTime`; a malformed one fails the list (as a
  bad CAD row does). `recencyMs` treats a time without `Z` as unreadable. `link` keeps only `http:`/`https:` URLs,
  others become `null` (decision 5). The analysis schema reads `enlilList`, and `toCmeAnalysis` maps the arrival, so
  `mostAccurateAnalysis` keeps its signature.
- Modify: `packages/data/src/cme.ts`: `link` is `z.url({ protocol: /^https?$/ }).nullable()`; the analysis gets
  `earthArrival: { predictedTime: iso datetime, isGlancingBlow: boolean, isMinorImpact: boolean } | null`.
- Refresh: `npm run snapshot -- cmes`; commit `apps/web/public/snapshot/cmes.json`.

**ENLIL rule** (field names checked against the Task 1a recording: `modelCompletionTime`,
`estimatedShockArrivalTime`, `isEarthGB`, `isEarthMinorImpact`): from the chosen analysis's `enlilList`, take the run
with the latest `modelCompletionTime` whose `estimatedShockArrivalTime` is not null; `isGlancingBlow` is its
`isEarthGB`, `isMinorImpact` its `isEarthMinorImpact`. No such run → `earthArrival: null`. Log in the PROGRESS
decisions how many of the kept CMEs have an arrival (the sample for Task 3's tolerance).

**Tests:**

- A time without `Z` (`2026-09-01T12:00`) throws `UpstreamFormatError`, in each of the four time fields; minute
  precision with `Z` parses.
- A `javascript:` or relative `link` becomes `null`; an `https:` link is kept.
- ENLIL: no list → `null`; several runs → the latest completed with an arrival; a run whose
  `estimatedShockArrivalTime` is `null` is skipped even when it is the latest (the recording has such runs).
- The re-recorded response normalizes, and its output passes `cmeSchema`.

**Acceptance:**

- [x] The two DONKI items in PROGRESS "Open questions" are removed and logged as decisions; the PR closes #85.
- [x] `npm run check` green.

## Task 1c: Validate cache entries on first read

Runs before Task 1b. Design approved 2026-10-02 (review items 1–4).

**Files:**

- Modify: `apps/server/src/datasets/types.ts`: `DatasetRequest.accepts(dataJson): boolean`;
  `DatasetCache.delete(cacheKey)`.
- Modify: `apps/server/src/datasets/datasetRequests.ts` (+ test): `datasetRequest()` builds `accepts` from the same
  `DATASET_DATA_SCHEMAS[name]` that `fetchData` uses; text that is not JSON is rejected without throwing. The service
  stays schema-agnostic.
- Modify: `apps/server/src/datasets/sqliteDatasetCache.ts` (+ test): `delete`.
- Modify: `apps/server/src/datasets/datasetService.ts` (+ test): `read` and the scheduler's `#refreshUnlessFresh` both
  go through `#readValid`. An entry is checked once per process (a `Set` of checked keys; entries the process writes
  count as checked); one that fails is deleted, logged once and treated as a miss (refetch, then snapshot).

**Tests:** a rejected entry is a miss (fetch, `fresh`, overwritten); with upstream down it serves the snapshot, the row
is gone and a second read logs nothing new; a valid entry is checked once and served without a fetch; entries the
process wrote are not re-checked; the scheduler replaces a rejected, unexpired entry; `accepts` takes the request's own
output and rejects an entry missing a required field, and rejects non-JSON; `SqliteDatasetCache.delete` removes a row.

**Acceptance:**

- [x] The cache item in PROGRESS "Open questions" is removed and logged as a decision.
- [x] `npm run check` green.

---

## Task 2: Engine: CME direction and Earth-in-cone (#99)

Maths-heavy, so full code. Two PRs: **2a** adds the Horizons Sun-orientation fixture (`phase-6/sun-fixtures`),
**2b** adds the engine functions and their tests (`phase-6/cme-direction`).

**Why the fixture proves the transform.** DONKI gives the cone axis in HEEQ (Stonyhurst) coordinates: z along the
Sun's rotation axis, x where the solar equator meets the central meridian seen from Earth, y = z × x (solar west).
That frame is fixed by two directions in ecliptic J2000: the Sun's pole, and the Sun→Earth line. The Sun→Earth line
is an input (the engine's Earth–Moon barycentre; the ~4,700 km offset is 0.002° at 1 AU). The pole is the only
modelled quantity, and it is pinned by Earth's heliographic latitude B0 = asin(ê · p̂): over a year B0 traces the
pole's tilt (amplitude) and node (phase), so twelve monthly B0 values from Horizons check both. The handedness
(y = west, so W30 is longitude +30°) is a convention, checked by unit test against Thompson (2006).

### Task 2a: Horizons Sun-orientation fixture

**Files (light format: interfaces and tests; read the existing generator first):**

- `packages/fixtures/src/fixtureSpec.ts`: `SUN_SAMPLE_JD_TDB` = 0h on the 1st of each month of 2026 (12 dates, via
  `julianDateOfNewYear`'s `Date.UTC` pattern); `EARTH_HORIZONS_ID = '399'` (Earth itself, not the EMB).
- `packages/fixtures/src/horizonsQuery.ts`: `SUN_OBSERVER_PARAMS` and `buildSunObserverQuery(jdTtList)`:
  `COMMAND='10'`, `CENTER='500@399'`, `EPHEM_TYPE=OBSERVER`, `QUANTITIES='14'` (observer sub-longitude/latitude),
  `TIME_TYPE=TT` (observer tables accept no TDB; TT = TDB within 1.7 ms, decisions log 2026-09-28), `TLIST_TYPE=JD`,
  `CAL_FORMAT=JD`, `ANG_FORMAT=DEG`, `EXTRA_PREC=YES`, `CSV_FORMAT=YES`, `OBJ_DATA=NO`, `MAKE_EPHEM=YES`.
  Checked live on 2026-10-01: header `Date_________JDTT, , , ObsSub-LON, ObsSub-LAT,`; 2026-01-01 gives
  B0 = −2.997476°.
- `packages/fixtures/src/horizonsRecords.ts`: `toSunObserverRecord(row) → { jdTt, earthHeliographicLatitudeDeg }`
  from `Date_________JDTT` and `ObsSub-LAT` (the Sun is a sphere in Horizons, so planetodetic = heliographic).
- `packages/fixtures/src/fixtureSchema.ts`: `sunOrientationFixturesSchema = { source, observerSettings, ephemeris,
samples: [{ jdTdb, earthPositionAu: vector3, earthHeliographicLatitudeDeg }] }`.
- `packages/fixtures/src/generate.ts`: `generateSunOrientationFixtures(client)`: Earth (399) vectors on
  `SUN_SAMPLE_JD_TDB` with the existing frame params, then the observer table on the same JDs; join by JD (both must
  cover exactly the requested dates); one ephemeris across both.
- `loaders.ts` / `golden.ts`: `loadSunOrientationFixtures()`, exported from the golden entry with its type.
- `packages/fixtures/scripts/generateFixtures.ts`: takes set names like `record`/`snapshot` do
  (`npm run fixtures -- sun`; no names = all, unknown name = error), so adding the Sun set never regenerates the
  planet and asteroid ground truth. Write `data/sun-orientation.json` and commit it.

**Deviation found while building (2026-10-02):** the CLI imported the package index, which re-exports the loaders,
which import the data files the CLI writes, so a new set could not be generated the first time. The CLI now imports
the generator modules directly. A real Horizons observer response is recorded in `src/recorded/observer-sun.json` for
the parser test, like the existing vector and elements recordings.

**Tests (in `generate.test.ts` style, fake client, no network):** the observer query carries the params above; a
fake observer table parses to records; the generator joins vectors and B0 by JD and rejects a missing date or a
mixed ephemeris; the loader validates the committed file; the CLI's name parsing rejects an unknown set.

### Task 2b: CME direction in the engine

**Files:** create `packages/orbit/src/heliographic.ts`, `heliographic.test.ts`, `heliographic.golden.test.ts`;
export from `packages/orbit/src/index.ts`.

```ts
// packages/orbit/src/heliographic.ts
import { type Vector3, cross, dot, norm } from './vector3';

const RAD_PER_DEG = Math.PI / 180;

/**
 * The Sun's north rotation pole in ICRF/J2000 equatorial coordinates: α0 = 286.13°, δ0 = 63.87°, with no drift
 * (IAU WGCCRE 2015: Archinal et al. 2018, Celest. Mech. Dyn. Astron. 130:22, Table 1). Horizons' IAU_SUN frame
 * uses the same pole.
 */
const SUN_POLE_RIGHT_ASCENSION_RAD = 286.13 * RAD_PER_DEG;
const SUN_POLE_DECLINATION_RAD = 63.87 * RAD_PER_DEG;

/** Obliquity of the ecliptic at J2000, 84381.448″ (IAU 1976): the value of Horizons' ecliptic J2000 frame. */
const OBLIQUITY_J2000_RAD = (84_381.448 / 3600) * RAD_PER_DEG;

/** A direction from the Sun's centre in HEEQ/Stonyhurst coordinates; longitude is positive toward solar west. */
export interface HeliographicDirection {
  latitudeRad: number;
  longitudeRad: number;
}

/** DONKI's cone model: apex at the Sun's centre, axis along `axis`, angular half-width `halfAngleRad`. */
export interface CmeCone {
  axis: HeliographicDirection;
  halfAngleRad: number;
}

/** Unit vector for a latitude/longitude on a frame's axes: x at longitude 0, z at latitude +90°. */
function unitFromSpherical(latitudeRad: number, longitudeRad: number): Vector3 {
  const cosLatitude = Math.cos(latitudeRad);
  return [
    cosLatitude * Math.cos(longitudeRad),
    cosLatitude * Math.sin(longitudeRad),
    Math.sin(latitudeRad),
  ];
}

/** Equatorial → ecliptic J2000: a rotation about x by the obliquity (Meeus, Astronomical Algorithms, eq. 13.5–13.6). */
function equatorialToEcliptic(vector: Readonly<Vector3>): Vector3 {
  const cosObliquity = Math.cos(OBLIQUITY_J2000_RAD);
  const sinObliquity = Math.sin(OBLIQUITY_J2000_RAD);
  return [
    vector[0],
    cosObliquity * vector[1] + sinObliquity * vector[2],
    -sinObliquity * vector[1] + cosObliquity * vector[2],
  ];
}

/** HEEQ's z axis in heliocentric ecliptic J2000 (unit vector). */
export const SUN_POLE_ECLIPTIC_J2000: Readonly<Vector3> = equatorialToEcliptic(
  unitFromSpherical(SUN_POLE_DECLINATION_RAD, SUN_POLE_RIGHT_ASCENSION_RAD),
);

/**
 * Earth's heliographic latitude B0: the angle of the Sun→Earth line above the solar equator. It is Earth's latitude
 * in HEEQ (its HEEQ longitude is 0 by definition) and stays within ±7.25°, the solar equator's tilt.
 */
export function earthHeliographicLatitudeRad(earthPositionAu: Readonly<Vector3>): number {
  return Math.asin(dot(earthPositionAu, SUN_POLE_ECLIPTIC_J2000) / norm(earthPositionAu));
}

/**
 * HEEQ (Stonyhurst) direction → heliocentric ecliptic J2000 unit vector. HEEQ: z = the Sun's pole, x = the Sun→Earth
 * line projected onto the solar equator, y = z × x, which points to solar west (the right-hand limb seen from Earth),
 * so a source at W30 has longitude +30° (Hapgood 1992, Planet. Space Sci. 40, 711, §4; Thompson 2006, A&A 449, 791,
 * §7). `earthPositionAu` is heliocentric ecliptic J2000 at the CME's time.
 */
export function heliographicToEcliptic(
  direction: HeliographicDirection,
  earthPositionAu: Readonly<Vector3>,
  out: Vector3 = [0, 0, 0],
): Vector3 {
  const xAxis = heeqXAxis(earthPositionAu);
  const yAxis = cross(SUN_POLE_ECLIPTIC_J2000, xAxis);
  const [x, y, z] = unitFromSpherical(direction.latitudeRad, direction.longitudeRad);
  const pole = SUN_POLE_ECLIPTIC_J2000;
  out[0] = x * xAxis[0] + y * yAxis[0] + z * pole[0];
  out[1] = x * xAxis[1] + y * yAxis[1] + z * pole[1];
  out[2] = x * xAxis[2] + y * yAxis[2] + z * pole[2];
  return out;
}

/** The Sun→Earth direction with its component along the pole removed: the solar equator's central meridian. */
function heeqXAxis(earthPositionAu: Readonly<Vector3>): Vector3 {
  const pole = SUN_POLE_ECLIPTIC_J2000;
  const alongPole = dot(earthPositionAu, pole);
  const inEquator: Vector3 = [
    earthPositionAu[0] - alongPole * pole[0],
    earthPositionAu[1] - alongPole * pole[1],
    earthPositionAu[2] - alongPole * pole[2],
  ];
  const length = norm(inEquator);
  return [inEquator[0] / length, inEquator[1] / length, inEquator[2] / length];
}

/**
 * Angle between a HEEQ direction and Earth, which sits at (B0, 0) in HEEQ. atan2(|a × b|, a · b) keeps precision
 * for small angles, where acos would not.
 */
export function angleFromEarthRad(
  direction: HeliographicDirection,
  earthLatitudeRad: number,
): number {
  const axis = unitFromSpherical(direction.latitudeRad, direction.longitudeRad);
  const earth = unitFromSpherical(earthLatitudeRad, 0);
  return Math.atan2(norm(cross(axis, earth)), dot(axis, earth));
}

/** Whether Earth's direction lies within the cone (edge inclusive). Distance plays no part in the cone model. */
export function isEarthInsideCone(cone: CmeCone, earthLatitudeRad: number): boolean {
  return angleFromEarthRad(cone.axis, earthLatitudeRad) <= cone.halfAngleRad;
}
```

`heliographicToEcliptic` takes `(direction, earthPositionAu, out?)`: the optional `out` is the engine's hot-path
convention, not a third argument to wrap (CLAUDE.md engine conventions).

**Unit and property tests (`heliographic.test.ts`):**

- `SUN_POLE_ECLIPTIC_J2000` is a unit vector at ecliptic latitude 82.75° (Carrington's 7.25° tilt) and ecliptic
  longitude 345.76° (ascending node Ω = 75.76° at J2000 minus 90°; Hapgood 1992's node formula at J2000), each
  within 0.01°: published constants that the IAU pole must reproduce.
- `heliographicToEcliptic`: latitude 90° gives the pole; `(B0, 0)` with `B0 = earthHeliographicLatitudeRad(e)` gives
  `e / |e|` (1e-12) for synthetic Earth positions; longitude +90° at latitude 0 gives `pole × x` (solar west);
  results are unit vectors and the map preserves angles between directions (fast-check over latitude/longitude and
  Earth's ecliptic longitude); it writes into and returns `out`.
- `earthHeliographicLatitudeRad`: within ±7.25° (+1e-9) for the engine's EMB on every day of 2026; scale-free
  (`e` and `3e` agree).
- `angleFromEarthRad`: 0 at `(B0, 0)`; equals |longitude| when both latitudes are 0; symmetric in longitude sign;
  within [0, π] (fast-check).
- `isEarthInsideCone`: with B0 = 0, an axis at W30 is outside a 25° cone and inside a 35° one; the edge (30°) is
  inside.

**Golden test (`heliographic.golden.test.ts`), against `loadSunOrientationFixtures()`:**

1. Pole check: `earthHeliographicLatitudeRad(sample.earthPositionAu)` (Horizons' Earth) vs Horizons'
   `earthHeliographicLatitudeDeg`, worst over the 12 dates.
2. End to end: the same with the engine's `planetStateAt('earthMoonBarycenter', jdTdb).positionAu`, which is what
   the app will use.

Expected agreement is about 0.001° (Horizons' B0 is light-time corrected, about 0.0007°; the EMB offset is about
0.002°), but the tolerances are not guessed: the first run measures the worst error of each check, and Task 2b
stops there to propose `measured × 1.25` with that evidence (the PROGRESS "Calibrated tolerances" rule).

**Changes approved while building 2b (2026-10-02):** the B0 range test's bound is 7.25° + 0.01°, not 7.25° + 1e-9
rad: the IAU pole tilts the solar equator 7.2517° (Carrington's 7.25° is rounded) and the EMB strays off the ecliptic,
so the engine's B0 peaks at 7.2521°. Golden tolerances, measured × 1.25: pole 8.7e-7°, end to end 7.3e-4°.

**Acceptance:**

- [x] 2a: `npm run fixtures -- sun` writes `sun-orientation.json` and leaves `planets.json` and `asteroids.json`
      untouched; committed with its provenance.
- [x] 2b: tolerances measured, approved and recorded in PROGRESS "Calibrated tolerances" (pole 8.7e-7°,
      end to end 7.3e-4°).
- [x] `npm run check` green for each PR.

---

## Task 3: Engine: CME kinematics and arrival (#100)

Decisions approved 2026-10-02 (from the recorded CMEs; evidence in PROGRESS.md):

1. **Drawn front.** With an ENLIL Earth arrival, the front moves uniformly at the mean transit speed that puts it at
   21.5 R☉ at `time21_5` and at Earth's distance at ENLIL's arrival time: both DONKI times are met exactly. DONKI's
   measured speed stays the speed shown as fact. A drag-based model (Vršnak et al. 2013) is left for Phase 7.
2. **ENLIL over the cone.** A predicted Earth arrival is shown and drives the impact even when the drawn cone misses
   Earth (7 of the 13 recorded arrivals): ENLIL models the CME's flank. The geometric cone test (Task 2) only matters
   for CMEs without one. How the impact looks is Task 8.
3. **No computed arrival time on screen without ENLIL.** The front is drawn at the measured speed, but no constant-
   speed arrival is shown (it differs from ENLIL by −39 h to +45 h on the recorded CMEs). The UI says "ENLIL: no Earth
   arrival predicted" (ENLIL ran) or "no ENLIL run" (it did not), so the analysis gains `enlilRunCount`.
4. **"Consistent with DONKI", as tests,** for every recorded CME: the front is at 21.5 R☉ at `time21_5`; with an
   ENLIL arrival it is at Earth's distance at that time; without one it moves at the analysis speed. Tolerances are
   measured and proposed × 1.25 at Task 3b (expected near zero, since these hold by construction).
5. **Placement.** The maths lives in `packages/orbit/src/cmeKinematics.ts`; the cross-check against the recording
   lives in `apps/server`, next to the Phase 5 close-approach cross-check.

Two PRs: **3a** adds `enlilRunCount` to the data (`phase-6/enlil-run-count`), **3b** the engine and the cross-check
(`phase-6/cme-kinematics`).

### Task 3a: `enlilRunCount` on the analysis (light)

- `packages/data/src/cme.ts`: `enlilRunCount: z.number().int().nonnegative()` on `cmeAnalysisSchema`, documented as
  the number of ENLIL runs on the chosen analysis, for any target.
- `packages/data/src/upstream/donki.ts`: `toCmeAnalysis` sets it from `enlilList?.length ?? 0`.
- Tests (`donki.test.ts`): no list or `null` → 0; three runs, one with an Earth arrival → 3; the recording normalizes
  and passes `cmeSchema`. Existing expected CMEs (`donki.test.ts`, `apps/web/src/data/loadDataset.test.ts`) gain
  `enlilRunCount: 0`.
- Refresh `npm run snapshot -- cmes`; the Task 1c cache check drops older cached CME entries by itself. Log in PROGRESS
  how many kept CMEs had ENLIL runs but no Earth arrival.

### Task 3b: CME kinematics in the engine (full code)

**Files:** move `KM_PER_AU` from `packages/orbit/src/index.ts` to a new `src/units.ts` (re-exported unchanged, so the
public API is the same; `cmeKinematics.ts` cannot import from the index it is re-exported by); create
`src/cmeKinematics.ts` and `src/cmeKinematics.test.ts`; export from the index; create
`apps/server/src/datasets/cmeCrossCheck.test.ts`.

```ts
// packages/orbit/src/units.ts
/** Astronomical unit in kilometres, exact by definition (IAU 2012 Resolution B2). */
export const KM_PER_AU = 149_597_870.7;
```

```ts
// packages/orbit/src/cmeKinematics.ts
import { KM_PER_AU } from './units';

const SECONDS_PER_DAY = 86_400;

/** Nominal solar radius, 695,700 km (IAU 2015 Resolution B3); Horizons uses the same value. */
export const SOLAR_RADIUS_AU = 695_700 / KM_PER_AU;

/**
 * DONKI measures each CME's speed and time as its front passes 21.5 R☉, the inner boundary of the WSA–ENLIL model
 * (https://ccmc.gsfc.nasa.gov/tools/DONKI/).
 */
export const DONKI_MEASUREMENT_DISTANCE_AU = 21.5 * SOLAR_RADIUS_AU;

/** DONKI's timing for one CME analysis, converted to TDB at the boundary. */
export interface CmeTiming {
  time21_5JdTdb: number;
  speedKmPerS: number;
  /** ENLIL's predicted Earth arrival, or null when there is none. */
  earthArrivalJdTdb: number | null;
}

/** The front's uniform motion: r(t) = DONKI_MEASUREMENT_DISTANCE_AU + speed × (t − time21_5). */
export interface CmeFrontMotion {
  time21_5JdTdb: number;
  speedAuPerDay: number;
}

/** Earth's heliocentric distance at a time: the engine's Earth–Moon barycentre in the app. */
export type EarthDistanceAt = (jdTdb: number) => number;

/**
 * With an ENLIL arrival, the mean transit speed that meets both DONKI times; without one, the measured speed
 * (Task 3 decisions 1 and 3).
 */
export function cmeFrontMotion(
  timing: CmeTiming,
  earthDistanceAt: EarthDistanceAt,
): CmeFrontMotion {
  if (timing.earthArrivalJdTdb === null) {
    return {
      time21_5JdTdb: timing.time21_5JdTdb,
      speedAuPerDay: auPerDayFromKmPerS(timing.speedKmPerS),
    };
  }
  return motionThroughArrival(timing.time21_5JdTdb, timing.earthArrivalJdTdb, earthDistanceAt);
}

function motionThroughArrival(
  time21_5JdTdb: number,
  arrivalJdTdb: number,
  earthDistanceAt: EarthDistanceAt,
): CmeFrontMotion {
  const transitDays = arrivalJdTdb - time21_5JdTdb;
  if (!(transitDays > 0)) {
    throw new RangeError(
      `ENLIL arrival JD ${arrivalJdTdb} is not after time21_5 JD ${time21_5JdTdb}.`,
    );
  }
  const travelAu = earthDistanceAt(arrivalJdTdb) - DONKI_MEASUREMENT_DISTANCE_AU;
  return { time21_5JdTdb, speedAuPerDay: travelAu / transitDays };
}

function auPerDayFromKmPerS(speedKmPerS: number): number {
  return (speedKmPerS * SECONDS_PER_DAY) / KM_PER_AU;
}

/**
 * The front's distance from the Sun's centre. Before `time21_5` the same motion is extrapolated back, and the front
 * is held at the photosphere (1 R☉) before launch, so the shell never starts inside the Sun.
 */
export function cmeFrontDistanceAu(motion: CmeFrontMotion, jdTdb: number): number {
  const distanceAu =
    DONKI_MEASUREMENT_DISTANCE_AU + motion.speedAuPerDay * (jdTdb - motion.time21_5JdTdb);
  return Math.max(SOLAR_RADIUS_AU, distanceAu);
}
```

**Unit and property tests (`cmeKinematics.test.ts`):**

- `SOLAR_RADIUS_AU × KM_PER_AU` is 695,700 km; `DONKI_MEASUREMENT_DISTANCE_AU` is 21.5 of them (≈ 0.09999 AU).
- Without an arrival: 1,000 km/s is 1000 × 86400 / `KM_PER_AU` AU/day (exact); the front is at the measurement
  distance at `time21_5` (exact).
- With an arrival (fast-check: transits 0.5–6 days, Earth distances 0.98–1.02 AU): the front is at Earth's distance
  at the arrival time (1e-12 AU) and at the measurement distance at `time21_5`.
- The front never moves backwards in time (fast-check over pairs of times) and is held at 1 R☉ long before launch.
- An arrival at or before `time21_5` throws `RangeError`.

**Cross-check (`apps/server/src/datasets/cmeCrossCheck.test.ts`),** over the recorded DONKI window normalized with
`toCmes`; times go ISO → `jdUtcFromUnixMs` → `jdTdbFromJdUtc`; Earth's distance is
`norm(planetStateAt('earthMoonBarycenter', jd).positionAu)`:

1. Every CME: `|cmeFrontDistanceAu(motion, time21_5) − DONKI_MEASUREMENT_DISTANCE_AU|`.
2. ENLIL CMEs: `|cmeFrontDistanceAu(motion, arrival) − earthDistanceAt(arrival)|`.
3. Other CMEs: relative difference between `motion.speedAuPerDay` and the analysis speed in AU/day.

Each is measured on the first run; Task 3b stops there and proposes `measured × 1.25` (exact equality if a measured
value is 0) for approval, then records them in PROGRESS "Calibrated tolerances".

**Acceptance:**

- [x] 3a: `enlilRunCount` in the data, snapshot refreshed; PROGRESS logs the ENLIL-ran-without-arrival count
      (39 of 77).
- [x] 3b: tolerances measured, approved and recorded (exact, all three measured 0); `KM_PER_AU` unchanged for every
      importer.
- [x] `npm run check` green for each PR.

---

Tasks 4–10 were planned and run in one go on 2026-10-02: the user authorized finishing the whole phase, merging each
PR once `npm run check` and CI are green, and asked to be told only of failures, critical errors or performance
drops. Each task's section below is written on its own branch, first, and lands with that task's code in one PR.

## Task 4: CME picker + selected-CME store (#101, light)

Branch `phase-6/cme-picker`.

**Decisions:**

1. **One shot at a time.** Selecting a CME clears the selected approach (the camera leaves a followed asteroid for
   Earth, as `clearApproach` does) and selecting an approach clears the CME, so the right column shows one card.
   `src/shell/shotSelection.ts` holds both choices, with injectable targets like `playApproach.ts`.
2. **One selection store.** `ApproachSelection`'s body becomes a generic `SelectionStore<T>`
   (`src/state/selectionStore.ts`); `ApproachSelection` extends it unchanged, `CmeSelection` is the second user.
3. **Where.** The left column, renamed "Events", gets an "Eruptions" panel under the approaches: newest first, with
   each CME's start time (UTC), speed, half-angle and an Earth tag. The right column shows the CME card when a CME
   is selected.
4. **Earth tag (facts from DONKI first).** "Earth arrival predicted" when ENLIL predicts one (decision 2 of Task 3);
   otherwise "Earth inside cone" or "Earth outside cone" from the engine's cone test (Task 2) at `time21_5`, i.e.
   from DONKI's own cone. The card's arrival line: ENLIL's time as fact (UTC, with "glancing blow" / "minor
   impact"), else "ENLIL: no Earth arrival predicted" (`enlilRunCount > 0`) or "No ENLIL run for this CME".
5. **Card (mockup's space-weather card).** Title "Coronal mass ejection", start time; stats: speed (km/s, measured at
   21.5 R☉ at `time21_5`), half-angle (° cone), direction (Stonyhurst "S12 W07": N/S latitude, W positive as DONKI);
   the DONKI link; source line "NASA DONKI (CCMC) · the drawn shell illustrates DONKI's cone model". Watch eruption
   comes with Task 9.
6. The CME dataset joins the data-status pill.

**Files:** `src/state/selectionStore.ts` (+ test), `src/approaches/approachSelection.ts`,
`src/eruptions/cmeSelection.ts`, `cmeFormat.ts` (+ test), `cmeGeometry.ts` (+ test), `cmeCardModel.ts`
(+ test), `CmeList.tsx` (+ test), `CmeCard.tsx` (+ test), `src/shell/shotSelection.ts` (+ test), `App.tsx`,
`styles.css`, `src/test/cmeRow.ts`.

**Tests:** format (UTC text, direction text incl. rounding to 0 → "N00"/"W00", arrival texts for the three cases);
geometry (a cone pointing at Earth contains it, one 90° away does not); card model; list (loading, unavailable,
empty, newest first, `aria-pressed` on the selected row); card (stats, link, arrival line); shot selection (each
choice clears the other).

**Acceptance:**

- [x] Picking a CME shows its card; picking an approach replaces it; the scene runs as before.
- [x] `npm run check` green.

## Task 5: CME particle shell (#102, full code)

Branch `phase-6/cme-shell`. Files in `apps/web/src/scene/eruption/`: `cmeShellLook.ts` (illustrative constants),
`cmeShellSeeds.ts`, `cmeShellGeometry.ts` (the shader's CPU mirror), `cmeShellTiming.ts`, `cmeShellMesh.ts`,
`cmeShell.vert`, `cmeShell.frag`, `CmeShell.tsx`, `CmeScene.tsx` (mounted in `SceneContents` after
`ApproachScene`); a test beside each `.ts`.

**Decisions:**

1. **DONKI's cone model, drawn literally:** a cone from the Sun's centre along the CME axis, capped by a sphere about
   the Sun of radius R(t), the front distance from `cmeFrontDistanceAu` (float64, CPU, once per frame). Every particle
   lies inside the half-angle and no farther out than R: the geometry is DONKI's; brightness, sheath, flanks and
   colour are illustrative (`CME_SHELL_LOOK`).
2. **Axis.** `heliographicToEcliptic(axis, Earth at time21_5)`: DONKI's HEEQ frame is fixed when it measured the CME.
3. **One particle layout** (24,000 seeds, mulberry32 with a fixed seed), so a new CME only rebuilds uniforms.
   Seeds: cap-area fraction u (cos θ = 1 − u (1 − cos α), even over the cap), azimuth, distance as a fraction of R,
   brightness. 25 % flank particles along the cone wall from 0.1 R to the sheath (dim), 25 % on the rim's loop
   (u ≥ 0.85, brightest), 50 % over the cap; the sheath is the outer 12 % of R with squared depth (crowds the front).
4. **Visibility.** Opacity eases in while the front goes from 1 R☉ to 5 R☉ (it is held at 1 R☉ before launch) and
   out between 1.4 and 2 AU.
5. **GPU work is the spread only** (PLAN.md: "an expanding cone shell on the GPU"): the basis (columns x, y, axis in
   scene axes) and cos α are set per CME, R, opacity and the Sun's camera-relative offset per frame. Additive,
   depth-tested, no depth writes, log-depth chunks, as the swarm.

**Vertex shader (`cmeShell.vert`):**

```glsl
// The CME shell's vertex shader: DONKI's cone model, a cone from the Sun's centre capped by a sphere about the Sun.
// cmeShellGeometry.ts mirrors this for the tests; the look constants arrive as uniforms from cmeShellLook.ts.

#include <common>
#include <logdepthbuf_pars_vertex>

attribute vec4 shellSeed; // cap-area fraction, azimuth (rad), distance as a fraction of the front's, brightness

uniform vec3 sunSceneOffsetAu;
uniform mat3 coneBasis;      // columns: x, y, axis (scene axes)
uniform float cosHalfAngle;
uniform float frontDistanceAu;
uniform float sheathFraction;
uniform float sheathBrightness;
uniform float pointSizePx;
uniform float pixelRatio;
uniform vec3 shellColor;

varying vec3 vColor;

void main() {
  // Even over the cap's area: cos θ = 1 − u (1 − cos α).
  float cosTheta = 1.0 - shellSeed.x * (1.0 - cosHalfAngle);
  float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
  vec3 along = vec3(sinTheta * cos(shellSeed.y), sinTheta * sin(shellSeed.y), cosTheta);
  float radiusAu = frontDistanceAu * shellSeed.z;
  vec3 sceneAu = sunSceneOffsetAu + coneBasis * along * radiusAu;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(sceneAu, 1.0);
  gl_PointSize = pointSizePx * pixelRatio;
  // Brightest at the leading edge, fading to `sheathBrightness` at the back of the sheath; the flanks' own dim
  // brightness (seed w) carries on behind it.
  float depthInSheath = clamp((1.0 - shellSeed.z) / sheathFraction, 0.0, 1.0);
  vColor = shellColor * shellSeed.w * mix(1.0, sheathBrightness, depthInSheath);

  // The logarithmic depth buffer is always on; without this, points depth-test against the wrong values.
  #include <logdepthbuf_vertex>
}
```

**Tests:** seeds deterministic and in range, kind shares and front crowding; `coneBasis` orthonormal, right-handed,
z on the axis (fast-check over all directions); every particle of the real layout inside α and within
[0.1 R, R], the widest within 1 % of α, the leading edge exactly R along the axis; the front at 21.5 R☉ at
`time21_5` and at Earth at ENLIL's arrival, measured speed without one, opacity 0 / 1 / 0 before launch, in flight
and far out; the axis at DONKI's angle from Earth (`angleFromEarthRad`); every declared uniform supplied.

**Acceptance:**

- [x] The shell leaves the Sun along the selected CME's direction and expands with the clock (dev app).
- [x] Frame time unchanged: 13.34 ms mean with and without the shell (p95 13.8 / 14.0 ms), 1920 × 809, 75 Hz.
- [x] `npm run check` green.

## Task 6: Sun look (#103, full code)

Branch `phase-6/sun-look`. Files: `apps/web/src/scene/shaders/simplexNoise3d.glsl` (Ashima/Gustavson simplex noise,
MIT, copied with its notice; no npm dependency), `apps/web/src/scene/bodies/sun/` `sunLook.ts` (constants and CPU
mirrors), `sunSurface.vert`/`.frag`, `corona.vert`/`.frag`, `sunMaterials.ts`, `SunBody.tsx` (replaces `Body`'s
`SunSurface`; keeps the point light); tests beside the `.ts` files.

**Decisions:**

1. **Limb darkening** is the linear law I(μ)/I(1) = 1 − u (1 − μ) per channel, u = 0.50 / 0.62 / 0.75 for R/G/B:
   u ≈ 0.6 in visible light and grows toward the blue, so the limb reddens (the per-channel values are illustrative).
2. **Granulation and streamers are illustrative**: three octaves of 3D simplex noise on the unit sphere (surface) and
   angular noise around the limb (streamers). Their motion follows the render clock while the simulation clock plays
   and freezes when it pauses: following the simulated rate would boil the surface at a month per second. This is
   the only scene motion not driven by simulated time, and it carries no data.
3. **Brightness.** The photosphere's centre is (1.5, 1.0, 0.5) linear, mean luminance just above the bloom threshold:
   the first try at the old `SUN_GLOW_COLOR` (4, 3.4, 2.6) washed the close-up to a white blob with no limb or
   granulation. The corona is a camera-facing quad out to 4 R☉ with brightness ∝ r^−2.5 from the limb, below 1, so it
   adds a haze that bloom only lifts near the disc. `SUN_GLOW_COLOR` goes; the Phase 3 bloom test now reads the
   photosphere colour (same assertion: the Sun crosses the threshold).

**Photosphere (`sunSurface.frag`, with the noise chunk prepended):**

```glsl
// The photosphere: linear-law limb darkening per channel (sunLook.ts) times an illustrative granulation from
// three octaves of simplex noise (simplexNoise3d.glsl, prepended). The colour stays above 1 so the disc blooms.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 surfaceColor;
uniform vec3 limbDarkening;
uniform float granulationScale;
uniform float granulationContrast;
uniform float surfacePhase;

varying vec3 vSurfacePoint;
varying vec3 vViewNormal;
varying vec3 vToEye;

float granulation(vec3 point) {
  vec3 flow = vec3(surfacePhase, -0.7 * surfacePhase, 0.4 * surfacePhase);
  float coarse = snoise(point * granulationScale + flow);
  float fine = snoise(point * granulationScale * 2.3 - 1.6 * flow);
  float finest = snoise(point * granulationScale * 5.1 + 2.4 * flow);
  return 0.55 * coarse + 0.3 * fine + 0.15 * finest;
}

void main() {
  #include <logdepthbuf_fragment>
  float mu = clamp(dot(normalize(vViewNormal), normalize(vToEye)), 0.0, 1.0);
  vec3 limb = 1.0 - limbDarkening * (1.0 - mu);
  float mottle = 1.0 + granulationContrast * granulation(vSurfacePoint);
  gl_FragColor = vec4(surfaceColor * limb * mottle, 1.0);
}
```

**Corona (`corona.vert`, `corona.frag`):**

```glsl
// A camera-facing square around the Sun: the corner offset is added in view space, so the quad always faces the
// camera whatever the Sun's orientation. vOffsetRadii is the offset from the Sun's centre in solar radii.

#include <common>
#include <logdepthbuf_pars_vertex>

uniform float sunRadiusAu;
uniform float coronaExtentRadii;

varying vec2 vOffsetRadii;

void main() {
  vOffsetRadii = position.xy * coronaExtentRadii;
  vec4 viewPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  viewPosition.xy += vOffsetRadii * sunRadiusAu;
  gl_Position = projectionMatrix * viewPosition;

  #include <logdepthbuf_vertex>
}
```

```glsl
// The corona: brightness falls as r^-falloff from the limb (sunLook.ts), broken into streamers by angular simplex
// noise (simplexNoise3d.glsl, prepended), and faded to nothing at the quad's edge. Additive and HDR, so bloom
// spreads it. Inside the limb the disc, nearer the camera, hides it.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 coronaColor;
uniform float coronaFalloff;
uniform float coronaExtentRadii;
uniform float streamerContrast;
uniform float surfacePhase;

varying vec2 vOffsetRadii;

void main() {
  #include <logdepthbuf_fragment>
  float radius = length(vOffsetRadii);
  if (radius < 1.0 || radius > coronaExtentRadii) discard;
  vec2 direction = vOffsetRadii / radius;
  float streamers = snoise(vec3(direction * 2.5, 0.15 * surfacePhase));
  float falloff = pow(radius, -coronaFalloff) * (1.0 + streamerContrast * streamers);
  float edgeFade = 1.0 - smoothstep(0.6 * coronaExtentRadii, coronaExtentRadii, radius);
  gl_FragColor = vec4(coronaColor * max(falloff, 0.0) * edgeFade, 1.0);
}
```

**Tests:** limb factor 1 at centre, 1 − u at the limb, coefficients rising to the blue; the centre blooms on average
and a dark granule does not; corona falloff 1 at the limb, 0 inside, falling outward; every declared uniform
supplied for both materials; one phase shared; the noise chunk precedes `main`.

**Acceptance:**

- [x] Close up, the disc shows limb darkening, granulation and a streamered corona; from 3 AU the Sun stays a bright
      point (dev app).
- [x] Frame time 13.34 ms mean at 0.012 AU from the Sun (disc filling the view) and at 3 AU, 1920 × 809, 75 Hz.
- [x] `npm run check` green.

## Task 7: Earth look (#104, full code)

Branch `phase-6/earth-look`. Files: `packages/orbit/src/earthOrientation.ts` (+ test; `heliographic.ts` exports
`OBLIQUITY_J2000_RAD` and `equatorialToEcliptic` for it); `apps/web/public/textures/earth-day-2048.jpg`;
`apps/web/src/scene/bodies/earth/` `earthLook.ts`, `earthSurface.vert`/`.frag`, `atmosphere.vert`/`.frag`,
`earthMaterials.ts`, `earthOrientation.ts`, `earthDayMap.ts`, `EarthBody.tsx`; `Body.tsx`, `SceneCanvas.tsx`.

**Decisions:**

1. **Texture.** NASA Visible Earth, Blue Marble Next Generation with topography and bathymetry, July 2004
   (Reto Stöckli, NASA Earth Observatory; public domain), image record 73751, resized from 5400 × 2700 to
   2048 × 1024 JPEG (478 KB; cap 600 KB). City lights stay in Phase 7, so the night side is the same map dimmed to
   4 % of its luminance and tinted blue, blended across a terminator ±0.1 in cos(Sun angle) (about ±6°).
2. **Orientation is real.** `earthRotationAngleRad` (IAU 2000 B1.8) turns Greenwich from the J2000 equinox about the
   J2000 celestial pole (tilted by the obliquity from ecliptic north): the continents under the Sun are the right ones.
   Precession since J2000 (~0.36°) and UT1 − UTC (< 0.9 s) are ignored; it is drawn only. three.js's sphere maps
   Greenwich to local +x, the pole to +y and 90° E to −z, so the mesh's matrix columns are the body axes in scene
   axes (x = Greenwich, y = pole, z = −east).
3. **Loading.** The map loads once from `SceneCanvas` into a small store (`earthDayMap`), not inside the scene, so
   the scene renders in tests (no DOM) and draws the plain sphere until the map arrives: one React commit.
4. **Atmosphere.** A rim term on the surface (power 5, strongest on the lit limb) and a back-facing halo shell at
   1.03 Earth radii, additive. Earth stays LDR: it never blooms.

**Surface (`earthSurface.frag`):**

```glsl
// Day map lit by the Sun (Lambert), blended across a soft terminator into a dim blue-tinted night side, plus a rim
// glow strongest on the lit limb (earthLook.ts). Output stays below 1, so Earth never blooms.

#include <common>
#include <logdepthbuf_pars_fragment>

uniform sampler2D dayMap;
uniform vec3 sunDirection; // unit, Earth → Sun, scene axes
uniform float twilightWidth;
uniform float dayBrightness;
uniform float nightBrightness;
uniform vec3 nightTint;
uniform vec3 rimColor;
uniform float rimPower;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vToEye;

void main() {
  #include <logdepthbuf_fragment>
  vec3 normal = normalize(vWorldNormal);
  vec3 toEye = normalize(vToEye);
  float sunCosine = dot(normal, sunDirection);
  float daylight = smoothstep(-twilightWidth, twilightWidth, sunCosine);

  vec3 albedo = texture2D(dayMap, vUv).rgb;
  vec3 day = albedo * dayBrightness * max(sunCosine, 0.0);
  float luminance = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
  vec3 night = nightTint * luminance * nightBrightness;

  float rim = pow(1.0 - max(dot(normal, toEye), 0.0), rimPower);
  float rimLit = 0.15 + 0.85 * smoothstep(-0.25, 0.5, sunCosine);
  vec3 color = mix(night, day, daylight) + rimColor * rim * rimLit;
  gl_FragColor = vec4(color, 1.0);
}
```

**Tests:** ERA = 280.46061837504° at J2000.0, period one sidereal day, range [0, 2π); body axes orthonormal,
right-handed, pole at the obliquity; `equatorialToEcliptic` keeps the equinox and tilts the pole; the mesh rotation
puts the map's Greenwich, 90° E and north pole on the body axes (through three.js's sphere mapping), determinant 1;
Sun direction unit and Earth → Sun; terminator blend 0 / ½ / 1; uniforms cover the declarations; the map store loads
once, marks the map sRGB and notifies.

**Acceptance:**

- [x] At 02:33 UTC the day side shows East Asia and Australia (subsolar ≈ 142° E), north up; the night side is dim
      blue with a lit limb (dev app).
- [x] Frame time 13.34 ms mean (p95 14.8 ms) with Earth filling the view, 1920 × 809, 75 Hz.
- [x] `npm run check` green.

## Task 8: Earth impact, illustrative (#105, light)

Branch `phase-6/earth-impact`. Files in `apps/web/src/scene/eruption/impact/`: `impactLook.ts`, `impactTiming.ts`,
`magnetopause.ts`, `magnetopause.vert`/`.frag`, `aurora.vert`/`.frag`, `impactMaterials.ts`, `EarthImpact.tsx`
(mounted by `CmeScene`); tests beside the `.ts` files. `cmeCardModel.ts`: the source line says the magnetosphere and
aurora are illustrative.

**Decisions:**

1. **Only with ENLIL's arrival** (Task 4 decision 4): the impact follows ENLIL's predicted time; a CME without one
   shows the shell only. The level eases in over the 3 h before arrival, peaks at the arrival and fades with an
   18 h e-folding; ENLIL's glancing-blow (× 0.6) and minor-impact (× 0.5) flags soften it.
2. **Magnetopause hint:** the Shue et al. (1998) surface r = r0 (2 / (1 + cos θ))^0.58 to 115° from the nose,
   turned onto the Earth → Sun line each frame; r0 runs from 10 R⊕ (quiet) to 6.6 R⊕ (geosynchronous) with the
   level. Edge-lit, additive, fading toward the open tail; faint (0.08) whenever an Earth-arrival CME is selected,
   up to 0.4 at the peak (1.0 read as fog in the first look).
3. **Aurora:** Gaussian ovals (σ 3°) around both poles of the IGRF-14 dipole (epoch 2025: 80.8° N, 72.6° W), at
   18° colatitude when quiet and 28° at the peak, on the night side only, on a shell 1.5 % above the surface that
   turns with Earth (same rotation as Task 7). The peak colour just crosses the bloom threshold. Flicker runs on the
   render clock while the simulation plays, like the Sun's surface.
4. **Labels:** the CME card's source line reads "… the shell illustrates DONKI's cone model · magnetosphere and
   aurora are illustrative".

**Tests:** strength from ENLIL's flags; level 0 before the rise, ½ midway, the strength at arrival, e^−1 one
e-folding later, 0 days later; the Shue radius (1 at the nose, 2^α at 90°, flaring outward) and every vertex of the
mesh on the surface within 115°; uniforms cover the declarations; the pole at 80.8° N in the mesh frame's western
hemisphere; at the peak the ovals reach 28° and the magnetopause its peak opacity.

**Acceptance:**

- [x] At ENLIL's arrival (CME 2026-09-05T11:09, arrival Sep 7 20:36 UTC) the magnetopause glows, pushed toward Earth
      on the sunward side, and green ovals light the night side (dev app).
- [x] Frame time 13.34 ms mean (p95 13.9 ms) at 9 and 38 R⊕ during the impact, 1920 × 809, 75 Hz.
- [x] `npm run check` green.

## Task 9: Shot choreography (#106, light)

Branch `phase-6/eruption-shot`. Files: `apps/web/src/scene/camera/cameraRig.ts` (flight `direction`),
`directedAim.ts` (+ test; `ChaseAim` now delegates to it), `CameraRigUpdater.tsx`;
`apps/web/src/scene/eruption/eruptionShot.ts` (+ test), `eruptionPlayback.ts` (+ test), `eruptionSequence.ts`,
`EruptionDirector.tsx` (mounted first in `SceneContents`); `apps/web/src/eruptions/watchEruption.ts` (+ test),
`CmeCard.tsx` (Watch eruption); `apps/web/src/scene/markers/FixedSizeMarker.tsx` (moved out of `ApproachScene`).

**Decisions:**

1. **Three beats on the simulation clock**, each a span of DONKI/ENLIL time played in fixed real seconds, so every
   CME plays in about the same time whatever its speed: _burst_ from an hour before the front leaves the
   photosphere until it is at 0.15 AU (8 s; camera on the Sun at 0.3 AU, side-on to the CME axis, 25° up);
   _cruise_ until 4 h before ENLIL's arrival (12 s; Sun at 2.6 AU, side-on to the Sun–Earth line, 35° up);
   _impact_ from 4 h before to 14 h after the arrival (10 s; Earth at 30 R⊕, side-on to the Sun line so the
   terminator, magnetopause and night side all show, 20° up). Without ENLIL's arrival the cruise runs until the
   front is 0.2 AU past Earth's distance and there is no impact beat.
2. **Directed flights.** `FlightRequest.direction` (unit, focus → camera, scene axes) is blended in over the flight
   by `DirectedAim`, the start-capture-and-slerp that `ChaseAim` already did; without it flights keep the camera's
   direction as before. "Side-on" views are exactly perpendicular to their line, raised toward ecliptic north
   (scene x for a near-polar line).
3. **The director** (`EruptionSequence`) runs before the clock each frame: entering a beat sets its rate and flies its
   camera once. At the end the clock pauses on the last frame; pausing, scrubbing before the shot or picking
   something else hands control back. Rates change at beat edges without easing.
4. **Earth marker.** The approach shot's fixed-size Earth marker moves to `scene/markers/` and is drawn while a CME is
   selected: from the cruise's 2.6 AU, Earth is otherwise a pixel lost in the swarm.

**Tests:** the rig keeps a flight's direction until the next flight; `DirectedAim` starts at the camera, ends on the
direction and recaptures per flight; the shot's beats are contiguous from an hour before launch, the impact beat
brackets ENLIL's arrival at Earth, each beat lasts its real seconds, the burst ends with the front at 0.15 AU (to
1e-9 AU: JD resolution), no-arrival shots end 0.2 AU past Earth; `beatIndexAt` and −1 outside; `sideView` is unit
and perpendicular (fast-check); the sequence flies once per beat, pauses at the end and hands back on pause, scrub
or another selection; Watch eruption selects, sets the clock and starts the shot; the card's button watches its CME.

**Acceptance:**

- [x] Watch eruption on CME 2026-09-05T11:09 plays burst → cruise → impact and pauses at arrival + 14 h (dev app).
- [x] Frame time over the whole 30 s shot (44 s recorded): 13.34 ms mean, p95 13.9 ms, p99 14.3 ms, one frame of
      26.5 ms (during a screenshot capture), 1920 × 809, 75 Hz.
- [x] `npm run check` green.

## Task 10: Exit verification (#107, light)

Branch `phase-6/exit-verification`. Files: `apps/web/src/scene/eruption/cmeExitCheck.test.ts`; `PROGRESS.md`.

**Checks:**

1. **Geometry and timing vs DONKI, every recorded CME** (77; 13 with an ENLIL arrival), through the app's drawing
   path: the shell axis's angle from Earth equals DONKI's (`angleFromEarthRad`); the shell (the real 24,000-seed
   layout, CPU mirror of the shader) never leaves DONKI's half-angle and fills it; the front is at 21.5 R☉ at
   `time21_5` and at Earth at ENLIL's arrival; the card shows DONKI's speed and half-angle verbatim; the shot's
   impact beat brackets ENLIL's arrival and is absent without one. Tolerances measured first, then measured × 1.25
   (exact where 0): 5.6e-16 rad, widest ≥ 0.9999895 α, exact timing.
2. **≥ 60 fps for the full sequence:** Watch eruption on a CME with an ENLIL arrival and one without, frame times
   recorded with `requestAnimationFrame` from the click to after the shot ends (dev console only).
3. **Release:** tag `v0.6.0` on the merge commit once CI on `main` is green, with five stills; close the milestone.

**Acceptance:**

- [x] All 77 CMEs pass the exit check.
- [x] Run A (1,323 km/s, ENLIL arrival): 13.34 ms mean, max 14.4 ms, none over 16.7 ms; run B (no arrival):
      13.34 ms mean, max 14.4 ms, none over 16.7 ms; 1920 × 809, 75 Hz.
- [x] `npm run check` green.
