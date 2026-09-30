# Phase 4: Shot 1: The Swarm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The opening shot: the camera pulls back from Earth to reveal ~40k real near-Earth asteroid orbits
glowing around the Sun while time accelerates, at ≥ 60 fps on a mid-range laptop.

**Architecture:** Planets, the camera and the focused object stay on the CPU in float64 (Phase 3). The swarm is the
one thing positioned on the GPU. At load, `/api/neos` columns are turned once into float32 instanced attributes:
per object, its eccentricity, its mean anomaly at a **reference epoch** and its mean motion, plus the two in-plane
axes of its orbit (towards perihelion scaled by `a`, and 90° ahead scaled by `b`) already in scene axes. Each frame
the CPU computes, in float64, the days elapsed since the reference epoch and the scene origin, and hands both to
the shader as uniforms. The vertex shader solves Kepler's equation with a fixed number of Newton steps and places
the point at `(cos E − e)·A + sin E·B − origin`. A float32 JavaScript port of the same function is what the tests
check against the float64 engine, since GLSL cannot run under Vitest.

**Tech Stack:** TypeScript 6 (strict, ESM), React 19, three 0.186 (`ShaderMaterial`, WebGL2 / GLSL ES 3.0),
@react-three/fiber 9.8, @react-three/drei 10.7, @react-three/postprocessing 3.1, Vitest 5, fast-check. Shaders are
imported with Vite's built-in `?raw` suffix (no plugin; Vitest resolves it too).

**Spec:** `PLAN.md` § Phase 4, plus decisions approved while planning (2026-09-30):

1. **Float32 precision.** JD values (~2.46e6) cannot live in float32, so none reach the GPU. At load, the CPU
   advances each NEO's mean anomaly in float64 from its own epoch to one shared reference epoch (the simulation
   time when the swarm is built). Each frame the CPU computes `Δt = jdTdb − referenceJdTdb` in float64 and passes
   it as a float32 uniform; the shader only adds `n · Δt`. The scene origin is also a uniform and is subtracted in
   the shader. Float32 error at 1 AU is about 1e-7 AU (15 km), invisible at swarm scale; Task 3 measures the real
   error, including at the far ends of 1800–2050.
2. **Kepler in the shader.** A fixed 6 Newton iterations from Mikkola's cubic starting value (amended
   2026-09-30: from E₀ = π, 6 steps left E ~0.1 rad off at e = 0.99 near perihelion; see Task 2). Eccentricity is
   clamped to ≤ 0.99 when the attributes are built, so the GPU and the JS port see the same value. Hyperbolic
   orbits never occur (the schema requires e < 1).
3. **Where the port lives.** `apps/web/src/scene/swarm/`: the GLSL beside a float32 JS port that rounds every
   intermediate with `Math.fround`. `packages/orbit` stays the float64 truth; its one change is
   exporting `perifocalBasis` (Task 1, amended 2026-09-30) so the swarm reuses the engine's rotation.
4. **Cross-check tolerance.** Not chosen up front. Task 3 measures float32-vs-engine error over sampled NEOs and
   proposes a tolerance with that evidence for the user to approve, as for the golden tests.
5. **Trails.** Short comet-like trails: the vertex shader re-solves Kepler at 8 earlier times per object
   (≈ 320k trail vertices). Full ellipses for 40k orbits are too heavy.
6. **Opening move.** A pull-back from Earth to a ~4 AU overview over ~12 s, while the time rate ramps from real
   time to ~1 month/s. Any click or key skips it. A caption labels the colours and trails as illustrative.

## Global Constraints

- No AI/LLM calls anywhere in shipped code.
- Tests never touch the network. Swarm tests build small catalogs in code; nothing reads `apps/web/public/snapshot`.
- `packages/orbit` keeps zero runtime dependencies; its only Phase 4 change is exporting `perifocalBasis` (Task 1).
- The web app gets NEOs only through `loadDataset('neos')` (server first, bundled snapshot second).
- World unit = 1 AU. Only `sceneFrame.ts` maps ecliptic → scene axes; the swarm's attribute builder calls
  `sceneAxesFromEcliptic` rather than repeating the mapping, and the shader works in scene axes throughout.
- No JD, and no heliocentric position larger than the scene needs, is ever converted to float32 on the CPU side
  except through the attribute builder and the per-frame `Δt` / origin uniforms.
- Never drive per-frame animation through React state: `useFrame` + refs only, ordered by `FRAME_PRIORITY`.
  The swarm's uniforms update at `sceneObjects` priority, after the camera rig has set the origin.
- Swarm positions are two-body approximations far from each NEO's epoch. They are never shown as facts; any
  number shown for a NEO comes from the JPL data itself. Colours, sizes and trails are illustrative.
- New dependencies: none planned. Any need found during a task is proposed at that task's review.
- TypeScript strict, ESM, no `any`, units in names (`jdTdb`, `semiMajorAxisAu`, `meanMotionRadPerDay`).
- Functions < 20 lines, ≤ 2 arguments (wrap 3+ in an object; an optional trailing `out` follows the engine's
  convention), `try/catch` isolated in its own function.
- **Guardrails (CLAUDE.md):** at most 3 tool loops per turn before pausing. If a command fails unexpectedly, stop,
  show the output, and hand back. "Run it to see it fail" steps are expected failures; anything else is not.
  No full-file rewrites of existing files.
- **Per-task workflow:** branch `phase-4/<name>` off an up-to-date `main` (if the previous task's PR is not merged
  yet, branch off that branch and say so in the PR). Before starting, review the task against `main`: imports
  exist with the expected signatures, and the code meets CLAUDE.md's clean-code rules; propose numbered changes
  and wait for approval. Finish with `npm run format && npm run check` green, tick the item in `PROGRESS.md` and
  add the listed decisions, record any deviation in the task's section of this plan, commit (functional
  description only, no trailers), push,
  `gh pr create --assignee @me --milestone "Phase 4: Shot 1: The Swarm" --label <labels>` with `Closes #N` in a
  plain-English body, add the PR to project 1 and set the issue to In Progress. The user merges.

## Review Focus

1. **Scrubbing to 1800 or 2050:** `Δt` reaches ~±90,000 days, where float32 steps are ~0.008 days. Positions
   must stay visually right: Task 3 measures the error at both ends of the range.
2. **High eccentricity near perihelion:** Newton must converge in 6 steps for e = 0.99 at M near 0, where the
   plain start E₀ = M fails; Task 2 tests it.
3. **The server down:** the swarm loads from the bundled snapshot; if both fail, the scene keeps running without
   a swarm and says so, instead of throwing (Task 4 test).
4. **Changing focus or flying:** the swarm follows the floating origin in the same frame as the planets, with no
   one-frame lag (uniforms update after the camera rig; Task 4 test).
5. **Nothing per-frame through React:** the Phase 3 render-loop test still passes with the swarm mounted.

## File Map

```
apps/web/src/data/useNeoCatalog.ts  Task 4  loads the NEO catalog once (server, then snapshot)
apps/web/src/scene/swarm/
  swarmAttributes.ts        Task 1  NeoCatalog → float32 attributes (pure)
  swarmTestSupport.ts       Task 1  test helpers shared by Tasks 1–3
  swarmKepler.glsl          Task 2  GPU Kepler solver + position (trail timing added in Task 5)
  swarmKepler.ts            Task 2  float32 JS port of swarmKepler.glsl
  swarmCrossCheck.test.ts   Task 3  JS port vs the float64 engine
  swarmLook.ts              Task 4  size/brightness by H, class colours (illustrative)
  swarmUniforms.ts          Task 4  per-frame uniforms (elapsed days, Sun offset)
  swarm.vert / swarm.frag   Task 4  point sprites
  Swarm.tsx                 Task 4  geometry, material, frame update
  SwarmStatus.tsx           Task 4  data line: count, source, date; or "unavailable"
  swarmTrails.vert / .frag  Task 5  trails
  SwarmTrails.tsx           Task 5  instanced trail lines
  SwarmControls.tsx         Task 5  trails toggle
apps/web/src/scene/opening/ Task 6  scripted camera move + time ramp
```

---

### Task 0: Tracking setup (after plan approval)

The Phase 4 checklist is already in `PROGRESS.md` (commit `8673bc6` on `phase-4/plan`), the milestone
`Phase 4: Shot 1: The Swarm` exists, and issues #56–#62 exist, one per checklist item:

| Issue | Task | Checklist item                                                    |
| ----- | ---- | ----------------------------------------------------------------- |
| #56   | 1    | Swarm data: `/api/neos` columns → typed arrays, with orbit class  |
| #57   | 2    | GPU Kepler solver in the vertex shader + float32 JS port          |
| #58   | 3    | GPU vs CPU cross-check test                                       |
| #59   | 4    | Look: additive point sprites, size/brightness by H, class colours |
| #60   | 5    | Faint orbit trails                                                |
| #61   | 6    | Choreography: scripted opening camera move + time ramp            |
| #62   | 7    | Exit verification: 40k objects at ≥ 60 fps, smooth opening move   |

- [ ] **Step 1: Check every issue is on project 1 with Status Todo** (`gh project item-list 1 --owner rvpanoz
--format json`); add any that is missing with `gh project item-add` and set its Status.

- [ ] **Step 2: Commit the plan on `phase-4/plan` and open a `type:docs` PR** (`phase:4`, `area:infra`,
      milestone `Phase 4: Shot 1: The Swarm`, no `Closes`).

