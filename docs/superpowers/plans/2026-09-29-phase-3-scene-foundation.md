# Phase 3: Scene Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A navigable, correctly scaled solar system (Sun, 8 planets, orbit lines) driven by the orbit engine,
with one time source the user can play, speed up, scrub and reset to "now", a camera that can fly between
bodies, and bloom + tone mapping in place.

**Architecture:** Everything that moves is computed on the CPU in float64 and written into three.js objects
from `useFrame` callbacks, never through React state. Each frame runs in a fixed order set by `useFrame`
priorities: the time store advances, the engine fills a float64 table of body positions, the camera rig picks
the float64 **scene origin** (the focused body, or a point on a flight path), and every object writes
`position − origin` into its three.js transform. Because the subtraction happens in float64 and the focused
body sits at exactly (0, 0, 0), zooming onto Earth at 1 AU cannot jitter. React only renders the HTML controls
(at most 4 Hz for the date readout) and re-renders the scene when the focus changes.

**Tech Stack:** TypeScript 6 (strict, ESM), React 19, three 0.186, @react-three/fiber 9.8, @react-three/drei 10.7,
@react-three/postprocessing 3.1 + postprocessing 6.39 (new), @react-three/test-renderer 9.1 (new, dev), Vitest 5,
fast-check.

**Spec:** `PLAN.md` § Phase 3, plus decisions approved while planning (2026-09-29):

1. **Focus-relative floating origin.** The scene origin is the float64 position of the camera's focus; objects
   are drawn at `position − origin`, subtracted in float64. OrbitControls always target (0, 0, 0).
2. **Axes.** Ecliptic (x, y, z) → three.js (x, z, −y): right-handed, ecliptic north is screen-up. Only
   `sceneFrame.ts` does this mapping.
3. **Sizes.** True IAU mean radii, plus a fixed 3 px marker per body so every body stays visible from afar.
4. **Earth** is drawn at the Earth–Moon barycentre (what Standish gives), ≈ 4,670 km from Earth's centre.
5. **Time store.** Hand-written, no dependency. The frame loop reads and advances it without notifying React;
   the UI polls at 4 Hz and is notified on user actions. Speed runs from real time (1/86,400 d/s) to 10 yr/s on
   a log slider. Time is clamped to Standish Table 1's 1800–2050 range and pauses at the end.
6. **UTC display.** Add `jdUtcFromJdTdb` to `packages/orbit` (inverse of `jdTdbFromJdUtc`, round-trip tested).
   _Refinement found while planning:_ UTC with leap seconds only exists from 1972, and the engine's conversion
   throws before that, so dates before 1972-01-01 are shown in TDB and labelled "TDB".
7. **Camera.** drei `OrbitControls` around (0, 0, 0) plus our own `flyTo({ focus, distanceAu?, durationSeconds? })`,
   which eases the float64 origin toward the target's current position and the distance in log space. Focus is
   picked from a list or by clicking a planet.
8. **Postprocessing.** `@react-three/postprocessing`: bloom with threshold 1 (only HDR colours, i.e. the Sun) and
   ACES filmic tone mapping; the renderer itself does no tone mapping (`<Canvas flat>`).
9. **"Nothing per-frame through React state"** is enforced by a test that runs the scene for 120 frames under a
   React `Profiler` and expects zero commits.

## Global Constraints

- No AI/LLM calls anywhere in shipped code.
- Tests never touch the network. Phase 3 loads no NASA/JPL data at all.
- `packages/orbit` keeps zero runtime dependencies and no DOM/Node APIs (Task 2 is its only change).
- World unit = 1 AU. Positions are heliocentric ecliptic J2000 in float64 until `sceneFrame.ts` writes them into
  three.js; nothing else subtracts the origin or maps axes.
- Never drive per-frame animation through React state: `useFrame` + refs only, ordered by `FRAME_PRIORITY`
  (`apps/web/src/scene/framePriorities.ts`). Negative priorities only; a positive priority would take over
  rendering from R3F.
- The logarithmic depth buffer stays on (`RENDERER_PARAMETERS`).
- Nothing in Phase 3 shows a distance, speed or other number as a fact. The date readout comes from the
  engine's time-scale conversion. Planet colours and marker dots are illustrative.
- New dependencies, exactly: `@react-three/postprocessing@^3.1.3`, `postprocessing@^6.39.5` (its peer range is
  `three >=0.168.0 <0.187.0`, so it pins three below 0.187), `@react-three/test-renderer@^9.1.1` (dev).
- TypeScript strict, ESM, no `any`, units in names (`jdTdb`, `distanceAu`, `radiusKm`, `rateDaysPerSecond`).
- Functions < 20 lines, ≤ 2 arguments (wrap 3+ in an object; an optional trailing `out` follows the engine's
  convention), `try/catch` isolated in its own function.
- **Guardrails (CLAUDE.md):** at most 2 tool loops per turn before pausing. If a command fails unexpectedly, stop,
  show the output, and hand back. "Run it to see it fail" steps are expected failures; anything else is not.
  No full-file rewrites of existing files.
- **Per-task workflow:** branch `phase-3/<name>` off an up-to-date `main` (if the previous task's PR is not merged
  yet, branch off that branch and say so in the PR). Finish with `npm run format && npm run check` green, tick the
  item in `PROGRESS.md` and add the listed decisions, commit (functional description only, no trailers), push,
  `gh pr create --assignee @me --milestone "Phase 3: Scene foundation" --label <labels>` with `Closes #N` in a
  plain-English body, add the PR to project 1 and set the issue to In Progress. The user merges.

## Review Focus

1. **A tab resumed after minutes in the background:** R3F's next frame delta is huge. The simulation must not
   jump years ahead: `advanceTime` caps a frame at 0.1 s (Task 2 test).
2. **Playing into 2050, scrubbing or "Now" outside 1800–2050:** time clamps to the range and playback pauses at
   the end instead of extrapolating Standish beyond its fit (Task 2 tests).
3. **Dates before 1972:** the readout must show a TDB date, never throw inside the UI (Task 4 test).
4. **Picking a new focus mid-flight:** the new flight starts from the current in-between pose; the camera must not
   snap (Task 5 test).
5. **Zooming into a planet:** the camera stops at 1.5 radii and the near plane (1e-6 AU) never clips the surface
   (Task 5 test).

---

### Task 0: Tracking setup (after plan approval)

**Files:**

- Modify: `PROGRESS.md` (Phase 3 checklist, status)

- [ ] **Step 1: Replace the Phase 3 checklist in `PROGRESS.md`** (one line per task below, so one issue each):

```markdown
## Phase 3: Scene foundation

- [ ] Floating origin (float64, focus-relative) + ecliptic → scene axes; logarithmic depth buffer kept
- [ ] Time store (the single time source) + `jdUtcFromJdTdb`
- [ ] Sun, 8 planets from the engine, orbit lines
- [ ] Time controls: play/pause, speed (real time → 10 yr/s), scrub, "now"
- [ ] Camera rig: orbit controls, focus, scripted `flyTo`
- [ ] Postprocessing: bloom + tone mapping
- [ ] Render-loop test: nothing per-frame goes through React state
```

Also set `**Current phase:** Phase 3: Scene foundation (in progress)` and the status table row to `🟨 In progress`.

- [ ] **Step 2: The milestone `Phase 3: Scene foundation` already exists (open, empty).** Do not create another.

- [ ] **Step 3: Create one issue per checklist item** and add each to the board:

| Title                                                        | Labels                                           |
| ------------------------------------------------------------ | ------------------------------------------------ |
| Floating origin + ecliptic → scene axes                      | `type:feature`,`phase:3`,`area:web`              |
| Time store (the single time source) + `jdUtcFromJdTdb`       | `type:feature`,`phase:3`,`area:web`,`area:orbit` |
| Sun, 8 planets from the engine, orbit lines                  | `type:feature`,`phase:3`,`area:web`              |
| Time controls: play/pause, speed, scrub, "now"               | `type:feature`,`phase:3`,`area:web`              |
| Camera rig: orbit controls, focus, scripted `flyTo`          | `type:feature`,`phase:3`,`area:web`              |
| Postprocessing: bloom + tone mapping                         | `type:feature`,`phase:3`,`area:web`              |
| Render-loop test: nothing per-frame goes through React state | `type:test`,`phase:3`,`area:web`                 |

```bash
URL=$(gh issue create --title "<title>" --body "<one-paragraph scope from this plan>" \
  --label "<labels>" --milestone "Phase 3: Scene foundation")
gh project item-add 1 --owner rvpanoz --url "$URL"
```

Set each item's Status to Todo (`gh project field-list 1 --owner rvpanoz --format json` gives the field and
option ids for `gh project item-edit`).

- [ ] **Step 4: Commit the plan and PROGRESS on `phase-3/plan`, open a `type:docs` PR** (`phase:3`, `area:infra`).

```bash
git add docs/superpowers/plans/2026-09-29-phase-3-scene-foundation.md PROGRESS.md
git commit -m "Add the Phase 3 scene foundation plan and expand its checklist"
git push -u origin phase-3/plan
```

---

### Task 1: Floating origin + ecliptic → scene axes

Branch: `phase-3/floating-origin`.

**Changes agreed in review (2026-09-29):** (1) also add `fast-check@^4.10.2` to `apps/web` devDependencies:
web tests in Tasks 1–5 import it and only `packages/orbit` declared it; (2) the axis-mapping comment is a module-level
comment and `SceneVectorTarget` has its own one-line doc. **Found while running:** unary minus turned 0 into −0,
which failed the axis test's `toEqual`, so the negated axis is written as a subtraction (code below updated).

**Files:**

- Create: `apps/web/src/scene/sceneFrame.ts`
- Test: `apps/web/src/scene/sceneFrame.test.ts`
- Modify: `apps/web/package.json` (add `"@perihelion/orbit": "^0.0.0"` to `dependencies`)

**Interfaces:**

