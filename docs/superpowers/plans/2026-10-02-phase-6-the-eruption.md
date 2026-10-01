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
| 1b  | Strict times, http(s) links, ENLIL arrival | #85   | light     | 🟨 in review  |
| 2   | Engine: CME direction and Earth-in-cone    | #99   | full code | ✅ #115, #116 |
| 3   | Engine: CME kinematics and arrival         | #100  | full code | 🟨 3a review  |
| 4   | CME picker + selected-CME store            | #101  | light     | written later |
| 5   | CME particle shell                         | #102  | full code | written later |
| 6   | Sun look                                   | #103  | full code | written later |
| 7   | Earth look                                 | #104  | full code | written later |
| 8   | Earth impact (illustrative)                | #105  | light     | written later |
| 9   | Shot choreography                          | #106  | light     | written later |
| 10  | Exit verification                          | #107  | light     | written later |

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
- [ ] 3b: tolerances measured, approved and recorded; `KM_PER_AU` unchanged for every importer.
- [ ] `npm run check` green for each PR.
