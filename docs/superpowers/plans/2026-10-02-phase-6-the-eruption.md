# Phase 6: Shot 3: The Eruption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pick a real CME from the last 30 days and watch it leave the Sun and travel outward along DONKI's measured
direction and cone width, timed to the real event; if it reaches Earth, show the impact (illustrative).

**Architecture:** The server fetches CMEs from DONKI's new CCMC API (no key), keeps each CME's most accurate analysis
and, when DONKI ran ENLIL for it, ENLIL's predicted Earth arrival. `packages/orbit` turns the analysis into a
heliocentric ecliptic J2000 cone axis and a leading-edge distance over time. The web app draws the cone as a GPU
particle shell driven by the time controller. Times and speeds shown are DONKI's; the drawn shell is an illustration
of DONKI's cone model.

**Tech Stack:** TypeScript 6 (strict, ESM), React 19, three 0.186, @react-three/fiber 9.8, @react-three/drei 10.7,
Fastify, zod 4, Vitest 5, fast-check.

**Spec:** `PLAN.md` § Phase 6 (ten tasks, PR #98), plus decisions approved while planning (2026-10-02):

1. **DONKI's new home.** CME data comes from `https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME`, which replaced
   `api.nasa.gov/DONKI/CME` on 2026-09-30 (CCMC "Major Updates"; parameters and JSON unchanged, checked live:
   107 CMEs for 2026-09-02 → 2026-10-01, same top-level fields as our recording). It needs no API key.
2. **`NASA_API_KEY` is retired.** DONKI was its only user. The key, the `DEMO_KEY` fallback and its start-up warning
   go; CLAUDE.md's data notes and non-negotiable 6 are updated to match. The redaction helper stays (generic).
3. **Own gate for CCMC.** The new host gets its own `UpstreamGate` at ≥ 1 s between requests (no rate-limit headers
   seen).
4. **Time strictness.** Upstream times must carry an explicit `Z` (DONKI prints minute precision, `2026-09-02T00:08Z`);
   a time without a zone is a format error, never local time.
5. **Links.** `cmeSchema.link` accepts only `http:`/`https:` URLs.
6. **Cache validation on read.** Each SQLite cache entry is validated against its dataset schema the first time a
   process reads it; a failure counts as a miss.
7. **ENLIL arrival is kept.** A CME carries ENLIL's predicted Earth arrival when its chosen analysis has an ENLIL
   run that predicts one, else `null`. When present it is the arrival time shown as fact and the time the drawn
   front reaches Earth (Task 3).
8. **Ground truth for the CME direction (Task 2):** published worked examples (Hapgood 1992, _Planet. Space Sci._
   40, 711), committed as a fixture with the source cited.
9. **Arrival timing (Task 3):** with an ENLIL arrival, the drawn front is timed to reach Earth then; without one, it
   moves at the analysis speed from 21.5 R☉ at `time21_5` (constant speed) and the arrival is labelled "est.". The
   tolerance for "consistent with DONKI" is measured and proposed with evidence at Task 3, as in earlier phases.

## Tasks

| #   | Task                                       | Issue | Format    | Status        |
| --- | ------------------------------------------ | ----- | --------- | ------------- |
| 1a  | DONKI on CCMC, key retired, re-recorded    | #85   | light     | 🟨 in review  |
| 1b  | Strict times, http(s) links, ENLIL arrival | #85   | light     | ⬜            |
| 1c  | Validate cache entries on first read       | #85   | light     | ⬜            |
| 2   | Engine: CME direction and Earth-in-cone    | #99   | full code | written later |
| 3   | Engine: CME kinematics and arrival         | #100  | full code | written later |
| 4   | CME picker + selected-CME store            | #101  | light     | written later |
| 5   | CME particle shell                         | #102  | full code | written later |
| 6   | Sun look                                   | #103  | full code | written later |
| 7   | Earth look                                 | #104  | full code | written later |
| 8   | Earth impact (illustrative)                | #105  | light     | written later |
| 9   | Shot choreography                          | #106  | light     | written later |
| 10  | Exit verification                          | #107  | light     | written later |

Task 1 is one issue (#85) delivered in three PRs (`phase-6/donki-ccmc`, `phase-6/donki-strict`,
`phase-6/cache-validation`); the last one closes #85.

---

## Task 1a: DONKI on CCMC, key retired, re-recorded

**Files:**

- Modify: `packages/data/src/upstream/queries.ts` (+ test): `DONKI_CME_API_URL` →
  `https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME`; `donkiCmeQuery(window)` drops its `apiKey` argument and the
  `api_key` parameter.
- Modify: `apps/server/src/upstream/upstreamClients.ts`: the DONKI client's comment names CCMC; keep
  `DONKI_TIMEOUT_MS`.
- Modify: `apps/server/src/config.ts` (+ test), `apps/server/src/main.ts`: remove `nasaApiKey`, `usingDemoKey`,
  `DEMO_API_KEY` and the warning.
- Modify the key's call sites (review item 4): `apps/server/src/datasets/datasetRequests.ts` (`nasaApiKey`
  dependency), `createDatasets.ts`, `apps/server/scripts/writeSnapshot.ts`, `apps/server/src/testing/testServer.ts`
  and `testConstants.ts` (`TEST_API_KEY` goes).