- Consumes: `Vector3` from `@perihelion/orbit` (`[number, number, number]`).
- Produces:
  - `setSceneOrigin(positionAu: Readonly<Vector3>): void`
  - `sceneOrigin(): Readonly<Vector3>`
  - `writeSceneOffset<T extends SceneVectorTarget>(positionAu: Readonly<Vector3>, out: T): T` (hot path, no allocation)
  - `sceneAxesFromEcliptic(eclipticAu: Readonly<Vector3>): Vector3` (allocates; for buffers built rarely)
  - `interface SceneVectorTarget { set(x: number, y: number, z: number): unknown }` (three's `Vector3` fits)

- [ ] **Step 1: Add the engine dependency**

Add `"@perihelion/orbit": "^0.0.0"` to `apps/web/package.json` `dependencies` (alphabetical, before
`@react-three/drei`), then run `npm i`. Expected: no new packages downloaded; the workspace link is added.

- [ ] **Step 2: Write the failing test** `apps/web/src/scene/sceneFrame.test.ts`

```ts
import fc from 'fast-check';
import { Vector3 as ThreeVector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { sceneAxesFromEcliptic, sceneOrigin, setSceneOrigin, writeSceneOffset } from './sceneFrame';

const positionWithin50Au = fc.tuple(
  fc.double({ min: -50, max: 50, noNaN: true }),
  fc.double({ min: -50, max: 50, noNaN: true }),
  fc.double({ min: -50, max: 50, noNaN: true }),
);

describe('scene frame', () => {
  afterEach(() => setSceneOrigin([0, 0, 0]));

  it('puts ecliptic north on scene up and ecliptic +y on scene −z', () => {
    expect(sceneAxesFromEcliptic([0, 0, 1])).toEqual([0, 1, 0]);
    expect(sceneAxesFromEcliptic([0, 1, 0])).toEqual([0, 0, -1]);
    expect(sceneAxesFromEcliptic([1, 0, 0])).toEqual([1, 0, 0]);
  });

  it('draws the origin body at exactly (0, 0, 0)', () => {
    const earthAu: [number, number, number] = [0.9833, 0.1734, -0.0000123];
    setSceneOrigin(earthAu);
    expect(writeSceneOffset(earthAu, new ThreeVector3()).length()).toBe(0);
  });

  it('keeps sub-metre precision 100 km from a focus 1 AU from the Sun', () => {
    // 100 km ≈ 6.7e-7 AU. Subtracting after a float32 cast would lose ~1e-8 AU (≈ 1.5 km) here.
    const focusAu: [number, number, number] = [0.9833, 0.1734, 0];
    const nearbyAu: [number, number, number] = [focusAu[0] + 6.7e-7, focusAu[1], focusAu[2]];
    setSceneOrigin(focusAu);
    const offsetX = writeSceneOffset(nearbyAu, new ThreeVector3()).x;
    const metrePerAu = 1 / 149_597_870_700;
    expect(Math.abs(Math.fround(offsetX) - (nearbyAu[0] - focusAu[0]))).toBeLessThan(metrePerAu);
  });

  it('writes position − origin in scene axes for any position and origin', () => {
    fc.assert(
      fc.property(positionWithin50Au, positionWithin50Au, (positionAu, originAu) => {
        setSceneOrigin(originAu);
        const offset = writeSceneOffset(positionAu, new ThreeVector3());
        const expected = sceneAxesFromEcliptic([
          positionAu[0] - originAu[0],
          positionAu[1] - originAu[1],
          positionAu[2] - originAu[2],
        ]);
        expect(offset.toArray()).toEqual(expected);
      }),
    );
  });

  it('copies the origin instead of keeping the caller’s array', () => {
    const originAu: [number, number, number] = [1, 2, 3];
    setSceneOrigin(originAu);
    originAu[0] = 99;
    expect(sceneOrigin()).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run apps/web/src/scene/sceneFrame.test.ts`
Expected: FAIL, cannot resolve `./sceneFrame`.

- [ ] **Step 4: Implement** `apps/web/src/scene/sceneFrame.ts`

```ts
import type { Vector3 } from '@perihelion/orbit';

// Scene space is three.js Y-up; the engine's heliocentric ecliptic J2000 is Z-up. Ecliptic (x, y, z) maps to
// scene (x, z, −y): a rotation of −90° about x, so the frame stays right-handed and ecliptic north is
// screen-up. `writeSceneOffset` and `sceneAxesFromEcliptic` are the only places that apply it. The negated axis
// is written as a subtraction because unary minus turns 0 into −0.

/** Anything shaped like three.js `Vector3.set`, so hot paths write straight into an object's position. */
export interface SceneVectorTarget {
  set(x: number, y: number, z: number): unknown;
}

/** The float64 heliocentric point drawn at the scene origin: the camera's focus. */
const sceneOriginAu: Vector3 = [0, 0, 0];

export function setSceneOrigin(positionAu: Readonly<Vector3>): void {
  sceneOriginAu[0] = positionAu[0];
  sceneOriginAu[1] = positionAu[1];
  sceneOriginAu[2] = positionAu[2];
}

export function sceneOrigin(): Readonly<Vector3> {
  return sceneOriginAu;
}

/**
 * Writes `positionAu − origin` in scene axes. The subtraction happens in float64, before three.js hands the
 * value to float32 GPU buffers, so objects near the focus keep sub-metre precision even 30 AU from the Sun.
 */
export function writeSceneOffset<T extends SceneVectorTarget>(
  positionAu: Readonly<Vector3>,
  out: T,
): T {
  const [originX, originY, originZ] = sceneOriginAu;
  out.set(positionAu[0] - originX, positionAu[2] - originZ, originY - positionAu[1]);
  return out;
}

export function sceneAxesFromEcliptic(eclipticAu: Readonly<Vector3>): Vector3 {
  return [eclipticAu[0], eclipticAu[2], 0 - eclipticAu[1]];
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run apps/web/src/scene/sceneFrame.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Finish** (per-task workflow). Checklist item 1. PROGRESS decisions:
  - Scene origin = the camera focus, float64; objects draw at `position − origin`, subtracted in float64.
  - Ecliptic (x, y, z) → scene (x, z, −y); only `sceneFrame.ts` maps axes.

Commit: `Add the float64 scene origin and the ecliptic to scene axis mapping`.

---

### Task 2: Time store (the single time source) + `jdUtcFromJdTdb`

Branch: `phase-3/time-store`.

**Changes agreed in review (2026-09-29):** (1) `clamp` takes `(value, bounds: { min, max })` instead of three
arguments; the bounds are module constants, so `advanceTime` still allocates nothing per frame; (2) the new engine
tests compare with `Math.abs(diff) < 1e-8` days (≈ 0.9 ms) instead of `toBeCloseTo(…, 9)`, whose 5e-10 d bound is
barely one float64 step at JD 2.4e6. Code below updated.

**Files:**

- Modify: `packages/orbit/src/time.ts` (add `jdUtcFromJdTdb`; share the TT − UTC offset helper)
- Test: `packages/orbit/src/time.test.ts` (add cases)
- Create: `apps/web/src/time/timeController.ts`, `apps/web/src/time/timeStore.ts`
- Create: `apps/web/src/scene/framePriorities.ts`, `apps/web/src/scene/SimulationClock.tsx`
- Test: `apps/web/src/time/timeController.test.ts`, `apps/web/src/time/timeStore.test.ts`,
  `apps/web/src/scene/framePriorities.test.ts`
- Modify: `apps/web/src/scene/SceneCanvas.tsx` (mount `<SimulationClock />`)

**Interfaces:**

- Consumes: `jdTdbFromJdUtc`, `jdUtcFromUnixMs`, `STANDISH_TABLE_1_VALID_JD_TDB` from `@perihelion/orbit`.
- Produces:
  - Engine: `jdUtcFromJdTdb(jdTdb: number): number` (throws `RangeError` before 1972-01-01 UTC)
  - `interface TimeState { jdTdb: number; rateDaysPerSecond: number; playing: boolean }`
  - `TIME_RANGE_JD_TDB`, `RATE_LIMITS_DAYS_PER_SECOND = { min, max }`, `DEFAULT_RATE_DAYS_PER_SECOND = 1`,
    `MAX_FRAME_SECONDS = 0.1`
  - `jdTdbFromUnixMs(unixMs: number): number`, `clampJdTdb(jdTdb: number): number`,
    `clampRate(rateDaysPerSecond: number): number`, `advanceTime(state: TimeState, elapsedSeconds: number): void`
  - `class TimeStore` with `state`, `tick`, `setPlaying`, `setRate`, `scrubTo`, `jumpToNow`, `subscribe`;
    the app-wide instance `timeStore`
  - `FRAME_PRIORITY = { clock: -3, bodyPositions: -2, cameraRig: -1, sceneObjects: 0 }`

- [ ] **Step 1: Write the failing engine tests** (append to `packages/orbit/src/time.test.ts`; add
      `jdUtcFromJdTdb` to the existing import from `./time`)

```ts
describe('jdUtcFromJdTdb', () => {
  // 1e-8 d ≈ 0.9 ms: a few float64 steps at JD 2.4e6 (4.7e-10 d each), far below the 1 s leap-second scale.
  const ROUND_TRIP_TOLERANCE_DAYS = 1e-8;

  it('undoes the 69.184 s TT − UTC offset in force from 2017-01-01', () => {
    const jdUtc = jdAt({ year: 2017, month: 1, day: 1 });
    const back = jdUtcFromJdTdb(jdUtc + 69.184 / SECONDS_PER_DAY);
    expect(Math.abs(back - jdUtc)).toBeLessThan(ROUND_TRIP_TOLERANCE_DAYS);
  });

  it('uses the old offset for the last second before a leap second', () => {
    const jdUtc = jdAt({ year: 2016, month: 12, day: 31, hour: 23, minute: 59, second: 59 });
    const back = jdUtcFromJdTdb(jdUtc + 68.184 / SECONDS_PER_DAY);
    expect(Math.abs(back - jdUtc)).toBeLessThan(ROUND_TRIP_TOLERANCE_DAYS);
  });

  it('round-trips jdTdbFromJdUtc from 1972 to 2100', () => {
    const unixMs = fc.integer({ min: Date.UTC(1972, 0, 2), max: Date.UTC(2100, 0, 1) });
    fc.assert(
      fc.property(unixMs, (ms) => {
        const jdUtc = jdUtcFromUnixMs(ms);
        const back = jdUtcFromJdTdb(jdTdbFromJdUtc(jdUtc));
        expect(Math.abs(back - jdUtc)).toBeLessThan(ROUND_TRIP_TOLERANCE_DAYS);
      }),
    );
  });

  it('refuses TDB before UTC had leap seconds', () => {
    expect(() => jdUtcFromJdTdb(jdAt({ year: 1971, month: 6, day: 1 }))).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run packages/orbit/src/time.test.ts`
Expected: FAIL, `jdUtcFromJdTdb` is not exported.

- [ ] **Step 3: Implement in `packages/orbit/src/time.ts`** (replace the body of `jdTtFromJdUtc`; add the rest
      after `jdTdbFromJdUtc`)

```ts
export function jdTtFromJdUtc(jdUtc: number): number {
  return jdUtc + ttMinusUtcDays(jdUtc);
}
```

```ts
/**
 * Inverse of `jdTdbFromJdUtc`. TT − UTC depends on UTC, the unknown, so estimate UTC with the offset at the
 * TDB instant, then correct once. The estimate can only be one leap second off (within ~69 s after a step),
 * and re-reading the offset at the estimate lands on the correct side of the step in both cases.
 * Throws a RangeError before 1972-01-01 UTC, like `taiMinusUtcSeconds`.
 */
export function jdUtcFromJdTdb(jdTdb: number): number {
  const estimateJdUtc = jdTdb - ttMinusUtcDays(jdTdb);
  return jdTdb - ttMinusUtcDays(estimateJdUtc);
}

function ttMinusUtcDays(jdUtc: number): number {
  return (taiMinusUtcSeconds(jdUtc) + TT_MINUS_TAI_SECONDS) / SECONDS_PER_DAY;
}
```

Run: `npx vitest run packages/orbit/src/time.test.ts`
Expected: PASS (all old and 4 new tests).

- [ ] **Step 4: Write the failing web tests**

`apps/web/src/time/timeController.test.ts`:

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  MAX_FRAME_SECONDS,
  RATE_LIMITS_DAYS_PER_SECOND,
  TIME_RANGE_JD_TDB,
  type TimeState,
  advanceTime,
  clampJdTdb,
  clampRate,
} from './timeController';

const J2000_JD_TDB = 2_451_545;

function playingAt(jdTdb: number, rateDaysPerSecond = 1): TimeState {
  return { jdTdb, rateDaysPerSecond, playing: true };
}

describe('advanceTime', () => {
  it('moves by elapsed seconds × rate while playing', () => {
    const state = playingAt(J2000_JD_TDB, 2);
    advanceTime(state, 0.05);
    expect(state.jdTdb).toBeCloseTo(J2000_JD_TDB + 0.1, 12);
  });

  it('does nothing while paused', () => {
    const state = { ...playingAt(J2000_JD_TDB), playing: false };
    advanceTime(state, 0.05);
    expect(state.jdTdb).toBe(J2000_JD_TDB);
  });

  it('caps a long frame, so a tab resumed after minutes does not leap ahead', () => {
    const state = playingAt(J2000_JD_TDB, 1);
    advanceTime(state, 300);
    expect(state.jdTdb).toBeCloseTo(J2000_JD_TDB + MAX_FRAME_SECONDS, 12);
  });

  it('ignores negative and non-finite frame times', () => {
    for (const elapsedSeconds of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const state = playingAt(J2000_JD_TDB);
      advanceTime(state, elapsedSeconds);
      expect(state.jdTdb).toBe(J2000_JD_TDB);
    }
  });

  it('stops and pauses at the end of the valid range', () => {
    const state = playingAt(TIME_RANGE_JD_TDB.endJdTdb - 1, RATE_LIMITS_DAYS_PER_SECOND.max);
    advanceTime(state, MAX_FRAME_SECONDS);
    expect(state).toMatchObject({ jdTdb: TIME_RANGE_JD_TDB.endJdTdb, playing: false });
  });
});

describe('clamps', () => {
  it('keeps any date inside 1800–2050', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), (jdTdb) => {
        const clamped = clampJdTdb(jdTdb);
        expect(clamped).toBeGreaterThanOrEqual(TIME_RANGE_JD_TDB.startJdTdb);
        expect(clamped).toBeLessThanOrEqual(TIME_RANGE_JD_TDB.endJdTdb);
      }),
    );
  });

  it('keeps the rate between real time and 10 years per second', () => {
    expect(clampRate(0)).toBe(1 / 86_400);
    expect(clampRate(1e9)).toBe(3_652.5);
    expect(clampRate(1)).toBe(1);
  });
});
```

`apps/web/src/time/timeStore.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { TIME_RANGE_JD_TDB } from './timeController';
import { TimeStore } from './timeStore';

const J2000_JD_TDB = 2_451_545;

function createStore(nowUnixMs = () => Date.UTC(2026, 8, 29)) {
  return new TimeStore({
    initial: { jdTdb: J2000_JD_TDB, rateDaysPerSecond: 1, playing: true },
    nowUnixMs,
  });
}

describe('TimeStore', () => {
  it('advances on tick without notifying (the frame loop never wakes React)', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.tick(0.05);
    expect(store.state.jdTdb).toBeCloseTo(J2000_JD_TDB + 0.05, 12);
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies on every user action', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setPlaying(false);
    store.setRate(10);
    store.scrubTo(J2000_JD_TDB + 100);
    store.jumpToNow();
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('clamps scrubbing and rates', () => {
    const store = createStore();
    store.scrubTo(0);
    store.setRate(-5);
    expect(store.state.jdTdb).toBe(TIME_RANGE_JD_TDB.startJdTdb);
    expect(store.state.rateDaysPerSecond).toBe(1 / 86_400);
  });

  it('jumps to now from the injected clock, clamped to 2050', () => {
    const store = createStore(() => Date.UTC(2017, 0, 1));
    store.jumpToNow();
    expect(store.state.jdTdb).toBeCloseTo(2_457_754.5 + 69.184 / 86_400, 9);
    const future = createStore(() => Date.UTC(2080, 0, 1));
    future.jumpToNow();
    expect(future.state.jdTdb).toBe(TIME_RANGE_JD_TDB.endJdTdb);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.setPlaying(false);
    expect(listener).not.toHaveBeenCalled();
  });
});
```

`apps/web/src/scene/framePriorities.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FRAME_PRIORITY } from './framePriorities';

describe('frame priorities', () => {
  it('run time → body positions → camera rig → scene objects', () => {
    const { clock, bodyPositions, cameraRig, sceneObjects } = FRAME_PRIORITY;
    expect(clock).toBeLessThan(bodyPositions);
    expect(bodyPositions).toBeLessThan(cameraRig);
    expect(cameraRig).toBeLessThan(sceneObjects);
  });

  it('never take over rendering (R3F does that for priorities above 0)', () => {
    for (const priority of Object.values(FRAME_PRIORITY)) expect(priority).toBeLessThanOrEqual(0);
  });
});
```

- [ ] **Step 5: Run them to verify they fail**

Run: `npx vitest run apps/web/src/time apps/web/src/scene/framePriorities.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 6: Implement**

`apps/web/src/time/timeController.ts`:

```ts
import { STANDISH_TABLE_1_VALID_JD_TDB, jdTdbFromJdUtc, jdUtcFromUnixMs } from '@perihelion/orbit';

const SECONDS_PER_DAY = 86_400;
const DAYS_PER_JULIAN_YEAR = 365.25;

interface Bounds {
  min: number;
  max: number;
}

/** Planet positions come from Standish Table 1, fitted to 1800–2050; outside it they are extrapolations. */
export const TIME_RANGE_JD_TDB = STANDISH_TABLE_1_VALID_JD_TDB;

export const RATE_LIMITS_DAYS_PER_SECOND = {
  min: 1 / SECONDS_PER_DAY,
  max: 10 * DAYS_PER_JULIAN_YEAR,
} as const satisfies Bounds;

export const DEFAULT_RATE_DAYS_PER_SECOND = 1;

/**
 * Longest frame counted as elapsed time. R3F reports the whole gap after a backgrounded tab or a debugger
 * pause as one frame; counting it would jump the simulation by up to years.
 */
export const MAX_FRAME_SECONDS = 0.1;

const JD_TDB_BOUNDS: Bounds = {
  min: TIME_RANGE_JD_TDB.startJdTdb,
  max: TIME_RANGE_JD_TDB.endJdTdb,
};
const FRAME_SECONDS_BOUNDS: Bounds = { min: 0, max: MAX_FRAME_SECONDS };

export interface TimeState {
  jdTdb: number;
  rateDaysPerSecond: number;
  playing: boolean;
}

export function jdTdbFromUnixMs(unixMs: number): number {
  return jdTdbFromJdUtc(jdUtcFromUnixMs(unixMs));
}

export function clampJdTdb(jdTdb: number): number {
  return clamp(jdTdb, JD_TDB_BOUNDS);
}

export function clampRate(rateDaysPerSecond: number): number {
  return clamp(rateDaysPerSecond, RATE_LIMITS_DAYS_PER_SECOND);
}

/** Runs every frame, so it mutates in place instead of allocating. Pauses at the end of the range. */
export function advanceTime(state: TimeState, elapsedSeconds: number): void {
  if (!state.playing) return;
  const frameSeconds = Number.isFinite(elapsedSeconds)
    ? clamp(elapsedSeconds, FRAME_SECONDS_BOUNDS)
    : 0;
  state.jdTdb = clampJdTdb(state.jdTdb + frameSeconds * state.rateDaysPerSecond);
  if (state.jdTdb === TIME_RANGE_JD_TDB.endJdTdb) state.playing = false;
}

function clamp(value: number, bounds: Readonly<Bounds>): number {
  return Math.min(Math.max(value, bounds.min), bounds.max);
}
```

`apps/web/src/time/timeStore.ts`:

```ts
import {
  DEFAULT_RATE_DAYS_PER_SECOND,
  type TimeState,
  advanceTime,
  clampJdTdb,
  clampRate,
  jdTdbFromUnixMs,
} from './timeController';

export interface TimeStoreOptions {
  initial: TimeState;
  nowUnixMs?: () => number;
}

/**
 * The single time source. The frame loop reads `state` and calls `tick` without notifying anyone; user actions
 * notify subscribers so the controls update at once instead of on their next 4 Hz poll.
 */
export class TimeStore {
  readonly #state: TimeState;
  readonly #nowUnixMs: () => number;
  readonly #listeners = new Set<() => void>();

  constructor(options: TimeStoreOptions) {
    this.#state = { ...options.initial, jdTdb: clampJdTdb(options.initial.jdTdb) };
    this.#nowUnixMs = options.nowUnixMs ?? Date.now;
  }

  get state(): Readonly<TimeState> {
    return this.#state;
  }

  tick(elapsedSeconds: number): void {
    advanceTime(this.#state, elapsedSeconds);
  }

  setPlaying(playing: boolean): void {
    this.#state.playing = playing;
    this.#notify();
  }

  setRate(rateDaysPerSecond: number): void {
    this.#state.rateDaysPerSecond = clampRate(rateDaysPerSecond);
    this.#notify();
  }

  scrubTo(jdTdb: number): void {
    this.#state.jdTdb = clampJdTdb(jdTdb);
    this.#notify();
  }

  jumpToNow(): void {
    this.scrubTo(jdTdbFromUnixMs(this.#nowUnixMs()));
  }

  /** An arrow property so it can be passed to `useSyncExternalStore` unbound. */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const timeStore = new TimeStore({
  initial: {
    jdTdb: jdTdbFromUnixMs(Date.now()),
    rateDaysPerSecond: DEFAULT_RATE_DAYS_PER_SECOND,
    playing: true,
  },
});
```

`apps/web/src/scene/framePriorities.ts`:

```ts
/**
 * `useFrame` callbacks run in ascending priority each frame; the order is the data flow. Priorities stay ≤ 0
 * because R3F hands rendering to any callback with a priority above 0.
 */
export const FRAME_PRIORITY = {
  clock: -3,
  bodyPositions: -2,
  cameraRig: -1,
  sceneObjects: 0,
} as const;
```

`apps/web/src/scene/SimulationClock.tsx`:

```tsx
import { useFrame } from '@react-three/fiber';
import { timeStore } from '../time/timeStore';
import { FRAME_PRIORITY } from './framePriorities';

export function SimulationClock() {
  useFrame((_, deltaSeconds) => timeStore.tick(deltaSeconds), FRAME_PRIORITY.clock);
  return null;
}
```

In `SceneCanvas.tsx`, import `SimulationClock` and render `<SimulationClock />` as the first child of `<Canvas>`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run packages/orbit/src/time.test.ts apps/web/src/time apps/web/src/scene/framePriorities.test.ts`
Expected: PASS.

- [ ] **Step 8: Finish** (per-task workflow). Checklist item 2. PROGRESS decisions:
  - One time store (`timeStore`); the frame loop ticks it without notifying; user actions notify.
  - Rate 1/86,400–3,652.5 d/s (real time → 10 yr/s), default 1 d/s; time clamped to 1800–2050, pauses at the end.
  - A frame counts at most 0.1 s of wall time.
  - `jdUtcFromJdTdb` added to the engine (estimate + one correction; throws before 1972 like the forward
    conversion).
  - `FRAME_PRIORITY`: clock −3, body positions −2, camera rig −1, scene objects 0.

Commit: `Add the time store, frame priorities and the TDB to UTC conversion`.

---

### Task 3: Sun, 8 planets from the engine, orbit lines

Branch: `phase-3/solar-system`.

**Changes agreed in review (2026-09-29):** the camera start (`CAMERA_SETTINGS.position = [0, 1.5, 2.598]`, ≈ 3 AU
and 30° above the ecliptic) and a `canvasConfig.test.ts` check (`Math.hypot(...position)` ≈ 3, `position[1] > 0`)
move here from Task 5, because the Phase 0 camera at `[0, 0, 2]` sits in the ecliptic plane and Step 8 would see every
orbit edge-on. **Checked while reviewing:** the test renderer mounts meshes, points, line loops and lights, runs
negative-priority `useFrame` callbacks and supports `scene.find(...).instance`; drei `OrbitControls` does not mount
under it (`reading 'removeEventListener'` of undefined), which Task 5's review addresses.

**Files:**

- Create: `apps/web/src/scene/bodies/bodyCatalog.ts`, `bodyPositions.ts`, `orbitPath.ts`
- Create: `apps/web/src/scene/bodies/Body.tsx`, `OrbitLine.tsx`, `BodyPositionsUpdater.tsx`, `SolarSystem.tsx`
- Test: `apps/web/src/scene/bodies/bodyCatalog.test.ts`, `bodyPositions.test.ts`, `orbitPath.test.ts`,
  `SolarSystem.test.tsx`
- Modify: `apps/web/src/scene/SceneCanvas.tsx` (replace the placeholder sphere and directional light)
- Modify: `apps/web/package.json` (dev dependency `@react-three/test-renderer@^9.1.1`)
- Maybe modify: `apps/web/vitest.config.ts` (see Step 1)

**Interfaces:**

- Consumes: `sceneFrame.ts` (Task 1); `timeStore`, `FRAME_PRIORITY` (Task 2); from the engine `PLANETS`,
  `Planet`, `KM_PER_AU`, `planetStateAt`, `planetElementsAt`, `stateFromElements`, `createStateVector`.
- Produces:
  - `type BodyId = 'sun' | Planet`, `BODY_IDS: readonly BodyId[]`
  - `BODY_APPEARANCE: Record<BodyId, { label: string; radiusKm: number; color: string }>`
  - `radiusAu(body: BodyId): number`, `SUN_GLOW_COLOR: Color` (linear, > 1), `SUN_LIGHT_INTENSITY`
  - `type BodyPositions = Record<BodyId, Vector3>`, `createBodyPositions()`,
    `updateBodyPositions(positions: BodyPositions, jdTdb: number): void`, the app-wide `bodyPositions`
  - `ORBIT_PATH_POINTS = 256`, `ORBIT_PATH_REFRESH_DAYS = 365.25`,
    `writeOrbitPath(request: { planet: Planet; jdTdb: number }, out: Float32Array): Float32Array`,
    `orbitPathIsStale(pathJdTdb: number | undefined, jdTdb: number): boolean`
  - Components `<Body body>`, `<OrbitLine planet>`, `<SolarSystem />`; each body's group is named
    `body-<id>` (Tasks 5 and 7 find them by name)

- [ ] **Step 1: Add the test renderer and check the test config**

Run: `npm i -D -w @perihelion/web @react-three/test-renderer@^9.1.1`.
Open `apps/web/vitest.config.ts`. If its `include` lists only `*.test.ts`, extend it to
`src/**/*.test.{ts,tsx}`. The test renderer needs no DOM, so keep the current environment.

- [ ] **Step 2: Write the failing unit tests**

`apps/web/src/scene/bodies/bodyCatalog.test.ts`:

```ts
import { PLANETS } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { BODY_APPEARANCE, BODY_IDS, radiusAu } from './bodyCatalog';

describe('body catalog', () => {
  it('lists the Sun and the eight engine planets', () => {
    expect(BODY_IDS).toEqual(['sun', ...PLANETS]);
  });

  it('labels the Earth–Moon barycentre as Earth', () => {
    expect(BODY_APPEARANCE.earthMoonBarycenter.label).toBe('Earth');
  });

  it('converts IAU mean radii to AU', () => {
    expect(radiusAu('earthMoonBarycenter')).toBeCloseTo(4.2588e-5, 8);
    expect(radiusAu('sun')).toBeCloseTo(4.6505e-3, 7);
  });
});
```

`apps/web/src/scene/bodies/bodyPositions.test.ts`:

```ts
import { PLANETS, planetStateAt } from '@perihelion/orbit';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TIME_RANGE_JD_TDB } from '../../time/timeController';
import { createBodyPositions, updateBodyPositions } from './bodyPositions';

const jdInRange = fc.double({
  min: TIME_RANGE_JD_TDB.startJdTdb,
  max: TIME_RANGE_JD_TDB.endJdTdb,
  noNaN: true,
});

describe('body positions', () => {
  it('matches the engine for every planet at any date in range', () => {
    const positions = createBodyPositions();
    fc.assert(
      fc.property(jdInRange, (jdTdb) => {
        updateBodyPositions(positions, jdTdb);
        for (const planet of PLANETS) {
          expect(positions[planet]).toEqual(planetStateAt(planet, jdTdb).positionAu);
        }
      }),
    );
  });

  it('keeps the Sun at the heliocentric origin', () => {
    const positions = createBodyPositions();
    updateBodyPositions(positions, 2_451_545);
    expect(positions.sun).toEqual([0, 0, 0]);
  });
});
```

`apps/web/src/scene/bodies/orbitPath.test.ts`:

```ts
import { PLANETS, planetElementsAt } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import {
  ORBIT_PATH_POINTS,
  ORBIT_PATH_REFRESH_DAYS,
  orbitPathIsStale,
  writeOrbitPath,
} from './orbitPath';

const J2000_JD_TDB = 2_451_545;

function radiusAt(path: Float32Array, index: number): number {
  return Math.hypot(path[index * 3] ?? 0, path[index * 3 + 1] ?? 0, path[index * 3 + 2] ?? 0);
}

describe('orbit path', () => {
  it.each(PLANETS)(
    'traces %s between perihelion and aphelion, starting at perihelion',
    (planet) => {
      const { semiMajorAxisAu: a, eccentricity: e } = planetElementsAt(planet, J2000_JD_TDB);
      const path = writeOrbitPath(
        { planet, jdTdb: J2000_JD_TDB },
        new Float32Array(ORBIT_PATH_POINTS * 3),
      );
      expect(radiusAt(path, 0) / (a * (1 - e))).toBeCloseTo(1, 6);
      for (let index = 0; index < ORBIT_PATH_POINTS; index += 1) {
        expect(radiusAt(path, index)).toBeGreaterThanOrEqual(a * (1 - e) * (1 - 1e-6));
        expect(radiusAt(path, index)).toBeLessThanOrEqual(a * (1 + e) * (1 + 1e-6));
      }
    },
  );

  it('is stale when never drawn or a refresh period old, in either direction', () => {
    expect(orbitPathIsStale(undefined, J2000_JD_TDB)).toBe(true);
    expect(orbitPathIsStale(J2000_JD_TDB, J2000_JD_TDB + ORBIT_PATH_REFRESH_DAYS)).toBe(true);
    expect(orbitPathIsStale(J2000_JD_TDB, J2000_JD_TDB - ORBIT_PATH_REFRESH_DAYS)).toBe(true);
    expect(orbitPathIsStale(J2000_JD_TDB, J2000_JD_TDB + 30)).toBe(false);
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run apps/web/src/scene/bodies`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement the pure modules**

`apps/web/src/scene/bodies/bodyCatalog.ts`:

```ts
import { KM_PER_AU, PLANETS, type Planet } from '@perihelion/orbit';
import { Color } from 'three';

export type BodyId = 'sun' | Planet;

export const BODY_IDS: readonly BodyId[] = ['sun', ...PLANETS];

export interface BodyAppearance {
  label: string;
  radiusKm: number;
  color: string;
}

/**
 * Mean radii from the IAU WGCCRE 2015 report (Archinal et al. 2018, Celest. Mech. Dyn. Astron. 130:22); the
 * Sun's is the IAU 2015 nominal solar radius (Resolution B3). Colours are illustrative. Standish gives the
 * Earth–Moon barycentre, not Earth, so "Earth" is drawn there, ≈ 4,670 km from Earth's centre.
 */
export const BODY_APPEARANCE: Record<BodyId, BodyAppearance> = {
  sun: { label: 'Sun', radiusKm: 695_700, color: '#fff4e0' },
  mercury: { label: 'Mercury', radiusKm: 2_439.4, color: '#9c9a96' },
  venus: { label: 'Venus', radiusKm: 6_051.8, color: '#e8d3a2' },
  earthMoonBarycenter: { label: 'Earth', radiusKm: 6_371.0084, color: '#4f7cff' },
  mars: { label: 'Mars', radiusKm: 3_389.5, color: '#c1440e' },
  jupiter: { label: 'Jupiter', radiusKm: 69_911, color: '#d8ca9d' },
  saturn: { label: 'Saturn', radiusKm: 58_232, color: '#e3d8a8' },
  uranus: { label: 'Uranus', radiusKm: 25_362, color: '#9fd8e0' },
  neptune: { label: 'Neptune', radiusKm: 24_622, color: '#4a6fe3' },
};

/** Linear RGB above 1, so the Sun is the only thing that crosses the bloom threshold (Task 6). */
export const SUN_GLOW_COLOR = new Color(4, 3.4, 2.6);

/**
 * No distance falloff (decay 0): inverse-square would leave Neptune 900× darker than Earth. Illustrative.
 * Kept low enough that a lit planet's diffuse term (≈ intensity/π × colour) stays below 1 and never blooms.
 */
export const SUN_LIGHT_INTENSITY = 2.5;

export function radiusAu(body: BodyId): number {
  return BODY_APPEARANCE[body].radiusKm / KM_PER_AU;
}
```

`apps/web/src/scene/bodies/bodyPositions.ts`:

```ts
import { PLANETS, type Vector3, createStateVector, planetStateAt } from '@perihelion/orbit';
import { BODY_IDS, type BodyId } from './bodyCatalog';

/** Heliocentric ecliptic J2000 positions in AU, float64, refreshed once per frame. */
export type BodyPositions = Record<BodyId, Vector3>;

export function createBodyPositions(): BodyPositions {
  return Object.fromEntries(BODY_IDS.map((body) => [body, [0, 0, 0]])) as BodyPositions;
}

const scratchState = createStateVector();

/** Heliocentric, so the Sun stays at [0, 0, 0]. Planets come from Standish Table 1 via the engine. */
export function updateBodyPositions(positions: BodyPositions, jdTdb: number): void {
  for (const planet of PLANETS) {
    const [x, y, z] = planetStateAt(planet, jdTdb, scratchState).positionAu;
    const target = positions[planet];
    target[0] = x;
    target[1] = y;
    target[2] = z;
  }
}

/** The app-wide table: written at `FRAME_PRIORITY.bodyPositions`, read by the camera rig and every body. */
export const bodyPositions = createBodyPositions();
```

`apps/web/src/scene/bodies/orbitPath.ts`:

```ts
import {
  type Planet,
  createStateVector,
  planetElementsAt,
  stateFromElements,
} from '@perihelion/orbit';
import { sceneAxesFromEcliptic } from '../sceneFrame';

export const ORBIT_PATH_POINTS = 256;

/**
 * Standish's element rates move the fastest-drifting node or perihelion by well under a degree per century,
 * so a path resampled once a simulated year is indistinguishable from one resampled every frame.
 */
export const ORBIT_PATH_REFRESH_DAYS = 365.25;

const scratchState = createStateVector();

/**
 * One revolution of the planet's osculating ellipse at `jdTdb`, relative to the Sun, in scene axes. Equal steps
 * in mean anomaly are equal steps in time, so points thin out slightly at perihelion; with e ≤ 0.21 (Mercury)
 * that is invisible at line width.
 */
export function writeOrbitPath(
  request: { planet: Planet; jdTdb: number },
  out: Float32Array,
): Float32Array {
  const elements = { ...planetElementsAt(request.planet, request.jdTdb) };
  for (let index = 0; index < ORBIT_PATH_POINTS; index += 1) {
    elements.meanAnomalyRad = (2 * Math.PI * index) / ORBIT_PATH_POINTS;
    out.set(sceneAxesFromEcliptic(stateFromElements(elements, scratchState).positionAu), index * 3);
  }
  return out;
}

export function orbitPathIsStale(pathJdTdb: number | undefined, jdTdb: number): boolean {
  return pathJdTdb === undefined || Math.abs(jdTdb - pathJdTdb) >= ORBIT_PATH_REFRESH_DAYS;
}
```

Run: `npx vitest run apps/web/src/scene/bodies`
Expected: PASS.

- [ ] **Step 5: Write the failing scene test** `apps/web/src/scene/bodies/SolarSystem.test.tsx`

This is the exit criterion "planets match the engine at any scrubbed date", checked through the real components.

```tsx
import { PLANETS, julianDateFromCalendar, planetStateAt } from '@perihelion/orbit';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { Object3D } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { timeStore } from '../../time/timeStore';
import { sceneAxesFromEcliptic, setSceneOrigin } from '../sceneFrame';
import { SolarSystem } from './SolarSystem';

const SCRUBBED_DATES_TDB = [
  julianDateFromCalendar({ year: 1850, month: 6, day: 1, hour: 0, minute: 0, second: 0 }),
  julianDateFromCalendar({ year: 2003, month: 8, day: 27, hour: 9, minute: 51, second: 0 }),
  julianDateFromCalendar({ year: 2049, month: 12, day: 31, hour: 0, minute: 0, second: 0 }),
];

async function renderAt(jdTdb: number) {
  timeStore.setPlaying(false);
  timeStore.scrubTo(jdTdb);
  const renderer = await ReactThreeTestRenderer.create(<SolarSystem />);
  await renderer.advanceFrames(1, 1 / 60);
  const bodyGroup = (name: string): Object3D =>
    renderer.scene.find((node) => node.props.name === `body-${name}`).instance;
  return { renderer, bodyGroup };
}

describe('SolarSystem', () => {
  afterEach(() => setSceneOrigin([0, 0, 0]));

  it.each(SCRUBBED_DATES_TDB)(
    'draws every planet where the engine puts it (JD %d)',
    async (jdTdb) => {
      const { renderer, bodyGroup } = await renderAt(jdTdb);
      for (const planet of PLANETS) {
        const expected = sceneAxesFromEcliptic(planetStateAt(planet, jdTdb).positionAu);
        expect(bodyGroup(planet).position.toArray()).toEqual(expected);
      }
      await renderer.unmount();
    },
  );

  it('draws the focused body at exactly the scene origin', async () => {
    const jdTdb = SCRUBBED_DATES_TDB[1] ?? 0;
    setSceneOrigin(planetStateAt('earthMoonBarycenter', jdTdb).positionAu);
    const { renderer, bodyGroup } = await renderAt(jdTdb);
    expect(bodyGroup('earthMoonBarycenter').position.length()).toBe(0);
    await renderer.unmount();
  });
});
```

Run: `npx vitest run apps/web/src/scene/bodies/SolarSystem.test.tsx`
Expected: FAIL, `./SolarSystem` not found.

- [ ] **Step 6: Implement the components**

`apps/web/src/scene/bodies/BodyPositionsUpdater.tsx`:

```tsx
import { useFrame } from '@react-three/fiber';
import { timeStore } from '../../time/timeStore';
import { FRAME_PRIORITY } from '../framePriorities';
import { bodyPositions, updateBodyPositions } from './bodyPositions';

export function BodyPositionsUpdater() {
  useFrame(
    () => updateBodyPositions(bodyPositions, timeStore.state.jdTdb),
    FRAME_PRIORITY.bodyPositions,
  );
  return null;
}
```

`apps/web/src/scene/bodies/Body.tsx`:

```tsx
import type { Planet } from '@perihelion/orbit';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { FRAME_PRIORITY } from '../framePriorities';
import { writeSceneOffset } from '../sceneFrame';
import {
  BODY_APPEARANCE,
  type BodyId,
  SUN_GLOW_COLOR,
  SUN_LIGHT_INTENSITY,
  radiusAu,
} from './bodyCatalog';
import { bodyPositions } from './bodyPositions';

const SPHERE_SEGMENTS = { width: 48, height: 24 } as const;

/** True radii are sub-pixel from 1 AU; a fixed-size dot keeps every body findable at any zoom. */
const MARKER_SIZE_PX = 3;
const MARKER_VERTEX = new Float32Array(3);

export function Body({ body }: { body: BodyId }) {
  const groupRef = useRef<Group>(null);
  useFrame(() => {
    if (groupRef.current) writeSceneOffset(bodyPositions[body], groupRef.current.position);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <group ref={groupRef} name={`body-${body}`}>
      {body === 'sun' ? <SunSurface /> : <PlanetSurface planet={body} />}
      <BodyMarker color={BODY_APPEARANCE[body].color} />
    </group>
  );
}

function SunSurface() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[radiusAu('sun'), SPHERE_SEGMENTS.width, SPHERE_SEGMENTS.height]} />
        <meshBasicMaterial color={SUN_GLOW_COLOR} toneMapped={false} />
      </mesh>
      <pointLight intensity={SUN_LIGHT_INTENSITY} decay={0} />
    </>
  );
}

function PlanetSurface({ planet }: { planet: Planet }) {
  return (
    <mesh>
      <sphereGeometry args={[radiusAu(planet), SPHERE_SEGMENTS.width, SPHERE_SEGMENTS.height]} />
      <meshStandardMaterial color={BODY_APPEARANCE[planet].color} roughness={0.9} />
    </mesh>
  );
}

function BodyMarker({ color }: { color: string }) {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[MARKER_VERTEX, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={MARKER_SIZE_PX} sizeAttenuation={false} />
    </points>
  );
}
```

`apps/web/src/scene/bodies/OrbitLine.tsx`:

```tsx
import type { Planet } from '@perihelion/orbit';
import { useFrame } from '@react-three/fiber';
import { type RefObject, useMemo, useRef } from 'react';
import type { LineLoop } from 'three';
import { timeStore } from '../../time/timeStore';
import { FRAME_PRIORITY } from '../framePriorities';
import { writeSceneOffset } from '../sceneFrame';
import { BODY_APPEARANCE } from './bodyCatalog';
import { bodyPositions } from './bodyPositions';
import { ORBIT_PATH_POINTS, orbitPathIsStale, writeOrbitPath } from './orbitPath';

const ORBIT_LINE_OPACITY = 0.35;

/**
 * Vertices are float32 relative to the Sun, so a point on Earth's orbit carries ~1e-8 AU (≈ 1.5 km) of rounding:
 * invisible next to Earth's 6,371 km radius even at the closest zoom. Only the line's origin is float64-exact.
 */
export function OrbitLine({ planet }: { planet: Planet }) {
  const lineRef = useRef<LineLoop>(null);
  const vertices = useMemo(() => new Float32Array(ORBIT_PATH_POINTS * 3), []);
  useOrbitPathUpdates({ planet, lineRef });
  return (
    <lineLoop ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={BODY_APPEARANCE[planet].color}
        transparent
        opacity={ORBIT_LINE_OPACITY}
      />
    </lineLoop>
  );
}

function useOrbitPathUpdates({
  planet,
  lineRef,
}: {
  planet: Planet;
  lineRef: RefObject<LineLoop | null>;
}) {
  const pathJdTdbRef = useRef<number | undefined>(undefined);
  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    writeSceneOffset(bodyPositions.sun, line.position);
    const { jdTdb } = timeStore.state;
    const attribute = line.geometry.getAttribute('position');
    if (
      !orbitPathIsStale(pathJdTdbRef.current, jdTdb) ||
      !(attribute.array instanceof Float32Array)
    )
      return;
    writeOrbitPath({ planet, jdTdb }, attribute.array);
    attribute.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    pathJdTdbRef.current = jdTdb;
  }, FRAME_PRIORITY.sceneObjects);
}
```

`apps/web/src/scene/bodies/SolarSystem.tsx`:

```tsx
import { PLANETS } from '@perihelion/orbit';
import { Body } from './Body';
import { BODY_IDS } from './bodyCatalog';
import { BodyPositionsUpdater } from './BodyPositionsUpdater';
import { OrbitLine } from './OrbitLine';

export function SolarSystem() {
  return (
    <>
      <BodyPositionsUpdater />
      {BODY_IDS.map((body) => (
        <Body key={body} body={body} />
      ))}
      {PLANETS.map((planet) => (
        <OrbitLine key={planet} planet={planet} />
      ))}
    </>
  );
}
```

In `SceneCanvas.tsx`: delete `PlaceholderSphere` and the `directionalLight`, render `<SolarSystem />`, and lower
the ambient light to `intensity={0.03}` so night sides are dark but not pure black.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run apps/web/src/scene`
Expected: PASS. If the test renderer throws while creating its mock WebGL context, stop and hand back (guardrails).

- [ ] **Step 8: Look at it.** `npm run dev`, open the web app in Chrome. Expected: a white-hot dot at the centre,
      eight coloured dots on faint orbit ellipses, the inner planets moving at 1 d/s. The camera is still the
      fixed Phase 0 camera (Task 5 adds controls).

- [ ] **Step 9: Finish** (per-task workflow). Checklist item 3. PROGRESS decisions:
  - True IAU radii (WGCCRE 2015) + 3 px markers; Earth drawn at the EM barycentre.
  - Orbit lines: 256 points of the osculating ellipse, resampled after 365.25 simulated days; float32 relative
    to the Sun (≈ 1.5 km rounding at 1 AU).
  - Sun light: point light, no decay (illustrative), intensity 2.5.

Commit: `Draw the Sun, the eight planets and their orbits from the orbit engine`.

---

### Task 4: Time controls: play/pause, speed, scrub, "now"

Branch: `phase-3/time-controls`.

**Files:**

- Create: `apps/web/src/time/timeDisplay.ts`, `apps/web/src/time/useTimeReadout.ts`,
  `apps/web/src/time/TimeControls.tsx`, `apps/web/src/App.tsx`
- Test: `apps/web/src/time/timeDisplay.test.ts`
- Modify: `apps/web/src/main.tsx` (render `<App />`), `apps/web/src/styles.css` (HUD styles)

**Interfaces:**

- Consumes: `timeStore`, `TIME_RANGE_JD_TDB`, `RATE_LIMITS_DAYS_PER_SECOND`, `TimeState` (Task 2);
  `calendarFromJulianDate`, `jdTdbFromJdUtc`, `jdUtcFromJdTdb` (engine).
- Produces:
  - `formatSimulationDate(jdTdb: number): string` ("YYYY-MM-DD hh:mm UTC", or "… TDB" before 1972)
  - `rateFromSliderPosition(position: number): number`, `sliderPositionFromRate(rateDaysPerSecond: number): number`
  - `formatRate(rateDaysPerSecond: number): string`
  - `useTimeReadout(): TimeState` (4 Hz poll + notifications)
  - `<TimeControls />`, `<App />` (Task 5 adds the focus picker to `App`)

- [x] **Step 1: Write the failing test** `apps/web/src/time/timeDisplay.test.ts`

```ts
import { jdTdbFromJdUtc, julianDateFromCalendar } from '@perihelion/orbit';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RATE_LIMITS_DAYS_PER_SECOND } from './timeController';
import {
  formatRate,
  formatSimulationDate,
  rateFromSliderPosition,
  sliderPositionFromRate,
} from './timeDisplay';

describe('formatSimulationDate', () => {
  it('shows UTC from 1972 on', () => {
    const jdUtc = julianDateFromCalendar({
      year: 2017,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    });
    expect(formatSimulationDate(jdTdbFromJdUtc(jdUtc))).toBe('2017-01-01 00:00 UTC');
  });

  it('shows J2000 (TDB noon) as 11:58 UTC', () => {
    expect(formatSimulationDate(2_451_545)).toBe('2000-01-01 11:58 UTC');
  });

  it('shows TDB, without throwing, before UTC had leap seconds', () => {
    const jdTdb = julianDateFromCalendar({
      year: 1850,
      month: 6,
      day: 1,
      hour: 6,
      minute: 30,
      second: 0,
    });
    expect(formatSimulationDate(jdTdb)).toBe('1850-06-01 06:30 TDB');
  });
});

describe('speed slider', () => {
  it('spans real time to 10 years per second', () => {
    expect(rateFromSliderPosition(0)).toBeCloseTo(RATE_LIMITS_DAYS_PER_SECOND.min, 15);
    expect(rateFromSliderPosition(1)).toBeCloseTo(RATE_LIMITS_DAYS_PER_SECOND.max, 9);
  });

  it('round-trips slider positions', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (position) => {
        expect(sliderPositionFromRate(rateFromSliderPosition(position))).toBeCloseTo(position, 12);
      }),
    );
  });

  it('labels rates in the largest whole unit', () => {
    expect(formatRate(RATE_LIMITS_DAYS_PER_SECOND.min)).toBe('real time');
    expect(formatRate(1 / 24)).toBe('1.0 h/s');
    expect(formatRate(1)).toBe('1.0 d/s');
    expect(formatRate(3_652.5)).toBe('10 yr/s');
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx vitest run apps/web/src/time/timeDisplay.test.ts`
Expected: FAIL, `./timeDisplay` not found.

- [x] **Step 3: Implement** `apps/web/src/time/timeDisplay.ts`

```ts
import { calendarFromJulianDate, jdTdbFromJdUtc, jdUtcFromJdTdb } from '@perihelion/orbit';
import { RATE_LIMITS_DAYS_PER_SECOND } from './timeController';

/** 1972-01-01 00:00 UTC: UTC has no leap-second definition before it, so earlier dates are shown in TDB. */
const UTC_LEAP_SECONDS_START_JD_UTC = 2_441_317.5;
const UTC_START_JD_TDB = jdTdbFromJdUtc(UTC_LEAP_SECONDS_START_JD_UTC);

export function formatSimulationDate(jdTdb: number): string {
  if (jdTdb < UTC_START_JD_TDB) return `${formatCalendar(jdTdb)} TDB`;
  return `${formatCalendar(jdUtcFromJdTdb(jdTdb))} UTC`;
}

function formatCalendar(julianDate: number): string {
  const { year, month, day, hour, minute } = calendarFromJulianDate(julianDate);
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

const LOG_RATE_MIN = Math.log(RATE_LIMITS_DAYS_PER_SECOND.min);
const LOG_RATE_SPAN = Math.log(RATE_LIMITS_DAYS_PER_SECOND.max) - LOG_RATE_MIN;

/** Log scale: the 8 decades from real time to 10 yr/s each get the same slider travel. */
export function rateFromSliderPosition(position: number): number {
  return Math.exp(LOG_RATE_MIN + position * LOG_RATE_SPAN);
}

export function sliderPositionFromRate(rateDaysPerSecond: number): number {
  return (Math.log(rateDaysPerSecond) - LOG_RATE_MIN) / LOG_RATE_SPAN;
}

const RATE_UNITS = [
  { label: 'yr', days: 365.25 },
  { label: 'd', days: 1 },
  { label: 'h', days: 1 / 24 },
  { label: 'min', days: 1 / 1_440 },
  { label: 's', days: 1 / 86_400 },
] as const;

/** Slider rates come back through exp(log(x)), so "real time" allows a few ulps of drift. */
const REAL_TIME_TOLERANCE = 1 + 1e-9;

export function formatRate(rateDaysPerSecond: number): string {
  if (rateDaysPerSecond <= RATE_LIMITS_DAYS_PER_SECOND.min * REAL_TIME_TOLERANCE)
    return 'real time';
  const unit = RATE_UNITS.find((candidate) => rateDaysPerSecond >= candidate.days) ?? RATE_UNITS[4];
  const value = rateDaysPerSecond / unit.days;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit.label}/s`;
}
```

Run: `npx vitest run apps/web/src/time/timeDisplay.test.ts`
Expected: PASS.

- [x] **Step 4: Implement the readout hook and the controls**

`apps/web/src/time/useTimeReadout.ts`:

```ts
import { useEffect, useState } from 'react';
import type { TimeState } from './timeController';
import { timeStore } from './timeStore';

/** 4 Hz is enough for a date readout; the scene itself never waits on React. */
const READOUT_INTERVAL_MS = 250;

export function useTimeReadout(): TimeState {
  const [readout, setReadout] = useState<TimeState>(() => ({ ...timeStore.state }));
  useEffect(() => {
    const refresh = () => setReadout({ ...timeStore.state });
    const unsubscribe = timeStore.subscribe(refresh);
    const interval = window.setInterval(refresh, READOUT_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, []);
  return readout;
}
```

`apps/web/src/time/TimeControls.tsx`:

```tsx
import { TIME_RANGE_JD_TDB } from './timeController';
import {
  formatRate,
  formatSimulationDate,
  rateFromSliderPosition,
  sliderPositionFromRate,
} from './timeDisplay';
import { timeStore } from './timeStore';
import { useTimeReadout } from './useTimeReadout';

const RATE_SLIDER_STEPS = 1_000;

export function TimeControls() {
  const readout = useTimeReadout();
  return (
    <div className="hud time-controls" role="group" aria-label="Simulation time">
      <button type="button" onClick={() => timeStore.setPlaying(!readout.playing)}>
        {readout.playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" onClick={() => timeStore.jumpToNow()}>
        Now
      </button>
      <output aria-label="Simulation date">{formatSimulationDate(readout.jdTdb)}</output>
      <DateScrubber jdTdb={readout.jdTdb} />
      <RateSlider rateDaysPerSecond={readout.rateDaysPerSecond} />
    </div>
  );
}

function DateScrubber({ jdTdb }: { jdTdb: number }) {
  return (
    <input
      type="range"
      aria-label="Scrub date"
      min={TIME_RANGE_JD_TDB.startJdTdb}
      max={TIME_RANGE_JD_TDB.endJdTdb}
      step={1}
      value={jdTdb}
      onChange={(event) => timeStore.scrubTo(event.currentTarget.valueAsNumber)}
    />
  );
}

function RateSlider({ rateDaysPerSecond }: { rateDaysPerSecond: number }) {
  return (
    <label className="rate-slider">
      <input
        type="range"
        aria-label="Speed"
        min={0}
        max={RATE_SLIDER_STEPS}
        value={Math.round(sliderPositionFromRate(rateDaysPerSecond) * RATE_SLIDER_STEPS)}
        onChange={(event) =>
          timeStore.setRate(
            rateFromSliderPosition(event.currentTarget.valueAsNumber / RATE_SLIDER_STEPS),
          )
        }
      />
      <span>{formatRate(rateDaysPerSecond)}</span>
    </label>
  );
}
```

`apps/web/src/App.tsx`:

```tsx
import { SceneCanvas } from './scene/SceneCanvas';
import { TimeControls } from './time/TimeControls';

export function App() {
  return (
    <>
      <SceneCanvas />
      <TimeControls />
    </>
  );
}
```

In `main.tsx`, replace the `SceneCanvas` import and element with `App` from `./App`.

Append to `apps/web/src/styles.css`:

```css
.hud {
  position: fixed;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  color: #e8ecf4;
  font:
    13px/1.4 system-ui,
    sans-serif;
  background: rgb(8 10 16 / 70%);
  border-radius: 6px;
}

.time-controls {
  left: 50%;
  bottom: 1rem;
  transform: translateX(-50%);
}

.time-controls output {
  min-width: 13ch;
  font-variant-numeric: tabular-nums;
}

.rate-slider {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
```

- [x] **Step 5: Look at it.** `npm run dev`. Check: Pause stops the planets and the readout; Play resumes; the
      speed label moves from "real time" to "10 yr/s"; dragging the scrubber moves planets immediately, including
      before 1972 (readout says TDB); Now jumps to today's date in UTC.

- [x] **Step 6: Finish** (per-task workflow). Checklist item 4. PROGRESS decisions:
  - Readout in UTC from 1972, TDB before (UTC undefined before leap seconds); updated at 4 Hz.
  - Speed slider is logarithmic over 8 decades.

Commit: `Add play, pause, speed, scrub and now controls for simulation time`.

---

### Task 5: Camera rig: orbit controls, focus, scripted `flyTo`

Branch: `phase-3/camera-rig`.

**Files:**

- Create: `apps/web/src/scene/camera/viewDistances.ts`, `flight.ts`, `cameraRig.ts`, `CameraRigController.tsx`,
  `FocusPicker.tsx`
- Test: `apps/web/src/scene/camera/viewDistances.test.ts`, `flight.test.ts`, `cameraRig.test.ts`
- Modify: `apps/web/src/scene/SceneCanvas.tsx` (mount the rig), `apps/web/src/App.tsx` (add `<FocusPicker />`),
  `apps/web/src/scene/bodies/Body.tsx` (click to focus), `apps/web/src/styles.css`

**Interfaces:**

- Consumes: `setSceneOrigin` (Task 1); `FRAME_PRIORITY` (Task 2); `BodyId`, `BODY_IDS`, `BODY_APPEARANCE`,
  `radiusAu`, `bodyPositions`, `BodyPositions` (Task 3).
- Produces:
  - `MIN_VIEW_DISTANCE_RADII = 1.5`, `MAX_VIEW_DISTANCE_AU = 100`, `minViewDistanceAu(body)`,
    `defaultViewDistanceAu(body)`
  - `interface CameraPose { originAu: Vector3; distanceAu: number }`,
    `interface Flight { from: CameraPose; to: BodyId; toDistanceAu: number; startSeconds: number; durationSeconds: number }`
  - `easeInOutCubic(t)`, `flightProgress(flight, nowSeconds)`,
    `writeFlightPose(step: { flight; targetAu; progress }, out: CameraPose): CameraPose`
  - `interface FlightRequest { focus: BodyId; distanceAu?: number; durationSeconds?: number }`
  - `class CameraRig` (`focus`, `flying`, `pose`, `flyTo`, `update`, `subscribe`) and the app-wide `cameraRig`.
    `cameraRig.flyTo(...)` is the scripted-move API later shots use.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/scene/camera/viewDistances.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BODY_IDS, radiusAu } from '../bodies/bodyCatalog';
import { CAMERA_SETTINGS } from '../canvasConfig';
import { MAX_VIEW_DISTANCE_AU, defaultViewDistanceAu, minViewDistanceAu } from './viewDistances';

describe('view distances', () => {
  it.each(BODY_IDS)('orders min < default < max for %s', (body) => {
    expect(minViewDistanceAu(body)).toBeLessThan(defaultViewDistanceAu(body));
    expect(defaultViewDistanceAu(body)).toBeLessThan(MAX_VIEW_DISTANCE_AU);
  });

  it.each(BODY_IDS)('never lets the near plane clip %s at the closest zoom', (body) => {
    const closestSurfaceGapAu = minViewDistanceAu(body) - radiusAu(body);
    expect(CAMERA_SETTINGS.near).toBeLessThan(closestSurfaceGapAu);
  });
});
```

`apps/web/src/scene/camera/flight.test.ts`:

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type Flight, easeInOutCubic, flightProgress, writeFlightPose } from './flight';

const FLIGHT: Flight = {
  from: { originAu: [0, 0, 0], distanceAu: 3 },
  to: 'earthMoonBarycenter',
  toDistanceAu: 3e-4,
  startSeconds: 10,
  durationSeconds: 2,
};
const EARTH_AU: [number, number, number] = [0.98, 0.17, 0];

function poseAt(progress: number) {
  return writeFlightPose(
    { flight: FLIGHT, targetAu: EARTH_AU, progress },
    {
      originAu: [0, 0, 0],
      distanceAu: 0,
    },
  );
}

describe('easeInOutCubic', () => {
  it('starts at 0, ends at 1 and is symmetric about the middle', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it('never moves backwards', () => {
    const pair = fc.tuple(
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
    );
    fc.assert(
      fc.property(pair, ([first, second]) => {
        const [low, high] = first <= second ? [first, second] : [second, first];
        expect(easeInOutCubic(low)).toBeLessThanOrEqual(easeInOutCubic(high));
      }),
    );
  });
});

describe('flightProgress', () => {
  it('clamps to 0 before the start and 1 after the end', () => {
    expect(flightProgress(FLIGHT, 0)).toBe(0);
    expect(flightProgress(FLIGHT, 11)).toBe(0.5);
    expect(flightProgress(FLIGHT, 99)).toBe(1);
  });

  it('treats a zero-length flight as already arrived', () => {
    expect(flightProgress({ ...FLIGHT, durationSeconds: 0 }, 10)).toBe(1);
  });
});

describe('writeFlightPose', () => {
  it('starts at the starting pose and ends on the target', () => {
    // Distances pass through exp(log(x)), which can be one ulp off, so compare them approximately.
    expect(poseAt(0).originAu).toEqual(FLIGHT.from.originAu);
    expect(poseAt(0).distanceAu).toBeCloseTo(FLIGHT.from.distanceAu, 12);
    expect(poseAt(1).originAu).toEqual(EARTH_AU);
    expect(poseAt(1).distanceAu).toBeCloseTo(FLIGHT.toDistanceAu, 15);
  });

  it('eases distance in log space: halfway is the geometric mean', () => {
    expect(poseAt(0.5).distanceAu).toBeCloseTo(Math.sqrt(3 * 3e-4), 12);
  });
});
```

`apps/web/src/scene/camera/cameraRig.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createBodyPositions } from '../bodies/bodyPositions';
import { CameraRig } from './cameraRig';
import { defaultViewDistanceAu } from './viewDistances';

function setup() {
  let nowSeconds = 0;
  const rig = new CameraRig({ initialDistanceAu: 3, nowSeconds: () => nowSeconds });
  const positions = createBodyPositions();
  positions.earthMoonBarycenter = [0.98, 0.17, 0];
  positions.mars = [-1.4, 0.6, 0.05];
  const frame = (cameraDistanceAu = 3) =>
    rig.update({ bodyPositions: positions, cameraDistanceAu });
  return { rig, positions, frame, setNow: (seconds: number) => (nowSeconds = seconds) };
}

describe('CameraRig', () => {
  it('starts on the Sun and follows the user’s zoom when idle', () => {
    const { rig, frame } = setup();
    expect(rig.focus).toBe('sun');
    expect(frame(1.25)).toEqual({ originAu: [0, 0, 0], distanceAu: 1.25 });
  });

  it('switches focus at once, notifies, then flies to the target', () => {
    const { rig, frame, setNow } = setup();
    const listener = vi.fn();
    rig.subscribe(listener);
    rig.flyTo({ focus: 'earthMoonBarycenter', durationSeconds: 2 });
    expect(rig.focus).toBe('earthMoonBarycenter');
    expect(listener).toHaveBeenCalledOnce();
    const departing = frame();
    expect(departing.originAu).toEqual([0, 0, 0]);
    expect(departing.distanceAu).toBeCloseTo(3, 12);
    setNow(2);
    const arrived = frame();
    expect(arrived.originAu).toEqual([0.98, 0.17, 0]);
    expect(arrived.distanceAu).toBeCloseTo(defaultViewDistanceAu('earthMoonBarycenter'), 15);
    expect(rig.flying).toBe(false);
  });

  it('keeps following a moving focus after arrival', () => {
    const { rig, positions, frame, setNow } = setup();
    rig.flyTo({ focus: 'mars', durationSeconds: 0 });
    frame();
    positions.mars = [-1.3, 0.7, 0.05];
    setNow(5);
    expect(frame(0.01).originAu).toEqual([-1.3, 0.7, 0.05]);
  });

  it('starts a retargeted flight from where the camera is, without a snap', () => {
    const { rig, frame, setNow } = setup();
    rig.flyTo({ focus: 'earthMoonBarycenter', durationSeconds: 2 });
    setNow(1);
    const midway = structuredClone(frame());
    rig.flyTo({ focus: 'mars', durationSeconds: 2 });
    const restarted = frame();
    expect(restarted.originAu).toEqual(midway.originAu);
    expect(restarted.distanceAu).toBeCloseTo(midway.distanceAu, 12);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run apps/web/src/scene/camera`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`apps/web/src/scene/camera/viewDistances.ts`:

```ts
import { type BodyId, radiusAu } from '../bodies/bodyCatalog';

/** Closest zoom, in body radii from the centre: half a radius of clearance above the surface. */
export const MIN_VIEW_DISTANCE_RADII = 1.5;
/** Neptune's orbit (30 AU) fits comfortably; beyond this the scene is just dots. */
export const MAX_VIEW_DISTANCE_AU = 100;

const DEFAULT_VIEW_DISTANCE_RADII = 8;
/** The Sun's default view shows the inner system out to Mars rather than the Sun's disc. */
const SUN_DEFAULT_VIEW_DISTANCE_AU = 3;

export function minViewDistanceAu(body: BodyId): number {
  return radiusAu(body) * MIN_VIEW_DISTANCE_RADII;
}

export function defaultViewDistanceAu(body: BodyId): number {
  return body === 'sun'
    ? SUN_DEFAULT_VIEW_DISTANCE_AU
    : radiusAu(body) * DEFAULT_VIEW_DISTANCE_RADII;
}
```

`apps/web/src/scene/camera/flight.ts`:

```ts
import type { Vector3 } from '@perihelion/orbit';
import type { BodyId } from '../bodies/bodyCatalog';

/** Where the scene origin is (float64, heliocentric ecliptic) and how far the camera is from it. */
export interface CameraPose {
  originAu: Vector3;
  distanceAu: number;
}

export interface Flight {
  from: CameraPose;
  to: BodyId;
  toDistanceAu: number;
  startSeconds: number;
  durationSeconds: number;
}

/** Zero velocity at both ends, so a flight never jerks the camera on departure or arrival. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

export function flightProgress(flight: Flight, nowSeconds: number): number {
  if (flight.durationSeconds <= 0) return 1;
  const progress = (nowSeconds - flight.startSeconds) / flight.durationSeconds;
  return Math.min(Math.max(progress, 0), 1);
}

/**
 * The origin eases toward the target's *current* position, so a moving planet is met where it is on arrival.
 * Distance eases in log space: a 3 AU → 3e-4 AU zoom spends equal time per decade instead of covering almost
 * all of it in the first frames.
 */
export function writeFlightPose(
  step: { flight: Flight; targetAu: Readonly<Vector3>; progress: number },
  out: CameraPose,
): CameraPose {
  const eased = easeInOutCubic(step.progress);
  const { from, toDistanceAu } = step.flight;
  for (const axis of [0, 1, 2] as const) {
    out.originAu[axis] = lerp(from.originAu[axis], step.targetAu[axis], eased);
  }
  out.distanceAu = Math.exp(lerp(Math.log(from.distanceAu), Math.log(toDistanceAu), eased));
  return out;
}

/** Exact at both ends (`t = 1` returns `to`), which `a + (b − a)·t` is not. */
function lerp(from: number, to: number, t: number): number {
  return from * (1 - t) + to * t;
}
```

`apps/web/src/scene/camera/cameraRig.ts`:

```ts
import type { BodyId } from '../bodies/bodyCatalog';
import type { BodyPositions } from '../bodies/bodyPositions';
import { type CameraPose, type Flight, flightProgress, writeFlightPose } from './flight';
import { defaultViewDistanceAu } from './viewDistances';

export interface FlightRequest {
  focus: BodyId;
  distanceAu?: number;
  durationSeconds?: number;
}

export interface CameraRigOptions {
  initialDistanceAu: number;
  nowSeconds?: () => number;
}

export const DEFAULT_FLIGHT_SECONDS = 2.5;

/**
 * Owns the camera focus and the float64 scene origin. `update` runs every frame and never notifies; `flyTo` is a
 * user or script action and notifies, so the focus list re-renders once per change.
 */
export class CameraRig {
  #focus: BodyId = 'sun';
  #flight: Flight | undefined;
  readonly #pose: CameraPose;
  readonly #nowSeconds: () => number;
  readonly #listeners = new Set<() => void>();

  constructor(options: CameraRigOptions) {
    this.#pose = { originAu: [0, 0, 0], distanceAu: options.initialDistanceAu };
    this.#nowSeconds = options.nowSeconds ?? (() => performance.now() / 1000);
  }

  get focus(): BodyId {
    return this.#focus;
  }

  get flying(): boolean {
    return this.#flight !== undefined;
  }

  get pose(): Readonly<CameraPose> {
    return this.#pose;
  }

  flyTo(request: FlightRequest): void {
    this.#flight = {
      from: { originAu: [...this.#pose.originAu], distanceAu: this.#pose.distanceAu },
      to: request.focus,
      toDistanceAu: request.distanceAu ?? defaultViewDistanceAu(request.focus),
      startSeconds: this.#nowSeconds(),
      durationSeconds: request.durationSeconds ?? DEFAULT_FLIGHT_SECONDS,
    };
    this.#focus = request.focus;
    this.#notify();
  }

  /** Call once per frame after body positions are updated; returns the pose to render. */
  update(frame: { bodyPositions: BodyPositions; cameraDistanceAu: number }): Readonly<CameraPose> {
    if (this.#flight) return this.#advanceFlight(this.#flight, frame.bodyPositions);
    const [x, y, z] = frame.bodyPositions[this.#focus];
    this.#pose.originAu[0] = x;
    this.#pose.originAu[1] = y;
    this.#pose.originAu[2] = z;
    this.#pose.distanceAu = frame.cameraDistanceAu;
    return this.#pose;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #advanceFlight(flight: Flight, bodyPositions: BodyPositions): Readonly<CameraPose> {
    const progress = flightProgress(flight, this.#nowSeconds());
    writeFlightPose({ flight, targetAu: bodyPositions[flight.to], progress }, this.#pose);
    if (progress === 1) this.#flight = undefined;
    return this.#pose;
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const cameraRig = new CameraRig({ initialDistanceAu: defaultViewDistanceAu('sun') });
```

Run: `npx vitest run apps/web/src/scene/camera`
Expected: PASS.

- [ ] **Step 4: Wire it into the scene**

`apps/web/src/scene/camera/CameraRigController.tsx`:

```tsx
import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { type ComponentRef, useRef, useSyncExternalStore } from 'react';
import { bodyPositions } from '../bodies/bodyPositions';
import { FRAME_PRIORITY } from '../framePriorities';
import { setSceneOrigin } from '../sceneFrame';
import { cameraRig } from './cameraRig';
import { MAX_VIEW_DISTANCE_AU, minViewDistanceAu } from './viewDistances';

/**
 * The controls always orbit (0, 0, 0), because the scene origin *is* the focus. During a flight the rig sets the
 * camera's distance directly and the controls are disabled, so drei does not re-clamp the distance to the new
 * focus's limits mid-flight.
 */
export function CameraRigController() {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const focus = useSyncExternalStore(cameraRig.subscribe, () => cameraRig.focus);
  useFrame(({ camera }) => {
    const pose = cameraRig.update({ bodyPositions, cameraDistanceAu: camera.position.length() });
    setSceneOrigin(pose.originAu);
    if (controlsRef.current) controlsRef.current.enabled = !cameraRig.flying;
    if (cameraRig.flying) camera.position.setLength(pose.distanceAu);
  }, FRAME_PRIORITY.cameraRig);
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      target={[0, 0, 0]}
      minDistance={minViewDistanceAu(focus)}
      maxDistance={MAX_VIEW_DISTANCE_AU}
    />
  );
}
```

`apps/web/src/scene/camera/FocusPicker.tsx`:

```tsx
import { useSyncExternalStore } from 'react';
import { BODY_APPEARANCE, BODY_IDS } from '../bodies/bodyCatalog';
import { cameraRig } from './cameraRig';

export function FocusPicker() {
  const focus = useSyncExternalStore(cameraRig.subscribe, () => cameraRig.focus);
  return (
    <nav className="hud focus-picker" aria-label="Focus">
      {BODY_IDS.map((body) => (
        <button
          key={body}
          type="button"
          aria-pressed={body === focus}
          onClick={() => cameraRig.flyTo({ focus: body })}
        >
          {BODY_APPEARANCE[body].label}
        </button>
      ))}
    </nav>
  );
}
```

- In `SceneCanvas.tsx`, render `<CameraRigController />` after `<SolarSystem />`.
- In `App.tsx`, render `<FocusPicker />` after `<TimeControls />`.
- In `Body.tsx`, give the `<group>` an `onClick` that calls `event.stopPropagation()` then
  `cameraRig.flyTo({ focus: body })`.
- Task 3 already moved the camera start to `[0, 1.5, 2.598]`. Add to `viewDistances.test.ts`:

  ```ts
  it('starts the camera at the Sun’s default view distance', () => {
    expect(Math.hypot(...CAMERA_SETTINGS.position)).toBeCloseTo(defaultViewDistanceAu('sun'), 3);
  });
  ```

- Append to `styles.css`:

```css
.focus-picker {
  top: 1rem;
  left: 1rem;
  flex-wrap: wrap;
  max-width: calc(100vw - 2rem);
}

.hud button[aria-pressed='true'] {
  outline: 1px solid currentcolor;
}
```

- [ ] **Step 5: Run all web tests**

Run: `npx vitest run apps/web`
Expected: PASS.

- [ ] **Step 6: Look at it.** `npm run dev`. Check: drag orbits the Sun; scroll zooms; clicking "Earth" flies
      there in 2.5 s with no snap and the camera keeps following Earth at 1 d/s; zooming in stops above the surface;
      clicking "Mars" mid-flight turns smoothly; clicking a planet sphere when close focuses it.

- [ ] **Step 7: Finish** (per-task workflow). Checklist item 5. PROGRESS decisions:
  - OrbitControls always target (0, 0, 0); the rig moves the origin. Controls are disabled during flights.
  - `flyTo` eases origin toward the target's current position and distance in log space (cubic in-out, 2.5 s).
  - View distances: min 1.5 radii, default 8 radii (Sun: 3 AU), max 100 AU.

Commit: `Add the camera rig with focus selection and scripted flights`.

---

### Task 6: Postprocessing: bloom + tone mapping

Branch: `phase-3/postprocessing`.

**Files:**

- Create: `apps/web/src/scene/effects/effectsConfig.ts`, `apps/web/src/scene/effects/Effects.tsx`
- Test: `apps/web/src/scene/effects/effectsConfig.test.ts`
- Modify: `apps/web/package.json` (`@react-three/postprocessing@^3.1.3`, `postprocessing@^6.39.5`)
- Modify: `apps/web/src/scene/SceneCanvas.tsx` (`<Canvas flat>` + `<Effects />`)

**Interfaces:**

- Consumes: `SUN_GLOW_COLOR`, `BODY_APPEARANCE` (Task 3).
- Produces: `BLOOM_SETTINGS`, `TONE_MAPPING_MODE`, `relativeLuminance(color: Color): number`, `<Effects />`.

- [ ] **Step 1: Install**

Run: `npm i -w @perihelion/web @react-three/postprocessing@^3.1.3 postprocessing@^6.39.5`
Expected: no peer-dependency errors (three 0.186 satisfies `>=0.168.0 <0.187.0`).

- [ ] **Step 2: Write the failing test** `apps/web/src/scene/effects/effectsConfig.test.ts`

```ts
import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { BODY_APPEARANCE, BODY_IDS, SUN_GLOW_COLOR } from '../bodies/bodyCatalog';
import { BLOOM_SETTINGS, relativeLuminance } from './effectsConfig';

describe('bloom', () => {
  it('lets the Sun’s HDR glow cross the threshold', () => {
    expect(relativeLuminance(SUN_GLOW_COLOR)).toBeGreaterThan(BLOOM_SETTINGS.luminanceThreshold);
  });

  it.each(BODY_IDS)('keeps the %s colour below the threshold', (body) => {
    const color = new Color(BODY_APPEARANCE[body].color);
    expect(relativeLuminance(color)).toBeLessThan(BLOOM_SETTINGS.luminanceThreshold);
  });
});
```

Run: `npx vitest run apps/web/src/scene/effects`
Expected: FAIL, `./effectsConfig` not found.

- [ ] **Step 3: Implement**

`apps/web/src/scene/effects/effectsConfig.ts`:

```ts
import { ToneMappingMode } from 'postprocessing';
import type { Color } from 'three';

/**
 * Threshold 1 in linear light: only HDR colours bloom, which today means the Sun (`SUN_GLOW_COLOR`). Planets and
 * lines are LDR and stay crisp.
 */
export const BLOOM_SETTINGS = {
  luminanceThreshold: 1,
  luminanceSmoothing: 0.2,
  intensity: 1.5,
  mipmapBlur: true,
} as const;

/** Applied once, at the end of the effect chain; the renderer itself does none (`<Canvas flat>`). */
export const TONE_MAPPING_MODE = ToneMappingMode.ACES_FILMIC;

/** Rec. 709 luma weights on linear RGB, the quantity the bloom threshold compares against. */
export function relativeLuminance(color: Color): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}
```

`apps/web/src/scene/effects/Effects.tsx`:

```tsx
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { HalfFloatType } from 'three';
import { BLOOM_SETTINGS, TONE_MAPPING_MODE } from './effectsConfig';

/** Half-float buffers keep colours above 1 until tone mapping, so the bloom threshold can see them. */
export function Effects() {
  return (
    <EffectComposer frameBufferType={HalfFloatType}>
      <Bloom {...BLOOM_SETTINGS} />
      <ToneMapping mode={TONE_MAPPING_MODE} />
    </EffectComposer>
  );
}
```

In `SceneCanvas.tsx`, add the `flat` prop to `<Canvas>` and render `<Effects />` as the last child before `<Stats />`.

Run: `npx vitest run apps/web/src/scene/effects`
Expected: PASS.

- [ ] **Step 4: Look at it and measure.** `npm run dev`, Chrome in a **focused, foreground** window. Check: the Sun
      glows, planets and orbit lines do not; colours are not washed out (tone mapping applied once). Read the
      Stats panel at the default view and zoomed onto Earth for 10 s each. Record fps and the machine in PROGRESS.
      Below 58 fps: stop and hand back with the numbers.

- [ ] **Step 5: Finish** (per-task workflow). Checklist item 6. PROGRESS decisions:
  - Bloom threshold 1 (linear), mipmap blur; ACES filmic tone mapping in the composer, none in the renderer.
  - Half-float frame buffers.
  - Measured fps (default view and at Earth) with the machine.

Commit: `Add bloom and tone mapping through a postprocessing composer`.

---

### Task 7: Render-loop test: nothing per-frame goes through React state

Branch: `phase-3/render-loop-test`.

**Files:**

- Create: `apps/web/src/scene/SceneContents.tsx`
- Modify: `apps/web/src/scene/SceneCanvas.tsx` (render `<SceneContents />`)
- Test: `apps/web/src/scene/SceneContents.test.tsx`

**Interfaces:**

- Consumes: `SimulationClock`, `SolarSystem`, `CameraRigController`, `timeStore`.
- Produces: `<SceneContents />`: everything inside the canvas except `Effects` and `Stats`, which need a real
  WebGL context.

- [ ] **Step 1: Extract `SceneContents`** `apps/web/src/scene/SceneContents.tsx`

```tsx
import { CameraRigController } from './camera/CameraRigController';
import { SolarSystem } from './bodies/SolarSystem';
import { SimulationClock } from './SimulationClock';

const AMBIENT_LIGHT_INTENSITY = 0.03;

export function SceneContents() {
  return (
    <>
      <SimulationClock />
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
      <SolarSystem />
      <CameraRigController />
    </>
  );
}
```

In `SceneCanvas.tsx`, replace those four children with `<SceneContents />` (keep `color`, `Effects`, `Stats`).

- [ ] **Step 2: Write the test** `apps/web/src/scene/SceneContents.test.tsx`

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Profiler } from 'react';
import { describe, expect, it } from 'vitest';
import { timeStore } from '../time/timeStore';
import { SceneContents } from './SceneContents';

const J2000_JD_TDB = 2_451_545;

describe('the render loop', () => {
  it('runs 120 frames without a single React commit', async () => {
    let commits = 0;
    timeStore.scrubTo(J2000_JD_TDB);
    timeStore.setRate(1);
    timeStore.setPlaying(true);
    const renderer = await ReactThreeTestRenderer.create(
      <Profiler id="scene" onRender={() => (commits += 1)}>
        <SceneContents />
      </Profiler>,
    );
    // The mount itself commits; seeing it proves the Profiler reports here, so 0 below is meaningful.
    expect(commits).toBeGreaterThan(0);
    commits = 0;
    await renderer.advanceFrames(120, 1 / 60);
    expect(timeStore.state.jdTdb).toBeGreaterThan(J2000_JD_TDB);
    expect(commits).toBe(0);
    await renderer.unmount();
  });
});
```

- [ ] **Step 3: Run it**

Run: `npx vitest run apps/web/src/scene/SceneContents.test.tsx`
Expected: PASS. It passes on the first run because Tasks 2–5 already follow the rule; to prove it can fail,
temporarily add `const [, setTick] = useState(0);` and `useFrame(() => setTick((tick) => tick + 1));` to
`SimulationClock`, see it fail with a non-zero `commits`, then revert. If OrbitControls cannot attach to the
test renderer's mock canvas, stop and hand back (guardrails): do not drop the rig from the test silently.

- [ ] **Step 4: Finish** (per-task workflow). Checklist item 7. PROGRESS decisions:
  - `SceneContents.test.tsx` enforces "nothing per-frame through React state": 120 frames, zero commits.

Commit: `Test that the scene runs frames without React commits`.

---

### Task 8: Phase 3 close-out

Branch: `phase-3/close-out`, after Tasks 1–7 are merged.

- [ ] **Step 1: `npm run check` on up-to-date `main`.** Expected: green.

- [ ] **Step 2: Verify the exit criteria by hand** (`npm run dev`, Chrome, focused foreground window):
  - **Planets match the engine at any scrubbed date:** covered by `SolarSystem.test.tsx`. Cross-check by eye:
    scrub to 2003-08-27 (Mars's closest opposition in 60,000 years); Sun, Earth and Mars should line up.
  - **No visible jitter zoomed to Earth at 1 AU:** focus Earth, zoom to the minimum, play at 1 d/s and at
    10 yr/s for 10 s each. The sphere must not shimmer or shake.
  - **Steady 60 fps on a mid-range laptop:** Stats panel at the default view, zoomed at Earth, and at 10 yr/s.
    Record the numbers and the machine.

- [ ] **Step 3: Update `PROGRESS.md`:** Phase 3 ✅ Done, current phase → Phase 4, an exit-criteria paragraph
      (commit, CI run, fps numbers), and resolve the Known issue "the Stats panel read 1 FPS in the automated tab"
      with the focused-window measurement.

- [ ] **Step 4: PR** (`type:docs`, `phase:3`, `area:infra`). After the user merges and CI on `main` is green:
      close the milestone, tag the merge commit `v0.3.0` (annotated), publish a release summarising the phase,
      and move all Phase 3 issues and PRs to Done on the board.

Commit: `Mark Phase 3 done in PROGRESS.md and move the current phase to Phase 4`.
