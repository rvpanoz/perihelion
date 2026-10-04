# Perihelion — Plan

> Working name. A real-time, web-based 3D solar system driven by live NASA/JPL data:
> tens of thousands of real near-Earth asteroids, this week's close approaches, and real
> solar eruptions (CMEs) travelling out to Earth. Built as a visual-effects showcase on top
> of a small, verifiable TypeScript orbit engine.

## Goals

1. **Showcase:** three polished "signature shots" that look great in a browser and a screen recording.
2. **Engine:** a dependency-free TypeScript orbit engine whose correctness is proven against JPL Horizons, not judged by eye.
3. **Resilience:** the app keeps working when NASA APIs are slow, rate-limited or gone.

## Non-goals

- No AI/LLM calls at runtime. AI is used only to build the project.
- No React Native app in v1 (web first; a showcase lives best as a link).
- No high-precision astronomy (no n-body perturbations, nutation, light-time). "Visually exact, numerically honest."
- No editor, no user accounts, no backend beyond a caching data server.

## Stack

| Layer       | Choice                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| Language    | TypeScript (strict), ESM everywhere                                       |
| Monorepo    | npm workspaces                                                            |
| Engine      | `packages/orbit`: pure TS, zero runtime dependencies                      |
| Rendering   | React + React Three Fiber + drei + postprocessing (three.js), custom GLSL |
| Web app     | Vite                                                                      |
| Data server | Node + Fastify, SQLite cache, scheduled refresh                           |
| Tests       | Vitest, fast-check (property tests), Playwright (render smoke tests)      |

## Data sources (verified live 2026-09-27)

| Source                                                     | Used for                                            | Key needed     |
| ---------------------------------------------------------- | --------------------------------------------------- | -------------- |
| JPL SBDB Query API (`ssd-api.jpl.nasa.gov/sbdb_query.api`) | Orbital elements for all NEOs (the swarm)           | No             |
| JPL Close Approach Data API (`cad.api`)                    | This week's close approaches                        | No             |
| JPL Horizons API                                           | Ground-truth positions for test fixtures (dev only) | No             |
| NASA DONKI (`api.nasa.gov/DONKI/CME`, `CMEAnalysis`)       | CME speed, direction, half-angle, time              | `NASA_API_KEY` |
| NASA Blue/Black Marble imagery                             | Earth day/night textures (downloaded at build time) | No             |

Not used: **Mars Rover Photos** (backend offline, returns 404), **InSight weather** (frozen 2020 data),
**legacy APOD API** (archived 2026-12-01).

## Architecture

```
apps/
  web/          Vite + React + R3F. Scenes, shaders, UI chrome (time controls, HUD)
  server/       Fastify. Fetches, normalizes, caches NASA/JPL data; serves /api/*
packages/
  orbit/        Pure TS engine: time scales, Kepler solver, elements <-> state vectors,
                frames, planet ephemerides. No DOM, no Node APIs, no deps.
  data/         Typed schemas (zod) + normalized types shared by server and web
  fixtures/     Horizons ground-truth fixtures + scripts that (re)generate them
```

Principles:

- **CPU for truth, GPU for scale.** The engine computes accurate positions in float64 on the CPU
  (planets, the focused object, the camera). The swarm is approximated on the GPU in a vertex shader.
- **Camera-relative rendering + logarithmic depth buffer** from day one (float32 jitter at AU scale).
- **Displayed facts come from JPL, not from our propagator.** E.g. close-approach distances are
  shown from CAD data; our two-body model only places the object visually.
- **The web app never calls NASA directly.** It calls our server, which falls back to a bundled
  snapshot, so a dead upstream API degrades gracefully instead of breaking the app.

---

## Phase 0 — Foundations

**Goal:** an empty but fully wired project that an agent can work in safely.

