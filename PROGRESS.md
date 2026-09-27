# PROGRESS

**Current phase:** Phase 1: Orbit engine (not started)
**Last updated:** 2026-09-28

## Phase status

| Phase                         | Status         |
| ----------------------------- | -------------- |
| 0. Foundations                | ✅ Done        |
| 1. Orbit engine               | ⬜ Not started |
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

- [ ] Time scales (UTC → TT/TDB, JD)
- [ ] Kepler solver + property tests
- [ ] Elements ↔ state vectors + round-trip tests
- [ ] Two-body propagation + conservation tests
- [ ] Planet positions (Standish tables)
- [ ] Horizons fixture generator + committed fixtures
- [ ] Golden tests: planets
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

| Test                         | Tolerance | Rationale |
| ---------------------------- | --------- | --------- |
| _(filled in during Phase 1)_ |           |           |

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

## Blockers

_None._
