# PROGRESS

**Current phase:** Phase 5: Shot 2: The Close Approach (in progress)
**Last updated:** 2026-10-01

## Phase status

| Phase                         | Status         |
| ----------------------------- | -------------- |
| 0. Foundations                | ✅ Done        |
| 1. Orbit engine               | ✅ Done        |
| 2. Data layer                 | ✅ Done        |
| 3. Scene foundation           | ✅ Done        |
| 4. Shot 1: The Swarm          | ✅ Done        |
| 5. Shot 2: The Close Approach | 🟨 In progress |
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

Exit criteria verified on `main` at `a2eef51` (CI green): server tests use recorded upstream responses only (global
`fetch` is passed in `upstreamClients.ts` alone, which no test imports), offline behaviour is verified (decisions log),
and gzipped `/api/neos` is 1,425,929 bytes, inside the 2 MB budget (`neoPayload.test.ts`).

## Phase 3: Scene foundation

- [x] Floating origin (float64, focus-relative) + ecliptic → scene axes; logarithmic depth buffer kept
- [x] Time store (the single time source) + `jdUtcFromJdTdb`
- [x] Sun, 8 planets from the engine, orbit lines
- [x] Time controls: play/pause, speed (real time → 10 yr/s), scrub, "now"
- [x] Camera rig: orbit controls, focus, scripted `flyTo`
- [x] Postprocessing: bloom + tone mapping
- [x] Render-loop test: nothing per-frame goes through React state

Exit criteria verified on `main` at `cb1f905` (CI green, run 36635761876), in Chrome 153 in a foreground window
(1920×865 canvas at DPR 1) on an Apple M3 with 16 GB, macOS 26.5:

- Planets match the engine at any scrubbed date: `SolarSystem.test.tsx` (1850, 2003, 2049), and by eye at Mars's
  2003 closest approach (2003-08-27 09:51 TDB), where the Sun, Earth and Mars line up: heliocentric longitudes
  333.68° and 334.13°, Earth–Mars 0.373 AU.
- No visible jitter zoomed to Earth: at the minimum zoom (1.5 radii) Earth sat exactly at the scene origin in 750/750
  frames at 1 d/s and 750/750 at 10 yr/s (run from 1900 so it does not stop at 2050), with the camera distance
  constant; the sphere is steady in screenshots.
