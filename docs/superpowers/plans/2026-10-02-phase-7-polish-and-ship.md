# Phase 7: Polish & ship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Perihelion at a public URL, fast on modest hardware first: measured quality tiers chosen
automatically, a lighter start, graceful fallbacks, a usable layout on phones, and enough explanation for a first-time
visitor to understand what they are looking at.

**Architecture:** A pure tier table and a pure frame-time governor pick a quality tier; a small store holds the tier
and the viewer's Display preferences, and the canvas, effects, swarm and CME shell read it (tier changes are rare
store updates, never per-frame React state). The NEO catalog is fetched, validated and turned into swarm attributes in
a Web Worker. Data loads time out to the bundled snapshot and upgrade to live data when the server answers. The web app
deploys to Netlify, which forwards `/api` to the Fastify server on Render.

**Tech Stack:** TypeScript 6 (strict, ESM), React 19, three 0.186, @react-three/fiber 9.8, @react-three/drei 10.7,
@react-three/postprocessing 3.1 (postprocessing 6.39), Vite 8, Fastify, zod 4, Vitest 5, fast-check. No new runtime
dependencies.

**Spec:** `PLAN.md` § Phase 7, plus decisions approved while planning (2026-10-02, this conversation's design in three
parts):

1. **Performance before graphics detail.** Earth city lights and clouds, and swarm colour tuning (deferred from
   Phase 4), move to `PLAN.md` § Parked.
2. **Proxy hardware.** Measurements run on the Apple M3 on the Dell S2721HN (75 Hz, 1920 × 1080, DPR 1); frame time
   is judged against 16.7 ms. A weaker GPU is approximated by proxy runs: `?dpr=2` (4× the pixels), `?swarmStress=4`
   and Chrome's CPU throttle (4×). No phone is in the loop; touch is checked in Chrome's device emulation.
3. **Hosting.** Web on Netlify (`/api/*` forwarded to the server, so the app keeps relative URLs and needs no CORS);
   server on Render's free tier. Render sleeps after 15 min idle and has no persistent disk: the SQLite cache is
   disposable, and the web app must not wait on a sleeping server (decision 7).
4. **Quality tiers** (corrected 2026-10-02 against the library defaults: today the composer runs 8× MSAA and Bloom's
   `resolutionScale` is already 0.5, so High keeps today's bloom and halves today's MSAA):

   | Setting                 | High   | Medium | Low   |
   | ----------------------- | ------ | ------ | ----- |
   | Pixel-ratio cap         | 2      | 1.5    | 1     |
   | Composer MSAA samples   | 4      | 2      | 0     |
   | Bloom `resolutionScale` | 0.5    | 0.25   | 0.25  |
   | Trails (default)        | on     | on     | off   |
   | CME shell particles     | 24,000 | 12,000 | 6,000 |
   | Swarm points            | all    | all    | all   |

   Every point is drawn at every tier: points are cheap (the trails are ~380k vertices), and the NEO count is shown
   as a fact. Bloom stays on at every tier because the Sun's look depends on it. The canvas's own `antialias` turns
   off: the composer renders off-screen, so the context's MSAA buffer is never what reaches the screen.

5. **Measured and adaptive tier choice.** A first guess from the device; a governor that drops a tier when the 90th
   percentile frame time stays above 20 ms for two 2 s windows; one probe up after 60 s steady, and a probe that turns
   slow locks the tier for the session. Mostly downward because on a 60 Hz display vsync holds frames at ~16.7 ms, so
   frame times cannot show headroom. A manual Auto/High/Medium/Low setting overrides it; `?tier=` in dev.
6. **Display panel** in the right column: Quality and Trails. The tier sets the Trails default; the viewer's own
   choice wins. Both preferences persist per browser (`localStorage`, every access in `try/catch`).
7. **Data fallback.** Each dataset waits at most 4 s for the server, then loads the snapshot (pill "snapshot" plus a
   banner) and keeps retrying the server with backoff; live data replaces the snapshot when it arrives. A selected
   approach or CME is looked up again by its ID. The app pings `/health` on load to wake the server early.
8. **Explanation.** A `?` help dialog (also the `?` key) with tabs What you're seeing / The three shots / Real vs
   illustrative / Glossary / Credits; an always-visible orbit-class legend with counts (from the mockup's legend,
   without its per-class toggles); one dismissible first-visit hint. No guided tour.
9. **Scrollbars.** Thin themed scrollbars (`scrollbar-width: thin`, `scrollbar-color`), `scrollbar-gutter: stable`,
   and one scroll area per column (no list scrolling inside a scrolling column).
10. **Reduced motion** is enforced in one place: `cameraRig.flyTo` makes every flight a cut when
    `prefers-reduced-motion: reduce` matches. The opening already skips itself (`openingSkip.ts`).
11. **Exit numbers.** Lighthouse desktop on the public URL: Performance ≥ 85 with Total Blocking Time < 300 ms;
    Accessibility ≥ 90 (instead of adding axe as a dependency). Frame times per tier, normal and proxy. The recording
    follows a scripted camera path (`?bench=tour`); the user captures the video.

## Global Constraints

- No AI at runtime; no new runtime dependencies (ask before adding any, dev ones included).
- The web app never calls NASA/JPL directly; `/api` goes through `apps/server` (snapshot fallback).
- Never drive per-frame animation through React state: tier changes, Display preferences and data swaps are rare
  store updates; frame times are read in `useFrame`.
- Values shown as facts (counts, distances, speeds, dates) stay JPL/DONKI's at every tier; nothing a tier changes is
  presented as data.
- Never edit fixtures or recordings, never loosen a tolerance. The Phase 6 exit check keeps its 24,000-particle
  layout.
- Browser storage only for per-viewer conveniences, wrapped in `try/catch`; the app works with storage throwing.
- Functions < 20 lines, ≤ 2 arguments (wrap more in an object), isolated `try/catch`, units in names.
- Frame-time budget 16.7 ms on the S2721HN (75 Hz); record screen, canvas size and DPR with every measurement.

## Review Focus

1. **A 60 Hz display at its cap.** Frames sit at 16.6–17.0 ms: the governor must not drop a tier (p90 < 20 ms).
   Test in Task 3.
2. **A hidden tab coming back.** The first frame after `visibilitychange` can be seconds long: it must not count as
   slow. Frames over 250 ms are ignored, and a hidden tab discards the window. Tests in Task 3.
3. **The server wakes mid-session** while an approach is selected and its card is open: the selection survives the
   swap to live data (by ID), or clears if the live list no longer has it. Test in Task 5.
4. **Storage throws** (private window, blocked site data): Quality, Trails and the first-visit hint still work for
   the session. Tests in Tasks 3 and 8.
5. **Manual tier, then back to Auto:** the governor starts again from the tier on screen, with a fresh warm-up, not
   from its old state. Test in Task 3.

---

## Tasks

| #   | Task                                         | Issue | Format    | Status |
| --- | -------------------------------------------- | ----- | --------- | ------ |
| 1   | Baseline harness: frame times + bundle size  | #128  | light     | ✅     |
| 2   | Quality tiers                                | #129  | full code | ✅     |
| 3   | Tier governor + Display panel                | #130  | full code | ✅     |
| 4   | Progressive loading: worker + code splitting | #131  | light     | ✅     |
| 5   | Fallbacks: no WebGL2, server timeout         | #132  | light     | ✅     |
| 6   | Responsive, touch and scrollbars             | #133  | light     | ✅     |
| 7   | Accessibility and reduced motion             | #134  | light     | ✅     |
| 8   | Help dialog, legend, hint, credits           | #135  | light     | ✅     |
| 9   | Deploy: Netlify + Render                     | #136  | light     | ⬜     |
| 10  | Exit verification                            | #137  | light     | ⬜     |

Branches: `phase-7/<short-name>` per task, one PR each. Task 3 needs Task 2; Task 4's bundle budget needs Task 1;
Task 10 needs the rest. Tasks 5–8 are independent of each other.

