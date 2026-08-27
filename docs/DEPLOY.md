# Deploying to Railway

Goal: a URL you can open that rebuilds every time code is pushed, so you can
watch the app change as it is edited.

## What can and cannot go on Railway

| Piece | Railway | Notes |
| --- | --- | --- |
| `frontend/` (React + Express) | **Yes** | One service. This is the app you look at. |
| Postgres | **Yes** | Railway plugin, sets `DATABASE_URL` for you. |
| Redis | **Yes** | Railway plugin, for the platform services. |
| `backend/` services | Yes, with effort | One Railway service per package. |
| Redpanda / Kafka | **No first-party plugin** | The real constraint — see below. |

**Start with the front end only.** It runs standalone against the hosted mock
backend, needs no database and no AI key, and gives you the live URL in about
five minutes. Everything else can follow.

## Deploying the front end

1. **New Project → Deploy from GitHub repo**, pick `jppett/Inzly`.
2. In the service's **Settings → Source**, set **Root Directory** to `frontend`.
   This is the step people miss: without it Railway builds the repository root,
   which has no app in it.
3. Set the branch you want to watch. Every push to that branch redeploys.
4. **Variables** — the minimum is nothing at all; it boots and serves the mock
   backend with no variables set. Worth setting:

   ```
   VITE_API_TARGET=mock
   SESSION_SECRET=<a long random string>
   ```

   **Do not set `NODE_ENV=production` as a Railway variable.** Railway applies
   variables to the build as well as the runtime, and `npm ci` under
   `NODE_ENV=production` skips devDependencies — which is where `vite`, `tsx`
   and `esbuild` live. The build then fails with `tsx: not found`. This was
   verified, not assumed: 342 packages installed instead of 450.

   The build command in `railway.json` passes `--include=dev` so it survives
   this anyway, and `npm start` sets `NODE_ENV=production` itself for the
   runtime. There is nothing to gain by setting it yourself.

5. **Settings → Networking → Generate Domain** for a public URL.

`railway.json` in `frontend/` already sets the build and start commands and
points the healthcheck at `/api/data-source`. That endpoint reports how the
deployment is configured, which is the fastest way to diagnose one:

```json
{ "source": "database", "database": false, "ai": false, "sessions": "memory" }
```

Names only, never values. `database: false` with `source: "database"` means the
app is trying to read properties from Postgres and there is none — set
`VITE_API_TARGET=mock` or add the database.

### Adding a database

Add the Postgres plugin to the project. Railway injects `DATABASE_URL`
automatically. Then, once:

```bash
railway run --service <your-service> npm run db:push
```

Without `DATABASE_URL` the app falls back to in-memory sessions — fine for
looking at the app, but logins reset on every restart and it will not work
across more than one instance.

**Seeding does not currently work.** `server/seed.ts` builds property fixtures
in an old shape the schema no longer accepts; see
[KNOWN_ISSUES.md](KNOWN_ISSUES.md). Until that is fixed, use `VITE_API_TARGET=mock`
for populated data.

### Turning on AI features

Set `AI_INTEGRATIONS_OPENAI_API_KEY`. Without it the app boots and browses
normally, and the analysis and chat endpoints return 503 naming the variable to
set rather than crashing the process. (With no database *and* no AI key you will
see a 500 from the database first, since the route loads the property before it
reaches the model — `/api/data-source` tells you which is missing.)

## Deploying the platform

Harder, and worth doing only once you need real data flowing.

Each package in `backend/` becomes its own Railway service with **Root
Directory** `backend` and a start command of
`pnpm --filter @bones-report/<name> start`, plus a build of
`pnpm install && pnpm run build`. Add the Redis plugin and set `REDIS_URL`.

**The blocker is Redpanda.** The services communicate over a Kafka API and
Railway has no first-party Redpanda or Kafka plugin. Three options:

1. **Managed Kafka elsewhere** — point `REDPANDA_BROKERS` at a hosted cluster.
   Least work, and keeps the architecture intact.
2. **Run Redpanda as a Railway service** from a Docker image with a volume.
   Workable, but you are now operating a broker.
3. **Skip it for now.** The front end does not need the platform: `mock` for
   demos, `database` for real Postgres-backed properties. Photo analysis and
   permits need the platform, so this defers those.

Option 3 is the honest recommendation until photo analysis is calibrated and
you actually want it running continuously.

## Cost shape

Two things dominate, and neither is Railway:

- **Vision analysis** — billed per run, and a run means every photo read by
  every agent. `review --dry-run` reports the call count before you spend
  anything, and photos are cached across agents so only the first call pays
  full image cost.
- **Railway itself** — a single always-on web service plus Postgres is modest;
  the platform services multiply that by however many you run.

Nothing in the repository spends money on its own. Every paid path is behind a
credential that is absent by default, and every service falls back to a mock
when its key is missing.
