# PROGRESS

**Current phase:** Phase 2: Data layer (in progress)
**Last updated:** 2026-09-29

## Phase status

| Phase                         | Status         |
| ----------------------------- | -------------- |
| 0. Foundations                | ✅ Done        |
| 1. Orbit engine               | ✅ Done        |
| 2. Data layer                 | 🟨 In progress |
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
- [x] Fixture provenance recorded; `VEC_CORR` pinned to geometric
- [x] Golden tests: asteroids (tolerance calibrated and recorded below)

Exit criteria verified on `main` at `907abec` (CI green): all property and golden tests pass, tolerances are documented
below, and `packages/orbit` has no runtime dependencies.

## Phase 2: Data layer

- [x] Upstream query definitions + esbuild server bundle
- [x] Recorded upstream responses (SBDB, CAD, DONKI) + `npm run record`
- [x] zod schemas + normalizers (SBDB, CAD, DONKI) and API types
- [x] Upstream HTTP client with per-host rate limiting
- [x] SQLite cache + stale-while-revalidate + scheduled refresh
- [x] `/api/neos`, `/api/close-approaches`, `/api/cmes` with recorded-response tests
- [x] Bundled snapshot + offline fallback verified

## Phase 3–7

Checklists will be expanded from `PLAN.md` when each phase starts.

## Calibrated tolerances