- npm workspaces monorepo with the layout above; TS strict; ESLint + Prettier; Vitest configured per package
- `apps/web`: Vite + R3F rendering a black scene with a single sphere and an FPS overlay
- `apps/server`: Fastify with `/health`
- CI (GitHub Actions): typecheck, lint, test, build
- ESLint rule: `packages/orbit` may not import anything (no deps, no DOM, no Node built-ins)
- `.env.example` with `NASA_API_KEY`

**Exit criteria:** `npm i && npm run check` (typecheck + lint + test + build) is green locally and in CI;
`npm run dev` shows the sphere and FPS counter.

## Phase 1 — Orbit engine

**Goal:** a correct, tested engine, proven against JPL Horizons.

- Time: Julian Date, UTC → TT/TDB (leap-second table + 32.184 s; TDB ≈ TT is acceptable)
- Kepler's equation solver for elliptic orbits, robust for `e` in [0, 0.99]; hyperbolic handled or rejected explicitly
- Orbital elements ↔ state vectors (position/velocity), heliocentric ecliptic J2000
- Two-body propagation from an epoch
- Planet positions from the JPL "Keplerian Elements for Approximate Positions of the Major Planets" (Standish) tables
- Fixture generator script: queries Horizons for a fixed list of bodies/dates, writes JSON to `packages/fixtures` (committed; tests never hit the network)

**Tests:**

- Property tests (fast-check): elements → state → elements round-trip; energy and angular momentum conserved under propagation; solver converges and satisfies `E − e·sin E = M` to 1e-12
- Golden tests vs Horizons:
  - Planets: within the published Standish error bounds for 1800–2050
  - Asteroids: two-body position within an agreed tolerance of Horizons inside a window around element epoch (initial target: ≤ 1e-3 AU within ±60 days; calibrate and record in PROGRESS.md)

**Exit criteria:** all property and golden tests green; tolerances documented; engine has zero runtime deps.

## Phase 2 — Data layer

**Goal:** reliable, normalized data regardless of upstream health.

- `packages/data`: zod schemas for SBDB rows, CAD rows, DONKI CME + analysis; normalized domain types
- `apps/server`:
  - `GET /api/neos`: all NEO orbital elements (compact binary or columnar JSON; ~40k rows)
  - `GET /api/close-approaches?days=7`
  - `GET /api/cmes?days=30`: CMEs with their most accurate analysis (speed, lat/lon, half-angle)
  - SQLite cache with per-source TTL; scheduled refresh; stale-while-revalidate
  - Respect rate limits; key from env only
- Bundled snapshot: a build step writes the latest data to `apps/web/public/snapshot/` as a fallback

**Exit criteria:** server tests use recorded upstream responses (no network); killing network access
still serves cached/snapshot data; `/api/neos` payload ≤ 2 MB gzipped.

## Phase 3 — Scene foundation

**Goal:** a navigable, correctly scaled solar system with time control.

- World units in AU; camera-relative rendering; logarithmic depth buffer
- Sun (placeholder emissive sphere), 8 planets from the engine, orbit lines
- Time controller: play/pause, speed (real-time → years/second), scrub, "now" button; single source of time for the whole scene
- Camera rig: orbit controls + scripted camera moves (for shots later)
- Postprocessing pipeline: bloom + tone mapping in place
- Rule: nothing per-frame goes through React state (`useFrame` + refs only)

**Exit criteria:** planets match the engine at any scrubbed date; no visible jitter when zoomed to
Earth at 1 AU; steady 60 fps on a mid-range laptop.

## Phase 4 — Shot 1: The Swarm (opening scene)

**Goal:** pull back from Earth to reveal ~40k real NEO orbits glowing around the Sun as time accelerates.

- Upload elements as instanced attributes; solve Kepler in the vertex shader (fixed Newton iterations with a good starting guess; clamp high-`e` cases)
- GPU vs CPU cross-check test: for a sample of asteroids, GPU-shader math (run via a headless/JS port of the shader function) matches the engine within a visual tolerance
- Look: additive point sprites, size/brightness by absolute magnitude, color by orbit class (Apollo/Aten/Amor/Atira), optional faint orbit trails
- Choreography: scripted opening camera move + time ramp

