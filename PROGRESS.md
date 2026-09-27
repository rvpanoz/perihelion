# PROGRESS

**Current phase:** Phase 0: Foundations (not started)
**Last updated:** 2026-09-28

## Phase status

| Phase                         | Status         |
| ----------------------------- | -------------- |
| 0. Foundations                | ⬜ Not started |
| 1. Orbit engine               | ⬜ Not started |
| 2. Data layer                 | ⬜ Not started |
| 3. Scene foundation           | ⬜ Not started |
| 4. Shot 1: The Swarm          | ⬜ Not started |
| 5. Shot 2: The Close Approach | ⬜ Not started |
| 6. Shot 3: The Eruption       | ⬜ Not started |
| 7. Polish & ship              | ⬜ Not started |

Legend: ⬜ not started · 🟨 in progress · ✅ done (all exit criteria verified)

## Phase 0: Foundations

- [ ] pnpm monorepo scaffold (`apps/web`, `apps/server`, `packages/orbit`, `packages/data`, `packages/fixtures`)
- [ ] TS strict + ESLint + Prettier + Vitest
- [ ] Lint rule: `packages/orbit` imports nothing
- [ ] Web: R3F scene with sphere + FPS overlay
- [ ] Server: Fastify `/health`
- [ ] `pnpm check` script
- [ ] CI workflow
- [ ] `.env.example`

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

## Open questions

- Final project name ("Perihelion" is a working name).
- Hosting targets for web and server.
- Confirm the opening scene (Swarm vs Eruption).

## Known external issues

- Mars Rover Photos API is offline (404), so it is not used.
- Legacy APOD API archived on 2026-12-01, so it is not used.
- `DEMO_KEY` is heavily rate-limited; use a personal `NASA_API_KEY`.

## Blockers

_None._
