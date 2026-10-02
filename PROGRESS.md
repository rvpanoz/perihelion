# PROGRESS

**Current phase:** Phase 7: Polish & ship (in progress)
**Last updated:** 2026-10-02

## Phase status

| Phase                         | Status         |
| ----------------------------- | -------------- |
| 0. Foundations                | ✅ Done        |
| 1. Orbit engine               | ✅ Done        |
| 2. Data layer                 | ✅ Done        |
| 3. Scene foundation           | ✅ Done        |
| 4. Shot 1: The Swarm          | ✅ Done        |
| 5. Shot 2: The Close Approach | ✅ Done        |
| 6. Shot 3: The Eruption       | ✅ Done        |
| 7. Polish & ship              | 🟨 In progress |

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

Plan: `docs/superpowers/plans/2026-10-01-phase-5-the-close-approach.md`. UI reference: `docs/design/perihelion-mockup.html`.

- [x] App shell: layout regions around the canvas + data-status pill (fresh / stale / snapshot)
- [x] Close-approach rows carry an orbit (NEO catalog join, SBDB lookup for misses), orbit class and JPL's diameter
- [x] Diameter: JPL's when known, else a range estimated from H (albedo 0.25–0.05) and labelled "est."
- [x] Close-approach list UI (from `/api/close-approaches`), with an empty state
- [x] Focused asteroid positioned by the CPU engine (float64) + trail; engine-vs-CAD closest-distance check
- [x] Selecting an approach: clock to the approach, camera flies to the asteroid and follows it through closest approach
- [x] Focus card (HUD): JPL-reported distance (LD/AU/km), relative speed and date, plus diameter and class; Follow / Play approach
- [x] Earth-centred close-up in the focus card (illustrative, no Moon)
- [x] Earth marker during an approach, so Earth is findable at any pass distance (found in exit verification)
- [x] Focus card scrolls in the wide layout, so its actions and source line stay reachable (found in exit verification)
- [x] Exit verification: every listed approach plays end to end; HUD values match CAD exactly; 60 fps

Exit criteria verified on `main` at `74725c7` (CI green, run 36927321821), measured on `phase-5/exit-verification`
(the same code plus `PROGRESS.md` and plan notes), in Chrome 154 in a foreground window (1920×809 canvas at DPR 1)
on an Apple M3 with 16 GB, macOS 26.5, live data (origin `fresh`, 19 approaches, 42,536-NEO catalog, trails on).
The checks were scripted in the console (dev only, no app code), one approach per call, each capped at 30 s.

- Every listed approach plays end to end (19/19): picked from the list, Play approach lands chasing in 2.51 s;
  Earth's marker and the asteroid are in view on every frame to closest approach (263/263 per row); the bright trail
  ends at the asteroid (within one trail sample, ≤ 1.7 % of the miss distance); paused at CAD's time, both are in
  view, the countdown reads "now" and the close-up marker shows.
- HUD values match CAD exactly (19/19): title, CAD's AU and km/s figures, km, LD, UTC time, the close-up's LD label
  and its 512-point path, against each `/api/close-approaches` row. No row needed an SBDB lookup this week.