```bash
git add docs/superpowers/plans/2026-09-30-phase-4-the-swarm.md
git commit -m "Add the Phase 4 swarm plan"
git push -u origin phase-4/plan
```

---

### Task 1: Swarm data: `/api/neos` columns → typed arrays for instanced attributes

Branch: `phase-4/swarm-data`. Closes #56. Labels: `type:feature`, `phase:4`, `area:web`, `area:data`.

This task is the pure transformation only. Loading the dataset and handing the arrays to three.js is Task 4, where
they are first drawn.

**Checked against `main` (2026-09-30):** `@perihelion/orbit` exports `OrbitalElements`, `propagateElements`
(which wraps M into [0, 2π)) and `meanMotionRadPerDay`. The perifocal rotation already exists as the private
`perifocalBasis` in `elements.ts`, so Step 1 exports it instead of repeating it (the PR also gets `area:orbit`).
There is no exported degrees → radians helper (`planets.ts` keeps its own `RAD_PER_DEG`), so this file converts at
its own I/O boundary. `noUncheckedIndexedAccess` is on, so catalog columns are read through a guard.

**Files:**

- Modify: `packages/orbit/src/elements.ts` (export `perifocalBasis`)
- Test: `packages/orbit/src/elements.test.ts` (test `perifocalBasis`)
- Create: `apps/web/src/scene/swarm/swarmAttributes.ts`
- Test: `apps/web/src/scene/swarm/swarmAttributes.test.ts`
- Create: `apps/web/src/scene/swarm/swarmTestSupport.ts` (test helpers shared with Tasks 2 and 3)

**Interfaces:**

- Consumes: `NeoCatalog`, `NEO_ORBIT_CLASSES` from `@perihelion/data`; `OrbitalElements`, `Vector3`,
  `propagateElements`, `meanMotionRadPerDay`, `perifocalBasis` from `@perihelion/orbit`; `sceneAxesFromEcliptic`
  from `../sceneFrame`.
- Produces:
  - `perifocalBasis(elements: OrbitalElements): { towardPerihelion: Vector3; towardQuadrature: Vector3 }`
    (now exported; ecliptic J2000 unit vectors)
  - `neoElementsAt(catalog: NeoCatalog, index: number): OrbitalElements` (degrees → radians; Task 3 reuses it)
  - `buildSwarmAttributes(catalog: NeoCatalog, referenceJdTdb: number): SwarmAttributes`
  - `interface SwarmAttributes { count; referenceJdTdb; motion; perihelionAxisAu; minorAxisAu; appearance }`, where
    the four arrays are `Float32Array`s laid out per `SWARM_ATTRIBUTE_SIZES`:
    - `motion` (3): eccentricity (clamped), mean anomaly at the reference epoch (rad, in [0, 2π)), mean motion
      (rad/day)
    - `perihelionAxisAu` (3): unit vector towards perihelion × `a`, scene axes
    - `minorAxisAu` (3): unit vector 90° ahead of perihelion × `b = a√(1 − e²)`, scene axes
    - `appearance` (2): absolute magnitude H, orbit class index in `NEO_ORBIT_CLASSES` order
  - `columnValue<T>(column: ArrayLike<T>, index: number): T` (throws `RangeError` on a missing entry; Task 2 reads
    attributes with it)
  - `MAX_SWARM_ECCENTRICITY = 0.99`, `UNKNOWN_ABSOLUTE_MAGNITUDE = 30`

Why the axes are pre-scaled: a point on the orbit is `a(cos E − e)·P + b·sin E·Q` (P, Q the unit perifocal axes).
Storing `a·P` and `b·Q` leaves the shader two multiply-adds and no trigonometry of the orientation angles.

- [ ] **Step 1: Export `perifocalBasis` from the engine, with a test**

