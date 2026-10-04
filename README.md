# Perihelion

A 3D solar system in the browser, driven by live NASA/JPL data. It shows the real near-Earth asteroids, this week's
close approaches to Earth and recent solar eruptions (CMEs), on top of a small TypeScript orbit engine that is tested
against JPL Horizons.

Live: <https://gilded-tartufo-9fde5f.netlify.app/> (the data server sleeps when idle, so the first visit shows a bundled
snapshot for a moment, then swaps to live data).

## What you can see

- **The Swarm.** About 42,000 known near-Earth asteroids, moving on their real orbits. They are coloured by orbit
  class (Apollo, Aten, Amor, Atira). A short camera move opens the app; any click, scroll or key press skips it.
- **The Close Approach.** A list of asteroids passing Earth this week. Pick one and the clock jumps to its pass and
  the camera follows it. A card shows JPL's distance, speed, time and size, with a small Earth-centred close-up.
- **The Eruption.** Coronal mass ejections from the last 30 days. Pick one to watch it leave the Sun and travel out
  to Earth, using the speed, direction and width that DONKI reports.

You can play, pause, speed up (up to 10 years per second) and scrub time, and orbit or zoom the camera freely. The sky
behind it is the real one: every naked-eye star from the Yale Bright Star Catalogue, at its J2000 position.

Press `?` for a short guide: what you are looking at, the three shots, what is real and what is illustrative, a
glossary and the credits. An orbit-class legend sits beside the swarm. The app picks
a quality tier (Low, Medium or High) from measured frame times and lets you change it in the Display panel. It works
by keyboard, respects the reduced-motion setting, and has a layout for phones and touch. Without WebGL 2 it shows an
explanation and stills of the three shots instead of a blank page.

Distances, speeds and dates shown as facts come straight from JPL or DONKI. Some effects, such as the aurora and the
magnetosphere, are only illustrations and are labelled that way in the app.

## How it works

The web app never talks to NASA or JPL itself. It asks our own data server, which fetches, checks and caches the
data. If the server or the upstream APIs are down, the app falls back to a snapshot bundled with it, and a status
pill shows whether the data is live, stale or from the snapshot. A server that is asleep or slow is not waited on for
more than a few seconds: the app starts from the snapshot and swaps to live data when the server answers.

```
apps/web           The app: Vite, React and React Three Fiber, with custom GLSL shaders
apps/server        The data server: Fastify, a SQLite cache and scheduled refreshes
packages/orbit     The orbit engine: pure TypeScript, no dependencies, no DOM or Node APIs
packages/data      Shared zod schemas and data types
packages/fixtures  Ground-truth positions from JPL Horizons, and the script that makes them
tools/review       Dev-only pull request checks for fixtures, tolerances and commit messages; never shipped
```

The engine works out the positions of the planets, the camera and the selected asteroid on the CPU, in full
precision. The tens of thousands of asteroids in the swarm are moved on the GPU instead, and a test checks that both
agree.

### Data sources

None of these need an API key.

| Source                           | Used for                                    |
| -------------------------------- | ------------------------------------------- |
| JPL SBDB Query API               | Orbits of all near-Earth asteroids          |
| JPL Close Approach Data API      | This week's close approaches                |
| JPL Horizons                     | Ground-truth positions for tests (dev only) |
| DONKI (CCMC `DONKI-API`)         | CME speed, direction, width and timing      |
| WSA-ENLIL (via DONKI)            | Forecasts of when a CME reaches Earth       |
| NASA Blue Marble Next Generation | The Earth texture                           |
| NASA HEASARC (Yale BSC5)         | The starfield (committed, dev-only refresh) |

### Server endpoints

| Endpoint                    | Returns                         |
| --------------------------- | ------------------------------- |
| `GET /health`               | `{"status":"ok"}`               |
| `GET /api/neos`             | The near-Earth asteroid catalog |
| `GET /api/close-approaches` | This week's close approaches    |
| `GET /api/cmes`             | CMEs from the last 30 days      |

## Getting started

You need Node 24 or newer.

```bash
npm i          # install
npm run dev    # start the web app and the data server together
```

The data server listens on port 8787, and the web app's dev server forwards `/api` requests to it. Optional settings
(`PORT`, `HOST`, `DATABASE_PATH`, `SNAPSHOT_DIR`) are listed in [`.env.example`](.env.example).

## Commands

```bash
npm run check     # typecheck, lint, test and build (must pass before any change is done)
npm test          # all unit and property tests
npm run format    # format the code with Prettier
npm run fixtures  # regenerate the Horizons fixtures (uses the network; dev only)
npm run stars     # regenerate the starfield from NASA HEASARC (uses the network; dev only)
npm run record    # re-record the upstream responses used by the server tests (uses the network; dev only)
npm run snapshot  # refresh the data snapshot bundled with the web app
```

Tests never use the network. They run against committed fixtures and recorded responses.

## Deployment

The web app runs on Netlify, which forwards `/api` to the data server on Render's free plan. Both redeploy on every
push to `main`. The steps to set it up again, and what to expect from the free plan, are in
[`docs/deploy.md`](docs/deploy.md).

## License

Copyright (C) 2026 rvpanoz

Licensed under the GNU General Public License v3.0 or later (`GPL-3.0-or-later`). See [LICENSE](LICENSE).
NASA/JPL data is used under its own terms and is not covered by this license.