- Frame times (Phase 4's method, 10 s per run): following (2026 SA8) through its pass, and the Sun overview with it
  selected at 1 d/s: 75.0 fps (the display's cap), median 13.3 ms, worst 14.4 ms, no frame over 20 ms.
- Engine vs CAD: the "Close approach" row in "Calibrated tolerances".
- Task 6d (#97, styles only, found by this check, merged as `99474e6`): checked on its own at 1186 × 723 and
  1024 × 768 (Task 6d entry below).
- Not verified: the offline (snapshot) replay of two rows, deferred (decisions log, 2026-10-02).
- Screenshot-worthy: two stills (the list with the focus card, and (2026 SA8) at closest approach with Earth in
  frame), attached to the v0.5.0 release.

Status (2026-10-01): plan merged in #82 (with the UI mockup applied, decision 7); issues #74–#81 and #83 (Task 6b).
Task 0 (#74, app shell) in progress on `phase-5/app-shell`. Its review against `main` produced 11 proposals; the
user approved all of them (2026-10-01) and they are folded into the plan's Task 0: the pill replaces `SwarmStatus`
(count included), `NamedDatasetState` (with an optional `summary`), one pointer-transparent CSS grid, `useNowMs(30_000)`,
one pill text pattern, interim homes for the existing controls, `.hud` → `.panel`, `<details>` columns below
1100 px, `--faint` at ≥ 4.5:1, a `Brand` component and a pill render test. `useNeoCatalog` now returns the generic
`DatasetState<'neos'>` (`data`, not `catalog`).
Browser check (2026-10-01, Chrome, 1600 × 1000 and 1024 × 768): pill `Live · JPL · updated 13 h ago` with the
server up and `Offline snapshot · JPL · from 29 Sep 2026` with it stopped; drawers below 1100 px; Tab reaches all
16 controls; drags between panels still orbit the camera. Frame times unchanged from Phase 4.

Task 1 (#75, orbits on close-approach rows) on `phase-5/approach-orbits`, all 12 review proposals included. Live
check (2026-10-01): 19 rows, all with an orbit (15 APO, 2 AMO, 2 ATE), none dropped, no lookups needed (the fresh
catalog had every row); CAD reported no diameters this week. Known issue: a dataset cached before a schema change is
served as-is until its TTL ends (seen live: old rows without `orbit`). Cleared the dev cache for now (user decision);
validating cache entries on first read is the proposed fix. DONKI moved (#85, Phase 6). Task 1 merged in #86.

Task 2 (#76, diameter) on `phase-5/diameter`. Its review against `main` checked out (imports exist; the formula
gives 2.658 / 5.9434687 km at H = 15). The user approved proposals 1–3 (2026-10-01), folded into the plan's
Task 2: the estimate's unit is picked after rounding (0.9996 km reads `1 km`, not `1000 m`); JPL diameters below
1 km are shown in metres by an exact ×1000 (`0.0071` → `7.1 m`, `0.37 ± 0.02` → `370 ± 20 m`); `diameterLabel` /
`diameterValueText` split label from value for the card, and `diameterText` stays combined for the list.
Proposal 4 (a test comment) was not taken. The plan's Task 6 card now takes `diameterLabel` /
`diameterValueText`, so an estimate doesn't read "est." twice.

Task 2 merged in #87.

Task 3 (#77, close-approach list) on `phase-5/approach-list`, review proposals 1–5 included (6–7 optional, not
taken): the left column always renders, with the list above the swarm controls; `ApproachList` takes `selected`
from `approachSelection` (built like `timeStore`); the row click is tested without a DOM through a shared
`findElementProps`; the empty state is built from `CAD_MAX_DISTANCE_AU` (now an exported number); Passed / Coming
split on the wall clock every 30 s. CNEOS's LD is 384,400 km, not the plan's 384,398 (expected strings unchanged).
Browser check (2026-10-01, Chrome, live data): 19 rows with the same names and order as `/api/close-approaches`
(5 coming, 14 passed); the first row's UTC time, LD, closeness bar, estimated diameter and class match CAD; the pill
reports both datasets. From that check (user decisions): Coming is listed before Passed, and the dev FPS overlay
moved out of the list's corner.

Task 4 (#78, the asteroid on the engine) on `phase-5/approach-engine`. The degree conversion and the
closest-approach search moved into `packages/orbit`, and the engine-vs-CAD cross-check runs in `apps/server` (plan
Task 4, "As built"). Tolerance 15,700 km / 86 min approved (2026-10-01). Browser check (2026-10-01, Chrome, live
data, 2019 AS2 at 4.48 LD): at the approach and ±1 d the marker sits on the trail and the bright part ends at it;
75.0 fps, median 13.3 ms, worst 14.4 ms, no frame over 20 ms over 10 s at 1 d/s through the approach, camera on
Earth at 0.025 AU. Jitter at close zoom is checked in Task 5, which follows the asteroid.

Task 5 (#79, fly and follow) on `phase-5/fly-and-follow`, review proposals 1–9 included, plus four changes from the
checks (plan Task 5, "Review", points 10–13): the closest asteroid zoom is 2e-6 AU, outside the near plane; the view
blend slerps; the chase tilts toward the pass's plane normal, not ecliptic north; a chase faces the asteroid during
its flight. Browser check (2026-10-01, Chrome, live data), Play approach on 2026 SA8 (closest, 379,868 km, past),
2026 SL7 (farthest, 6,760,624 km, past, started while chasing SA8) and 2019 AS2 (coming): each flight lands chasing
in 2.48 s, turns at most 2.4° per frame, faces the asteroid throughout and leaves Earth where it was on screen at
landing; Earth is in view on every frame through closest approach (863/863 per row); the turn through the pass peaks
at 25–26°/s; 75 fps, median 13.3 ms, worst 14.4 ms. Follow leaves the clock untouched; picking another row
mid-flight starts a new flight from the current pose (at most 1.0° per frame); a drag ends the chase on its first
frame without a snap; following at 300 km, Earth's screen position moves at most 1.3e-9 per frame (no jitter).

Task 6 (#80, focus card) on `phase-5/focus-card`, PR open (2026-10-01). Review proposals 1–9
included, 10 dropped (plan Task 6, "Review"): the model is time-free, `approachCard(approach)`, and only a
`Countdown` component reads `useTimeReadout()`; `countdownParts` returns `before` / `duration` / `after` so the
duration is bold, and rounds `|Δ|` to the second before flooring minutes (JD float noise); the badge has its own
no-class branch (`NEO`); an unknown diameter reads `unknown` with no detail; the timing detail is `3σ <CAD t_sigma_f>`;
`ApproachCard` takes `onFollow` / `onPlay` / `closeUp` props; `ShellRight` mirrors `ShellLeft` (column "Focus").
Deviations: the model file is `approachCardModel.ts`, since `./ApproachCard` resolved to `approachCard.ts` on the
case-insensitive file system; `apps/web` gains `@perihelion/fixtures` as a dev dependency for the exactness test,
which validates the recording with `jplColumnarResponseSchema` first; the stats are one column, not the mockup's two,
because CAD's full-precision figures wrapped mid-number in a 146 px half-column (user decision). `npm run check`
green (708 tests) before the one-column CSS change.
Browser check so far (2026-10-01, Chrome, live data, 19 rows): (2026 RQ34) and (2026 SC) cards match
`/api/close-approaches` exactly (AU, km/s, TDB tooltip; km, LD, km/h and UTC derived as expected); hidden until a
row is selected; one column has every value and detail on one line; 75 fps with the card shown.
Browser check, continued (2026-10-01): at 1024 × 768 (page 1024 × 591) the card ran under the time bar with
nothing to scroll; the drawers now fill the row down to the bar and scroll (user decision), and Follow / Play
approach are reachable and clickable. Play approach on (2019 AS2): the countdown steps from `in 0d 03h 48m` to
`0d 04h 00m ago` across CAD's 19:27 UTC, and paused at 23:51 UTC it reads `0d 04h 24m ago` exactly. At 1.4 d/s it
steps about 8 h per update, coarser than the 86 min engine-vs-CAD bound, so zero and the drawn closest approach
coincide on screen. 75 fps (median 13.3 ms, worst 14.4 ms). `npm run check` green (708 tests). Not checked by me:
wheel scrolling in the drawer (user to confirm). Noted, outside Task 6: during play the time bar's date lags the
countdown by about 0.15 s; the dev FPS overlay covers the card's speed value.

Task 6b (#83, Earth-centred close-up) on `phase-5/close-up`, review proposals 1–10 included (plan Task 6b,
"Review"). The close-up is an SVG in the card's slot, filled from `App.tsx`; the pure maths is `closeUpModel.ts`
(`./closeUp` and `./CloseUp` collided on the case-insensitive file system, as in Task 6); `trailForApproach` is
shared by the scene and the card. Browser check (2026-10-01, Chrome, live data, 19 rows): the closest row, (2026 SA8)
at CAD 0.99 LD, draws its closest point at 1.016 LD (0.6 px off), the farthest, (2026 SL7) at 17.59 LD, at
17.575 LD; during Play approach the marker steps ~10.5 px per 8 h along the path and is hidden outside the trail
window; 75 fps with the card shown (median 13.3 ms, worst 14.4 ms, none over 20 ms). `npm run check` green
(724 tests). The card is ~200 px taller, so at small heights more of it sits below the drawer's scroll.

Task 6c (#93, Earth marker) on `phase-5/earth-marker`, added during Task 7: on the exit check's first 10 rows, paused
at CAD's closest-approach time, the chase camera had Earth in frame, but only (2026 SA8) at 0.99 LD showed it; beyond
about 1 LD Earth's disc is under a pixel. Earth now gets an 8 px marker in its own colour while an approach is
selected, drawn over its disc (a depth-tested marker was hidden by the dark night-side disc of (2026 SC) at 1.70 LD;
user decision). The card's source line adds `· markers not to scale`. Browser check (2026-10-02, Chrome 154,
1920 × 809, DPR 1, live data): Earth projects inside the view and its marker shows on all 10 rows; 75.0 fps following
(2026 SA8) through its pass and in the Sun overview with it selected (median 13.3 ms, worst 14.4 ms, none over 20 ms).

Task 6d (#96, card scroll) on `phase-5/wide-card-scroll`, added during Task 7: in the release stills (1920 × 809)
the focus card ran under the time bar, hiding part of its buttons and its source line; only the drawers below
1100 px scrolled. The column scroll rule now applies at every width. Browser check (2026-10-02, Chrome 154, live
data, (2026 SA8) selected): at 1186 × 723 the right column ends above the time bar and scrolls to its end with the
buttons and source line in view, scrolling past the end leaves the camera unchanged, and scrolling and dragging
over empty scene still zoom and orbit; at 1024 × 768 the drawer behaves as before.

Task 7 (#81, exit verification) on `phase-5/exit-verification`, in progress (2026-10-02). Review proposals 1–7
approved. Done so far (Chrome, live data, origin `fresh`, 19 rows): none needed an SBDB lookup (all 19 designations
are in the 42,536-object catalog); every card matches its `/api/close-approaches` row exactly (title, CAD's AU and
km/s strings, day, close-up LD label, 512-point path). Before Task 6c, 10 rows played end to end (flight lands in
2.5 s, the countdown passes zero, the close-up marker shows), but paused at CAD's time Earth was visible only on
(2026 SA8): that check added Task 6c. Rerun of all 19 rows on `main` after #94 (2026-10-02, Chrome, live data,
origin `fresh`, 1920 × 809 at DPR 1; one row per console call, each capped at 30 s): every row picked from the list, every
card matches its row (title, AU, km, LD, km/s, UTC time, close-up LD label, 512-point path); every flight lands
chasing in 2.51 s; through the pass to CAD's time Earth's marker and the asteroid are in view on 263/263 frames per
row, and the bright trail ends within 1.7 % of the miss distance of the asteroid (one trail sample); paused at
CAD's time, both are in view, the countdown reads "now" and the close-up marker shows. Frame times on `main`
(2026-10-02, same laptop, Chrome and window as Phase 4, tab visible, 10 s per run): following (2026 SA8) from Play
approach (1 s warm-up) through closest approach, and the Sun overview with it still selected at 1 d/s (3.5 s
warm-up, so the 2.5 s flight is done): each 750 frames, 75.0 fps, median 13.3 ms, worst 14.4 ms, none over 20 ms.
Trackpad check at 1024 × 768 (2026-10-02): the Focus drawer scrolls to its end with the buttons and source line in
view, scrolling past the end does not zoom, Play approach from the scrolled drawer leaves it in place, and the scene
still zooms and orbits. The first release stills (1920 × 809) showed the card under the time bar in the wide
layout, which added Task 6d; the stills were retaken after it. The offline (snapshot)
replay of two rows is deferred (user decision, 2026-10-02).

## Phase 6: Shot 3: The Eruption

Plan: `docs/superpowers/plans/2026-10-02-phase-6-the-eruption.md` (part 1: Task 1). Tasks follow `PLAN.md`
(split into ten on 2026-10-02, PR #98).

- [x] DONKI migration: new CME endpoint, validation, re-recorded fixtures and snapshot (#85)
- [x] Engine: CME direction from DONKI latitude/longitude, and whether Earth is inside the cone (#99)
- [x] Engine: CME kinematics and arrival time at Earth (#100)
- [x] CME picker for the last 30 days + selected-CME store (#101)
- [x] CME particle shell on the GPU (#102)
- [x] Sun look: noise surface, limb darkening, corona (#103)
- [x] Earth look: day/night terminator and rim glow (#104)
- [x] Earth impact: magnetosphere hint and aurora, labelled illustrative (#105)
- [x] Shot choreography: camera and playback synced to the event time (#106)
- [x] Exit verification: CME geometry and timing vs DONKI; 60 fps (#107)

Exit criteria verified on `main` at `b6ea5fd` (CI green), measured on `phase-6/exit-verification` (the same app code
plus the exit check, `PROGRESS.md` and the plan), in Chrome in a foreground window (1920 × 809 canvas at DPR 1) on the
Dell S2721HN (75 Hz), Apple M3, macOS 26.5, Node 24.7, live data (`/api/cmes` origin `fresh`, 77 CMEs). The shots were
started from the console (dev only, no app code) by pressing Watch eruption on the selected CME.

- Direction, cone width and timing vs DONKI, for all 77 recorded CMEs, through the app's own drawing path
  (`apps/web/src/scene/eruption/cmeExitCheck.test.ts`): the shell axis sits at DONKI's angle from Earth (worst
  4.4e-16 rad); no particle leaves DONKI's half-angle and the widest reaches ≥ 0.99999 of it; the front is at
  21.5 R☉ at `time21_5` and at Earth's distance at ENLIL's arrival exactly (13 CMEs); the card shows DONKI's speed and
  half-angle verbatim, and the shot's impact beat brackets ENLIL's arrival (none without one). Rows in "Calibrated
  tolerances".
- Full sequence ≥ 60 fps: run A (2026-09-02T19:36, 1,323 km/s, ENLIL arrival, glancing blow): 39.5 s, 2,964 frames,
  13.34 ms mean, p99 14.3 ms, max 14.4 ms, none over 16.7 ms; paused at arrival + 14 h (Sep 6 08:00 UTC) as designed.
  Run B (2026-10-01T03:12, 432 km/s, ENLIL ran without an Earth arrival): 23.3 s, 1,745 frames, 13.34 ms mean, max
  14.4 ms, none over 16.7 ms; no impact beat, card "ENLIL: no Earth arrival predicted". A third run
  (2026-09-05T11:09) earlier gave 13.35 ms mean with two frames over 16.7 ms, both during screenshot captures.
- GPU vs CPU: the shell's shader is the same formula as `shellParticleOffsetAu` in float32; at 1 AU its rounding is
  ~1e-7 relative (~15 km), far below a pixel. Not measured separately.
- Screenshot-worthy: five stills (burst, cruise, impact, Sun close-up, aurora), attached to the v0.6.0 release.

## Phase 7: Polish & ship

Plan: `docs/superpowers/plans/2026-10-02-phase-7-polish-and-ship.md`. Performance comes before graphics detail.

- [x] Baseline harness: frame times and bundle size (#128)
- [x] Quality tiers (#129)
- [ ] Tier governor and Display panel (#130)
- [ ] Progressive loading: worker and code splitting (#131)
- [ ] Fallbacks: no WebGL2, server timeout (#132)
- [ ] Responsive layout, touch and scrollbars (#133)
- [ ] Accessibility and reduced motion (#134)
- [ ] Help dialog, orbit-class legend, first-visit hint and credits (#135)
- [ ] Deploy: Netlify and Render (#136)
- [ ] Exit verification (#137)

Status (2026-10-02): plan merged in #138, with issues #128–#137 on the board. README rewritten for the current state
in #139. Task 1 (#128) merged in #141. Task 2 (#129) on `phase-7/quality-tiers`, review proposals 1–8 included (plan
Task 2, "As built"); next is Task 3 (#130).

### Phase 7 baseline

Measured 2026-10-02 on `phase-7/baseline` (`main` at `0f9d2ca` plus the harness), in Chrome in a foreground window
(1920×809 canvas) on an Apple M3 with 16 GB, macOS 26.5, Dell S2721HN at 75 Hz; live data (19 approaches, 42,536-NEO
catalog, trails on). Each run is `?opening=off&bench=<scenario>`: the camera flight lands, 1 s settles, 10 s are
recorded. Approach: 2026 SA8, the closest row. Eruption: `2026-09-30T03:12:00-CME-001`, the latest with an ENLIL
Earth arrival. Cells: median / p90 / worst ms, then frames over 20 ms.

| Scenario | Normal (DPR 1)            | `?dpr=2`                    | `?dpr=2&swarmStress=4`      | + CPU 4× setting (≈ 1.7×)   |
| -------- | ------------------------- | --------------------------- | --------------------------- | --------------------------- |
| overview | 13.3 / 13.8 / 14.5, 0/750 | 23.3 / 24.1 / 25.5, 430/431 | 34.1 / 37.4 / 39.0, 288/288 | 34.4 / 37.5 / 39.5, 287/287 |
| earth    | 13.3 / 13.6 / 15.1, 0/750 | 19.5 / 21.0 / 98.6, 164/500 | 22.5 / 23.1 / 32.7, 446/447 | 22.5 / 23.7 / 27.1, 441/445 |
| approach | 13.3 / 13.9 / 14.9, 0/750 | 19.2 / 20.4 / 25.6, 106/522 | 20.9 / 23.8 / 27.8, 336/468 | 21.0 / 24.3 / 47.0, 323/465 |
| eruption | 13.3 / 14.3 / 17.5, 0/750 | 21.5 / 23.9 / 25.5, 446/454 | 29.3 / 35.8 / 44.9, 322/323 | 32.6 / 41.9 / 49.0, 292/292 |

- At DPR 1 every scenario holds the display's 75 fps. At 4× the pixels every one misses 16.7 ms: fill rate is the
  first cost, so Task 2's pixel-ratio cap and MSAA come first. The overview and the eruption are the worst cases.
- The CPU throttle barely moves the medians (GPU-bound); it shows in the tails (approach worst 47 ms, eruption p90
  41.9 ms). Chrome's 4× setting slowed a 2e8-iteration loop 1.7× on this machine (486 ms vs 281 ms; the user's
  check in the DevTools console: 483 ms), so the column is labelled with the measured rate (decisions log).
- Lighthouse desktop (DevTools, Navigation) on `npm run build` + `vite preview`, data server stopped (pill "Offline
  snapshot"): Performance 90, Accessibility 98; FCP 0.6 s, LCP 2.0 s, TBT 0 ms, CLS 0, Speed Index 0.6 s.
- Initial JS: 391,164 bytes gzipped (one entry chunk, Node's default gzip level); `npm run check` fails above
  400,000 (`scripts/bundleBudget.mjs`). Task 4 lowers the budget.

### Quality tiers (Task 2)

Measured 2026-10-02 21:33–21:46 on `phase-7/quality-tiers`, same setup as the baseline, tier from `?tier=`. `?dpr=2`
stands in for the device's ratio and the tier caps it (Low 1, Medium 1.5, High 2). Cells as above.

| Scenario | High, normal (DPR 1)      | `?dpr=2` Low              | `?dpr=2` Medium           | `?dpr=2` High               |
| -------- | ------------------------- | ------------------------- | ------------------------- | --------------------------- |
| overview | 13.3 / 13.8 / 15.1, 0/750 | 13.3 / 13.7 / 41.2, 1/749 | 13.3 / 13.5 / 15.7, 0/750 | 20.4 / 21.5 / 29.7, 450/485 |
| earth    | 13.3 / 14.3 / 22.2, 1/750 | 13.3 / 13.8 / 15.0, 0/750 | 13.3 / 15.3 / 17.4, 0/750 | 16.2 / 16.9 / 24.4, 1/616   |
| approach | 13.3 / 13.9 / 22.8, 1/750 | 13.3 / 13.8 / 20.2, 1/750 | 13.3 / 15.2 / 26.1, 1/750 | 15.8 / 17.1 / 18.9, 0/629   |
| eruption | 13.3 / 13.5 / 24.3, 1/750 | 13.3 / 13.8 / 16.0, 0/750 | 13.3 / 13.7 / 14.5, 0/750 | 18.2 / 21.5 / 26.9, 190/525 |

| Scenario | `?dpr=2&swarmStress=4` Low | … Medium                  | … High                      |
| -------- | -------------------------- | ------------------------- | --------------------------- |
| overview | 13.3 / 13.8 / 24.8, 1/750  | 14.3 / 14.7 / 16.0, 0/697 | 35.1 / 35.7 / 39.9, 287/287 |
| earth    | 13.3 / 13.8 / 14.9, 0/750  | 13.3 / 14.1 / 19.0, 0/750 | 19.8 / 20.5 / 26.9, 110/506 |
| approach | 13.3 / 13.8 / 15.0, 0/750  | 13.3 / 13.8 / 14.8, 0/750 | 17.6 / 21.2 / 22.5, 135/549 |
| eruption | 13.3 / 14.2 / 54.6, 1/748  | 13.4 / 14.8 / 20.3, 1/725 | 27.5 / 36.6 / 38.7, 333/334 |

- Medium and Low hold the display's 75 fps in every proxy run; High at `?dpr=2` beats the baseline in every scenario
  (overview 23.3 → 20.4 ms median), from 4× MSAA instead of 8× and no canvas MSAA buffer.
- High at `?dpr=2&swarmStress=4` read slower than the baseline (overview 35.1 vs 34.1 ms) and repeats drifted worse
  (41.5 ms at 21:46) as the fanless Mac warmed, so main and the branch were compared head to head (A/B below).
- Isolated single frames over 20 ms at Low and Medium (worst 54.6 ms) are one-offs, not a pattern.

A/B, 2026-10-02 21:53–22:07, overview at `?dpr=2&swarmStress=4`, main (`37af7ba`, own worktree) against the branch at
High, in the order M B B M M B B M with 90 s idle between runs so drift cancels:

| Build       | Median (ms)                   | p90 (ms)                  | Worst (ms)                | Frames in 10 s        |
| ----------- | ----------------------------- | ------------------------- | ------------------------- | --------------------- |
| main        | 34.65 / 34.40 / 34.75         | 38.1 / 37.5 / 37.6        | 83.3 / 39.6 / 39.8        | 284 / 287 / 286       |
| branch High | 35.10 / 35.20 / 35.10 / 35.30 | 35.8 / 36.1 / 36.3 / 36.2 | 37.3 / 37.4 / 39.1 / 37.9 | 286 / 285 / 286 / 284 |

- Same throughput (≈ 285.5 frames per 10 s, so the same mean frame time); the branch's median is 0.6 ms higher but
  its p90 is 1.6 ms lower and its worst frames tighter: steadier pacing, not slower rendering. Accepted as not slower
  (user decision).
- The last main run came out bimodal (half the frames ~17 ms, half ~70 ms); a repeat of main and a branch control run
  did the same, so the machine changed state, not the code. Those three runs are left out.

## Calibrated tolerances

| Test                                    | Tolerance                    | Rationale                                                                                    |
| --------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Planets vs Horizons: Mercury            | 31.4″ / 2.91″ / 2,250 km     | Measured 25.1″ / 2.33″ / 1,800 km × 1.25; Standish nominal 15″ / 1″ / 1,000 km               |
| Planets vs Horizons: Venus              | 31.5″ / 1.88″ / 7,000 km     | Measured 25.2″ / 1.50″ / 5,600 km × 1.25; Standish nominal 20″ / 1″ / 4,000 km               |
| Planets vs Horizons: EM barycentre      | 24.6″ / 2.03″ / 8,875 km     | Measured 19.7″ / 1.62″ / 7,100 km × 1.25; Standish nominal 20″ / 8″ / 6,000 km               |
| Planets vs Horizons: Mars               | 73.5″ / 1.71″ / 30,125 km    | Measured 58.8″ / 1.37″ / 24,100 km × 1.25; Standish nominal 40″ / 2″ / 25,000 km             |
| Planets vs Horizons: Jupiter            | 568″ / 8.88″ / 711,125 km    | Measured 454.6″ / 7.10″ / 568,900 km × 1.25; Standish nominal 400″ / 10″ / 600,000 km        |
| Planets vs Horizons: Saturn             | 891″ / 28.7″ / 3,502,375 km  | Measured 712.7″ / 22.95″ / 2,801,900 km × 1.25; Standish nominal 600″ / 25″ / 1,500,000 km   |
| Planets vs Horizons: Uranus             | 127″ / 4.39″ / 1,676,875 km  | Measured 101.9″ / 3.51″ / 1,341,500 km × 1.25; Standish nominal 50″ / 2″ / 1,000,000 km      |
| Planets vs Horizons: Neptune            | 73.9″ / 2.09″ / 1,571,375 km | Measured 59.1″ / 1.67″ / 1,257,100 km × 1.25; Standish nominal 10″ / 1″ / 200,000 km         |
| Asteroids vs Horizons: Eros             | 7.06e-5 AU over ±120 d       | Measured 5.65e-5 AU × 1.25 (JPL#659)                                                         |
| Asteroids vs Horizons: Apophis          | 2.44e-5 AU over ±120 d       | Measured 1.95e-5 AU × 1.25 (JPL#220)                                                         |
| Asteroids vs Horizons: Bennu            | 4.31e-5 AU over ±120 d       | Measured 3.45e-5 AU × 1.25 (ORX_merged_DE424)                                                |
| Asteroids vs Horizons: Ryugu            | 2.95e-5 AU over ±120 d       | Measured 2.36e-5 AU × 1.25 (JPL#270)                                                         |
| Asteroids vs Horizons: Phaethon         | 6.15e-5 AU over ±120 d       | Measured 4.92e-5 AU × 1.25 (JPL#1003; e = 0.89, q = 0.14 AU)                                 |
| Asteroids vs Horizons: Aten             | 2.15e-5 AU over ±120 d       | Measured 1.72e-5 AU × 1.25 (JPL#149)                                                         |
| Asteroids vs Horizons: Atira            | 4.18e-5 AU over ±120 d       | Measured 3.34e-5 AU × 1.25 (JPL#225)                                                         |
| Asteroids vs Horizons: PLAN target      | 1e-3 AU within ±60 d         | PLAN.md target; worst measured 1.42e-5 AU (Eros), ~70× inside                                |
| Asteroids: elements → state at epoch    | 1e-12 AU / 1e-12 AU/day      | Fixed bound (15 cm); measured ≤ 3e-15 AU / 6e-14 AU/day                                      |
| Asteroids: Horizons Keplerian GM vs k²  | 1e-11 relative               | Measured 5e-12                                                                               |
| Swarm float32 vs engine: within ±10 yr  | 1.71e-5 AU                   | Measured 1.37e-5 AU × 1.25 (2,006 NEOs, seed 20260930); 1 px ≈ 0.002 AU at the overview      |
| Swarm float32 vs engine: 1800 / 2050    | 4.73e-4 AU                   | Measured 3.78e-4 AU × 1.25 (2,006 NEOs, seed 20260930); 1 px ≈ 0.002 AU at the overview      |
| Close approach: engine vs CAD           | 15,700 km / 86 min           | Measured 12,509 km (2026 RN15) / 68.8 min (2026 SA8) × 1.25 over 19 recorded rows; absolute  |
| B0 vs Horizons: pole (Horizons Earth)   | 8.7e-7°                      | Measured 6.96e-7° (2026-07-01) × 1.25 over 12 monthly 2026 dates; Horizons prints 6 decimals |
| B0 vs Horizons: engine EMB end to end   | 7.3e-4°                      | Measured 5.84e-4° (2026-10-01) × 1.25 over 12 monthly 2026 dates                             |
| CME front vs DONKI: 21.5 R☉ at time21_5 | exact                        | Measured 0 over 77 recorded CMEs (2026-10-01); holds by construction                         |
| CME front vs DONKI: Earth at ENLIL time | exact                        | Measured 0 over the 13 CMEs with an ENLIL Earth arrival; mean transit speed meets both times |
| CME front vs DONKI: measured speed      | exact                        | Measured 0 over the 64 CMEs without an ENLIL Earth arrival                                   |
| Exit: drawn CME axis vs DONKI angle     | 5.6e-16 rad                  | Measured 4.4e-16 rad × 1.25 over 77 recorded CMEs (float64 rounding of one rotation)         |
| Exit: shell vs DONKI half-angle         | ≤ α; widest ≥ 0.9999895 α    | Measured: none outside (worst 1.4e-6 rad inside); widest ≥ 0.9999916 α, shortfall × 1.25     |
| Exit: drawn front vs DONKI/ENLIL times  | exact                        | Measured 0 at time21_5 (77) and at ENLIL's arrival (13), through the web's time conversion   |

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
- **2026-10-01:** The chase camera sits beyond the asteroid, 20° off the Earth→asteroid line, tilted toward the
  pass's plane normal (signed toward ecliptic north). The normal is fixed through a flyby; a tilt toward ecliptic
  north swung the view at ~100°/s where 2026 SA8's line passed within 4° of the south ecliptic pole.
- **2026-10-01:** Chase flights turn the view by slerp on the flight's eased progress. A normalised lerp turned 21.7°
  in one frame between nearly opposite directions.
- **2026-10-01:** The closest zoom on an asteroid is 2e-6 AU (~300 km), outside the camera's 1e-6 AU near plane. The
  marker has no physical size, so nothing closer would show more.
- **2026-10-01:** A chase turns the camera to face its focus every frame, because the controls that otherwise do it
  are off during flights; without it the view kept its take-off facing and snapped at landing.

## Open questions

- Retargeting a flight mid-way keeps the camera's position continuous but restarts from zero speed, a visible
  hitch. Carry the velocity over? (Seen in the Task 5 browser check.)
- Final project name ("Perihelion" is a working name).
- Hosting targets for web and server.
- Confirm the opening scene (Swarm vs Eruption).

## Known external issues

- Mars Rover Photos API is offline (404), so it is not used.
- Legacy APOD API archived on 2026-12-01, so it is not used.
- R3F 9.8 logs `THREE.Clock: This module has been deprecated` with three 0.186 (upstream; harmless).
- Vite warns the web bundle is 1.42 MB (394 kB gzipped, 2026-10-02), mostly three.js. Code splitting is Phase 7
  Task 4 (#131).
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

- **2026-10-01:** The data-status pill replaces `SwarmStatus`. It shows the worst state across datasets (unavailable >
  snapshot > stale > loading > live), aged by the oldest dataset in that state and refreshed every 30 s (`useNowMs`),
  and expands (a `<details>`, so keyboard-reachable) to one line per dataset; the NEO count lives in that line.
- **2026-10-01:** The shell is one CSS grid over the canvas with `pointer-events: none`; only `.panel`s take events.
  Below 1100 px the columns are `<details>` drawers, remounted when the breakpoint flips. `--faint` is `#787e90`
  (4.80:1 against `--panel` composited on `--bg`; the mockup's `#5b6378` was 3.24:1).
- **2026-10-01:** Shell frame times (Task 0 browser check, same laptop as Phase 4, tab visible): Sun overview and
  Earth each 75.0 fps over 5 s, median 13.3 ms, worst 14.3 / 14.4 ms, no frame over 20 ms. Opening: 901 frames,
  median 13.3 ms, only the first frame (38 ms) over 20 ms. drei's `<Stats />` meter, pinned top-left by inline
  styles, is moved under the top bar (right edge above the timeline below 1100 px) so it no longer covers the brand.
- **2026-10-01:** Close-approach rows join the NEO catalog by designation (CAD `des` = SBDB `pdes`); a miss is looked
  up with `sbdb.api?des=…` (exact, not `sstr`), one at a time, at most 25 per refresh (more fails the refresh before
  any lookup). SBDB's "not found" (HTTP 200, `message`) and an unusable orbit drop the row with a warning; a network
  or format error fails the refresh. CAD is asked for `kind=a` (asteroids, like the catalog) and `diameter=true`.
- **2026-10-01:** DONKI's CME endpoint moved (301 to CCMC, #85). `npm run record` and `npm run snapshot` now take
  names (`record -- cad sbdb-object`, `snapshot -- close-approaches`) so one upstream can be refreshed while another
  is down; the recordings manifest dates each file. The DONKI recordings and the CME snapshot stay as committed.
- **2026-10-01:** The server's SQLite cache is not checked against the schema on read, so a pre-change entry is served
  until its TTL ends. For now the dev cache was cleared by hand (user decision); proposed fix: validate each cache
  entry the first time a process reads it and treat a failure as a miss.
- **2026-10-01:** The degrees → radians conversion and the closest-approach search live in `packages/orbit`, not
  `apps/web`: they are pure maths over the engine and the server's cross-check uses them. The engine-vs-CAD
  cross-check runs in `apps/server`, next to the recorded fixtures it needs.
- **2026-10-01:** Engine vs CAD tolerance is absolute (15,700 km / 86 min, user-approved): two-body motion omits
  Earth's pull and the Standish Earth is the Earth–Moon barycentre (up to 4,670 km off), errors that do not shrink
  with distance. The engine only places the marker and trail; distances, speeds and dates shown come from CAD.
- **2026-10-01:** The focus card's close-up (Task 6b) is a 2D schematic of the engine trail in its own pass plane,
  centred on the Earth–Moon barycentre (≈ 0.012 LD from Earth's centre, not corrected), labelled illustrative. Only
  the dashed closest-point label is a fact (CAD's LD). Its scale shows 4 miss distances above and below Earth, never
  less than 1.25 LD, so the 1 LD ring stays whole; 1 LD is CNEOS's 384,400 km throughout.
- **2026-10-02:** During an approach Earth has a fixed 8 px marker drawn over its disc, never depth-tested: the chase
  camera keeps Earth in frame, but its disc is sub-pixel beyond about 1 LD and can be on the night side. A ring sized
  to the disc, which would not cover a large lit disc, is left for Phase 7 polish.
- **2026-10-02:** The side columns scroll at every width, not only as drawers below 1100 px: a focus card taller
  than the space above the time bar otherwise hides its actions and the source line that labels the drawn positions
  illustrative.
- **2026-10-02:** Phase 5's offline (snapshot) replay of two approaches is deferred (user decision): it is not a
  `PLAN.md` exit criterion, and its behaviour (snapshot pill, past rows playable) is pinned by the Task 0 and Task 5
  tests and the Phase 2 offline check.
- **2026-10-02:** DONKI moved to CCMC on 2026-09-30: CMEs come from `https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME`
  (same parameters and JSON, no key; checked live). `NASA_API_KEY` and `DEMO_KEY` are retired with it, and CCMC gets
  its own request gate (Task 1a, #85).
- **2026-10-02:** CMEs keep ENLIL's predicted Earth arrival when DONKI ran one. With it, that is the arrival shown and
  the time the drawn front reaches Earth; without it, the front moves at the analysis speed from 21.5 R☉ at
  `time21_5` and the arrival is labelled "est.". The tolerance is measured and proposed at Task 3 (#100).
- **2026-10-02:** Ground truth for the CME direction (Task 2, #99) is Hapgood (1992)'s published worked examples.
- **2026-10-02:** Task 1 (#85) ships as three PRs: 1a DONKI on CCMC, 1b strict times / http(s) links / ENLIL
  arrival, 1c cache validation on first read.
- **2026-10-02:** Task 1a (#85): the DONKI recordings were re-recorded from CCMC on 2026-10-01 (110 CMEs, 33 left out
  for no longitude, 6 with two flagged analyses); the recorded-CME count test moved from 86 to 77 (user-approved).
  `.env.example` now lists only the optional `PORT`, `DATABASE_PATH` and `SNAPSHOT_DIR`.
- **2026-10-02:** Cache entries are validated on first read (Task 1c, #85): each `DatasetRequest` has `accepts`, built
  from its dataset schema; the service checks an entry once per process (entries it wrote count as checked), and one
  that fails is deleted, logged once and treated as a miss. Task 1c runs before 1b so the CME schema change lands
  with this in place.
- **2026-10-02:** ENLIL's predicted Earth arrival lives on the chosen analysis (`analysis.earthArrival`, with
  `isGlancingBlow` and `isMinorImpact`); ENLIL runs belong to an analysis. Every DONKI time must end in `Z`.
- **2026-10-02:** DONKI times must be UTC with an explicit `Z` (minute precision allowed) in `startTime`, `time21_5` and
  ENLIL's two times; a zone-less one fails the list instead of being read as local time, and ranks oldest when only
  ordering analyses. CME links must be http(s) (`cmeLinkSchema`); any other link becomes `null` (Task 1b, #85).
- **2026-10-02:** ENLIL arrival sample for Task 3: of the 77 CMEs kept from the 2026-10-01 recording, 13 have an ENLIL
  Earth arrival (6 glancing blows, none minor); the CME snapshot (fetched 2026-10-01T22:31Z) matches. On the first
  dev start after the change, Task 1c dropped the pre-change `cmes?days=30` cache entry once and refetched.
- **2026-10-02:** Ground truth for the CME direction (#99) is JPL Horizons, replacing Hapgood (1992)'s worked examples
  (no published values could be verified; user-approved). Horizons gives Earth's heliocentric ecliptic J2000 position
  and Earth's heliographic latitude B0 (observer table, quantity 14, TT only); with the IAU Sun pole (α 286.13°,
  δ 63.87°) these fix the HEEQ frame. Plan part 2 adds a `sun` fixture set, generated on its own.
- **2026-10-02:** Task 2a (#99): `npm run fixtures` takes set names (`planets`, `asteroids`, `sun`); naming one leaves the
  other sets' ground truth and calibrated tolerances untouched. `data/sun-orientation.json` (DE441, Horizons API 1.2,
  generated Thu Oct 1 15:42:27 2026 Pasadena) holds Earth's position and B0 on the 1st of each month of 2026; B0 runs
  from −7.216° to +7.189°. The CLI imports generator modules directly, since the package index pulls in the loaders.
- **2026-10-02:** Task 2b (#99): `packages/orbit/src/heliographic.ts` maps DONKI's HEEQ/Stonyhurst direction to
  ecliptic J2000 with the IAU Sun pole (α 286.13°, δ 63.87°) and the Sun→Earth line, gives B0, and tests Earth against
  the cone in HEEQ, where Earth sits at (B0, 0). The pole reproduces Carrington's tilt and the J2000 node within
  0.002° / 0.006°. B0 matches Horizons to 7e-7° from Horizons' Earth and 6e-4° from the engine's EMB (tolerances
  above, user-approved). The B0 range test bound is 7.25° + 0.01° (the IAU pole's tilt is 7.2517°; user-approved).
- **2026-10-02:** Task 3 (#100) arrival rules, from the 77 CMEs in the 2026-10-01 recording (user-approved): projecting
  the 13 ENLIL-arrival CMEs at constant speed from 21.5 R☉ lands −39 h to +45 h from ENLIL (fast CMEs of
  1,100–1,600 km/s average 555–790 km/s in transit; slow ones of 280 km/s speed up to ~420 km/s); 7 of the 13
  arrivals have Earth outside DONKI's cone (ENLIL models the flank); of the 64 without an arrival, 1 has Earth inside
  its cone. So: with an ENLIL arrival the front moves at the mean transit speed that meets both DONKI times and the
  arrival is shown even if the cone misses; without one the front moves at the measured speed and no computed
  arrival is shown. The analysis gains `enlilRunCount` to tell "ENLIL: no Earth arrival" from "no ENLIL run".
- **2026-10-02:** Task 3a (#100): each CME analysis carries `enlilRunCount`. Of the 77 kept CMEs in the 2026-10-01
  recording, 13 have an ENLIL Earth arrival, 39 had ENLIL runs that predicted none, and 25 had no ENLIL run; the CME
  snapshot (fetched 2026-10-01T22:53Z) matches.
- **2026-10-02:** Task 3b (#100): `packages/orbit/src/cmeKinematics.ts` gives the CME front's uniform motion from
  21.5 R☉ (nominal R☉ 695,700 km, IAU 2015 B3) and its distance at any time, held at 1 R☉ before launch;
  `KM_PER_AU` moved to `src/units.ts`, re-exported unchanged. The cross-check against the recording
  (`apps/server/src/datasets/cmeCrossCheck.test.ts`) measured 0 on all three checks, so all three assert exact
  equality (user-approved). The 13 ENLIL CMEs travel 1.99–3.77 days at a mean 417–790 km/s.
- **2026-10-02:** The user authorized finishing Phase 6 in one go (Tasks 4–10): each task's plan section is written on
  its own branch and lands with its code in one PR, merged once `npm run check` and CI are green; stop only on
  failures, critical errors or performance drops.
- **2026-10-02:** Task 4 (#101): an "Eruptions" list joins the left column (renamed "Events"), newest first, and a
  CME card the right one. One shot at a time: picking a CME clears the approach and vice versa
  (`src/shell/shotSelection.ts`). `ApproachSelection` became a generic `SelectionStore<T>`. Earth tag: ENLIL arrival,
  else DONKI's cone at `time21_5` (inside/outside). The approach list's height drops from min(60vh, 560px) to
  min(42vh, 480px) to share the column.
- **2026-10-02:** Task 5 (#102): the CME shell is DONKI's cone model drawn literally (cone from the Sun's centre,
  spherical cap at the front distance) with 24,000 GPU particles: the axis is fixed at `time21_5`, the front distance
  is float64 on the CPU each frame. Flanks along the cone wall make it read as leaving the Sun (first look was a
  floating lens). Frame time unchanged at 13.34 ms mean (75 Hz, 1920 × 809).
- **2026-10-02:** Task 6 (#103): the Sun gets per-channel linear limb darkening, simplex-noise granulation and a
  streamered corona quad (Ashima/Gustavson noise, MIT, vendored as a GLSL chunk). The illustrative surface motion runs
  on the render clock while the simulation plays and freezes when paused. The photosphere drops from (4, 3.4, 2.6) to
  (1.5, 1.0, 0.5) linear so the close-up is not a white blob; `SUN_GLOW_COLOR` is removed and the Phase 3 bloom test
  now checks the photosphere colour. Frame time 13.34 ms mean close up and from 3 AU.
- **2026-10-02:** Task 7 (#104): Earth uses NASA's Blue Marble NG (July 2004, topo-bathy, public domain) at
  2048 × 1024 (478 KB), turned by the IAU 2000 Earth Rotation Angle about the J2000 pole
  (`packages/orbit/src/earthOrientation.ts`), so the right continents face the Sun. Night side: the same map dimmed
  and tinted blue (city lights stay in Phase 7). The map loads from `SceneCanvas` into a store, so scene tests need no
  DOM. Frame time 13.34 ms mean at Earth.
- **2026-10-02:** Task 8 (#105): the impact shows only for CMEs with an ENLIL arrival and follows its time (3 h rise,
  18 h fade, softened by the glancing-blow/minor-impact flags). Magnetopause: Shue et al. (1998) surface, standoff
  10 → 6.6 R⊕; aurora: ovals around the IGRF-14 dipole poles, 18° → 28° colatitude, night side only. Both are
  labelled illustrative on the CME card. Frame time 13.34 ms mean during the impact.
- **2026-10-02:** Task 9 (#106): Watch eruption plays three beats on the simulation clock (burst 8 s, cruise 12 s,
  impact 10 s around ENLIL's arrival; no impact beat without one), each with a side-on camera. Flights gained an
  optional end `direction` (`DirectedAim`, shared with the chase). The fixed-size Earth marker moved to
  `scene/markers/` and shows during eruptions. Whole shot: 13.34 ms mean, p99 14.3 ms.
- **2026-10-02:** Task 10 (#107): exit verified (see Phase 6). The exit check's tolerances follow the approved rule
  (measured × 1.25, exact if 0) and were set without a separate stop, under the user's go-ahead for the whole phase.
  Phase 6 done; v0.6.0.
- **2026-10-02:** Licensed under GPL-3.0-or-later (user decision): `LICENSE`, a `license` field in every
  `package.json`, and a README section. Upstream NASA/JPL data keeps its own terms.
- **2026-10-02:** Phase 7 planned (user decisions): performance before graphics detail, so Earth city lights and
  clouds and swarm colour tuning move to Parked. Proxy runs on the M3 stand in for an integrated GPU. Hosting is
  Netlify (web, `/api` forwarded) and Render's free tier (server). Quality tiers are chosen from frame times with a
  manual override in a Display panel; High keeps today's bloom (0.5) and drops the composer's MSAA from 8 to 4.
  Explanation is a help dialog, an orbit-class legend and one first-visit hint (no tour). Exit: Lighthouse desktop
  Performance ≥ 85, TBT < 300 ms, Accessibility ≥ 90; the user captures the recording.
- **2026-10-02:** README rewritten in plain English for the current state (#139): the three shots, how the web app,
  data server and engine fit together, data sources, endpoints, getting started and every npm command.
- **2026-10-02:** Task 1 (#128): the bench (`?bench=overview|earth|approach|eruption|tour`, dev only) loads its own
  copy of the lists, so nothing is threaded through `App`; it plays the closest approach and the latest CME with an
  ENLIL Earth arrival (else the latest), and logs which. Timing starts after the shot's camera flight lands plus
  1 s, so a flight is never mixed into the steady numbers; `tour` (~64 s) is untimed. `?dpr=<n>` clamps to 0.5–3.
  `FrameTimeSummary` gains `p90Ms` (nearest rank), so the existing summary tests now expect it.
- **2026-10-02:** Chrome's DevTools CPU throttle at 4× gives only ≈ 1.7× on the M3 (fixed loop, checked by the user in
  the DevTools console as well), so throttled runs are recorded as "CPU 4× setting (≈ 1.7×)", never as 4×. The other
  proxies (`?dpr=2`, `?swarmStress=4`) already show the GPU sets the frame time.
- **2026-10-02:** The initial JS budget counts what `index.html` loads up front (entry script + modulepreloads),
  gzipped at Node's default level, against 400,000 bytes (391,164 measured, rounded up to the next 10 kB).
- **2026-10-02:** Task 2 (#129): `?dpr` stands in for the device's ratio and the tier caps it, so proxy runs show the
  tiers apart; the dev-only `?tier=low|medium|high` is read once in `main.tsx` (a bench run reloads the page), with no
  `window` handle. `CME_SHELL_LOOK.particleCount` (24,000) stays and `QUALITY_TIERS.high` references it, so the
  Phase 6 exit-check and shell-geometry tests are unchanged.
- **2026-10-02:** Task 2's High tier counts as not slower than main at `?dpr=2&swarmStress=4` (user decision): an
  alternating A/B showed the same frames per 10 s, a 0.6 ms higher median and a 1.6 ms lower p90. A/B runs on this
  fanless Mac alternate builds with idle breaks; one long sweep drifts with heat.