In `packages/orbit/src/elements.ts`, change `function perifocalBasis(` to `export function perifocalBasis(` (it is
re-exported through `index.ts`'s `export * from './elements'`). Append to `packages/orbit/src/elements.test.ts`,
adding `perifocalBasis`, `dot`, `norm` and `fc` to its imports where missing:

```ts
describe('perifocalBasis', () => {
  const angleRad = fc.double({ min: -Math.PI, max: Math.PI, noNaN: true });
  const orientation = fc.record({
    inclinationRad: angleRad,
    longitudeOfAscendingNodeRad: angleRad,
    argumentOfPerihelionRad: angleRad,
  });
  const ORBIT_SHAPE = {
    semiMajorAxisAu: 1,
    eccentricity: 0.1,
    meanAnomalyRad: 0,
    epochJdTdb: 2451545,
  };

  it('returns two orthogonal unit vectors for any orientation', () => {
    fc.assert(
      fc.property(orientation, (angles) => {
        const { towardPerihelion, towardQuadrature } = perifocalBasis({
          ...ORBIT_SHAPE,
          ...angles,
        });
        expect(norm(towardPerihelion)).toBeCloseTo(1, 12);
        expect(norm(towardQuadrature)).toBeCloseTo(1, 12);
        expect(dot(towardPerihelion, towardQuadrature)).toBeCloseTo(0, 12);
      }),
    );
  });

  it('points perihelion to ecliptic north for i = 90°, ω = 90°', () => {
    const { towardPerihelion } = perifocalBasis({
      ...ORBIT_SHAPE,
      inclinationRad: Math.PI / 2,
      longitudeOfAscendingNodeRad: 0,
      argumentOfPerihelionRad: Math.PI / 2,
    });
    [0, 0, 1].forEach((expected, axis) => expect(towardPerihelion[axis]).toBeCloseTo(expected, 12));
  });
});
```

Run: `npx vitest run packages/orbit/src/elements.test.ts`
Expected: PASS (the new 2 tests plus the existing ones; the function already existed, so these pass at once).

- [ ] **Step 2: Write the shared test helpers and the failing test**

`apps/web/src/scene/swarm/swarmTestSupport.ts` (not a test file itself; Tasks 2 and 3 use it too):

```ts
import type { NeoCatalog } from '@perihelion/data';
import { expect } from 'vitest';

export const J2000_JD_TDB = 2451545.0;

/** A one-NEO catalog on an orbit in the ecliptic; each test overrides only what it is about. */
export function catalogOf(overrides: Partial<NeoCatalog> = {}): NeoCatalog {
  return {
    count: 1,
    designation: ['433'],
    name: ['Eros'],
    epochJdTdb: [J2000_JD_TDB],
    eccentricity: [0.2],
    semiMajorAxisAu: [1.5],
    inclinationDeg: [0],
    longitudeOfAscendingNodeDeg: [0],
    argumentOfPerihelionDeg: [0],
    meanAnomalyDeg: [0],
    absoluteMagnitude: [11],
    orbitClass: ['AMO'],
    ...overrides,
  };
}

/** Component-wise closeness; `toEqual` would fail on the −0 the axis mapping can produce. */
export function expectCloseTo(
  actual: ArrayLike<number>,
  expected: readonly number[],
  digits = 6,
): void {
  expect(actual.length).toBe(expected.length);
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, digits));
}
```

`apps/web/src/scene/swarm/swarmAttributes.test.ts`:

```ts
import { NEO_ORBIT_CLASSES } from '@perihelion/data';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  MAX_SWARM_ECCENTRICITY,
  UNKNOWN_ABSOLUTE_MAGNITUDE,
  buildSwarmAttributes,
  neoElementsAt,
} from './swarmAttributes';
import { J2000_JD_TDB, catalogOf, expectCloseTo } from './swarmTestSupport';

const GAUSSIAN_K_RAD_PER_DAY = 0.01720209895;
const FLOAT32_DIGITS = 6;

describe('neoElementsAt', () => {
  it('converts the catalog’s degrees to radians and keeps the epoch', () => {
    const catalog = catalogOf({
      inclinationDeg: [90],
      longitudeOfAscendingNodeDeg: [180],
      argumentOfPerihelionDeg: [45],
      meanAnomalyDeg: [270],
    });
    expect(neoElementsAt(catalog, 0)).toEqual({
      semiMajorAxisAu: 1.5,
      eccentricity: 0.2,
      inclinationRad: expect.closeTo(Math.PI / 2, 12),
      longitudeOfAscendingNodeRad: expect.closeTo(Math.PI, 12),
      argumentOfPerihelionRad: expect.closeTo(Math.PI / 4, 12),
      meanAnomalyRad: expect.closeTo(1.5 * Math.PI, 12),
      epochJdTdb: J2000_JD_TDB,
    });
  });

  it('throws when a column is shorter than `count`', () => {
    expect(() => neoElementsAt(catalogOf({ count: 2 }), 1)).toThrow(RangeError);
  });
});

describe('buildSwarmAttributes', () => {
  it('lays out 3 + 3 + 3 + 2 floats per NEO', () => {
    const attributes = buildSwarmAttributes(catalogOf(), J2000_JD_TDB);
    expect(attributes.count).toBe(1);
    expect(attributes.referenceJdTdb).toBe(J2000_JD_TDB);
    expect(attributes.motion).toHaveLength(3);
    expect(attributes.perihelionAxisAu).toHaveLength(3);
    expect(attributes.minorAxisAu).toHaveLength(3);
    expect(attributes.appearance).toHaveLength(2);
  });

  it('advances the mean anomaly from the NEO epoch to the reference epoch at n = k / a^1.5', () => {
    const catalog = catalogOf({ semiMajorAxisAu: [1] });
    const { motion } = buildSwarmAttributes(catalog, J2000_JD_TDB + 10);
    expectCloseTo(motion, [0.2, 10 * GAUSSIAN_K_RAD_PER_DAY, GAUSSIAN_K_RAD_PER_DAY]);
  });

  it('keeps the mean anomaly in [0, 2π) for any epoch offset', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 360, noNaN: true }),
        fc.double({ min: -100_000, max: 100_000, noNaN: true }),
        (meanAnomalyDeg, offsetDays) => {
          const catalog = catalogOf({ meanAnomalyDeg: [meanAnomalyDeg] });
          const [, meanAnomalyRad] = buildSwarmAttributes(
            catalog,
            J2000_JD_TDB + offsetDays,
          ).motion;
          expect(meanAnomalyRad).toBeGreaterThanOrEqual(0);
          expect(meanAnomalyRad).toBeLessThanOrEqual(Math.fround(2 * Math.PI));
        },
      ),
    );
  });

  it('clamps the eccentricity and shortens the minor axis to match', () => {
    const catalog = catalogOf({ eccentricity: [0.999], semiMajorAxisAu: [2] });
    const { motion, minorAxisAu } = buildSwarmAttributes(catalog, J2000_JD_TDB);
    expect(motion[0]).toBeCloseTo(MAX_SWARM_ECCENTRICITY, FLOAT32_DIGITS);
    expectCloseTo(minorAxisAu, [0, 0, -2 * Math.sqrt(1 - MAX_SWARM_ECCENTRICITY ** 2)]);
  });

  it('puts perihelion on scene +x and the motion on scene −z for Ω = ω = i = 0', () => {
    // Scene axes are ecliptic (x, z, −y): perihelion on ecliptic +x, motion towards ecliptic +y.
    const { perihelionAxisAu, minorAxisAu } = buildSwarmAttributes(catalogOf(), J2000_JD_TDB);
    expectCloseTo(perihelionAxisAu, [1.5, 0, 0]);
    expectCloseTo(minorAxisAu, [0, 0, -1.5 * Math.sqrt(1 - 0.2 ** 2)]);
  });

  it('stores H, and the faintest H when SBDB gives none', () => {
    expect(buildSwarmAttributes(catalogOf(), J2000_JD_TDB).appearance[0]).toBe(11);
    const unknown = catalogOf({ absoluteMagnitude: [null] });
    expect(buildSwarmAttributes(unknown, J2000_JD_TDB).appearance[0]).toBe(
      UNKNOWN_ABSOLUTE_MAGNITUDE,
    );
  });

  it.each(NEO_ORBIT_CLASSES.map((orbitClass, index) => [orbitClass, index] as const))(
    'stores orbit class %s as index %i',
    (orbitClass, index) => {
      const catalog = catalogOf({ orbitClass: [orbitClass] });
      expect(buildSwarmAttributes(catalog, J2000_JD_TDB).appearance[1]).toBe(index);
    },
  );
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run apps/web/src/scene/swarm/swarmAttributes.test.ts`
Expected: FAIL, cannot resolve `./swarmAttributes`.

- [ ] **Step 4: Implement** `apps/web/src/scene/swarm/swarmAttributes.ts`

```ts
import { NEO_ORBIT_CLASSES, type NeoCatalog } from '@perihelion/data';
import {
  type OrbitalElements,
  type Vector3,
  meanMotionRadPerDay,
  perifocalBasis,
  propagateElements,
} from '@perihelion/orbit';
import { sceneAxesFromEcliptic } from '../sceneFrame';

/** SBDB gives angles in degrees; the engine works in radians. Converted here, at the I/O boundary. */
const RAD_PER_DEG = Math.PI / 180;

/** Highest eccentricity the GPU solver is given: 6 Newton steps are not enough closer to 1 (plan decision 2). */
export const MAX_SWARM_ECCENTRICITY = 0.99;

/** H for NEOs SBDB gives none for: drawn as the faintest objects in the catalog. */
export const UNKNOWN_ABSOLUTE_MAGNITUDE = 30;

/** Floats per NEO in each instanced attribute; the shaders declare the matching `vec3`/`vec2`. */
export const SWARM_ATTRIBUTE_SIZES = {
  motion: 3,
  perihelionAxisAu: 3,
  minorAxisAu: 3,
  appearance: 2,
} as const;

type SwarmAttributeName = keyof typeof SWARM_ATTRIBUTE_SIZES;

export interface SwarmAttributes extends Record<SwarmAttributeName, Float32Array> {
  count: number;
  /** The epoch the stored mean anomalies refer to; the shader gets `jdTdb − referenceJdTdb` each frame. */
  referenceJdTdb: number;
}

interface AttributeSlot {
  attributes: SwarmAttributes;
  index: number;
}

/** Built once per load, in float64 through the engine; only the finished values are rounded to float32. */
export function buildSwarmAttributes(catalog: NeoCatalog, referenceJdTdb: number): SwarmAttributes {
  const attributes = allocateSwarmAttributes(catalog.count, referenceJdTdb);
  for (let index = 0; index < catalog.count; index += 1) {
    const elements = clampEccentricity(
      propagateElements(neoElementsAt(catalog, index), referenceJdTdb),
    );
    const slot = { attributes, index };
    writeMotion(elements, slot);
    writeAxes(elements, slot);
    writeAppearance(appearanceAt(catalog, index), slot);
  }
  return attributes;
}

export function neoElementsAt(catalog: NeoCatalog, index: number): OrbitalElements {
  return {
    semiMajorAxisAu: columnValue(catalog.semiMajorAxisAu, index),
    eccentricity: columnValue(catalog.eccentricity, index),
    inclinationRad: columnValue(catalog.inclinationDeg, index) * RAD_PER_DEG,
    longitudeOfAscendingNodeRad:
      columnValue(catalog.longitudeOfAscendingNodeDeg, index) * RAD_PER_DEG,
    argumentOfPerihelionRad: columnValue(catalog.argumentOfPerihelionDeg, index) * RAD_PER_DEG,
    meanAnomalyRad: columnValue(catalog.meanAnomalyDeg, index) * RAD_PER_DEG,
    epochJdTdb: columnValue(catalog.epochJdTdb, index),
  };
}

/**
 * Catalog columns (checked by the schema) and attribute arrays (allocated to match) always have `count`
 * entries, so a miss here is a bug, not bad data.
 */
export function columnValue<T>(column: ArrayLike<T>, index: number): T {
  const value = column[index];
  if (value === undefined) throw new RangeError(`Column has no entry ${index}`);
  return value;
}

function allocateSwarmAttributes(count: number, referenceJdTdb: number): SwarmAttributes {
  return {
    count,
    referenceJdTdb,
    motion: new Float32Array(count * SWARM_ATTRIBUTE_SIZES.motion),
    perihelionAxisAu: new Float32Array(count * SWARM_ATTRIBUTE_SIZES.perihelionAxisAu),
    minorAxisAu: new Float32Array(count * SWARM_ATTRIBUTE_SIZES.minorAxisAu),
    appearance: new Float32Array(count * SWARM_ATTRIBUTE_SIZES.appearance),
  };
}

function clampEccentricity(elements: OrbitalElements): OrbitalElements {
  return { ...elements, eccentricity: Math.min(elements.eccentricity, MAX_SWARM_ECCENTRICITY) };
}

function writeMotion(elements: OrbitalElements, { attributes, index }: AttributeSlot): void {
  const meanMotion = meanMotionRadPerDay(elements.semiMajorAxisAu);
  const values = [elements.eccentricity, elements.meanAnomalyRad, meanMotion];
  attributes.motion.set(values, index * SWARM_ATTRIBUTE_SIZES.motion);
}

function writeAxes(elements: OrbitalElements, { attributes, index }: AttributeSlot): void {
  const { semiMajorAxisAu, eccentricity } = elements;
  const semiMinorAxisAu = semiMajorAxisAu * Math.sqrt(1 - eccentricity ** 2);
  const { towardPerihelion, towardQuadrature } = perifocalBasis(elements);
  const perihelionAxis = sceneAxesFromEcliptic(scaledVector(towardPerihelion, semiMajorAxisAu));
  const minorAxis = sceneAxesFromEcliptic(scaledVector(towardQuadrature, semiMinorAxisAu));
  attributes.perihelionAxisAu.set(perihelionAxis, index * SWARM_ATTRIBUTE_SIZES.perihelionAxisAu);
  attributes.minorAxisAu.set(minorAxis, index * SWARM_ATTRIBUTE_SIZES.minorAxisAu);
}

function appearanceAt(catalog: NeoCatalog, index: number): [number, number] {
  const absoluteMagnitude =
    columnValue(catalog.absoluteMagnitude, index) ?? UNKNOWN_ABSOLUTE_MAGNITUDE;
  return [absoluteMagnitude, NEO_ORBIT_CLASSES.indexOf(columnValue(catalog.orbitClass, index))];
}

function writeAppearance(appearance: [number, number], { attributes, index }: AttributeSlot): void {
  attributes.appearance.set(appearance, index * SWARM_ATTRIBUTE_SIZES.appearance);
}

function scaledVector(vector: Readonly<Vector3>, factor: number): Vector3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run apps/web/src/scene/swarm/swarmAttributes.test.ts`
Expected: PASS (12 tests).

**Agreed at review (2026-09-30); the shipped code differs from the snippets above in these points:**

1. `perifocalBasis` takes `Pick<OrbitalElements, 'inclinationRad' | 'longitudeOfAscendingNodeRad' |
'argumentOfPerihelionRad'>` and returns `{ towardPerihelion: Vector3; towardQuadrature: Vector3 }` explicitly,
   so its engine test passes the angles alone: no `ORBIT_SHAPE`, and it reuses the file's existing `angleRad`
   arbitrary instead of redefining it.
2. `elements.test.ts` already imported `fc`, `dot` and `norm`; only `perifocalBasis` was added.
3. `swarmTestSupport.ts` writes `J2000_JD_TDB = 2_451_545` (repo style).
4. The PR also gets `area:orbit`.

- [ ] **Step 6: Finish** (per-task workflow). Checklist item 1. PROGRESS decisions:
  - The swarm's attributes are built once per load in float64 through the engine (`propagateElements`,
    `meanMotionRadPerDay`, `perifocalBasis`) and rounded to float32 at the end: per NEO, eccentricity (clamped to
    ≤ 0.99), mean anomaly at a shared reference epoch and mean motion, and the two in-plane orbit axes pre-scaled
    by `a` and `b`, in scene axes.
  - `perifocalBasis` is exported from `packages/orbit` so the swarm reuses the engine's rotation.
  - NEOs without an H are drawn as H = 30 (the faintest).

