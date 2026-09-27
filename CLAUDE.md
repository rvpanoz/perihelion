# CLAUDE.md

Perihelion: a web-based 3D solar system VFX showcase driven by live NASA/JPL data, built on a
small TypeScript orbit engine. See `PLAN.md` for scope and phases, `PROGRESS.md` for current state.

## Workflow

- Read `PROGRESS.md` first. Work only on the current phase unless told otherwise.
- A phase is done only when every exit criterion in `PLAN.md` is met and verified.
- At the end of each task, update `PROGRESS.md`: tick items, add decisions, note blockers.
- Run `npm run check` before calling anything done.
- Keep changes small and focused; don't refactor outside the task.

## Non-negotiables

1. **No AI at runtime.** No LLM/AI API calls anywhere in shipped code.
2. **Tests never touch the network.** Use committed fixtures and recorded responses.
3. **Fixtures are ground truth. Never edit fixtures or loosen tolerances to make a test pass.**
   Fix the code. If you believe a tolerance is wrong, stop and ask, with evidence.
4. **`packages/orbit` has zero runtime dependencies** and no DOM or Node APIs. It is pure functions over numbers.
5. **The web app never calls NASA/JPL directly.** All data goes through `apps/server` (with snapshot fallback).
6. **Never commit secrets.** `NASA_API_KEY` comes from the environment only.

## Commands

```bash
npm i             # install
npm run dev       # web + server in dev mode
npm run check     # typecheck + lint + test + build (must be green)
npm test          # all unit/property tests
npm run fixtures  # regenerate Horizons fixtures (network; dev only; commit the result)
npm run snapshot  # refresh bundled data snapshot for the web app
```

## Layout

```
apps/web        Vite + React + React Three Fiber (scenes, shaders, UI)
apps/server     Fastify data server (fetch, normalize, cache NASA/JPL)
packages/orbit  Pure TS orbit engine
packages/data   zod schemas + shared normalized types
packages/fixtures  Horizons ground-truth fixtures + generator
```

## Engine conventions (`packages/orbit`)

- Units in names: `distAu`, `velAuPerDay`, `jdTdb`, `angleRad`. Radians internally; degrees only at I/O boundaries.
- Frame: heliocentric ecliptic J2000 unless a name says otherwise.
- Time: Julian Date (TDB) internally; convert from UTC at the boundary.
- Functions are pure and allocation-light; accept an optional `out` array for hot paths.
- Every public function has a unit or property test.

## Rendering conventions (`apps/web`)

- **Never drive per-frame animation through React state.** Use `useFrame` and refs.
- Camera-relative rendering and logarithmic depth buffer are always on. World unit = 1 AU.
- CPU (float64 engine) positions: planets, camera, focused object. GPU (shader) positions: the swarm only.
- One time source (the time controller store); every scene element reads from it.
- Shaders live next to their component as `.glsl` files; keep uniforms typed.
- Values shown to the user as facts (distances, speeds, dates) come from JPL/DONKI data, not our approximations.
  Anything illustrative (aurora, magnetosphere) is labelled as such in the UI.
- Check performance after visual changes: target 60 fps on a mid-range laptop.

## Data notes

- JPL SSD APIs (SBDB query, CAD, Horizons) need no key. DONKI needs `NASA_API_KEY`.
- Do **not** use: Mars Rover Photos API (offline), InSight weather (frozen 2020 data), legacy APOD API (archived 2026-12-01).
- Validate every upstream response with zod; treat upstream data as untrusted.

## Code style

- TypeScript strict, ESM, no `any` (use `unknown` + narrowing).
- Match the surrounding code; comment the _why_ (especially astronomy math: cite the formula/source).

## Git & Workflow Guidelines

- **Every new feature works on its own branch, branched off `main`.** Never
  commit feature work directly to `main`. Create the branch before the first
  edit: `git checkout -b <phase>/<short-name>`. One branch per step or feature,
  merged back when its step is done and `npm run check` passes.
- All commit messages must strictly contain only the functional description of the changes.
- No trailers. Write commit messages and PR descriptions in plain English.

## Agent Guardrails & Cost Optimization

- **Maximum 2 Tool Loops:** You are strictly forbidden from executing more than 2 tool loops (e.g., read file -> edit file) in a single turn without pausing to ask for human permission.
- **No Autonomous Debugging Loops:** If a terminal command or test fails, do NOT attempt to read more files or fix the error on your own. Stop immediately, output the error log, and hand control back to the user.
- **No Full File Rewrites:** When editing a file, strictly use precise diff patches. Never output an entire 100+ line file if only 5 lines are changing.

## Coding Standards (Uncle Bob Clean Code)

- **Meaningful Names:** Intention-revealing, pronounceable names. Avoid abbreviations.
- **Small Functions:** Do one thing, do it well, and keep them short (< 20 lines).
- **Single Level of Abstraction:** Do not mix high-level logic with low-level implementation details.
- **DRY:** Eliminate duplicate logic.
- **Self-Documenting Code:** Explain "why" in comments, not "what" or "how".
- **Function Arguments:** Prefer 0–2 arguments. Wrap 3+ in a dedicated object type.
- **Error Handling:** Isolate `try/catch` blocks; don't mix them with core logic.
- **Boy Scout Rule:** Leave modified files cleaner than you found them.
