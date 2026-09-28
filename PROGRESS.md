# PROGRESS

**Current phase:** Phase 1: Orbit engine (in progress)
**Last updated:** 2026-09-28

## Phase status

| Phase                         | Status         |
| ----------------------------- | -------------- |
| 0. Foundations                | ✅ Done        |
| 1. Orbit engine               | 🟨 In progress |
| 2. Data layer                 | ⬜ Not started |
| 3. Scene foundation           | ⬜ Not started |
| 4. Shot 1: The Swarm          | ⬜ Not started |
| 5. Shot 2: The Close Approach | ⬜ Not started |
| 6. Shot 3: The Eruption       | ⬜ Not started |
| 7. Polish & ship              | ⬜ Not started |

Legend: ⬜ not started · 🟨 in progress · ✅ done (all exit criteria verified)

## Phase 0: Foundations

- [x] npm workspaces monorepo scaffold (`apps/web`, `apps/server`, `packages/orbit`, `packages/data`, `packages/fixtures`)
- [x] TS strict + ESLint + Prettier + Vitest
- [x] Lint rule: `packages/orbit` imports nothing (verified: bare, `node:`, type-only, re-export and dynamic imports all rejected)
- [x] Web: R3F scene with sphere + FPS overlay (verified in Chrome via `npm run dev`)
- [x] Server: Fastify `/health` (test via `inject()`; live `curl` returned `{"status":"ok"}`)
- [x] `npm run check` script (green locally: 5 test files, 7 tests)
- [x] CI workflow (green on `main` at `ca384de`, run 36353074544: `npm ci` + `npm run check`)
- [x] `.env.example`

## Phase 1: Orbit engine

- [x] Time scales (UTC → TT/TDB, JD)
- [x] Kepler solver + property tests
- [x] Elements ↔ state vectors + round-trip tests
- [x] Two-body propagation + conservation tests
- [x] Planet positions (Standish tables)
- [x] Horizons fixture generator + committed fixtures
- [x] Golden tests: planets (tolerances calibrated below)
- [ ] Golden tests: asteroids (tolerance calibrated and recorded below)

## Phase 2: Data layer

- [ ] zod schemas (SBDB, CAD, DONKI)
- [ ] `/api/neos`, `/api/close-approaches`, `/api/cmes`
- [ ] SQLite cache + scheduled refresh
- [ ] Recorded-response server tests
- [ ] Bundled snapshot + offline fallback verified

## Phase 3–7

Checklists will be expanded from `PLAN.md` when each phase starts.

## Calibrated tolerances

| Test                               | Tolerance                    | Rationale                                                                                  |
| ---------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Planets vs Horizons: Mercury       | 31.4″ / 2.91″ / 2,250 km     | Measured 25.1″ / 2.33″ / 1,800 km × 1.25; Standish nominal 15″ / 1″ / 1,000 km             |
| Planets vs Horizons: Venus         | 31.5″ / 1.88″ / 7,000 km     | Measured 25.2″ / 1.50″ / 5,600 km × 1.25; Standish nominal 20″ / 1″ / 4,000 km             |
| Planets vs Horizons: EM barycentre | 24.6″ / 2.03″ / 8,875 km     | Measured 19.7″ / 1.62″ / 7,100 km × 1.25; Standish nominal 20″ / 8″ / 6,000 km             |
| Planets vs Horizons: Mars          | 73.5″ / 1.71″ / 30,125 km    | Measured 58.8″ / 1.37″ / 24,100 km × 1.25; Standish nominal 40″ / 2″ / 25,000 km           |
| Planets vs Horizons: Jupiter       | 568″ / 8.88″ / 711,125 km    | Measured 454.6″ / 7.10″ / 568,900 km × 1.25; Standish nominal 400″ / 10″ / 600,000 km      |
| Planets vs Horizons: Saturn        | 891″ / 28.7″ / 3,502,375 km  | Measured 712.7″ / 22.95″ / 2,801,900 km × 1.25; Standish nominal 600″ / 25″ / 1,500,000 km |
| Planets vs Horizons: Uranus        | 127″ / 4.39″ / 1,676,875 km  | Measured 101.9″ / 3.51″ / 1,341,500 km × 1.25; Standish nominal 50″ / 2″ / 1,000,000 km    |
| Planets vs Horizons: Neptune       | 73.9″ / 2.09″ / 1,571,375 km | Measured 59.1″ / 1.67″ / 1,257,100 km × 1.25; Standish nominal 10″ / 1″ / 200,000 km       |