- Steady 60 fps: 75.0 fps (the display's refresh cap), median frame 13.3 ms, worst 15.7 ms, no frame over 20 ms,
  over 10 s each at the default view and at Earth, at 1 d/s and at 10 yr/s.

## Phase 4: Shot 1: The Swarm

- [x] Swarm data: `/api/neos` columns → typed arrays for instanced attributes, with orbit class
- [x] GPU Kepler solver in the vertex shader (fixed Newton iterations, good starting guess, high-`e` clamp) + float32 JS port
- [x] GPU vs CPU cross-check test: the JS port matches the engine for sampled NEOs within a visual tolerance
- [x] Look: additive point sprites, size/brightness by H, colour by orbit class (Apollo/Aten/Amor/Atira)
- [x] Faint orbit trails
- [x] Choreography: scripted opening camera move + time ramp
- [x] Exit verification: 40k objects at ≥ 60 fps, smooth opening move (GPU frame timing + 4× stress run)

Exit criteria verified on `main` at `e507be1` (CI green, run 36782993883). The frame times were measured on
`phase-4/exit-verification` (on `main` at `a4a910b` plus the Task 7 dev tools; PR CI run 36781278993, merged as
`f410175`, `main` run 36781976339), in Chrome 154 in a foreground window (1920×809 canvas at DPR 1) on an Apple M3
with 16 GB, with the 42,535-NEO catalog and trails on; 10 s per run after a 1 s warm-up.

- Sun overview: 75.0 fps (the display's cap), median 13.3 ms, worst 14.4 ms, no frame over 20 ms, at 1 d/s and at
  10 yr/s (from 1900, ending ~2010 so the clock never paused at 2050).
- Earth at minimum zoom (6.39e-5 AU): the same numbers at both rates, with the camera distance constant. Paused, two
  captures of the swarm 1 s apart are identical: no jitter against the planets.
- The opening, from a fresh load: 4 loads in Task 7 (901–902 frames, median 13.3 ms) and a clean run after the #70
  fix in #72 (902 frames, median 13.3 ms). Its only frame over 20 ms (29–32 ms) is the first, ~30 ms in, the frame
  the catalog arrives and the swarm is built, before any camera motion; it is known and accepted (decisions log).
  The move itself has no hitch.
- 4× stress (`?swarmStress=4`, 170,140 objects): 75.0 fps, median 13.3–13.4 ms, worst 14.4 ms, no frame over 20 ms,
  at both rates.
- GPU timer (`EXT_disjoint_timer_query_webgl2` is exposed): points ≈ 5.3 ms and trails ≈ 6.2 ms at 1×, ≈ 8.4 ms and
  ≈ 11.4 ms at 4×. These are not draw-only: at 4× they sum to ~20 ms while frames take 13.3 ms, so ANGLE's Metal
  timer queries include other work. They are upper bounds; the 4× frame times are the headroom evidence.
- #70, fixed in #72: on the opening's long pull-back `flyTo`'s origin outran the log-space zoom, so Earth left the
  view within ~1 s. Earth now recedes toward the edge; frame times are unchanged.
- GPU/CPU agreement: the Task 3 rows in "Calibrated tolerances".
- Screenshot-worthy: three stills (the Sun overview, Earth in the swarm, the opening's end frame with its caption),
  attached to the v0.4.0 release.

## Phase 5: Shot 2: The Close Approach

Plan: `docs/superpowers/plans/2026-10-01-phase-5-the-close-approach.md`.

- [ ] App shell: layout regions around the canvas + data-status pill (fresh / stale / snapshot)
- [ ] Close-approach rows carry an orbit (NEO catalog join, SBDB lookup for misses) and JPL's diameter
- [ ] Diameter: JPL's when known, else estimated from H and labelled "est."
- [ ] Close-approach list UI (from `/api/close-approaches`), with an empty state
- [ ] Focused asteroid positioned by the CPU engine (float64) + trail; engine-vs-CAD closest-distance check
- [ ] Selecting an approach: clock to the approach, camera flies to the asteroid and follows it through closest approach
- [ ] HUD: JPL-reported distance (LD/AU/km), relative speed and date, plus diameter
- [ ] Exit verification: every listed approach plays end to end; HUD values match CAD exactly; 60 fps

## Phase 6–7

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
| Swarm float32 vs engine: within ±10 yr | 1.71e-5 AU                   | Measured 1.37e-5 AU × 1.25 (2,006 NEOs, seed 20260930); 1 px ≈ 0.002 AU at the overview    |
| Swarm float32 vs engine: 1800 / 2050   | 4.73e-4 AU                   | Measured 3.78e-4 AU × 1.25 (2,006 NEOs, seed 20260930); 1 px ≈ 0.002 AU at the overview    |

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

- **2026-09-29:** Phase 3 scene origin = the camera focus, kept in float64; objects draw at `position − origin`,
  subtracted in float64 before three.js sees the value (`apps/web/src/scene/sceneFrame.ts`).
- **2026-09-29:** Ecliptic (x, y, z) → scene (x, z, −y), and only `sceneFrame.ts` maps axes. The negated axis is written
  as a subtraction so a zero never becomes −0.
- **2026-09-29:** `apps/web` declares `fast-check` as a dev dependency; its tests use it, and before only
  `packages/orbit` declared it.

- **2026-09-29:** One time store (`apps/web/src/time/timeStore.ts`) is the scene's only time source. The frame loop
  ticks it without notifying React; user actions (play/pause, rate, scrub, now) notify subscribers.
- **2026-09-29:** Rate runs from 1/86,400 to 3,652.5 d/s (real time → 10 yr/s), default 1 d/s. Time is clamped to
  Standish Table 1's 1800–2050 range and playback pauses at the end. A frame counts at most 0.1 s of wall time.
- **2026-09-29:** `jdUtcFromJdTdb` added to the engine: estimate UTC with the offset at the TDB instant, then correct
  once. It throws before 1972 like the forward conversion; its tests use a 1e-8 d (≈ 0.9 ms) bound.
- **2026-09-29:** `useFrame` order is fixed by `FRAME_PRIORITY`: clock −3, body positions −2, camera rig −1, scene
  objects 0. R3F 9.8 sorts ascending and only priorities above 0 take over rendering.

- **2026-09-29:** Bodies use true IAU mean radii (WGCCRE 2015; IAU 2015 nominal solar radius) plus a fixed 3 px
  marker so they stay visible at any zoom. Earth is drawn at the Earth–Moon barycentre (what Standish gives). Colours
  are illustrative.
- **2026-09-29:** Orbit lines are 256 points of each planet's osculating ellipse, resampled after 365.25 simulated
  days. They are float32 relative to the Sun (≈ 1.5 km rounding at 1 AU); only their origin is float64-exact.
- **2026-09-29:** Sunlight is a point light with no distance falloff (illustrative), intensity 2.5, plus 0.03
  ambient.
- **2026-09-29:** The camera starts ≈ 3 AU out and 30° above the ecliptic (moved from Phase 3 Task 5 to Task 3, so
  orbits read as ellipses from the first render).
- **2026-09-29:** drei `OrbitControls` cannot mount under `@react-three/test-renderer` (its mock canvas has no event
  target); the camera rig will split per-frame logic from the controls (Task 5 review).

- **2026-09-30:** The date readout shows UTC from 1972 and TDB before it (UTC has no leap-second definition earlier). It
  refreshes at 4 Hz and on every user action; the scene never waits on it.
- **2026-09-30:** The speed slider is logarithmic: the 8 decades from real time to 10 yr/s get equal travel.

- **2026-09-30:** OrbitControls always target (0, 0, 0); the camera rig moves the scene origin to the focus. The
  controls are switched off during flights.
- **2026-09-30:** `cameraRig.flyTo` eases the origin toward the target's current position and the distance in log
  space (cubic in-out, 2.5 s). On the frame a flight lands the camera gets the exact target distance.
- **2026-09-30:** View distances: min 1.5 radii, default 8 radii (Sun: 3 AU), max 100 AU.
- **2026-09-30:** The rig is two components: `CameraRigUpdater` (per frame, no drei, so it mounts under the test
  renderer) and `CameraControls` (drei `OrbitControls`). drei updates its controls at priority −1 like the rig, so
  the updater is mounted first and switches the controls off before drei looks. It reads the controls from R3F's frame
  state.
- **2026-09-30:** Body markers ignore raycasts: three.js hit-tests points within 1 world unit (1 AU here), which let
  clicks on empty space focus a planet. Only the spheres are clickable. The focus picker sits top-right, clear of the
  FPS panel.

- **2026-09-30:** Bloom threshold 1 in linear light with mipmap blur, so only HDR colours (today just the Sun's glow)
  bloom; every body colour stays below it (`effectsConfig.test.ts`). ACES filmic tone mapping runs once, at the end of
  the composer; the renderer does none (`<Canvas flat>`). Frame buffers are half-float so colours above 1 survive
  until tone mapping.
- **2026-09-30:** Measured with bloom and tone mapping on (Chrome 153, 1920×809 canvas at DPR 1, Apple M3 with
  8 CPU / 10 GPU cores, 16 GB, macOS 26.5; tab visible, not focused): 75.0 fps over 10 s at the default view and
  75.0 fps over 10 s at Earth, median frame 13.3 ms, worst 15.2 ms, no frame over 20 ms. 75 Hz is the display's
  refresh rate, so this is the vsync cap, not the limit.

- **2026-09-30:** `SceneContents.test.tsx` enforces "nothing per-frame goes through React state": 120 frames, zero
  commits under a React `Profiler` (the mount's own commits are counted first, so zero is meaningful). Each frame runs
  inside the test renderer's `act()`. `advanceFrames` calls the callbacks synchronously and React commits later, so the
  planned single `advanceFrames(120)` read 0 commits even with a `useState` tick added to `SimulationClock`; with one
  `act()` per frame that sabotage gives 120 commits.
- **2026-09-30:** `SceneContents` is everything in the canvas that mounts under the test renderer (clock, ambient light,
  solar system, camera-rig updater). `SceneCanvas` adds the background colour, `CameraControls` (mounted after it, so
  the updater runs first), `Effects` and `Stats`.
- **2026-09-30:** The Stats panel's 1 FPS in the automated tab (Phase 0) is explained: Chrome stops drawing a hidden
  or covered window, so requestAnimationFrame stalls. In a visible window the scene runs at the display's 75 Hz
  (Task 6 and the Phase 3 close-out).

- **2026-09-30:** Faint orbit trails stay in Phase 4 (user decision), not moved to Phase 7 polish.
- **2026-09-30:** The swarm's attributes are built once per load in float64 through the engine (`propagateElements`,
  `meanMotionRadPerDay`, `perifocalBasis`) and rounded to float32 at the end: per NEO, eccentricity (clamped to
  ≤ 0.99), mean anomaly at a shared reference epoch and mean motion, and the two in-plane orbit axes pre-scaled by
  `a` and `b`, in scene axes.
- **2026-09-30:** `perifocalBasis` is exported from `packages/orbit` so the swarm reuses the engine's rotation. It
  takes only the three orientation angles (`Pick<OrbitalElements, …>`) and has an explicit return type.
- **2026-09-30:** NEOs without an H are drawn as H = 30 (the faintest).
- **2026-09-30:** The swarm's Kepler solver starts from Mikkola's cubic approximation and takes a fixed 6 Newton
  steps. From E₀ = π, 6 steps left E ~0.1 rad off at e = 0.99 near perihelion.
- **2026-09-30:** The GLSL (`swarmKepler.glsl`) and its float32 JS port (`swarmKepler.ts`) are kept in step by hand,
  with matching function names. A test checks that they share the step count and names. The port rounds each
  statement to float32, and the cross-check (Task 3) tests the port.
- **2026-09-30:** The GPU path is cross-checked through its float32 JS port against the float64 engine, on the same
  elements, over 6 named shapes and 2,000 seeded random NEOs. Horizons is not involved: the engine is already
  checked against it.
- **2026-09-30:** Swarm cross-check tolerances approved (user decision): worst 1.37e-5 AU within ±10 yr and 3.78e-4 AU
  at 1800 / 2050 (0.19 px at the overview), each × 1.25. No reference-epoch rebasing is needed: the range-end error
  is ~25× below the plan's 1e-2 AU estimate.
- **2026-09-30:** The swarm is one `Points` with plain vertex attributes (`gl.POINTS` draws one vertex per NEO; only
  trails instance), with frustum culling off and raycasting ignored. Its shaders include three's log-depth chunks.
- **2026-09-30:** The Sun's scene offset reaches the swarm shader as a uniform written through `writeSceneOffset`
  every frame at `sceneObjects` priority, after the camera rig. `elapsedDays = jdTdb − referenceJdTdb` is taken in
  float64 on the CPU; the reference epoch is the simulation time when the catalog arrives, so a later scrub can be
  up to ~91,000 days away (Task 3 measured 83,000), still far under a pixel.
- **2026-09-30:** The NEO catalog is loaded in `App` (`useNeoCatalog`), not inside the canvas. The scene gets it as a
  prop and runs unchanged without it. The status line gives the count, source and fetch date, and says when the data
  is the bundled snapshot or unavailable.
- **2026-09-30:** Swarm size, brightness and colours are illustrative. One sprite at full brightness stays below the
  bloom threshold, so only dense stacks glow. Colour tuning is deferred to Task 7 (user decision): zoomed out, the
  Apollo blue dominates and the Amor purple reads almost white.
- **2026-09-30:** Trails span 1/24 of each NEO's own period in 8 steps behind the head, a refinement of decision 5:
  spacing by orbit fraction, not days, keeps trails the same shape at any time rate and still while paused. They are
  an instanced line strip (one 9-vertex strip per NEO) that reuses the swarm's Kepler solver via `swarmTrailLagDays`,
  with opacity 0.12 at the head falling with the square of the distance to 0 at the tail.
- **2026-09-30:** Points and trails share one attribute build and one set of uniforms, so one per-frame write moves
  both. Trails are on by default; the "Trails" checkbox lives in `App` beside the catalog state and unmounts them when
  off, so they cost nothing on the GPU.
- **2026-10-01:** The opening is one `flyTo` plus a log-space rate ramp: it snaps to Earth, then flies 12 s to a 4 AU
  Sun overview while the rate climbs from real time to 30 d/s, eased like the flight and timed by the same wall
  clock, so both finish together. It waits until the catalog is no longer loading, plays over the planets when the
  data is unavailable, and plays once per page load.
- **2026-10-01:** Scripted rate changes don't notify React: `TimeStore.setScriptedRate` clamps like `setRate` but wakes
  no one, and the director notifies once at the end through `setRate`. It runs at `FRAME_PRIORITY.opening = -4`,
  before the clock, and mounts in `SceneCanvas` because its defaults read `window`.
- **2026-10-01:** Shaders are pre-compiled with `gl.compile(scene, camera)` before the move, so the first frames of the
  flight don't stall.
- **2026-10-01:** Any `pointerdown`, `wheel` or `keydown` skips the opening to its final state; `prefers-reduced-motion`
  and the dev-only `?opening=off` start there. The caption gives the NEO count from the data and labels the look
  illustrative; without the catalog there is no caption.
- **2026-10-01:** Swarm colours (user choice, from stills): Atira `#ffd166`, Aten `#ff7a3d`, Apollo `#2f86e0`,
  Amor `#b45cff`. The darker Apollo blue keeps the densest stacks near 1 AU from washing out to white, and the more
  saturated Amor makes the outer band read violet. A bluer Amor (`#8a5cf0`) was tried and not chosen.
- **2026-10-01:** Measurement tools live in `apps/web/src/dev/` behind `import.meta.env.DEV`: `?swarmStress=N`
  (1–8 copies, copy k's mean anomalies moved on by 2π·k/N), an opening frame probe that logs the median, worst and
  hitch times, and a GPU timer that logs rolling medians. A search of the production bundle finds none of them.
- **2026-10-01:** Chrome on macOS exposes the WebGL2 timer query, but its readings include work beyond the timed draws
  (they exceed the frame time at 4×). GPU cost is judged from frame times under the 4× stress run instead.
- **2026-10-01:** Flights move the origin with the zoom, not the clock (#70): `originProgress(e, r) = (rᵉ − 1)/(r − 1)`,
  clamped to [0, 1], is the fraction of the distance change covered. On the opening's pull-back Earth now recedes
  toward the edge instead of leaving the view within a second, and zoom-ins from the focus buttons keep their target
  in view. Opening frame times are unchanged: 902 frames, median 13.3 ms, only the first frame (31 ms) over 20 ms.
- **2026-10-01:** The opening's first frame (~30 ms) is accepted for Phase 4: it is the frame the catalog arrives and
  the swarm's attributes are built on the main thread, before any camera motion, so nothing visible stutters.
- **2026-10-01:** The v0.4.0 release carries three stills and no opening GIF (user decision). Stills are
  `screencapture` PNGs of a Chrome window the browser extension does not drive, since it draws a click marker and an
  edge glow into the pages it controls.

## Open questions

- Retargeting a flight mid-way keeps the camera's position continuous but restarts from zero speed, a visible
  hitch. Carry the velocity over? (Seen in the Task 5 browser check.)
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
- `npm ci` warns that esbuild's postinstall script is not covered by npm's `allowScripts` policy (esbuild comes in
  via tsx). It doesn't affect `check`; revisit if `npm run dev` for the server breaks on a fresh install.
- The leap-second table ends at 2017-01-01 (TAI − UTC = 37 s) and assumes none since. Check it against the
  latest IERS Bulletin C before release.
- Horizons rejects an unencoded `;` with HTTP 400 "parameter not recognized"; rows come back in time order
  regardless of TLIST order.
- Node 24 prints `ExperimentalWarning: SQLite is an experimental feature and might change at any time` whenever
  `node:sqlite` loads (tests, server start-up). Harmless; we use only `DatabaseSync` and prepared statements.
- `postprocessing` 6.39 accepts three `>= 0.168.0 < 0.187.0`, so three.js stays on 0.186.x until it widens the range.

## Blockers

_None._