---

## Task 1: Baseline harness (light)

Branch `phase-7/baseline`. Measure before changing anything; every later task reports against these numbers.

**Files:**

- Create: `apps/web/src/dev/benchScenarios.ts` (+ test): `parseBenchRequest(search: string): BenchRequest | undefined`
  for `?bench=<scenario>`; scenarios `overview`, `earth`, `approach`, `eruption`, `tour`. Unknown → `undefined`.
- Create: `apps/web/src/dev/BenchProbe.tsx`: mounted by `DevProbes` (dev only). Waits for the opening to finish (or
  `?opening=off`), runs the scenario's setup (camera focus, selection, Play approach / Watch eruption, time rate),
  waits 1 s, records 10 s of `useFrame` deltas and logs `[bench] <scenario> <json>` with `summarizeFrameTimes` plus
  `p90Ms`, canvas size and DPR. `tour` is the recording path: overview → Earth → an approach → an eruption, ~60 s, no
  measurement.
- Create: `apps/web/src/dev/devPixelRatio.ts` (+ test): `?dpr=<n>` in dev overrides the canvas pixel ratio (proxy
  run), clamped to 0.5–3.
- Modify: `apps/web/src/dev/frameTimes.ts` (+ test): `FrameTimeSummary` gains `p90Ms` (nearest rank).
- Create: `scripts/bundleBudget.mjs`: reads `apps/web/dist/index.html`, finds the JS it loads up front (the entry
  `<script>` and `modulepreload` links), sums their gzip sizes with `node:zlib` and fails above
  `INITIAL_JS_GZIP_BUDGET_BYTES`. Prints the per-file sizes either way.
- Modify: root `package.json`: `check` runs `node scripts/bundleBudget.mjs` after the build. The budget starts at the
  measured size rounded up to the next 10 KB (today ~394 KB), so it can only stop growth; Task 4 lowers it.
- Modify: `PROGRESS.md`: a "Phase 7 baseline" table.

**Tests:** `parseBenchRequest` (each scenario, unknown, missing); `?dpr` parsing and clamping; `p90Ms` on known
arrays (empty → 0; `[1..10]` → 9).

**Acceptance:**

- [x] Baseline in `PROGRESS.md`, on the S2721HN, for `overview`, `earth`, `approach`, `eruption` at: normal; `?dpr=2`;
      `?dpr=2&swarmStress=4`; `?dpr=2&swarmStress=4` with CPU throttle 4×. Median, p90, worst, frames over 20 ms.
- [x] Lighthouse desktop on `npm run build && npx vite preview` (local, no server: snapshot path): Performance, TBT,
      LCP, Accessibility, recorded as the baseline.
- [x] Initial JS gzip size recorded; `npm run check` green with the budget step.

**As built** (review proposals 1–8, approved 2026-10-02):

1. `BenchProbe` loads its own copy of the close-approach and CME lists (`loadDataset`), because the lists are React
   state in `App` and the probe runs inside `<Canvas>`. Dev and bench only; `App` is unchanged.
2. `approach` plays the closest row by CAD distance (`closestApproach`); `eruption` watches the latest CME with an
   ENLIL Earth arrival, else the latest (`benchCme`). The log line's `subject` names the row.
3. Timing starts when the shot's camera flight has landed, then 1 s settles and 10 s are recorded (`BenchRun`,
   pure, with tests). `overview` and `earth` jump to now at 1 d/s and fly to the Sun / `earthMoonBarycenter`.
   `tour`: overview 0 s, Earth 8 s, approach 16 s, eruption 32 s, done at 64 s (`[bench] tour done`).
4. Scenario setups are a table in `benchScenarios.ts` driven through injected targets (tested with fakes); the probe
   picks a row as the viewer does (`chooseApproach`, then `playApproach`).