- Modify: `apps/server/src/testing/fakeUpstream.ts`: the DONKI recording is served under `/DONKI-API/get/CME`
  (review item 1).
- Modify: `apps/server/scripts/recordUpstream.ts`: no key.
- Modify: `apps/server/src/upstream/upstreamUrl.test.ts`, `httpClient.test.ts`: new host; the redaction tests keep a
  made-up `api_key` URL (the helper stays generic).
- Re-record: `npm run record -- donki` (the recorder's group; writes `donki-cme-window.json`, `donki-cme-empty.json`
  and their manifest entries; review item 3).
- Modify: `CLAUDE.md` (review item 5): non-negotiable 6 reads "**Never commit secrets.** Credentials come from the
  environment only."; the data note reads "JPL SSD APIs (SBDB query, CAD, Horizons) and DONKI (CCMC `DONKI-API`)
  need no key." `.env.example` lists the optional server settings instead of `NASA_API_KEY` (review item 6).
  `PROGRESS.md`: remove the `DEMO_KEY` known issue.

**Tests (agreed changes, review item 2; the rest pass unchanged):**

- `queries.test.ts`: "asks CCMC for the window, with no key": the base URL is CCMC's and the params are exactly
  `{ startDate, endDate }`.
- `config.test.ts`: the defaults lose `nasaApiKey`/`usingDemoKey`; a new test shows a leftover `NASA_API_KEY` changes
  nothing.
- `datasetRequests.test.ts`: DONKI is asked on `/DONKI-API/get/CME` with no `api_key`.
- `donki.test.ts` (approved after the re-record, 2026-10-02): the recorded-CME count is 77 of 110 (33 have no
  longitude in their flagged analysis), was 86 of 126. Same rule, new recording.
- If any other test fails on the new recording, stop and report it; never edit the recording.

**Acceptance:**

- [x] `grep -rn "NASA_API_KEY\|DEMO_KEY\|api.nasa.gov" apps packages CLAUDE.md` finds nothing outside committed
      recordings' history.
- [x] `npm run dev`: `/api/cmes` answers `origin: "fresh"` and the server logs no DONKI error (2026-10-01T22:20Z:
      77 CMEs).
- [x] `npm run check` green.

## Task 1b: Strict times, http(s) links, ENLIL arrival

**Files:**

- Modify: `packages/data/src/upstream/donki.ts` (+ test): `toIsoTimestamp` rejects a time without `Z` (decision 4);
  `link` keeps only `http:`/`https:` URLs, others become `null` (decision 5); the analysis schema reads `enlilList`.
- Modify: `packages/data/src/cme.ts`: `link` is `z.url({ protocol: /^https?$/ }).nullable()`; add
  `earthArrival: { predictedTime: iso datetime, isGlancingBlow: boolean } | null`.
- Refresh: `npm run snapshot -- cmes`; commit `apps/web/public/snapshot/cmes.json`.

**ENLIL rule (read the field names from the Task 1a recording before coding; don't guess):** from the chosen
analysis's `enlilList`, take the run with the latest `modelCompletionTime` that has a non-null
`estimatedShockArrivalTime`; `isGlancingBlow` is its `isEarthGB`. No such run → `earthArrival: null`. Record in the
PROGRESS decisions how many recorded CMEs have an arrival.

**Tests:**

- A time without `Z` (`2026-09-01T12:00`) throws `UpstreamFormatError`; minute precision with `Z` parses.
- A `javascript:` or relative `link` becomes `null`; an `https:` link is kept.
- ENLIL: no list → `null`; several runs → the latest completed with an arrival; a run without an arrival is skipped.
- The re-recorded response normalizes, and its output passes `cmeSchema`.

**Acceptance:**

- [ ] The two DONKI items in PROGRESS "Open questions" are removed and logged as decisions.
- [ ] `npm run check` green.

## Task 1c: Validate cache entries on first read

**Files:** `apps/server/src/datasets/sqliteDatasetCache.ts` or `datasetService.ts` (+ tests); read both first and put
the check where the dataset's schema is already known.

**Behaviour:** the first time a process reads an entry for a dataset, it parses it with that dataset's schema; a
failure is logged once, the entry is treated as a miss (refetch, then stale/snapshot fallback as today), and later
reads of a valid entry skip re-validation.

**Tests:** a pre-change entry (e.g. a CME row without `earthArrival`) is a miss and triggers a fetch; a valid entry is
served without a fetch; validation runs once per entry per process.

**Acceptance:**

- [ ] The cache item in PROGRESS "Open questions" is removed and logged as a decision; the PR closes #85.
- [ ] `npm run check` green.