Commit: `Build the swarm's instanced attributes from the NEO catalog`.

---

### Task 2: GPU Kepler solver in the vertex shader + float32 JS port

Branch: `phase-4/gpu-kepler`. Closes #57. Labels: `type:feature`, `phase:4`, `area:orbit`, `area:web`.

**Found while planning (amends decision 2):** starting from E₀ = π, 6 Newton steps at e = 0.99 and M → 0 still
leave E about 0.1 rad off (worked by hand: π → 1.56 → 0.99 → 0.64 → 0.40 → 0.23 → 0.11, against a true E ≈ 0).
That is about 0.03 AU at perihelion for a = 2 AU. The start is therefore Mikkola's cubic approximation, close enough
everywhere that Newton converges quadratically from the first step. The property test below checks every
e ≤ 0.99.

**Why a port at all:** Vitest cannot run GLSL, and jsdom has no WebGL. The shader and `swarmKepler.ts` are
written statement for statement, and the tests check the port. Each statement's result is rounded to float32.
Rounding every single operation would not match the hardware exactly either, because GPUs may fuse multiply-adds.
The Task 3 tolerance covers that difference. The shader first compiles in Task 4, in Chrome.

**Files:**

- Create: `apps/web/src/scene/swarm/swarmKepler.glsl`
- Create: `apps/web/src/scene/swarm/swarmKepler.ts`
- Test: `apps/web/src/scene/swarm/swarmKepler.test.ts`

**Interfaces:**

- Consumes: `SwarmAttributes`, `columnValue` from `./swarmAttributes`; `Vector3` from `@perihelion/orbit`.
- Produces:
  - GLSL: `struct SwarmOrbit { vec3 motion; vec3 perihelionAxisAu; vec3 minorAxisAu; }`,
    `float swarmEccentricAnomaly(float meanAnomalyRad, float eccentricity)`,
    `vec3 swarmHeliocentricPosition(SwarmOrbit orbit, float elapsedDays)` (scene axes, AU, Sun-centred; the
    vertex shader subtracts the origin uniform).
  - TS: `SWARM_NEWTON_STEPS = 6`, `interface SwarmOrbit` (same fields as `Readonly<Vector3>`),
    `swarmOrbitAt(attributes: SwarmAttributes, index: number): SwarmOrbit`,
    `swarmEccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number`,
    `swarmHeliocentricPosition(orbit: SwarmOrbit, elapsedDays: number, out?: Vector3): Vector3`.

- [ ] **Step 1: Write the failing test** `apps/web/src/scene/swarm/swarmKepler.test.ts`

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildSwarmAttributes } from './swarmAttributes';
import swarmKeplerGlsl from './swarmKepler.glsl?raw';
import {
  SWARM_NEWTON_STEPS,
  swarmEccentricAnomaly,
  swarmHeliocentricPosition,
  swarmOrbitAt,
} from './swarmKepler';
import { J2000_JD_TDB, catalogOf, expectCloseTo } from './swarmTestSupport';

const GAUSSIAN_K_RAD_PER_DAY = 0.01720209895;

/**
 * About 40 float32 steps at E = π. Converged answers sit near 1e-7; one Newton step short of converged at
 * e = 0.99 is ~1e-3, so this separates the two cleanly.
 */
const KEPLER_RESIDUAL_TOLERANCE_RAD = 1e-5;

/** Kepler's equation, in float64, on the solver's float32 answer; M is centred on [−π, π) as the solver does. */
function keplerResidualRad(meanAnomalyRad: number, eccentricity: number): number {
  const eccentricAnomalyRad = swarmEccentricAnomaly(meanAnomalyRad, eccentricity);
  const centredRad = meanAnomalyRad >= Math.PI ? meanAnomalyRad - 2 * Math.PI : meanAnomalyRad;
  return eccentricAnomalyRad - eccentricity * Math.sin(eccentricAnomalyRad) - centredRad;
}

const float32MeanAnomalyRad = fc
  .double({ min: 0, max: 2 * Math.PI, maxExcluded: true, noNaN: true })
  .map(Math.fround);
const float32Eccentricity = fc.double({ min: 0, max: 0.99, noNaN: true }).map(Math.fround);

describe('swarmEccentricAnomaly', () => {
  it('solves Kepler’s equation to float32 precision for every e ≤ 0.99', () => {
    fc.assert(
      fc.property(float32MeanAnomalyRad, float32Eccentricity, (meanAnomalyRad, eccentricity) => {
        expect(Math.abs(keplerResidualRad(meanAnomalyRad, eccentricity))).toBeLessThan(
          KEPLER_RESIDUAL_TOLERANCE_RAD,
        );
      }),
      { numRuns: 10_000 },
    );
  });

  it.each([
    ['e = 0.99 just past perihelion', 1e-6, 0.99],
    ['e = 0.99, M = 0.001', 1e-3, 0.99],
    ['e = 0.99, M = 0.05', 0.05, 0.99],
    ['e = 0.99 just before aphelion', Math.PI - 1e-4, 0.99],
    ['e = 0.99 just before perihelion', 2 * Math.PI - 1e-3, 0.99],
    ['a circle', 1, 0],
    ['e = 0.5 at aphelion', Math.PI, 0.5],
  ])('converges for %s', (_case, meanAnomalyRad, eccentricity) => {
    const residualRad = keplerResidualRad(Math.fround(meanAnomalyRad), Math.fround(eccentricity));
    expect(Math.abs(residualRad)).toBeLessThan(KEPLER_RESIDUAL_TOLERANCE_RAD);
  });

  it('returns float32 values, as the GPU would', () => {
    fc.assert(
      fc.property(float32MeanAnomalyRad, float32Eccentricity, (meanAnomalyRad, eccentricity) => {
        const eccentricAnomalyRad = swarmEccentricAnomaly(meanAnomalyRad, eccentricity);
        expect(Math.fround(eccentricAnomalyRad)).toBe(eccentricAnomalyRad);
      }),
    );
  });
});

describe('swarmHeliocentricPosition', () => {
  it('moves a circular ecliptic orbit a quarter revolution in a quarter period', () => {
    const catalog = catalogOf({ eccentricity: [0], semiMajorAxisAu: [1], meanAnomalyDeg: [90] });
    const orbit = swarmOrbitAt(buildSwarmAttributes(catalog, J2000_JD_TDB), 0);
    // Scene axes are ecliptic (x, z, −y): M = 90° is ecliptic +y, M = 180° is ecliptic −x.
    expectCloseTo(swarmHeliocentricPosition(orbit, 0), [0, 0, -1], 5);
    const quarterPeriodDays = Math.PI / 2 / GAUSSIAN_K_RAD_PER_DAY;
    expectCloseTo(swarmHeliocentricPosition(orbit, quarterPeriodDays), [-1, 0, 0], 5);
  });

  it('stays between perihelion and aphelion distance at any time in the scrubbable range', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.99, noNaN: true }),
        fc.double({ min: 0.5, max: 4, noNaN: true }),
        fc.double({ min: -90_000, max: 90_000, noNaN: true }),
        (eccentricity, semiMajorAxisAu, elapsedDays) => {
          const catalog = catalogOf({
            eccentricity: [eccentricity],
            semiMajorAxisAu: [semiMajorAxisAu],
          });
          const orbit = swarmOrbitAt(buildSwarmAttributes(catalog, J2000_JD_TDB), 0);
          const distanceAu = Math.hypot(...swarmHeliocentricPosition(orbit, elapsedDays));
          const float32SlackAu = 1e-6 * semiMajorAxisAu;
          expect(distanceAu).toBeGreaterThan(semiMajorAxisAu * (1 - eccentricity) - float32SlackAu);
          expect(distanceAu).toBeLessThan(semiMajorAxisAu * (1 + eccentricity) + float32SlackAu);
        },
      ),
    );
  });
});