5. `SceneCanvas` passes `dpr={DEV_PIXEL_RATIO}` (undefined outside dev or without `?dpr`, so R3F's default stays
   until Task 2's cap).
6. `bundleBudget.mjs` gzips at Node's default level: 391,164 bytes measured, budget 400,000.
7. Chrome's 4× CPU throttle measured ≈ 1.7× on the M3 (a fixed loop: 486 ms vs 281 ms unthrottled; 483 ms in the
   user's DevTools console). The throttled column is labelled with the measured rate. The user ran Lighthouse in
   DevTools; no `npx lighthouse`.
8. Port 8787 was free during the Lighthouse run; the pill read "Offline snapshot".

`summarizeFrameTimes`'s existing tests now expect `p90Ms` in the summary (the type gained the field).

## Task 2: Quality tiers (full code)

Branch `phase-7/quality-tiers`. Tiers apply from a store; nothing chooses them yet (Task 3). Default: High.

**Files:**

- Create: `apps/web/src/quality/qualityTiers.ts` (+ test)
- Create: `apps/web/src/quality/qualityStore.ts` (+ test)
- Modify: `apps/web/src/scene/canvasConfig.ts`: `antialias: false` (decision 4); `canvasConfig.test.ts` updated to
  match (an agreed test change).
- Modify: `apps/web/src/scene/SceneCanvas.tsx`: `dpr` from the tier.
- Modify: `apps/web/src/scene/effects/Effects.tsx`: `multisampling` and Bloom `resolutionScale` from the tier.
- Modify: `apps/web/src/scene/eruption/CmeShell.tsx`: particle count from the tier.
- Modify: `apps/web/src/App.tsx`: `showTrails` comes from the store (the existing `SwarmControls` checkbox writes the
  store until Task 3 replaces it).

**Interfaces:**

- Produces: `QualityTierName`, `QUALITY_TIER_NAMES` (ascending), `QUALITY_TIERS`, `stepTier(name, direction)`,
  `pixelRatioFor(tier, devicePixelRatio)`; `qualityStore` with `tierName`, `tier`, `showTrails`, `setTierName`,
  `setTrailsPreference`, `subscribe`; hooks `useQualityTier()` and `useShowTrails()`.

- [x] **Step 1: Write the failing tier test**

```ts
// apps/web/src/quality/qualityTiers.test.ts
import { describe, expect, it } from 'vitest';
import { QUALITY_TIERS, QUALITY_TIER_NAMES, pixelRatioFor, stepTier } from './qualityTiers';

describe('quality tiers', () => {
  it('lists tiers from cheapest to richest', () => {
    expect(QUALITY_TIER_NAMES).toEqual(['low', 'medium', 'high']);
  });

  it('never gets more expensive going down a tier', () => {
    const [low, medium, high] = QUALITY_TIER_NAMES.map((name) => QUALITY_TIERS[name]);
    for (const [cheaper, richer] of [
      [low, medium],
      [medium, high],
    ] as const) {
      expect(cheaper.maxPixelRatio).toBeLessThanOrEqual(richer.maxPixelRatio);
      expect(cheaper.multisampling).toBeLessThanOrEqual(richer.multisampling);
      expect(cheaper.bloomResolutionScale).toBeLessThanOrEqual(richer.bloomResolutionScale);
      expect(cheaper.cmeParticleCount).toBeLessThanOrEqual(richer.cmeParticleCount);
    }
  });

  it('keeps the Phase 6 exit check layout at High', () => {
    expect(QUALITY_TIERS.high.cmeParticleCount).toBe(24_000);
  });

  it('steps one tier and stops at the ends', () => {
    expect(stepTier('medium', -1)).toBe('low');
    expect(stepTier('medium', 1)).toBe('high');
    expect(stepTier('low', -1)).toBeUndefined();
    expect(stepTier('high', 1)).toBeUndefined();
  });

  it('caps the pixel ratio but never raises it', () => {
    expect(pixelRatioFor(QUALITY_TIERS.medium, 2)).toBe(1.5);
    expect(pixelRatioFor(QUALITY_TIERS.high, 1)).toBe(1);
  });
});
```

- [x] **Step 2: Run it; expect FAIL** (`npx vitest run apps/web/src/quality/qualityTiers.test.ts`: module not found)

- [x] **Step 3: Implement the table**

```ts
// apps/web/src/quality/qualityTiers.ts
/** Cheapest first, so a step down is index − 1. */
export const QUALITY_TIER_NAMES = ['low', 'medium', 'high'] as const;
export type QualityTierName = (typeof QUALITY_TIER_NAMES)[number];

export interface QualityTier {
  maxPixelRatio: number;
  /** Composer MSAA samples; the canvas's own antialias is off because the composer renders off-screen. */
  multisampling: number;
  /** Bloom's working resolution as a share of the canvas; postprocessing's default is 0.5. */
  bloomResolutionScale: number;
  trailsByDefault: boolean;
  cmeParticleCount: number;
}

/**
 * Every tier draws every NEO: points are cheap and the count is shown as a fact. Bloom stays on at every tier because
 * the Sun's look is built on it (`sunLook.ts`). High keeps today's bloom and halves today's 8× MSAA (decision 4).
 */
export const QUALITY_TIERS = {
  low: {
    maxPixelRatio: 1,
    multisampling: 0,
    bloomResolutionScale: 0.25,
    trailsByDefault: false,
    cmeParticleCount: 6_000,
  },
  medium: {
    maxPixelRatio: 1.5,
    multisampling: 2,
    bloomResolutionScale: 0.25,
    trailsByDefault: true,
    cmeParticleCount: 12_000,
  },
  high: {
    maxPixelRatio: 2,
    multisampling: 4,
    bloomResolutionScale: 0.5,
    trailsByDefault: true,
    cmeParticleCount: 24_000,
  },
} as const satisfies Record<QualityTierName, QualityTier>;

export function stepTier(name: QualityTierName, direction: -1 | 1): QualityTierName | undefined {
  return QUALITY_TIER_NAMES[QUALITY_TIER_NAMES.indexOf(name) + direction];
}

export function pixelRatioFor(tier: QualityTier, devicePixelRatio: number): number {
  return Math.min(devicePixelRatio, tier.maxPixelRatio);
}
```

- [x] **Step 4: Run it; expect PASS**

- [x] **Step 5: Write the failing store test**

```ts
// apps/web/src/quality/qualityStore.test.ts
import { describe, expect, it, vi } from 'vitest';
import { QualityStore } from './qualityStore';

describe('QualityStore', () => {
  it('starts at High with the tier default for trails', () => {
    const store = new QualityStore();
    expect(store.tierName).toBe('high');
    expect(store.showTrails).toBe(true);
  });

  it("follows the tier's trail default until the viewer chooses", () => {
    const store = new QualityStore();
    store.setTierName('low');
    expect(store.showTrails).toBe(false);
    store.setTrailsPreference(true);
    store.setTierName('medium');
    store.setTierName('low');
    expect(store.showTrails).toBe(true);
  });

  it('notifies on real changes only', () => {
    const store = new QualityStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setTierName('high');
    store.setTierName('medium');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Step 6: Run it; expect FAIL**

- [x] **Step 7: Implement the store** (same shape as `OpeningStore` and `SelectionStore`)

```ts
// apps/web/src/quality/qualityStore.ts
import { useSyncExternalStore } from 'react';
import { QUALITY_TIERS, type QualityTier, type QualityTierName } from './qualityTiers';

/**
 * The tier on screen and the viewer's trail choice. Changes come from the governor (rarely) and the Display panel
 * (on clicks), never per frame, so React subscribers re-render only on real changes.
 */
export class QualityStore {
  #tierName: QualityTierName = 'high';
  /** `undefined` until the viewer chooses: the tier's default applies. */
  #trailsPreference: boolean | undefined;
  readonly #listeners = new Set<() => void>();

  get tierName(): QualityTierName {
    return this.#tierName;
  }

  get tier(): QualityTier {
    return QUALITY_TIERS[this.#tierName];
  }

  get showTrails(): boolean {
    return this.#trailsPreference ?? this.tier.trailsByDefault;
  }

  setTierName = (tierName: QualityTierName): void => {
    if (tierName === this.#tierName) return;
    this.#tierName = tierName;
    this.#notify();
  };

  setTrailsPreference = (showTrails: boolean | undefined): void => {
    if (showTrails === this.#trailsPreference) return;
    this.#trailsPreference = showTrails;
    this.#notify();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const qualityStore = new QualityStore();

export function useQualityTier(): QualityTier {
  return useSyncExternalStore(qualityStore.subscribe, () => qualityStore.tier);
}

export function useShowTrails(): boolean {
  return useSyncExternalStore(qualityStore.subscribe, () => qualityStore.showTrails);
}
```

- [x] **Step 8: Run it; expect PASS**

- [x] **Step 9: Apply the tier to the scene**

  - `SceneCanvas`: `const tier = useQualityTier();` and `<Canvas dpr={pixelRatioFor(tier, window.devicePixelRatio)} …>`
    (in dev, `devPixelRatio` from Task 1 wins).
  - `Effects`: `const tier = useQualityTier();`, `<EffectComposer frameBufferType={HalfFloatType}
multisampling={tier.multisampling}>` and `<Bloom {...BLOOM_SETTINGS} resolutionScale={tier.bloomResolutionScale} />`.
  - `CmeShell`: the seeds' `useMemo` depends on `tier.cmeParticleCount` instead of `CME_SHELL_LOOK.particleCount`
    (remove `particleCount` from `CME_SHELL_LOOK` and point `cmeExitCheck.test.ts` at `QUALITY_TIERS.high` — the same
    24,000, so the exit check is unchanged in substance; call this out in the PR).
  - `App`: `showTrails` from `useShowTrails()`; `SwarmControls`' `onShowTrailsChange` is
    `qualityStore.setTrailsPreference`.
  - Scene tests: a `SceneContents`/`Effects` test that switching the store's tier re-renders with the new props and
    that `useFrame` callbacks never call `setState` (extend the existing render-loop test).

- [x] **Step 10: Measure.** High, Medium and Low (set from the console: `qualityStore.setTierName('low')` exposed on
      `window` in dev only) at the Task 1 proxy settings; add rows to the baseline table. Stop and report if any tier
      is slower than the baseline at the same settings.

- [x] **Step 11: `npm run check`, commit** (`Add quality tiers: pixel ratio, MSAA, bloom resolution, trails and CME
particles per tier`)

**As built** (review proposals 1–8, approved 2026-10-02):

1. `?dpr` stands in for the device's ratio and the tier caps it: `pixelRatioFor(tier, DEV_PIXEL_RATIO ??
window.devicePixelRatio)`, so proxy runs show the tiers apart.
2. The dev-only `?tier=low|medium|high` (`devTierNameFromUrl`, with a test) is read once in `main.tsx` before the
   first render, because a bench run reloads the page; no `window.qualityStore` handle.
3. The tier test reads `QUALITY_TIERS.low/.medium/.high` by name (a destructured `.map` fails typecheck under
   `noUncheckedIndexedAccess`).
4. `CME_SHELL_LOOK.particleCount` (24,000) stays and `QUALITY_TIERS.high.cmeParticleCount` references it, so
   `cmeExitCheck.test.ts` and `cmeShellGeometry.test.ts` are untouched (replaces Step 9's third bullet).
5. The tier-switch test goes through `CmeShell` in the test renderer (High 24,000 → Low 6,000, geometry rebuilt);
   `EffectComposer` needs real WebGL, so `Effects` has no render test.
6. `canvasConfig.test.ts` gains the `antialias: false` assertion (the agreed test change).
7. CME shell brightness unchanged at every tier; the Step 10 runs logged frame times only, so a look check of the
   thinner Medium and Low shells is still open (optional).
8. Step 10: every tier at `?dpr=2` and `?dpr=2&swarmStress=4` plus High at normal (rows in `PROGRESS.md`). High
   under stress read 1 ms slower than the baseline, so main and the branch were run alternately (A/B): same frames
   per 10 s, median +0.6 ms, p90 −1.6 ms; accepted as not slower (user decision).

## Task 3: Tier governor + Display panel (full code for the governor)

Branch `phase-7/tier-governor`.

**Files:**

- Create: `apps/web/src/quality/frameStats.ts` (+ test): `percentileMs(values, fraction)` (nearest rank).
- Create: `apps/web/src/quality/tierGovernor.ts` (+ test)
- Create: `apps/web/src/quality/initialTier.ts` (+ test): the device's first guess.
- Create: `apps/web/src/quality/QualityGovernor.tsx`: in the canvas; feeds `useFrame` deltas to the governor when the
  preference is Auto; discards the window on `visibilitychange`.
- Create: `apps/web/src/state/safeStorage.ts` (+ test): `readStored(key)` / `writeStored(key, value)`, each in its own
  `try/catch`, returning `undefined` / doing nothing when storage throws. Task 8 reuses it.
- Modify: `apps/web/src/quality/qualityStore.ts` (+ test): `preference: 'auto' | QualityTierName`, persisted via
  `safeStorage` with the trails preference.
- Create: `apps/web/src/shell/DisplayPanel.tsx` (+ test), replacing `scene/swarm/SwarmControls.tsx` (deleted with its
  test): a `.panel` in the right column with Quality (a native `<select>`: Auto, High, Medium, Low; Auto shows the
  tier in use, e.g. "Auto (Medium)") and a Trails checkbox.
- Modify: `apps/web/src/App.tsx` (`ShellLeft` loses its children; `ShellRight` gets the panel), `styles.css`.
- Modify: `apps/web/src/dev/devPixelRatio.ts` neighbour: `?tier=low|medium|high` in dev sets a manual preference.

**Interfaces:**

- Consumes (Task 2): `QualityTierName`, `stepTier`, `qualityStore.setTierName`.
- Produces: `TierGovernor` (`tier`, `recordFrame(frameMs): boolean`, `discardWindow()`), `GOVERNOR_SETTINGS`,
  `initialTier(device: DeviceHints): QualityTierName`, `readStored`, `writeStored`.

- [x] **Step 1: Write the failing percentile test**

```ts
// apps/web/src/quality/frameStats.test.ts
import { describe, expect, it } from 'vitest';
import { percentileMs } from './frameStats';

describe('percentileMs', () => {
  it('uses the nearest rank', () => {
    const values = Array.from({ length: 10 }, (_, index) => index + 1);
    expect(percentileMs(values, 0.9)).toBe(9);
    expect(percentileMs(values, 1)).toBe(10);
  });

  it('is 0 for no frames', () => {
    expect(percentileMs([], 0.9)).toBe(0);
  });
});
```

- [x] **Step 2: Run; expect FAIL. Step 3: implement**

```ts
// apps/web/src/quality/frameStats.ts
/** Nearest-rank percentile: the smallest value with at least `fraction` of the frames at or below it. */
export function percentileMs(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(fraction * sorted.length));
  return sorted[rank - 1] ?? 0;
}
```

(Task 1's `p90Ms` in `dev/frameTimes.ts` calls this function instead of its own copy.)

- [x] **Step 4: Run; expect PASS.**

- [x] **Step 5: Write the failing governor tests**

```ts
// apps/web/src/quality/tierGovernor.test.ts
import { describe, expect, it } from 'vitest';
import { GOVERNOR_SETTINGS, TierGovernor } from './tierGovernor';

/** Feeds frames of one length for a duration; returns the tiers the governor moved to, in order. */
function feed(governor: TierGovernor, frame: { ms: number; forMs: number }): string[] {
  const moves: string[] = [];
  for (let elapsedMs = 0; elapsedMs < frame.forMs; elapsedMs += frame.ms) {
    if (governor.recordFrame(frame.ms)) moves.push(governor.tier);
  }
  return moves;
}

const { warmUpMs, windowMs, steadyMsBeforeProbe } = GOVERNOR_SETTINGS;

describe('TierGovernor', () => {
  it('ignores slow frames while warming up', () => {
    const governor = new TierGovernor('high');
    expect(feed(governor, { ms: 40, forMs: warmUpMs })).toEqual([]);
  });

  it('drops one tier after two slow windows, not one', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    expect(feed(governor, { ms: 30, forMs: windowMs })).toEqual([]);
    expect(feed(governor, { ms: 30, forMs: windowMs })).toEqual(['medium']);
  });

  it('holds a 60 Hz display at its vsync cap', () => {
    const governor = new TierGovernor('high');
    expect(feed(governor, { ms: 16.9, forMs: 30_000 })).toEqual([]);
  });

  it('judges the 90th percentile, so rare spikes do not drop a tier', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    const moves: string[] = [];
    for (let frame = 0; frame < 1_000; frame += 1) {
      if (governor.recordFrame(frame % 20 === 0 ? 45 : 13)) moves.push(governor.tier);
    }
    expect(moves).toEqual([]);
  });

  it('ignores frames over 250 ms, such as the first after a hidden tab', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    expect(feed(governor, { ms: 3_000, forMs: 12_000 })).toEqual([]);
  });

  it('forgets a discarded window', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    // One slow window closes, then half of a second one is discarded; without the discard, the next
    // 1.5 s of slow frames would close that second slow window and drop the tier.
    feed(governor, { ms: 30, forMs: windowMs * 1.5 });
    governor.discardWindow();
    expect(feed(governor, { ms: 30, forMs: windowMs * 0.75 })).toEqual([]);
  });

  it('never goes below Low', () => {
    const governor = new TierGovernor('low');
    expect(feed(governor, { ms: 40, forMs: 20_000 })).toEqual([]);
  });

  it('probes one tier up after a steady minute', () => {
    const governor = new TierGovernor('medium');
    expect(feed(governor, { ms: 13, forMs: warmUpMs + steadyMsBeforeProbe + windowMs })).toEqual([
      'high',
    ]);
  });

  it('locks after a failed probe', () => {
    const governor = new TierGovernor('medium');
    feed(governor, { ms: 13, forMs: warmUpMs + steadyMsBeforeProbe + windowMs });
    expect(feed(governor, { ms: 30, forMs: warmUpMs + windowMs * 2 })).toEqual(['medium']);
    expect(feed(governor, { ms: 13, forMs: steadyMsBeforeProbe * 3 })).toEqual([]);
  });

  it('warms up again after every change', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    feed(governor, { ms: 30, forMs: windowMs * 2 });
    expect(feed(governor, { ms: 30, forMs: warmUpMs })).toEqual([]);
  });
});
```

- [x] **Step 6: Run; expect FAIL.**

- [x] **Step 7: Implement the governor**

```ts
// apps/web/src/quality/tierGovernor.ts
import { percentileMs } from './frameStats';
import { type QualityTierName, stepTier } from './qualityTiers';

