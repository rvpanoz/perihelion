# Deploying Perihelion

The web app runs on Netlify and the data server on Render's free plan. Both redeploy on every push to `main`. Neither
needs a secret: every upstream (JPL SSD, CCMC DONKI) is keyless.

## One-time setup

1. **Render (server).** New → Blueprint, pick this repo and the `main` branch, apply. `render.yaml` creates the
   `perihelion-server` web service in Frankfurt with a `/health` check. Note its URL
   (`https://perihelion-server.onrender.com` unless Render added a suffix because the name was taken).
2. **`netlify.toml`.** If the Render URL differs from the one in the two `/api` redirects, change both.
3. **Netlify (web).** Add new site → Import from GitHub, pick this repo and `main`. Leave the build settings blank:
   `netlify.toml` supplies them.

## How the pieces connect

- The browser only asks relative paths. Netlify proxies `/api/*` to Render (status 200, so the address bar and CORS
  are unaffected). `/api/health` is proxied to the server's `/health`, which is the only health route it has.
- Render needs `HOST=0.0.0.0` (set in `render.yaml`); the server's default is loopback for local development.

## Free-plan behaviour to expect

- Render sleeps the service after about 15 minutes without traffic. The first request afterwards takes around a
  minute. The web app shows the bundled snapshot after 4 s and swaps to live data when the server answers.
- The disk is ephemeral, so the SQLite cache starts empty on every cold start and refills from upstream.
- The server reads its fallback snapshot from `apps/web/public/snapshot` in the checkout, which is why Render builds
  from the whole repo.

## Checking a deploy

- `curl https://<site>.netlify.app/api/health` returns `{"status":"ok"}` (the first call may wait for Render to wake).
- Logs: Render dashboard → the service → Logs for the server; Netlify → Deploys for the build.