describe('swarmKepler.glsl', () => {
  it('takes as many Newton steps as the JS port', () => {
    expect(swarmKeplerGlsl).toContain(`const int SWARM_NEWTON_STEPS = ${SWARM_NEWTON_STEPS};`);
  });

  it.each([
    'swarmCentredAnomaly',
    'swarmKeplerStart',
    'swarmEccentricAnomaly',
    'swarmHeliocentricPosition',
  ])('defines %s, as the port does', (functionName) => {
    expect(swarmKeplerGlsl).toMatch(new RegExp(`\\b${functionName}\\(`));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run apps/web/src/scene/swarm/swarmKepler.test.ts`
Expected: FAIL, cannot resolve `./swarmKepler.glsl?raw`.

- [ ] **Step 3: Write the shader function** `apps/web/src/scene/swarm/swarmKepler.glsl`

This is a chunk with no `main`: Tasks 4 and 5 prepend it to their vertex shaders.

```glsl
// The swarm's Kepler solver and orbit position, in float32. swarmKepler.ts mirrors it statement for statement
// and is what the tests check against the float64 engine: change both files together.

const float SWARM_PI = 3.14159265358979;
const float SWARM_TWO_PI = 6.28318530717959;
const int SWARM_NEWTON_STEPS = 6;

// One NEO's instanced attributes (built by swarmAttributes.ts).
struct SwarmOrbit {
  vec3 motion;           // eccentricity, mean anomaly at the reference epoch (rad), mean motion (rad/day)
  vec3 perihelionAxisAu; // towards perihelion × a, scene axes
  vec3 minorAxisAu;      // 90° ahead of perihelion × b, scene axes
};

// M from [0, 2π) to [−π, π), the range Mikkola's start is derived for.
float swarmCentredAnomaly(float meanAnomalyRad) {
  return meanAnomalyRad >= SWARM_PI ? meanAnomalyRad - SWARM_TWO_PI : meanAnomalyRad;
}

// Mikkola's cubic starting value (S. Mikkola, "A cubic approximation for Kepler's equation", Celestial
// Mechanics 40, 1987, 329–334): with s ≈ sin(E/3), sin E = 3s − 4s³ turns Kepler's equation into a cubic in s.
// The cube root's sign follows beta; the sign is never 0, so alpha / cubeRoot cannot divide by zero.
float swarmKeplerStart(float meanAnomalyRad, float eccentricity) {
  float denominator = 4.0 * eccentricity + 0.5;
  float alpha = (1.0 - eccentricity) / denominator;
  float beta = 0.5 * meanAnomalyRad / denominator;
  float direction = beta < 0.0 ? -1.0 : 1.0;
  float cubeRoot = direction * pow(abs(beta) + sqrt(beta * beta + alpha * alpha * alpha), 1.0 / 3.0);
  float sinThirdAnomaly = cubeRoot - alpha / cubeRoot;
  // Mikkola's fifth-order correction; s·s·s·s·s because pow() is undefined for a negative base.
  float corrected = sinThirdAnomaly - 0.078 * sinThirdAnomaly * sinThirdAnomaly * sinThirdAnomaly
    * sinThirdAnomaly * sinThirdAnomaly / (1.0 + eccentricity);
  return meanAnomalyRad + eccentricity * corrected * (3.0 - 4.0 * corrected * corrected);
}

// A fixed step count keeps every vertex on the same path (no divergent loops). The slope 1 − e·cos E is at
// least 0.01 because eccentricity is clamped to 0.99 when the attributes are built.
float swarmEccentricAnomaly(float meanAnomalyRad, float eccentricity) {
  float centredRad = swarmCentredAnomaly(meanAnomalyRad);
  float eccentricAnomalyRad = swarmKeplerStart(centredRad, eccentricity);
  for (int step = 0; step < SWARM_NEWTON_STEPS; step++) {
    float residualRad = eccentricAnomalyRad - eccentricity * sin(eccentricAnomalyRad) - centredRad;
    float slope = 1.0 - eccentricity * cos(eccentricAnomalyRad);
    eccentricAnomalyRad = eccentricAnomalyRad - residualRad / slope;
  }
  return eccentricAnomalyRad;
}

// Sun-centred position in scene axes (AU): a(cos E − e)·P + b·sin E·Q, with a·P and b·Q pre-scaled.
vec3 swarmHeliocentricPosition(SwarmOrbit orbit, float elapsedDays) {
  float eccentricity = orbit.motion.x;
  float advancedRad = orbit.motion.y + orbit.motion.z * elapsedDays;
  float meanAnomalyRad = mod(advancedRad, SWARM_TWO_PI);
  float eccentricAnomalyRad = swarmEccentricAnomaly(meanAnomalyRad, eccentricity);
  float alongMajor = cos(eccentricAnomalyRad) - eccentricity;
  float alongMinor = sin(eccentricAnomalyRad);
  return alongMajor * orbit.perihelionAxisAu + alongMinor * orbit.minorAxisAu;
}
```

- [ ] **Step 4: Write the port** `apps/web/src/scene/swarm/swarmKepler.ts`

```ts
import type { Vector3 } from '@perihelion/orbit';
import { type SwarmAttributes, columnValue } from './swarmAttributes';

// Float32 port of swarmKepler.glsl, statement for statement: each statement's result is rounded to float32,
// as the GPU stores it. Change both files together; the GLSL has the derivations.

const float32 = Math.fround;

export const SWARM_PI = float32(Math.PI);
export const SWARM_TWO_PI = float32(2 * Math.PI);
export const SWARM_NEWTON_STEPS = 6;

/** One NEO's instanced attributes, as the vertex shader receives them. */
export interface SwarmOrbit {
  motion: Readonly<Vector3>;
  perihelionAxisAu: Readonly<Vector3>;
  minorAxisAu: Readonly<Vector3>;
}

export function swarmOrbitAt(attributes: SwarmAttributes, index: number): SwarmOrbit {
  return {
    motion: vectorAt(attributes.motion, index),
    perihelionAxisAu: vectorAt(attributes.perihelionAxisAu, index),
    minorAxisAu: vectorAt(attributes.minorAxisAu, index),
  };
}

function vectorAt(values: Float32Array, index: number): Vector3 {
  const start = index * 3;
  return [
    columnValue(values, start),
    columnValue(values, start + 1),
    columnValue(values, start + 2),
  ];
}

function centredAnomaly(meanAnomalyRad: number): number {
  return meanAnomalyRad >= SWARM_PI ? float32(meanAnomalyRad - SWARM_TWO_PI) : meanAnomalyRad;
}

/** Mikkola's cubic starting value; see swarmKepler.glsl for the source and the derivation. */
function keplerStart(meanAnomalyRad: number, eccentricity: number): number {
  const denominator = float32(4 * eccentricity + 0.5);
  const alpha = float32((1 - eccentricity) / denominator);
  const beta = float32((0.5 * meanAnomalyRad) / denominator);
  const direction = beta < 0 ? -1 : 1;
  const cubeRoot = float32(
    direction * Math.cbrt(Math.abs(beta) + Math.sqrt(beta * beta + alpha ** 3)),
  );
  const sinThirdAnomaly = float32(cubeRoot - alpha / cubeRoot);
  const corrected = float32(sinThirdAnomaly - (0.078 * sinThirdAnomaly ** 5) / (1 + eccentricity));
  return float32(meanAnomalyRad + eccentricity * corrected * (3 - 4 * corrected * corrected));
}

export function swarmEccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number {
  const centredRad = centredAnomaly(meanAnomalyRad);
  let eccentricAnomalyRad = keplerStart(centredRad, eccentricity);
  for (let step = 0; step < SWARM_NEWTON_STEPS; step += 1) {
    const sine = float32(Math.sin(eccentricAnomalyRad));
    const residualRad = float32(eccentricAnomalyRad - eccentricity * sine - centredRad);
    const slope = float32(1 - eccentricity * float32(Math.cos(eccentricAnomalyRad)));
    eccentricAnomalyRad = float32(eccentricAnomalyRad - residualRad / slope);
  }
  return eccentricAnomalyRad;
}

/** Sun-centred position in scene axes (AU). Pass `out` on hot paths to avoid allocating. */
export function swarmHeliocentricPosition(
  orbit: SwarmOrbit,
  elapsedDays: number,
  out: Vector3 = [0, 0, 0],
): Vector3 {
  const [eccentricity, meanAnomalyAtReferenceRad, meanMotionRadPerDay] = orbit.motion;
  const advancedRad = float32(
    meanAnomalyAtReferenceRad + meanMotionRadPerDay * float32(elapsedDays),
  );
  const eccentricAnomalyRad = swarmEccentricAnomaly(
    glslMod(advancedRad, SWARM_TWO_PI),
    eccentricity,
  );
  const alongMajor = float32(float32(Math.cos(eccentricAnomalyRad)) - eccentricity);
  const alongMinor = float32(Math.sin(eccentricAnomalyRad));
  for (const axis of [0, 1, 2] as const) {
    out[axis] = float32(
      alongMajor * orbit.perihelionAxisAu[axis] + alongMinor * orbit.minorAxisAu[axis],
    );
  }
  return out;
}

/** GLSL's mod(x, y) = x − y·floor(x/y), which unlike `%` is never negative for positive y. */
function glslMod(value: number, divisor: number): number {
  return float32(value - divisor * Math.floor(float32(value / divisor)));
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run apps/web/src/scene/swarm/swarmKepler.test.ts`
Expected: PASS (16 tests). If the property test fails, that is the solver not converging: stop and report the
counterexample fast-check prints. Do not raise the step count or the tolerance without approval.

**Agreed at review (2026-09-30); the shipped code differs from the snippets above in these points:**

1. The Interfaces bullet saying Task 1's `columnValue` becomes exported was dropped: Task 1 already shipped it.
2. `SWARM_PI` and `SWARM_TWO_PI` are private to `swarmKepler.ts`; only `SWARM_NEWTON_STEPS` is exported.
3. The port's private helpers are named `swarmCentredAnomaly` and `swarmKeplerStart`, as in the GLSL.
4. `vectorAt` reads with a named `VECTOR3_LENGTH` instead of a bare `3`.

- [ ] **Step 6: Finish** (per-task workflow). Checklist item 2. PROGRESS decisions:
  - The swarm's Kepler solver starts from Mikkola's cubic approximation and takes a fixed 6 Newton steps. From
    E₀ = π, 6 steps left E ~0.1 rad off at e = 0.99 near perihelion.
  - The GLSL and its float32 JS port (`swarmKepler.ts`) are kept in step by hand. A test checks that they share the
    step count and function names. The port rounds each statement to float32, and the cross-check (Task 3) tests
    the port.

Commit: `Add the swarm's GPU Kepler solver and its float32 JS port`.

---

### Task 3: GPU vs CPU cross-check test

Branch: `phase-4/gpu-cross-check`. Closes #58. Labels: `type:test`, `phase:4`, `area:orbit`, `area:web`.

**What is compared:** the float32 port (Task 2) against the float64 engine, both two-body from the same elements.
This isolates what the GPU path adds: float32 rounding, `Δt` as a float32 uniform, the fixed-step solver and the
eccentricity clamp. The engine is already checked against Horizons (Phase 1), so Horizons fixtures would add
nothing here. They are not used.

**What "a visual tolerance" means:** the opening shot ends on a ~4 AU-wide overview. At 1920 px, one pixel is
about 0.002 AU. An error well under a pixel is invisible.

**Expected size of the error:** at the ends of the range, `Δt` is ~−83,000 days (1800) or ~+8,500 days (2050)
from a 2026 reference. The float32 steps in `Δt` and in `n·Δt` then put M off by ~1e-4 rad. That is ~1e-4 AU for
most NEOs. Near perihelion at e = 0.99 it could reach ~1e-2 AU, because speed there is ~14× the mean. Step 2
replaces this estimate with a measurement.

**Files:**

- Test: `apps/web/src/scene/swarm/swarmCrossCheck.test.ts`
- Modify: `PROGRESS.md` (calibrated tolerances table)

**Interfaces:**

- Consumes: `stateAtTime(elements, jdTdb)` from `@perihelion/orbit`, as used by `asteroids.golden.test.ts`;
  `buildSwarmAttributes` and `neoElementsAt` (Task 1); `swarmOrbitAt` and `swarmHeliocentricPosition` (Task 2);
  `sceneAxesFromEcliptic`; `catalogOf` from `./swarmTestSupport`.

- [ ] **Step 1: Write the measurement version of the test** `apps/web/src/scene/swarm/swarmCrossCheck.test.ts`

The sample is deterministic: a fixed fast-check seed, plus named shapes covering each orbit class and the hard
cases. The element values are rounded published values, used only as shapes. Both sides get identical elements,
so exactness does not matter.

```ts
import type { NeoCatalog } from '@perihelion/data';
import { stateAtTime } from '@perihelion/orbit';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sceneAxesFromEcliptic } from '../sceneFrame';
import { buildSwarmAttributes, neoElementsAt } from './swarmAttributes';
import { swarmHeliocentricPosition, swarmOrbitAt } from './swarmKepler';
import { catalogOf } from './swarmTestSupport';

/** 2026-09-30 0h TDB: stands in for the load time the app uses as its reference epoch. */
const REFERENCE_JD_TDB = 2_461_313.5;
const JD_TDB_1800 = 2_378_496.5;
const JD_TDB_2050 = 2_469_807.5;

/** Up to ten years either side of the reference epoch: where the swarm is watched most. */
const NEAR_ELAPSED_DAYS = [0, 1, 30, 365.25, -365.25, 3_652.5, -3_652.5];
/** The ends of the scrubbable range (Phase 3 clamps time to 1800–2050). */
const RANGE_END_ELAPSED_DAYS = [JD_TDB_1800 - REFERENCE_JD_TDB, JD_TDB_2050 - REFERENCE_JD_TDB];

const CROSS_CHECK_SEED = 20_260_930;
const SAMPLE_SIZE = 2_000;

const NAMED_SHAPES: Record<string, Partial<NeoCatalog>> = {
  'Amor (Eros-like)': { semiMajorAxisAu: [1.458], eccentricity: [0.223], inclinationDeg: [10.8] },
  'Aten (Apophis-like)': { semiMajorAxisAu: [0.923], eccentricity: [0.191], inclinationDeg: [3.3] },
  'Apollo, q = 0.14 AU (Phaethon-like)': {
    semiMajorAxisAu: [1.271],
    eccentricity: [0.89],
    inclinationDeg: [22.3],
  },
  Atira: { semiMajorAxisAu: [0.74], eccentricity: [0.32], inclinationDeg: [25] },
  'eccentricity at the clamp': { semiMajorAxisAu: [2], eccentricity: [0.99], inclinationDeg: [5] },
  'high inclination': { semiMajorAxisAu: [1.8], eccentricity: [0.4], inclinationDeg: [70] },
};

const degrees = fc.double({ min: 0, max: 360, maxExcluded: true, noNaN: true });
const sampledNeo = fc
  .record({
    semiMajorAxisAu: fc.double({ min: 0.5, max: 4, noNaN: true }),
    eccentricity: fc.double({ min: 0, max: 0.99, noNaN: true }),
    inclinationDeg: fc.double({ min: 0, max: 90, noNaN: true }),
    longitudeOfAscendingNodeDeg: degrees,
    argumentOfPerihelionDeg: degrees,
    meanAnomalyDeg: degrees,
    epochOffsetDays: fc.double({ min: -5_000, max: 5_000, noNaN: true }),
  })
  .map(({ epochOffsetDays, ...elements }) =>
    catalogOf({
      semiMajorAxisAu: [elements.semiMajorAxisAu],
      eccentricity: [elements.eccentricity],
      inclinationDeg: [elements.inclinationDeg],
      longitudeOfAscendingNodeDeg: [elements.longitudeOfAscendingNodeDeg],
      argumentOfPerihelionDeg: [elements.argumentOfPerihelionDeg],
      meanAnomalyDeg: [elements.meanAnomalyDeg],
      epochJdTdb: [REFERENCE_JD_TDB + epochOffsetDays],
    }),
  );

const SAMPLED_NEOS: readonly NeoCatalog[] = [
  ...Object.values(NAMED_SHAPES).map((shape) => catalogOf(shape)),
  ...fc.sample(sampledNeo, { seed: CROSS_CHECK_SEED, numRuns: SAMPLE_SIZE }),
];

/** Distance (AU) between the float32 port and the float64 engine for one NEO, `elapsedDays` after the reference. */
function portErrorAu(catalog: NeoCatalog, elapsedDays: number): number {
  const orbit = swarmOrbitAt(buildSwarmAttributes(catalog, REFERENCE_JD_TDB), 0);
  const portAu = swarmHeliocentricPosition(orbit, elapsedDays);
  const engineState = stateAtTime(neoElementsAt(catalog, 0), REFERENCE_JD_TDB + elapsedDays);
  const engineAu = sceneAxesFromEcliptic(engineState.positionAu);
  return Math.hypot(portAu[0] - engineAu[0], portAu[1] - engineAu[1], portAu[2] - engineAu[2]);
}

function worstErrorAu(elapsedDays: readonly number[]): number {
  return Math.max(
    ...SAMPLED_NEOS.flatMap((catalog) => elapsedDays.map((days) => portErrorAu(catalog, days))),
  );
}

describe('GPU vs CPU cross-check (measurement)', () => {
  it('measures the worst float32 error', () => {
    console.table({
      nearAu: worstErrorAu(NEAR_ELAPSED_DAYS),
      rangeEndsAu: worstErrorAu(RANGE_END_ELAPSED_DAYS),
    });
    for (const [name, shape] of Object.entries(NAMED_SHAPES)) {
      const errors = RANGE_END_ELAPSED_DAYS.map((days) => portErrorAu(catalogOf(shape), days));
      console.log(name, errors);
    }
    expect(SAMPLED_NEOS).toHaveLength(Object.keys(NAMED_SHAPES).length + SAMPLE_SIZE);
  });
});
```

Run: `npx vitest run apps/web/src/scene/swarm/swarmCrossCheck.test.ts`
Expected: PASS, printing the two worst errors and the per-shape errors at the range ends.

- [ ] **Step 2: Stop and propose the tolerance, with the evidence.** Report the measured worst errors (near and at
      the range ends), the worst shape, and the pixel equivalent at the overview (÷ 0.002 AU). Propose each tolerance
      as measured × 1.25, the margin the golden tests use. If the range-end error is more than a pixel, propose the
      fix rather than a loose tolerance. The fix: rebuild the attributes with a new reference epoch whenever `|Δt|`
      passes a bound, and measure the rebuild's cost. Wait for the user's approval.

- [ ] **Step 3: Replace the measurement with the assertions** (numbers from the approved proposal):

```ts
/**
 * Worst float32 error (AU) over the seeded sample, measured on <date>. See "Calibrated tolerances" in
 * PROGRESS.md. The margin is room for harmless changes (statement order, a GPU's fused multiply-adds);
 * a solver or precision bug moves far more.
 */
const MEASURED_MAX_ERROR_AU = { near: <measured>, rangeEnds: <measured> };
const TOLERANCE_MARGIN = 1.25;

describe('GPU vs CPU cross-check', () => {
  it('matches the engine within ten years of the reference epoch', () => {
    expect(worstErrorAu(NEAR_ELAPSED_DAYS)).toBeLessThan(MEASURED_MAX_ERROR_AU.near * TOLERANCE_MARGIN);
  });

  it('matches the engine at the ends of the scrubbable range', () => {
    expect(worstErrorAu(RANGE_END_ELAPSED_DAYS)).toBeLessThan(MEASURED_MAX_ERROR_AU.rangeEnds * TOLERANCE_MARGIN);
  });

  it('samples every named shape plus the seeded NEOs', () => {
    expect(SAMPLED_NEOS).toHaveLength(Object.keys(NAMED_SHAPES).length + SAMPLE_SIZE);
  });
});
```

Remove the measurement `describe` and its `console` calls (lint forbids stray logging if configured; either way
it does not ship).

Run: `npx vitest run apps/web/src/scene/swarm/swarmCrossCheck.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Finish** (per-task workflow). Checklist item 3. In `PROGRESS.md`, add two rows to "Calibrated
      tolerances": `Swarm float32 vs engine: within ±10 yr` and `Swarm float32 vs engine: 1800 / 2050`, each with
      its tolerance and "Measured <x> AU × 1.25 (<n> NEOs, seed 20260930); 1 px ≈ 0.002 AU at the overview". PROGRESS
      decisions:
  - The GPU path is cross-checked through its float32 JS port against the float64 engine, on the same elements,
    over 6 named shapes and 2,000 seeded random NEOs. Horizons is not involved: the engine is already
    checked against it.
  - Record the approved tolerance, and whether the reference epoch needed rebasing.

Commit: `Cross-check the swarm's float32 Kepler path against the engine`.

### Task 4: Look: additive point sprites, size/brightness by H, colour by orbit class

Branch: `phase-4/swarm-look`. Closes #59. Labels: `type:feature`, `phase:4`, `area:web`.

_Lighter format (user decision, 2026-09-30):_ Tasks 4–8 give the design, interfaces, test cases and acceptance
checks, not full code. The per-task review writes the code against `main`.

This is the first task that draws the swarm. It loads the data, uploads the attributes, compiles the shader and
updates it every frame.

**Design:**

- **Loading happens outside the canvas.** `useNeoCatalog()` calls `loadDataset('neos')` once, with its
  `try/catch` in its own function. It returns `{ status: 'loading' }`, `{ status: 'ready', catalog, origin,
fetchedAt }` or `{ status: 'unavailable' }`. `App` passes the catalog down through `SceneCanvas` and
  `SceneContents` to `<Swarm catalog>`. The scene never fetches, so scene tests can pass a small catalog and
  never touch the network. That is one React commit when the data arrives, not per frame.
- **The status line (`SwarmStatus`)** shows "Loading asteroids…", or "Asteroid data unavailable" (the scene keeps
  running without a swarm), or "40,123 near-Earth asteroids · JPL SBDB · <fetchedAt date>", plus "(bundled
  snapshot)" when `origin` is `snapshot`. The count and date are facts from the data.
- **Geometry.** A `BufferGeometry` with one vertex per NEO. The `SwarmAttributes` arrays become vertex attributes
  (`itemSize` from `SWARM_ATTRIBUTE_SIZES`). There is also a zero `position` attribute, because three.js takes the
  draw count from it. `frustumCulled = false`, since a bounding sphere of zeros is meaningless. `gl.POINTS` draws
  one vertex per NEO, so points need plain vertex attributes, not instancing; only trails (Task 5) instance. The
  geometry is built in `useMemo` from the catalog, with the reference epoch = `timeStore.state.jdTdb` at build
  time, and disposed on unmount.
- **Material.** A `ShaderMaterial`: `swarm.vert` is `swarmKepler.glsl` plus a `main`. It uses
  `blending: AdditiveBlending`, `transparent`, `depthWrite: false`. **It must include three's log-depth chunks**
  (`<common>`, `<logdepthbuf_pars_vertex>`, `<logdepthbuf_vertex>`, `<logdepthbuf_pars_fragment>`,
  `<logdepthbuf_fragment>`), because the logarithmic depth buffer is always on. Without them, points depth-test
  against the wrong values and show through planets or vanish behind nothing.
- **Uniforms.** `SwarmUniforms` is typed: `elapsedDays`, `sunSceneOffsetAu` (vec3), `pixelRatio`, the look
  constants and `classColors` (vec3[4]). Each frame, `writeSwarmUniforms(uniforms, jdTdb)` sets
  `elapsedDays = jdTdb − referenceJdTdb` in float64. It sets `sunSceneOffsetAu` through
  `writeSceneOffset([0, 0, 0], uniforms.sunSceneOffsetAu.value)`, which is where the Sun sits in the scene. The
  shader adds it to the Sun-centred position. `sceneFrame.ts` stays the only place that maps axes, and nothing is
  allocated. This runs in `useFrame` at `FRAME_PRIORITY.sceneObjects`, after the camera rig has set the origin.
- **Look (`swarmLook.ts`, illustrative).**
  - Size and brightness fall linearly with H. For a fixed albedo, log(diameter) is linear in H:
    D = 1329 km / √p · 10^(−H/5) (Pravec & Harris 2007). H is mapped over [15, 28] to [4, 1] px (× pixel ratio)
    and to [1, 0.25] brightness, clamped outside that range. The constants live in TS and reach the shader as
    uniforms, so the shader holds the mapping formula but no numbers of its own.
  - Colours are in `NEO_ORBIT_CLASSES` order. Starting values, to be tuned by eye: Atira `#ffcc66`, Aten
    `#ff8a4c`, Apollo `#4cc3ff`, Amor `#9d8cff`. One sprite at full brightness stays below the bloom threshold
    (`relativeLuminance < BLOOM_SETTINGS.luminanceThreshold`). Only dense stacks, adding up, exceed it and glow,
    which is intended.
  - The sprite is a soft round disc: alpha falls off with distance from the centre of `gl_PointCoord`.

**Tests:**

- `swarmLook.test.ts`:
  - Size and brightness never increase with H (property test).
  - Both are clamped outside [15, 28].
  - H = 30 (unknown) gets the minimum.
  - The four colours are distinct.
  - Each colour at full brightness is below the bloom threshold.
- `swarmUniforms.test.ts`:
  - `elapsedDays` is exact in float64 (reference 2461313.5, jd 2461313.75 → 0.25).
  - `sunSceneOffsetAu` equals the scene offset of (0, 0, 0) for a given `setSceneOrigin`.
  - The same `Vector3` instance is written each frame, so nothing is allocated.
- `useNeoCatalog.test.ts` (loader injected, no network):
  - Ready with the data and its origin.
  - Unavailable when the loader rejects, and no throw.
  - The loader is called once across re-renders.
- `Swarm.test.tsx` (test renderer):
  - One `Points` with `count` vertices and the four attributes.
  - After one frame focused on Earth, `sunSceneOffsetAu` equals the Sun's offset from Earth in that same frame
    (Review focus 4).
- `SceneContents.test.tsx`: the 120-frame, zero-commit test now mounts a 3-NEO catalog (Review focus 5).
- Shader guard: `swarm.vert` includes the log-depth chunks and calls `swarmHeliocentricPosition`.

**Acceptance (Chrome, `npm run dev`; screenshot in the PR):**

- The shader compiles, with no console errors or WebGL warnings.
- About 40k points are visible around the Sun in four colours.
- Scrubbing moves them.
- Focusing Earth and flying between planets keeps the swarm locked to the planets, with no lag or jitter.
- With the server stopped, the snapshot loads and the status line says so. With the snapshot path also broken,
  "unavailable" shows and the scene runs.
- A quick fps look (the full check is Task 7).

**PROGRESS decisions:**

- Points use plain vertex attributes.
- The Sun's scene offset is a uniform written through `writeSceneOffset`.
- Size, brightness and colours are illustrative.
- A single sprite stays below the bloom threshold.
- The NEO catalog is loaded in `App`, not inside the canvas.

Commit: `Draw the NEO swarm as additive point sprites coloured by orbit class`.

---

### Task 5: Faint orbit trails

Branch: `phase-4/swarm-trails`. Closes #60. Labels: `type:feature`, `phase:4`, `area:web`.

**Design:**

- **Refinement of decision 5.** The 8 earlier times are spaced over a fixed fraction of each NEO's own orbit,
  `TRAIL_ORBIT_FRACTION = 1/24` of its period, not over a fixed number of days. Trails look alike at any time rate
  and stay put when paused. A fixed span in days would make trails vanish at real time and wrap around the orbit
  at 10 yr/s.
- **Shader function.** Add `swarmTrailElapsedDays(SwarmOrbit orbit, float elapsedDays, float trailStep)` to
  `swarmKepler.glsl`. It returns `elapsedDays − trailStep / TRAIL_SAMPLES · TRAIL_ORBIT_FRACTION · 2π / n`. Mirror
  it in `swarmKepler.ts` as `swarmTrailElapsedDays`. The trail shader feeds its result to
  `swarmHeliocentricPosition`, so there is one solver.
- **Geometry.** An `InstancedBufferGeometry`:
  - The base is a 9-vertex strip with a `trailStep` attribute: 0 at the head, 8 at the tail.
  - The per-instance attributes are `InstancedBufferAttribute`s over the same `SwarmAttributes` arrays Task 4
    uploads. They are built from the same `useMemo` result, so the reference epoch is shared.
  - `instanceCount = count`.
  - Drawn as a three.js `Line` through `<primitive>`, because JSX `<line>` collides with SVG. A strip is 9 vertex
    invocations per NEO against 16 for `LineSegments`: ~360k Kepler solves per frame in total.
- **Look.** The trail takes its NEO's class colour, with alpha = `TRAIL_MAX_OPACITY · (1 − trailStep / 8)²`
  (starting value 0.12) and additive blending. It uses the same log-depth chunks and `depthWrite: false`.
- **Toggle.** A "Trails" checkbox in `SwarmControls`, on by default. React state is fine here, because it only
  changes on a user action. Off unmounts the trails, so they cost nothing on the GPU.

**Tests:**

- In `swarmKepler.test.ts` (port):
  - `trailStep = 0` gives the head's `elapsedDays`.
  - `trailStep = 8` is exactly one trail span earlier: `TRAIL_ORBIT_FRACTION` × the period from `n`.
  - Consecutive steps are equally spaced.
  - Every trail sample stays between perihelion and aphelion distance (reuse the property test's shape).
- Shader guard: `swarmKepler.glsl` declares `TRAIL_SAMPLES` equal to the TS constant and defines
  `swarmTrailElapsedDays`. `swarmTrails.vert` includes the log-depth chunks.
- `SwarmTrails.test.tsx`:
  - The base geometry has 9 vertices.
  - `instanceCount` equals the catalog count.
  - Unchecking "Trails" unmounts them.
- `SceneContents.test.tsx`: still zero commits over 120 frames with trails on.

**Acceptance (Chrome; screenshot in the PR):**

- Trails fade from head to tail in the head's colour.
- When paused, trails hold still.
- At 10 yr/s, trails stay coherent arcs, not noise.
- The toggle works.
- A quick GPU cost check: if trails add more than ~3 ms per frame at 40k, stop and report with numbers. Fewer
  samples or a lower opacity cut-off are options, but neither is decided here.

**PROGRESS decisions:**

- Trails span 1/24 of each NEO's orbit in 8 steps, a refinement of decision 5.
- They are drawn as an instanced line strip.
- They are on by default and unmounted when off.

Commit: `Add faint orbit trails to the swarm`.

### Task 6: Choreography: scripted opening camera move + time ramp

Branch: `phase-4/opening`. Closes #61. Labels: `type:feature`, `phase:4`, `area:web`.

**Design:**

- **The camera reuses Phase 3's `flyTo`.** The opening is one flight: it starts framed on Earth at its default
  view distance and flies to `{ focus: 'sun', distanceAu: OPENING_OVERVIEW_DISTANCE_AU (~4), durationSeconds:
OPENING_SECONDS (12) }`. `flyTo` already eases the origin and interpolates the distance in log space, so no new
  camera maths is needed. _Verify at review:_ how to start instantly at Earth. Either `flyTo` accepts
  `durationSeconds: 0`, or the rig needs a small `jumpTo`.
- **Time ramp.** `openingRateDaysPerSecond(elapsedSeconds)` is a pure function. It interpolates the rate in log
  space from real time (1/86,400 d/s) to `OPENING_FINAL_RATE_DAYS_PER_SECOND` (~30, i.e. ~1 month/s), eased with
  Phase 3's `easeInOutCubic` over the same 12 s. The clock starts at "now".
- **No React per frame.** `TimeStore.setRate` notifies listeners, which would re-render the UI every frame.
  Add a non-notifying `TimeStore.setScriptedRate(rate)` for scripts. The 4 Hz readout poll picks the rate up,
  and the director notifies once at the end so the speed slider syncs. `OpeningDirector` runs in `useFrame` at a
  new `FRAME_PRIORITY.opening = -4`, before the clock; update `framePriorities.test.ts` to match.
- **When it starts.** It starts once the NEO status is no longer `loading`: the reveal needs the swarm. If the
  data is `unavailable`, it plays anyway over the planets. It plays once per page load. Before starting, it calls
  `gl.compile(scene, camera)` so the swarm and trail shaders compile before the first frame of the move, not
  during it.
- **Skipping.** Any `pointerdown`, `wheel` or `keydown` ends the opening at its final state: the Sun overview and
  the final rate. `prefers-reduced-motion: reduce` starts at the final state with no move. A dev-only
  `?opening=off` URL parameter does the same, which is handy while working on other scenes.
- **Caption (`OpeningCaption`).** "Orbits of <count> near-Earth asteroids from JPL SBDB · Colours, sizes and
  trails are illustrative". It fades out after the move. The count is a fact from the data.

**Files:** `apps/web/src/scene/opening/openingTimeline.ts`, `OpeningDirector.tsx`, `OpeningCaption.tsx` (plus
tests). Also modify `time/timeStore.ts` (`setScriptedRate`) and `scene/framePriorities.ts`.

**Tests:**

- `openingTimeline.test.ts`:
  - Real time at 0 s and the final rate from 12 s on.
  - The rate never decreases (property test).
  - The rate is log-interpolated at the midpoint: the geometric mean of the two ends.
- `timeStore.test.ts`: `setScriptedRate` changes the rate and clamps like `setRate`, without notifying.
- `OpeningDirector.test.tsx` (test renderer, fake clock):
  - Waits while the catalog is `loading`.
  - Starts at Earth.
  - Asks for exactly one flight to the Sun overview.
  - The rate follows the timeline frame by frame.
  - Zero React commits over the 12 s of frames.
  - A `keydown` mid-way ends at the final state.
  - Reduced motion skips the move.
  - It does not replay after it has finished.

**Acceptance (Chrome):**

- A recording (`gif_creator`) of the full opening from a fresh load.
- Earth fills the view at the start, the swarm is revealed as the camera pulls back, and it ends on the Sun
  overview with the swarm streaming.
- A click, a key or a wheel skips it.
- Reduced motion (DevTools rendering emulation) starts at the end state.
- Frame smoothness is measured in Task 7.

**PROGRESS decisions:**

- The opening is one `flyTo` plus a log-space rate ramp.
- Scripted rate changes don't notify React.
- Shaders are pre-compiled before the move.
- Any input or reduced motion skips it.

Commit: `Add the scripted opening: pull back from Earth to the swarm while time speeds up`.

---

### Task 7: Exit verification: 40k objects at ≥ 60 fps, smooth opening move

Branch: `phase-4/exit-verification`. Closes #62. Labels: `type:chore`, `phase:4`, `area:web`.

**Dev-only tooling** (gated on `import.meta.env.DEV`, so none of it ships):

- `?swarmStress=4` draws the catalog 4 times (160k objects). Copies 2–4 get their mean anomalies offset by
  2π·k/4, so they don't overlap.
- A GPU timer: `EXT_disjoint_timer_query_webgl2` around the swarm and trail draws, logged as a rolling median in
  ms. Chrome on macOS may not expose it. If not, record that, and treat the 4× headroom run as the evidence.
- Test: the stress parameter multiplies the vertex and instance counts by 4. The GPU timer is manual only.

**Measurements** (Chrome, focused foreground window, as for Phase 3; record the machine and browser):

1. The default Sun overview with trails on, 10 s at 1 d/s and 10 s at 10 yr/s (from 1900, so the clock does not
   pause at 2050).
2. Focused on Earth at minimum zoom, same two runs. The swarm must not jitter against the planets.
3. The opening from a fresh load. Frame times over the whole 12 s: median, worst, and the count over 20 ms.
4. The 4× stress run: repeat run 1.
5. GPU ms per frame for points and trails, if the timer is available.

**Pass bar:**

- Runs 1–3 hold ≥ 60 fps: median ≤ 16.7 ms, no frame over 20 ms after the first second.
- The opening shows no hitch.
- The 4× run shows the headroom a slower mid-range GPU would need. If it falls below 60 fps, report the numbers
  and don't call it a fail. The dev machine (an M3) is above mid-range, which is why this run exists.
- If any of runs 1–3 misses, stop and report with numbers before changing the look. The levers are trail samples,
  trail opacity cut-off and point size.

**Screenshot-worthy:** save 2–3 stills and the opening GIF for the PR and the v0.4.0 release.

**PROGRESS:** an exit-criteria paragraph in the Phase 3 format: commit, CI run, machine, the numbers for each run,
and the GPU ms or the reason it is missing.

Commit: `Add dev-only swarm stress and GPU timing tools and record the Phase 4 measurements`.

---

### Task 8: Phase 4 close-out

Branch: `phase-4/close-out`, after Tasks 1–7 are merged.

- [ ] **Step 1: `npm run check` on up-to-date `main`.** Expected: green, CI green on the same commit.
- [ ] **Step 2: Check each exit criterion against its evidence:**
  - 40k objects at ≥ 60 fps: Task 7, runs 1–2 and 4.
  - Smooth opening move: Task 7, run 3, plus the Task 6 recording.
  - Screenshot-worthy: the stills and GIF.
  - GPU/CPU agreement: the Task 3 tolerance rows in "Calibrated tolerances".
- [ ] **Step 3: Update `PROGRESS.md`:** Phase 4 ✅ Done, current phase → Phase 5, and the exit-criteria paragraph
      (from Task 7) with the `main` commit and CI run.
- [ ] **Step 4: PR** (`type:docs`, `phase:4`, `area:infra`). After the user merges and CI on `main` is green:
      close the milestone, tag the merge commit `v0.4.0` (annotated), publish a release summarising the phase with
      the stills and GIF, and move all Phase 4 issues and PRs to Done on the board. Update the phase-status memory.

Commit: `Mark Phase 4 done in PROGRESS.md and move the current phase to Phase 5`.