**Exit criteria:** 40k objects at ≥ 60 fps on a mid-range laptop; opening move plays smoothly; screenshot-worthy.

## Phase 5 — Shot 2: The Close Approach

**Goal:** follow a real asteroid from this week's CAD data as it passes Earth.

- Close-approach list UI (from `/api/close-approaches`)
- Selecting one: camera flies to it, follows it through closest approach; trail; HUD with JPL-reported distance (LD/AU/km), relative speed and date
- Focused object is positioned by the CPU engine (float64), not the shader

**Exit criteria:** any listed approach can be played end to end; HUD values match CAD data exactly.

## Phase 6 — Shot 3: The Eruption (+ Earth and Sun look)

**Goal:** a real CME bursts from the Sun and travels to Earth at its real speed and angle.

1. DONKI migration (#85): move to DONKI's new CME endpoint, update validation, re-record fixtures, refresh the
   CME snapshot; settle DONKI time parsing, `link` checks and cache-entry validation on first read
2. Engine: CME direction — DONKI's Stonyhurst lat/lon (relative to the Sun–Earth line) to a heliocentric ecliptic
   J2000 unit vector, and whether Earth lies inside the cone; ground-truth source agreed before the task starts
3. Engine: CME kinematics — leading-edge distance over time from the analysis speed and `time21_5`, and arrival time
   at Earth; the reference and tolerance for "consistent with DONKI" agreed before the task starts
4. CME picker for the last 30 days, and the selected-CME store every scene element reads
5. CME particle shell: an expanding cone shell on the GPU, sized from the half-angle and driven by the time controller
6. Sun look: animated noise surface, limb darkening, bloom-lit corona
7. Earth look: day/night textures blended along the terminator, atmospheric rim glow (public-domain NASA textures,
   with a size limit)
8. Earth impact moment: magnetosphere hint + aurora glow on the night side (artistic, clearly labelled as illustrative)
9. Shot choreography: camera moves and playback of a selected CME, synced to the real event time
10. Exit verification: CME geometry and timing against DONKI, ≥ 60 fps for the full sequence

**Exit criteria:** a selected CME's direction, cone width and arrival timing are consistent with its
DONKI analysis; full sequence runs at ≥ 60 fps.

## Phase 7 — Polish & ship

Performance comes before graphics detail (2026-10-02).

- Performance pass on modest hardware (integrated GPU): quality tiers (pixel ratio, MSAA, bloom resolution, trails,
  CME particle count), chosen automatically from frame times, with a manual override
- Display panel: quality and trails
- Loading experience (progressive: planets first, swarm streams in)
- Graceful fallbacks: WebGL2 missing, data unavailable (snapshot banner)
- Responsive layout; touch controls on mobile web; thin, consistent scrollbars
- Accessibility basics for the UI chrome; reduced-motion mode (no auto camera moves)
- Help: a short guide to what you're seeing, an orbit-class legend, and credits/attribution for NASA/JPL data and
  imagery
- Visual polish (added 2026-10-04): the FPS meter dev-only, body markers as soft round sprites, orbit lines as
  screen-space `Line2` instead of aliased hairlines, a real starfield from the Yale Bright Star Catalogue, and
  anti-aliasing chosen per quality tier from measured frame times
- Deploy (web: Netlify; server: Render) + a short screen recording for sharing

**Exit criteria:** public URL, shareable recording, Lighthouse on desktop: Performance ≥ 85 with Total Blocking Time
< 300 ms and Accessibility ≥ 90.

## Parked (post-v1)

- Zoom-to-Earth scene with EONET events on GIBS imagery
- React Native companion (aurora alerts from DONKI)
- WebGPU renderer (three.js TSL) for the swarm
- Comets and main-belt asteroids (hundreds of thousands of points)
- Earth detail: city lights on the night side and a cloud layer (moved from Phase 7, 2026-10-02)
- Swarm colour tuning: Apollo blue dominates zoomed out, Amor purple reads almost white (deferred from Phase 4)