export const GOVERNOR_SETTINGS = {
  /** After start-up and after every tier change (the composer remounts), frames say nothing yet. */
  warmUpMs: 2_000,
  windowMs: 2_000,
  /** 20 ms is `HITCH_THRESHOLD_MS`: above a 60 Hz display's 16.7 ms cap with room for vsync jitter. */
  slowP90Ms: 20,
  slowWindowsBeforeDrop: 2,
  steadyMsBeforeProbe: 60_000,
  /** Longer frames are a hidden tab or a stall with a known cause, not rendering cost. */
  ignoredFrameMs: 250,
} as const;

/**
 * Picks the tier from frame times, mostly downward: on a 60 Hz display vsync holds every frame near 16.7 ms, so
 * frame times cannot show headroom. It probes one tier up after a steady minute; a probe that turns slow drops back
 * and locks the tier for the session, so quality never flickers (decision 5).
 */
export class TierGovernor {
  #tier: QualityTierName;
  #warmUpLeftMs: number = GOVERNOR_SETTINGS.warmUpMs;
  #window: number[] = [];
  #windowMs = 0;
  #slowWindows = 0;
  #steadyMs = 0;
  #probing = false;
  #locked = false;

  constructor(tier: QualityTierName) {
    this.#tier = tier;
  }