| Test                                   | Tolerance                    | Rationale                                                                                  |
| -------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Planets vs Horizons: Mercury           | 31.4″ / 2.91″ / 2,250 km     | Measured 25.1″ / 2.33″ / 1,800 km × 1.25; Standish nominal 15″ / 1″ / 1,000 km             |
| Planets vs Horizons: Venus             | 31.5″ / 1.88″ / 7,000 km     | Measured 25.2″ / 1.50″ / 5,600 km × 1.25; Standish nominal 20″ / 1″ / 4,000 km             |
| Planets vs Horizons: EM barycentre     | 24.6″ / 2.03″ / 8,875 km     | Measured 19.7″ / 1.62″ / 7,100 km × 1.25; Standish nominal 20″ / 8″ / 6,000 km             |
| Planets vs Horizons: Mars              | 73.5″ / 1.71″ / 30,125 km    | Measured 58.8″ / 1.37″ / 24,100 km × 1.25; Standish nominal 40″ / 2″ / 25,000 km           |
| Planets vs Horizons: Jupiter           | 568″ / 8.88″ / 711,125 km    | Measured 454.6″ / 7.10″ / 568,900 km × 1.25; Standish nominal 400″ / 10″ / 600,000 km      |
| Planets vs Horizons: Saturn            | 891″ / 28.7″ / 3,502,375 km  | Measured 712.7″ / 22.95″ / 2,801,900 km × 1.25; Standish nominal 600″ / 25″ / 1,500,000 km |
| Planets vs Horizons: Uranus            | 127″ / 4.39″ / 1,676,875 km  | Measured 101.9″ / 3.51″ / 1,341,500 km × 1.25; Standish nominal 50″ / 2″ / 1,000,000 km    |
| Planets vs Horizons: Neptune           | 73.9″ / 2.09″ / 1,571,375 km | Measured 59.1″ / 1.67″ / 1,257,100 km × 1.25; Standish nominal 10″ / 1″ / 200,000 km       |
| Asteroids vs Horizons: Eros            | 7.06e-5 AU over ±120 d       | Measured 5.65e-5 AU × 1.25 (JPL#659)                                                       |
| Asteroids vs Horizons: Apophis         | 2.44e-5 AU over ±120 d       | Measured 1.95e-5 AU × 1.25 (JPL#220)                                                       |
| Asteroids vs Horizons: Bennu           | 4.31e-5 AU over ±120 d       | Measured 3.45e-5 AU × 1.25 (ORX_merged_DE424)                                              |
| Asteroids vs Horizons: Ryugu           | 2.95e-5 AU over ±120 d       | Measured 2.36e-5 AU × 1.25 (JPL#270)                                                       |
| Asteroids vs Horizons: Phaethon        | 6.15e-5 AU over ±120 d       | Measured 4.92e-5 AU × 1.25 (JPL#1003; e = 0.89, q = 0.14 AU)                               |
| Asteroids vs Horizons: Aten            | 2.15e-5 AU over ±120 d       | Measured 1.72e-5 AU × 1.25 (JPL#149)                                                       |
| Asteroids vs Horizons: Atira           | 4.18e-5 AU over ±120 d       | Measured 3.34e-5 AU × 1.25 (JPL#225)                                                       |
| Asteroids vs Horizons: PLAN target     | 1e-3 AU within ±60 d         | PLAN.md target; worst measured 1.42e-5 AU (Eros), ~70× inside                              |
| Asteroids: elements → state at epoch   | 1e-12 AU / 1e-12 AU/day      | Fixed bound (15 cm); measured ≤ 3e-15 AU / 6e-14 AU/day                                    |
| Asteroids: Horizons Keplerian GM vs k² | 1e-11 relative               | Measured 5e-12                                                                             |

Planet tolerances are heliocentric longitude / latitude / distance, the units of Standish's accuracy table
(https://ssd.jpl.nasa.gov/planets/approx_pos.html): the worst case over the 27 fixture dates × 1.25
(`TOLERANCE_MARGIN` in `planets.golden.test.ts`). Why they exceed the published bounds: see the decisions log.

Asteroid tolerances are the 3D heliocentric position error of two-body propagation from Horizons osculating elements at
JD 2461000.5, worst over the fixture offsets × 1.25 (`TOLERANCE_MARGIN` in `asteroids.golden.test.ts`).

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
- **2026-09-28:** Fixtures record their provenance: the Horizons API version and timestamp per file, the planets'
  ephemeris (DE441), and per asteroid its orbit solution, ephemeris, perturber set and Keplerian GM. Vector queries pin
  `VEC_CORR='NONE'` (geometric states). Regenerating with these changes left every committed number identical.
- **2026-09-28:** Horizons serves Bennu from the OSIRIS-REx tracking trajectory (`ORX_merged_DE424`), not a JPL orbit
  fit, so its ephemeris is DE424 and it has no perturber set (recorded as `null`). Bennu stays in the set (user
  decision), which is why provenance is kept per asteroid. Every asteroid's Keplerian GM is 2.9591220828411951e-4
  AU³/day², within 5e-12 (relative) of the engine's k².
- **2026-09-28:** Asteroid golden tolerances approved (user decision): measured worst error over ±120 days × 1.25 per
  asteroid, the PLAN target of 1e-3 AU within ±60 days asserted separately, a fixed 1e-12 AU / AU/day bound for the
  elements → state conversion at the epoch, and 1e-11 relative for GM. The conversion is exact to float noise; the
  error grows as t² away from the epoch (unmodelled planetary perturbations, not a GM or mean-motion error, which
  would grow linearly). Phaethon (e = 0.89) behaves like the rest.
- **2026-09-28:** The server is bundled by esbuild (`apps/server/scripts/build.mjs`): workspace packages are bundled,
  npm dependencies stay external, and `tsc` only typechecks the server, with Bundler resolution. This settles the
  Phase 0 "bundle vs. emit" question.
- **2026-09-28:** Upstream queries live in `packages/data` so the server and the recorder send identical requests.
  SBDB is asked for asteroids only (`sb-kind=a`) at full precision; CAD's `dist-max=0.05` is pinned explicitly.
- **2026-09-28:** The close-approach window is today ± `days` (a just-passed approach stays replayable); the CME
  window is the last `days` days.
- **2026-09-28:** Upstream recordings live in `packages/fixtures/upstream/` (Prettier-ignored), written by
  `npm run record` with a `manifest.json` (redacted URLs, status, `recordedAt`). The full SBDB NEO answer is committed
  gzipped (2.7 MB) for the payload-budget test; everything else is small.
- **2026-09-28:** Recording loaders return `unknown`; `@perihelion/fixtures/upstream` is environment-free,
  `/upstream-full` needs Node.
- **2026-09-28:** `/api/neos` is columnar JSON: e and a rounded to 1e-8, angles to 1e-6°, H to 0.01 (≈ 1–3 km at
  1 AU). Rows that are unbound, unclassified or missing an element are skipped; more than 1% skipped is a format error.
- **2026-09-28:** CAD values are kept exactly as printed (facts); one bad row fails the list so the server falls back.
- **2026-09-28:** A CME is served only with a complete `isMostAccurate` analysis; if several are flagged, the most
  recently submitted _complete_ one wins (an incomplete newer one falls back to an older complete one; ties: the later
  `time21_5`). In the 2026-09-28 recording 6 of 126 CMEs had two flagged analyses, and 40 were left out because their
  flagged analysis has no longitude (unknown far-side source).
- **2026-09-28:** API responses are `{ fetchedAt, origin: fresh | stale | snapshot, data }`; snapshots are
  `{ fetchedAt, data }`.
- **2026-09-28:** `days` is a whole number 1–60 (defaults: close approaches 7, CMEs 30).
- **2026-09-28:** An SBDB or CAD answer that reports `count > 0` but carries no rows is a format error, and so is an
  SBDB answer with no usable rows; the server falls back instead of serving an empty swarm or list. This overrides the
  plan's "returns an empty catalog for an empty answer" test (Review Focus 5). `count` must be a number or a digit
  string. CME analyses with a non-positive speed or half-angle count as incomplete, and SBDB elements are checked after
  rounding, so the normalizers never emit what their schemas reject.
- **2026-09-29:** One `UpstreamGate` per host (JPL SSD, api.nasa.gov): one request at a time, ≥ 1 s apart, counted
  from when the previous request ended; after a 429 the host is refused until `Retry-After` (default 60 s) and callers
  fall back rather than queue.
- **2026-09-29:** Upstream failures of every kind (network, timeout, HTTP status, a body cut off mid-read, non-JSON)
  become `UpstreamError` with the key redacted. A failed response's body is cancelled so Node can reuse the
  connection. `Retry-After` counts only as positive seconds; zero, negative or an HTTP date gets the 60 s default.
- **2026-09-29:** The dataset cache is one `node:sqlite` table (`dataset_cache`: key, validated JSON, fetch time) at
  `DATABASE_PATH` (default `.cache/perihelion.sqlite`, git-ignored). Data is stored as JSON text so `/api/neos` is
  never re-parsed per request.
- **2026-09-29:** Read path: fresh → cache; stale → cache now + background refresh; cold → upstream, else snapshot,
  else 503. Concurrent cold reads share one fetch. After a failure a dataset's upstream is left alone for 60 s: cold
  reads go straight to the snapshot and stale reads skip the background refresh. `refreshIfStale` never rejects (every
  failure, the cache's included, is logged) because the scheduler runs it unawaited.
- **2026-09-29:** The scheduler refreshes the default queries at start-up and every 10 minutes (wired in Task 6),
  skipping anything still fresh.
- **2026-09-29:** The server's default `DATABASE_PATH` and `SNAPSHOT_DIR` resolve against `apps/server` (via
  `import.meta.url`), not the working directory, so the server finds them wherever it is started. Values from the
  environment are used as given. Task 6 ships as two PRs: 6a (config, snapshot reader, dataset requests, upstream
  clients) and 6b (routes, compression, wiring, smoke test).
- **2026-09-29:** `/api/neos`, `/api/close-approaches?days=` and `/api/cmes?days=` return
  `{ fetchedAt, origin, data }`; a bad `days` is 400 and no data at all is 503. Responses are gzip-compressed
  (`@fastify/compress`).
- **2026-09-29:** TTLs: NEOs 24 h, close approaches and CMEs 1 h. The scheduler keeps the default queries warm every
  10 minutes. A missing `NASA_API_KEY` falls back to `DEMO_KEY` with a warning at start-up.
- **2026-09-29:** When upstream is down the snapshot answers for any `days` value, labelled `origin: "snapshot"`.
- **2026-09-29:** SBDB and CAD share the JPL SSD gate, so a cold `/api/close-approaches` can wait behind an SBDB
  download (up to its 60 s timeout).
- **2026-09-29:** Measured: gzipped `/api/neos` on the full recording is 1,425,929 bytes (71% of the 2,000,000-byte
  budget; 4,264,785 bytes uncompressed), keeping all 42,534 recorded NEOs. Live on 2026-09-29: 1,425,931 bytes,
  42,534 NEOs.
- **2026-09-29:** `npm run snapshot` writes `apps/web/public/snapshot/<name>.json` (`{ fetchedAt, data }`) through the
  same queries and validation as the server, and refuses a NEO snapshot over the gzip budget. The snapshot is committed
  and Prettier-ignored; a server test keeps it valid. Written from live data on 2026-09-29: `neos.json` 4,264,773 bytes
  (1,425,917 gzipped, 42,534 NEOs), `close-approaches.json` 9 KB, `cmes.json` 58 KB.
- **2026-09-29:** The web app loads data with `loadDataset(name)`: server first, bundled snapshot second, both validated.
- **2026-09-29:** Offline fallback verified by hand on the built server and web app: online with an empty cache →
  `fresh`; offline with a warm cache after a restart → `stale` (past the 1 h CME TTL; the failed refresh is logged);
  offline with an empty cache → `snapshot` for all three routes, found at the default path from `dist/main.js`; server
  down → `vite preview` serves `/snapshot/*.json`.

## Open questions

- Final project name ("Perihelion" is a working name).
- Hosting targets for web and server.
- Confirm the opening scene (Swarm vs Eruption).
- Before Phase 6 shows CME times or renders CME links: DONKI times go through `Date.parse`, which reads a time without
  `Z` as local time (every recorded time has `Z`), so require an explicit `Z`; and `cmeSchema.link` accepts any string,
  so restrict it to http(s).

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
- Node 24 prints `ExperimentalWarning: SQLite is an experimental feature and might change at any time` whenever
  `node:sqlite` loads (tests, server start-up). Harmless; we use only `DatabaseSync` and prepared statements.

## Blockers

_None._