Planet tolerances are heliocentric longitude / latitude / distance, the units of Standish's accuracy table
(https://ssd.jpl.nasa.gov/planets/approx_pos.html): the worst case over the 27 fixture dates × 1.25
(`TOLERANCE_MARGIN` in `planets.golden.test.ts`). Why they exceed the published bounds: see the decisions log.

## Decisions log

- **2026-09-28:** TypeScript/React/Node stack; web first, React Native parked.
- **2026-09-28:** No AI at runtime; AI only used to build.
- **2026-09-28:** Correctness is proven against JPL Horizons fixtures, not judged by eye.
- **2026-09-28:** CPU float64 engine for truth; GPU vertex-shader Kepler for the swarm.
- **2026-09-28:** Camera-relative rendering + logarithmic depth buffer from the start.
- **2026-09-28:** All NASA/JPL access goes through our caching server with a bundled snapshot fallback.
- **2026-09-28:** Opening scene is the Swarm reveal (assumed; confirm).
- **2026-09-28:** npm workspaces instead of pnpm (user decision); docs updated to `npm run …`.
- **2026-09-28:** TypeScript pinned to `~6.0`: typescript-eslint 8.70 supports TS `<6.1`, so TS 7 is out for now.
- **2026-09-28:** Internal packages export TS source (`exports: ./src/index.ts`); Vite/tsx/Vitest compile them.
  How the production server consumes them (bundle vs. emit) is decided in Phase 2.
- **2026-09-28:** Orbit purity enforced twice: ESLint (`no-restricted-imports` regex allowing only relative
  paths, plus a ban on `import()`/`require`) and tsconfig (`lib: ES2023`, `types: []`, so no DOM/Node globals).
- **2026-09-28:** `npm run dev` uses `scripts/dev.mjs` (spawns both workspaces) instead of adding `concurrently`.
- **2026-09-28:** Server dev port 8787; Vite proxies `/api` to it. FPS overlay is drei `<Stats />`.
- **2026-09-28:** `packages/fixtures` gets Node types (its generator runs in Node); orbit/data stay DOM- and Node-free.
- **2026-09-28:** Work is tracked on GitHub: issues per checklist item, `type:`/`phase:`/`area:` labels, a milestone
  per phase, the Perihelion project board, and a `v0.N.0` tag + release per finished phase (see CLAUDE.md).
- **2026-09-28:** Time: calendar dates are proleptic Gregorian (Meeus ch. 7). TDB = TT (the periodic term is
  ≤ 1.7 ms, about 50 m of Earth motion). UTC before 1972-01-01 is rejected; callers pass TDB directly.
- **2026-09-28:** Kepler: hyperbolic orbits (e ≥ 1) are rejected with a `RangeError`; comets are parked.
- **2026-09-28:** Asteroid golden tests take osculating elements from Horizons at a fixed epoch, so they
  measure only our two-body error. Bodies: Eros, Apophis, Bennu, Ryugu, Phaethon, one Aten, one Atira.
- **2026-09-28:** GM☉ = k² with the IAU 1976 Gaussian constant (AU³/day²). Where elements are undefined, ecliptic
  orbits get Ω = 0 and circular orbits get ω = 0; states still round-trip exactly.
- **2026-09-28:** Planets use Standish Table 1 (1800–2050), transcribed by script from JPL's page. "Earth" is the
  Earth–Moon barycentre as in the table. Dates outside 1800–2050 still compute (no throw) so the timeline can
  scrub freely; the validity range is exported for callers that show facts.
- **2026-09-28:** Golden tests import `@perihelion/fixtures/golden` (loaders, spec constants, record types),
  typechecked with no Node/DOM globals; orbit's tsconfig stays ES2023-only.
- **2026-09-28:** Fixtures query Horizons planet-system barycentres 1–8 (what Standish Table 1 fits), heliocentric
  `500@10`, ecliptic J2000, AU-D, TDB.
- **2026-09-28:** Planet samples: 1 January of every decade 1800–2050 plus J2000 (27 dates). Asteroid elements at
  JD 2461000.5 (2025-11-21), states at 0, ±10, ±30, ±60, ±120 days.
- **2026-09-28:** Fixtures are JSON in `packages/fixtures/data/`, validated by zod on load; data and recorded
  responses are Prettier-ignored so they are never reformatted.
- **2026-09-28:** `packages/fixtures` depends on zod (validation) and tsx (dev, runs the generator); orbit stays
  dependency-free.

- **2026-09-28:** Planet golden tests use calibrated tolerances, not Standish's published bounds (user decision).
  Against DE441 (Sun-centred) the engine exceeds the page's _nominal_ 1800–2050 errors by 1.1–2.3×, Neptune by ~6×.
  The inner planets being close and the Table 1 constants matching the page point to the approximation's
  limits against a modern ephemeris rather than an engine bug.
- **2026-09-28:** One-off barycentre check (dev only, not committed): measured from the solar-system barycentre,
  Neptune falls to about its published bound (10.8″ / 0.51″ / 291,700 km), the inner planets get ~100× worse, and
  Uranus fits neither frame. Fixtures and engine stay heliocentric as `PLAN.md` specifies.
- **2026-09-28:** ESLint pins `tsconfigRootDir`, and ESLint and Prettier ignore `.kilo/`: another tool's git
  worktree inside the repo made typescript-eslint see two project roots and broke lint.
- **2026-09-28:** All 96 Table 1 constants in `planets.ts` match the table on JPL's approx_pos page (numeric diff by
  script), and the formulae (degrees; M = L − ϖ, ω = ϖ − Ω; no b, c, s, f terms in Table 1) follow the page. The engine's
  error oscillates around zero with no drift away from J2000: Saturn ±700″ over ~60 years (Jupiter–Saturn
  perturbations), Neptune ±50″ (about the Sun's Jupiter-driven wobble seen from 30 AU). That is periodic perturbation a
  mean-element fit cannot model, not a transcription error.

## Open questions

- Final project name ("Perihelion" is a working name).
- Hosting targets for web and server.
- Confirm the opening scene (Swarm vs Eruption).

## Known external issues

- Mars Rover Photos API is offline (404), so it is not used.
- Legacy APOD API archived on 2026-12-01, so it is not used.
- `DEMO_KEY` is heavily rate-limited; use a personal `NASA_API_KEY`.
- R3F 9.8 logs `THREE.Clock: This module has been deprecated` with three 0.186 (upstream; harmless).
- Vite warns the web bundle is 1.13 MB (310 kB gzipped), mostly three.js. Revisit code-splitting in Phase 7.
- In the automated Chrome tab the Stats panel read 1 FPS. It was updating, so the render loop runs; likely background-tab
  throttling, but not confirmed. Check the frame rate in a focused window.
- `npm ci` warns that esbuild's postinstall script is not covered by npm's `allowScripts` policy (esbuild comes in
  via tsx). It doesn't affect `check`; revisit if `npm run dev` for the server breaks on a fresh install.
- The leap-second table ends at 2017-01-01 (TAI − UTC = 37 s) and assumes none since. Check it against the
  latest IERS Bulletin C before release.
- Horizons rejects an unencoded `;` with HTTP 400 "parameter not recognized"; rows come back in time order
  regardless of TLIST order.

## Blockers

_None._