  get tier(): QualityTierName {
    return this.#tier;
  }

  /** Returns true when this frame changed the tier. */
  recordFrame(frameMs: number): boolean {
    if (frameMs > GOVERNOR_SETTINGS.ignoredFrameMs) return false;
    if (this.#warmUpLeftMs > 0) {
      this.#warmUpLeftMs -= frameMs;
      return false;
    }
    this.#window.push(frameMs);
    this.#windowMs += frameMs;
    return this.#windowMs >= GOVERNOR_SETTINGS.windowMs && this.#closeWindow();
  }

  discardWindow(): void {
    this.#window = [];
    this.#windowMs = 0;
  }

  #closeWindow(): boolean {
    const slow = percentileMs(this.#window, 0.9) > GOVERNOR_SETTINGS.slowP90Ms;
    const windowMs = this.#windowMs;
    this.discardWindow();
    return slow ? this.#afterSlowWindow() : this.#afterSteadyWindow(windowMs);
  }

  #afterSlowWindow(): boolean {
    this.#steadyMs = 0;
    this.#slowWindows += 1;
    if (this.#slowWindows < GOVERNOR_SETTINGS.slowWindowsBeforeDrop) return false;
    if (this.#probing) this.#locked = true;
    this.#probing = false;
    return this.#step(-1);
  }

  #afterSteadyWindow(windowMs: number): boolean {
    this.#slowWindows = 0;
    this.#steadyMs += windowMs;
    if (this.#steadyMs < GOVERNOR_SETTINGS.steadyMsBeforeProbe) return false;
    this.#steadyMs = 0;
    this.#probing = !this.#locked && this.#step(1);
    return this.#probing;
  }

  #step(direction: -1 | 1): boolean {
    const next = stepTier(this.#tier, direction);
    if (next === undefined) return false;
    this.#tier = next;
    this.#slowWindows = 0;
    this.#warmUpLeftMs = GOVERNOR_SETTINGS.warmUpMs;
    return true;
  }
}
```

- [x] **Step 8: Run; expect PASS.** If a test fails, fix the code, not the test; a test change needs the user's OK.

- [x] **Step 9: First guess (TDD, light).** `initialTier({ coarsePointer, shortSidePx, gpuRenderer })`:
      coarse pointer and short side < 600 px → `low`; `gpuRenderer` matching `/intel|mali|adreno|powervr/i` →
      `medium`; otherwise `high`. Tests: a phone, an Intel laptop, the M3 (`"ANGLE (Apple, ANGLE Metal Renderer: Apple
M3, …)"` → high), an empty renderer string (Firefox masks it) → high. `QualityGovernor` reads the hints once
      (`matchMedia('(pointer: coarse)')`, `screen`, `WEBGL_debug_renderer_info` when exposed).

- [x] **Step 10: Preference and storage (TDD).** `safeStorage` tests: a storage whose `getItem`/`setItem` throw gives
      `undefined` and no throw. Store tests: `setPreference('low')` sets the tier and stops the governor;
      `setPreference('auto')` creates a new `TierGovernor` from the tier on screen (Review Focus 5); the preference and
      the trails choice survive a reload through `safeStorage` and still work when it throws (Review Focus 4).

- [x] **Step 11: Display panel (TDD, light).** Render tests: the select lists Auto/High/Medium/Low and shows
      "Auto (Medium)" when the governor picked Medium; changing it calls `setPreference`; the Trails checkbox reflects
      `showTrails` and writes `setTrailsPreference`. Keyboard: both controls are native and labelled.

- [x] **Step 12: Measure.** At `?dpr=2&swarmStress=4` with CPU throttle 4× the governor steps down within ~6 s and the
      frame times recover; on the normal setting it stays on High for 2 minutes. Log tier changes in dev
      (`[quality] high → medium`). Record both in the baseline table.

- [x] **Step 13: `npm run check`, commit** (`Choose the quality tier from frame times and add the Display panel`).

**As built** (review proposals 1–9, approved 2026-10-02):

1. The dev-only `?tier=` sets the preference for that load only (`qualityStore.setPreferenceForThisLoad`), so a bench
   run never leaves its tier in storage.
2. The `[bench]` line also records `tier` and `qualityPreference`, since on Auto the governor may change the tier
   during a run.
3. `HITCH_THRESHOLD_MS` moves into `quality/frameStats.ts` beside `percentileMs`; `dev/frameTimes.ts` imports both
   instead of keeping its own nearest-rank copy.
4. The store owns the governor: `applyFirstGuess` (once per load, Auto only), `recordFrame` and `discardFrameWindow`.
   `QualityGovernor` only reads the device hints and forwards frame times and `visibilitychange`.
5. Stored values are untrusted strings: `qualityPreferenceFrom` lets only a known preference through (anything else
   reads as Auto), and trails read only `'true'` / `'false'`. The select's value goes through the same check.
6. The right column is always rendered: the focus card (when one is selected) above the Display panel. Its drawer
   label is "Focus" with a card, else "Display".
7. The GPU name falls back to `RENDERER` when `WEBGL_debug_renderer_info` is not exposed, and to `''` if neither is a
   string.
8. Step 12 runs without the CPU throttle (it is ≈ 1.7× on the M3 and barely moves the frame times; Task 1).
9. The Trails checkbox is always shown, not only once the catalog is loaded.

Step 12 (2026-10-02 23:45–23:52, Auto with nothing stored): at `?dpr=2&swarmStress=4` the governor dropped High →
Medium 6.5 s after load, tried High again after a steady minute, fell back to Medium (locked), then dropped to Low;
Low holds 75 fps. At the normal setting it stayed on High for 2 minutes. Numbers in `PROGRESS.md`.

## Task 4: Progressive loading: worker + code splitting (light)

Branch `phase-7/progressive-loading`. Before writing code, read `useDataset.ts`, `loadDataset.ts`, `useNeoCatalog.ts`,
`swarmAttributes.ts`, `Swarm.tsx` and every consumer of the catalog (`grep -rn "neoCatalog\|catalog" apps/web/src`), and
propose the worker's message types in the review (plan-task-review flow).

**Scope:**

- **Worker.** `apps/web/src/data/neoCatalogWorker.ts` (`new Worker(new URL(...), { type: 'module' })`, no
  dependency) runs `loadDataset('neos')` (with Task 5's timeout when it lands) and `buildSwarmAttributes`, and posts the
  dataset's metadata (origin, fetched time, count, orbit-class counts for the legend) plus the attribute arrays as
  transferables. The reference epoch is sent with the request (the main thread's `timeStore.state.jdTdb`). Any data
  the main thread still needs from the catalog is posted too, decided in the review.
- **Fallback.** A browser without module workers (or a worker error) loads on the main thread as today.
- **Fade-in.** The swarm fades in over ~1 s from its first frame (one uniform; `useFrame`, no React state).
- **Code splitting.** `React.lazy` + `Suspense` for `ApproachScene`/`CmeScene` and their cards; postprocessing in its
  own chunk, requested in parallel with the first render. Planets, Sun and time bar draw first.
- **Budget.** Lower `INITIAL_JS_GZIP_BUDGET_BYTES` to the new initial size rounded up to the next 10 KB.

**Tests:** the worker's message builder as a pure function (catalog in → message with transfer list out, counts per
class correct, arrays equal to `buildSwarmAttributes`); the fallback path when `Worker` is undefined; the scene test
still finds no `setState` in `useFrame`.

**Acceptance:**

- [ ] The opening's first-frames hitch from Phase 4 (29–32 ms when the catalog arrives) is gone: no frame over 20 ms
      in 4 fresh loads.
- [ ] Initial JS gzip below the baseline; Lighthouse TBT and LCP no worse than baseline (local preview).
- [ ] The swarm, the approaches and an eruption still play end to end.

**As built** (review proposals 1–10, approved 2026-10-03):

1. Messages: the request is `{ referenceJdTdb }`. The reply is `{ kind: 'ready', summary }` or
   `{ kind: 'unavailable' }`, where `summary` holds origin, fetched time, count, orbit-class counts and the swarm
   attributes; the four attribute buffers are transferred. No catalog columns come back: the main thread reads only
   those fields (`indexCatalogOrbits` is server-only). The pure builder is `data/neoCatalogMessage.ts`; the worker
   entry `data/neoCatalogWorker.ts` is a thin wrapper tests never import. The hook takes every `ready` message, so
   Task 5's snapshot → live upgrade is a second post.
2. `useNeoCatalog` returns `loading | unavailable | ready & NeoCatalogSummary` through a `NeoCatalogSource`
   (`data/neoCatalogSource.ts`); `Swarm` takes `attributes` instead of `catalog`; the pill's state type is the smaller
   `DatasetStatusState`. `Swarm.test.tsx`, `SceneContents.test.tsx`, `useNeoCatalog.test.tsx` and
   `DataStatusPill.test.tsx` changed to the new shapes with the same assertions. `loadDatasetOrUndefined` moved into
   `loadDataset.ts` so the worker shares it without importing React.
3. A worker that reports `unavailable` is believed. Only a missing `Worker`, a constructor error, or an
   `error`/`messageerror` before the first message falls back to the main thread, through the same builder.
4. The "no `setState` in `useFrame`" test already exists: `SceneContents.test.tsx` ("120 frames without a single
   React commit"). It now covers the fade too; `Swarm.test.tsx` adds a fade test that counts renders.
5. Instead of a new `?bench=opening`, the existing opening probe (`DevProbes.tsx`) also logs `[startup]`: every frame
   from the canvas's first to the end of the opening.
6. `compileAsync` was not needed: the opening's `gl.compile` took 0.6 ms (all 9 scene programs were already built).
   The remaining hitch was the lazy composer's first frame (17 bloom targets, 11 new programs, ≈ 27 ms) landing in
   the opening. `EffectsWarmUp` counts two composer frames and the opening waits for it
   (`openingCanStart && effectsWarm`).
7. Only postprocessing is split (`React.lazy` + `Suspense` inside the canvas); the approach and CME scenes and cards
   stay in the main chunk (≈ 8 KB). Before the chunk lands, the overview draws for ≈ 10 frames without bloom (dimmer
   swarm, no Sun glow, nothing clipped).
8. The fade is one shared `fadeIn` uniform, 0 → 1 with smoothstep over `SWARM_FADE_IN_SECONDS` (1 s) of wall-clock
   time from the swarm's first frame, written through `writeSwarmFadeIn`.
9. `worker: { format: 'es' }` in `vite.config.ts`.
10. Initial JS 370,460 B gzip (was 391,142 B); budget 380,000 B.

Measured 2026-10-03 (dev, live data, 1920×809 canvas, DPR 1, S2721HN at 75 Hz): 4 fresh loads, opening worst
15.1 / 15.8 / 14.6 / 14.6 ms, none over 20 ms. Lighthouse desktop on `vite preview`: Performance 100, LCP 0.6 s
(baseline 2.0 s), TBT 0 ms. Numbers in `PROGRESS.md`.

## Task 5: Fallbacks (light)

Branch `phase-7/fallbacks`.

**Scope:**

- **No WebGL2.** `apps/web/src/shell/webglSupport.ts`: `hasWebGl2(createCanvas)` (testable with a fake canvas).
  `main.tsx` renders `NoWebGlNotice` instead of `App` when it is false: what Perihelion is, why it cannot run here,
  the release stills (copied into `public/stills/`, ≤ 200 KB each, WebP), and links to the data sources. `?webgl=off`
  forces it in dev.
- **Server timeout.** `loadDataset` gains a time limit per server attempt (`AbortSignal.timeout(4_000)`), then the
  snapshot. `useDataset` keeps retrying the server in the background (4 s, 8 s, 16 s, … capped at 60 s, stopping
  once live) and swaps the state to the live response. One wake-up `fetch('/api/health')` (no wait) runs at start.
- **Banner.** When any dataset's origin is `snapshot`, a one-line banner under the top bar says the live server is
  unavailable and the data is from the bundled snapshot (with its date); it disappears on the swap.
- **Selection survives the swap.** The approach and CME selection stores re-resolve the selected item by its ID in
  the new list; missing → cleared (Review Focus 3).

**Tests:** a server that never answers → snapshot after 4 s (fake timers); a server that answers on the third retry →
state goes snapshot → live; selection kept when the ID exists, cleared when not; `hasWebGl2` true/false; the banner
shows for `snapshot` and not for `fresh`/`stale`.

**Acceptance:**

- [x] With the server stopped, the app shows the snapshot within ~4 s with the banner; starting the server swaps to
      live without a reload; a selected approach stays selected.
- [x] The Phase 5 deferred check: two approaches replay end to end from the snapshot (server stopped), HUD values
      equal the snapshot rows.
- [x] `?webgl=off` shows the notice; no WebGL context is created.

**As built** (review proposals 1–11, approved 2026-10-03):

1. No wake-up `fetch('/api/health')`: the server's route is `/health`, which neither the dev proxy nor Netlify
   forwards, and the first dataset request reaches Render and wakes it anyway. Task 9's `/api/health` check needs a
   server route for it.
2. `loadDataset(name, options?)` takes `{ fetchImpl, serverTimeoutMs, signal }`. The limit is an `AbortController`
   with `setTimeout`, not `AbortSignal.timeout`, so tests drive it with fake timers; it is combined with the caller's
   signal through `AbortSignal.any`.
3. The 4 s limit (`SERVER_TIMEOUT_MS`) covers only the wait for headers; the timer is cleared once the server
   answers, so a slow 4 MB NEO body from a live server is never cut off.
4. Retries call `loadFromServer` (server only, never the snapshot) with a 30 s limit per attempt
   (`RETRY_SERVER_TIMEOUT_MS`). Delays 4, 8, 16, 32 s, then every 60 s, each counted from the end of the previous
   attempt (`data/serverRetry.ts`: `retryDelayMs`, `retryUntilAnswered`). Any answer from the server ends them, even
   its own snapshot (JPL down): `needsServerRetry` is true only for origin `snapshot` or `unavailable`. `useDataset`
   now takes `DatasetSources` (`load` + `loadFromServer`) instead of a bare loader.
5. The NEO catalog retries too: `NeoCatalogRequest.serverOnly` makes the worker (or the main-thread fallback) ask the
   server only, and `useNeoCatalog` replaces the swarm's attributes when it answers. Each attempt's worker is stopped
   when the attempt ends. The swarm's fade-in does not run again.
6. `SelectionStore.reselectFrom(items, keyOf)` points the store at the row with the same key in the new list, since
   the lists match the selection by identity. `shotSelection.keepShotsIn` uses `approachKey` (moved to
   `approaches/approachKey.ts`) and `activityId`; a missing approach clears through `clearApproach()`, a missing CME
   through `cmeSelection.clear()`. No camera flight. `shell/useKeepShots.ts` runs it when a list changes.
7. Banner text: "Live JPL data unavailable · showing the snapshot from <date>" (oldest snapshot date, the pill's date
   format), true whether our server or JPL is down. `SnapshotBanner` spans the top bar under the pill; it is not a
   live region.
8. `hasWebGl2` releases its probe context through `WEBGL_lose_context`. `?webgl=off` (dev only) skips the probe, so no
   context is created at all.
9. Stills in `apps/web/public/stills/`: `swarm.webp` (v0.4 overview, cropped clear of the FPS meter and the old
   buttons, 1280 × 605, 173 KB), `close-approach.webp` (v0.5 close pass, 1280 × 602, 34 KB), `eruption.webp` (v0.6
   burst, the cursor removed from the Sun's glow, cropped to the scene, 990 × 520, 91 KB). The v0.6 cruise frame was
   not used: its cursor sits on the shell's edge and could not be removed cleanly.
10. Tests as planned, plus: the swap re-selects the new object; a server answering with its own snapshot stops the
    retries; a slow body from a live server still arrives; an aborted retry cancels its attempt.

Verified 2026-10-03 in Chrome (dev, 1920×809 canvas, DPR 1, S2721HN at 75 Hz), with a listener on 8787 that accepts
and never answers standing in for an asleep server: the snapshot and the banner arrived at 4.6 s after navigation.
2026 RP39 and 2024 SH7 played through their passes from the snapshot; the card's distance, speed, H and 3σ equal the
snapshot rows. Swapping in the real server, all three datasets went live within 26 s without a reload, the banner
went away and 2024 SH7 stayed selected and highlighted. Frame times over 26 s spanning the swap: 1,920 frames, none
over 16.7 ms (worst 14.5 ms, steady median 13.3 ms). `?webgl=off`: the notice, no canvas, the three stills loaded and
no data requested.

## Task 6: Responsive, touch and scrollbars (light)

Branch `phase-7/responsive`.

**Scope:**

- **Phones (< 600 px).** One panel open at a time as a bottom sheet (the existing `<details>` columns become
  exclusive), the time bar compact (speed as a select), the Display panel inside the right sheet.
- **Touch.** `touch-action: none` on the canvas; drei `OrbitControls` already rotates with one finger and pinches to
  zoom; tune `rotateSpeed` for touch; tap targets ≥ 44 px in the chrome.
- **Scrollbars (decision 9).** `scrollbar-width: thin; scrollbar-color: var(--faint) transparent;
scrollbar-gutter: stable;` on scroll areas. Lists stop having their own `max-height` inside a column that scrolls,
  so there is one scroll area per column at every width.
- **Default tier on touch** comes from Task 3's `initialTier` (Low on phones).

**Tests:** render tests for the exclusive sheets (opening one closes the other); the CSS is checked by eye.

**Acceptance:**

- [ ] Chrome device emulation (iPhone 15, Pixel 8, iPad): every panel reachable, nothing overlaps the time bar, the
      scene rotates and zooms by touch, no page scroll while dragging the scene.
- [ ] At 1920 × 1080, 1186 × 723 and 1024 × 768 no column shows two scrollbars; content does not shift when a
      scrollbar appears. Before/after stills in the PR.

**As built** (review proposals 1–10, approved 2026-10-03; proposal 8 took the alternative):

1. Exclusive sheets are native `<details name="shell-sheet">`, set only in the phone layout: both wide columns start
   open, and a shared name would close one. `ShellColumn` has three layouts (`shell/shellLayout.ts`: `wide`,
   `drawers`, `sheets`), each its own remount key.
2. Test: `columnDetailsProps(layout)` and `shellLayoutFor(matches)` are unit-tested (sheets share a name and start
   closed, drawers start closed, wide is open). The web tests have no DOM to click in; the browser's grouping was
   checked in Chrome (opening Display closed Events and back).
3. The phone layout is `(max-width: 599.98px), (max-height: 500px) and (max-width: 1099.98px)`, so a phone held
   sideways gets sheets rather than drawers.
4. Speed stays a range slider: no preset list exists for a select. Phone time bar: controls on one row, scrubber and
   speed under them; sideways, everything on one row.
5. Phone sheets: both columns share one grid area above the time bar; the summaries sit side by side at its foot and
   the open body rises above them at full width (`flex-direction: column-reverse`).
6. `rotateSpeed` unchanged: three's OrbitControls scales rotation by the canvas height and already sets
   `touch-action: none` on r3f's event element.
7. 44 px targets only under `@media (pointer: coarse)`: buttons, selects, summaries, the Trails label and sliders.
8. Decision 9 amended: no box scrolls inside another, but the left column itself never scrolls. The column and its
   `::details-content` are flex boxes; the eruption list is capped at `min(28vh, 300px)` and the approach list takes
   what is left; each list scrolls. The right column's body scrolls.
9. Phones: the focus picker is one horizontally scrolling row; `body` has `overscroll-behavior: none`.
10. Checked with classic scrollbars (this Mac shows them). Desktop sizes by window size (1920 × 809 is the tallest
    page the screen allows); phones in same-origin iframes for layout. Touch checks need DevTools emulation (user).

## Task 7: Accessibility and reduced motion (light)

Branch `phase-7/accessibility`.

**Scope:**

- **Reduced motion (decision 10).** `apps/web/src/scene/camera/motionPreference.ts`: `prefersReducedMotion()` (reads
  `matchMedia`, live: listens for changes). `cameraRig.flyTo` uses `durationSeconds: 0` when it matches; the opening
  keeps its own skip (`openingSkip.ts` switches to the shared helper).
- **Keyboard.** Visible focus on every control (`:focus-visible` ring with the accent token), labels on icon-only
  buttons, a logical tab order (top → left → right → time bar), time controls fully usable by keyboard (Space on the
  play button, arrows on the scrubber). No global shortcuts other than `?` (Task 8) and Esc.
- **Live regions.** The data-status pill announces changes politely (`aria-live="polite"`), not every second.

**Tests:** `cameraRig` with reduced motion: a flight completes in the same frame; a render test that every button
has an accessible name; the pill has `aria-live`.

**Acceptance:**

- [ ] With macOS "Reduce motion" on, Play approach and Watch eruption cut instead of fly; the opening is skipped.
- [x] The app can be operated from the keyboard alone: pick an approach, play it, pick a CME, watch it, change speed.
- [x] Lighthouse Accessibility ≥ 90 (local preview).

**As built** (review proposals 1–9, approved 2026-10-03):

1. `CameraRigOptions.reducedMotion` (default false, so the tests need no `matchMedia`); the singleton passes
   `prefersReducedMotion`, and `flyTo` makes every flight 0 s long, which `flightProgress` already lands on its first
   frame. Play approach, Watch eruption, the focus picker and body clicks all cut through this one place.
2. `scene/camera/motionPreference.ts`: `prefersReducedMotion()` reads `matchMedia` on every call, so a change applies
   to the next flight without a listener; it is false where there is no `matchMedia`. `openingSkip.ts` uses it.
3. The pill's `<summary>` no longer has `aria-live`: its age changes every minute and would be re-read each time. A
   visually hidden `aria-live="polite"` span beside the pill says only "Data status: <head word>". The planned "pill
   has aria-live" test became "only the head word is announced".
4. Each event list is one Tab stop (roving `tabIndex`), with ↑/↓/Home/End inside it (no wrap). The stop is the last
   focused row while it is listed, else the selected row, else the first. Pure `shell/rovingRows.ts`
   (`nextRowIndex`, `tabStopKey`) plus `shell/useRovingRows.ts`; rows carry `data-row-key`.
5. `aria-valuetext` on the scrubber (the formatted date instead of a Julian Date) and the speed slider (`formatRate`).
6. No key handlers in this task: Esc comes with Task 8's `<dialog>`.
7. `shell/accessibleNames.test.tsx` renders the time controls, focus picker, both lists, both cards and the Display
   panel, and checks that every button, input and select has a name (text without `aria-hidden` parts,
   `aria-label`, or a wrapping `<label>`). `FocusPicker` gained a server snapshot (the same reader) to render there.
8. Lighthouse first: `main` had Accessibility 98 (Task 1), losing only "Document does not have a main landmark". The
   scene is now wrapped in `<main class="shell-scene">`; the header and footer stay outside it.
9. The swarm fade-in and the caption fades stay under reduced motion: they do not move anything on screen.

Verified 2026-10-03 in Chrome (dev, live data): Tab order is focus picker → pill → approach list (one stop) → CME
list (one stop) → card → Display → time bar; picking an approach, playing it, picking a CME, watching it and
changing the speed all worked from the keyboard alone. With `matchMedia` stubbed to reduced motion, a flight landed
within two frames (a normal flight was still at eased progress ≈ 0); the macOS setting itself was not toggled, so the
first acceptance box stays open. Lighthouse on `vite preview`: Accessibility 100 (was 98), Performance 100.

## Task 8: Help dialog, legend, hint, credits (light)

Branch `phase-7/help`.

**Scope:**

- **Help dialog.** `apps/web/src/help/HelpDialog.tsx` on a native `<dialog>` (`showModal()`: focus trap and Esc for
  free), opened by a `?` button in the top bar and the `?` key. Tabs: What you're seeing / The three shots / Real vs
  illustrative / Glossary / Credits. Copy lives in `apps/web/src/help/helpContent.ts` as typed data (title, short
  paragraphs, glossary entries), so the dialog is a renderer.
- **Credits tab.** NASA/JPL SSD (SBDB, CAD), JPL Horizons (fixtures), NASA CCMC DONKI and ENLIL, the Earth texture's
  source and licence (check `apps/web/public/textures/` provenance in the repo history), three.js / React Three Fiber,
  and the GPL-3.0-or-later notice with a link to the source.
- **Legend.** `apps/web/src/shell/OrbitClassLegend.tsx`, after the mockup's legend: swatch, class name, count per
  class, total; colours from `SWARM_CLASS_COLORS` so it cannot drift from the shader; no per-class toggles.
- **First-visit hint.** One dismissible line ("New here? Press ? for a short guide"), remembered with `safeStorage`
  (Task 3); shown after the opening ends, never over it.

**Tests:** the dialog opens from the button and the `?` key (not while typing in an input), closes on Esc; every tab
renders its content; legend counts sum to the catalog count and use `SWARM_CLASS_COLORS` in order; the hint shows once,
stays dismissed, and still works when storage throws (Review Focus 4).

**Acceptance:**

- [x] A first-time visitor sees the hint after the opening; the dialog explains the swarm, the three shots and which
      parts are illustrative; Credits lists every data source the app uses.
- [x] The legend's counts match `/api/neos`.

**As built** (review proposals 1–11, approved 2026-10-04):

1. No DOM in the web tests, so the dialog's behaviour is tested through its parts: `isHelpShortcut(event)` (`?` only;
   not with Ctrl/Meta/Alt, on auto-repeat, or in an input, textarea, select or editable text), a key listener on an
   injected target, the button's `onClick` from the element tree, and the tabs' markup. Esc, the focus trap and focus
   return are the native `<dialog>`'s (`showModal()`), checked in the browser.
2. `HelpDialog` and its copy load with `React.lazy` on first open and stay mounted, so the chosen tab survives a close.
   Initial JS 375,017 B gzip lazy against 376,365 B eager (dialog chunk 3.3 KB gzip); before the task, 372,907 B.
3. Tabs follow the WAI-ARIA APG pattern: one Tab stop, Left/Right wrap, Home/End (`help/helpTabs.ts`,
   `nextTabIndex`). Every panel is rendered and the unselected ones `hidden`, so each tab controls its own panel.
4. `ClassSwatch` moved from `ApproachList` to `shell/ClassSwatch.tsx`, shared with the legend. The legend lists the
   classes in `NEO_ORBIT_CLASSES` order (Atira → Amor), not by count, so rows never reorder on a data swap. Its total
   is the catalog's `count`; the schema already makes every column `count` long, so the class counts add up to it.
5. The legend sits at the foot of the left column (`flex-shrink: 0`), shown once the catalog is ready. Below 1100 px
   it is in the Events drawer or sheet.
6. `help/helpStore.ts` holds whether help is open and whether the hint was seen (`perihelion.helpHintSeen`). Opening
   help counts as seeing the hint. The hint takes the opening caption's place and fades in after the caption has gone
   (4.5 s), so the two never overlap.
7. Credits: the three live sources (now shared with `NoWebGlNotice` in `shell/dataSources.ts`), the SBDB object API,
   WSA-ENLIL, Horizons, Standish's planetary elements, Blue Marble NG, the 3D libraries and the GPL notice with the
   repository link. The stills moved to `shell/releaseStills.ts` for the shots tab. README gains WSA-ENLIL.
8. `accessibleNames.test.tsx` covers the help button, the dialog (every tab) and the hint's dismiss button.
9. Glossary bounds are CNEOS's (cneos.jpl.nasa.gov/about/neo_groups.html); au and LD come from `KM_PER_AU` and
   `KM_PER_LUNAR_DISTANCE`, the close-approach cut from `CAD_MAX_DISTANCE_AU`.
10. The shots tab shows the three release stills, `loading="lazy"`.
11. Task table statuses brought up to date.

## Task 9: Deploy: Netlify + Render (light)

Branch `phase-7/deploy`.

**Scope:**

- **`netlify.toml`** (repo root): build `npm ci && npm run build -w apps/web`, publish `apps/web/dist`, Node 24;
  redirect `/api/*` → `https://<render-service>.onrender.com/api/:splat` with status 200 (proxy); `/assets/*` cached
  `public, max-age=31536000, immutable`; `index.html` not cached; Netlify compresses the snapshot JSON.
- **`render.yaml`** (Blueprint): one web service, free plan, Node 24, build `npm ci && npm run build -w apps/server`,
  start `node apps/server/dist/main.js`, health check `/health`, no secrets. `DATABASE_PATH` stays the default (the
  disk is ephemeral; decision 3).
- **Server.** Bind to `0.0.0.0` and Render's `PORT` (check `main.ts`; `config.ts` already reads `PORT`).
- **`docs/deploy.md`**: the user's checklist: create both services from the repo, set the Render URL in
  `netlify.toml`, confirm the first deploys, where to see logs. Both redeploy on every push to `main`.
- **README:** the public URL and how to run locally.

**Tests:** `config.test.ts` for the host binding if it changes. Deployment itself is checked by hand.

_Note from Task 5:_ the server answers `/health` only, and Netlify forwards `/api/*`, so the `/api/health` check
below needs an `/api/health` route (or the check uses `/api/cmes`); decide in this task's review.

**Acceptance:**

- [ ] The Netlify URL loads; `/api/health` answers through Netlify; with the server asleep the first visit shows the
      snapshot within ~4 s and swaps to live when Render wakes.
- [ ] No secrets in either config; `npm run check` green.

## Task 10: Exit verification (light)

Branch `phase-7/exit-verification`. Files: `PROGRESS.md`, plan status.

**Checks:**

1. **Public URL** end to end: the opening, an approach, an eruption, the help dialog, on the deployed site.
2. **Lighthouse desktop** on the public URL, three runs, median: Performance ≥ 85, TBT < 300 ms, Accessibility ≥ 90
   (decision 11). Record LCP and CLS too.
3. **Frame times per tier** with `?bench` (`overview`, `earth`, `approach`, `eruption`): each tier at normal settings,
   and the proxy runs, against the baseline. The governor seen stepping down under the 4× proxy load.
4. **Fallbacks:** no WebGL2, server asleep (snapshot then live), reduced motion, keyboard-only pass.
5. **Recording:** `?bench=tour` on the public URL; the user captures it (60 s, 1080p); linked from the README and the
   release.
6. **Release:** tag `v0.7.0` on the merge commit once CI on `main` is green, with the recording and stills; close the
   milestone.

**Acceptance:**

- [ ] Every check above recorded in `PROGRESS.md` with screen, canvas size, DPR and browser version.
- [ ] `npm run check` green.
