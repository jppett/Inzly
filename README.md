# Inzly

AI-powered real estate analysis. Inzly helps agents and buyers understand a home
— its condition, risks, and hidden costs — before anyone commits.

This repository holds both halves of the product:

| Path         | What it is                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| `frontend/`  | The Inzly product app — React 19 client plus an Express BFF and Postgres.   |
| `backend/`   | The data platform — event-driven services that ingest property data and analyse listing photographs. |
| `docs/`      | Architecture, the integration contract, brand guide, known issues.          |
| `.claude/`   | Agent definitions for build-out work.                                       |

The two were developed separately and are consolidated here without being
merged: each still builds, runs, and deploys on its own. What connects them is a
single documented seam — see **[docs/INTEGRATION.md](docs/INTEGRATION.md)**.

## Quick start

```bash
# Product app (React + Express)
cd frontend
npm install
cp .env.example .env      # defaults run against the hosted mock backend
npm run dev               # http://localhost:5000

# Data platform (pnpm workspace)
cd backend
pnpm install
cp .env.example .env
docker compose up -d      # Redpanda + Redis + services
pnpm run build
```

The front end runs standalone out of the box: the default `VITE_API_TARGET=mock`
points at a hosted mock backend, so you need neither a database nor the platform
services to see the UI with realistic data.

## How the data connection works

Property data can come from three places. You choose without touching code:

| Source     | Set this                                              | Requires                  |
| ---------- | ----------------------------------------------------- | ------------------------- |
| Mock       | `VITE_API_TARGET=mock` *(default)*                    | nothing                   |
| Postgres   | `VITE_API_TARGET=local`, `INZLY_DATA_SOURCE=database` | `DATABASE_URL`            |
| Platform   | `VITE_API_TARGET=platform`, `INZLY_DATA_SOURCE=platform` | `PLATFORM_API_URL`, running `backend/` |

`GET /api/data-source` reports which one is live.

Switching to `platform` routes property reads through `frontend/server/platform/`,
which calls the backend's REST API and maps its report shape onto the shape the
UI renders. That adapter is written and typechecked; it is the piece that goes
live as real data connections come online. Details and the current gaps are in
[docs/INTEGRATION.md](docs/INTEGRATION.md).

## Photo analysis

The `photo-analyst` service runs 14 specialist vision agents over a property's
listing photographs and produces the severity-rated findings the app shows to
buyers. Each finding cites the photo it came from and separates what was
literally seen from what that implies.

```bash
cd backend
# Works with no credentials — deterministic mock provider
pnpm --filter @bones-report/photo-analyst analyse <photo-url> [photo-url...]

# Real analysis
export ANTHROPIC_API_KEY=...
pnpm --filter @bones-report/photo-analyst analyse <photo-url>
```

See [docs/PHOTO_ANALYSIS.md](docs/PHOTO_ANALYSIS.md).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the whole system fits together
- [docs/INTEGRATION.md](docs/INTEGRATION.md) — the contract between the two halves
- [docs/PHOTO_ANALYSIS.md](docs/PHOTO_ANALYSIS.md) — the expert vision agents and why their instructions read as they do
- [docs/CALIBRATION.md](docs/CALIBRATION.md) — tuning the agents against professional judgement
- [docs/PERMITS.md](docs/PERMITS.md) — permit history, and how it corroborates what the agents see
- [docs/DEPLOY.md](docs/DEPLOY.md) — standing the app up on Railway
- [docs/SPEED_AND_COST.md](docs/SPEED_AND_COST.md) — tiered models, the Summary Agent, batching, and why "instant" means precomputed
- [docs/BRAND.md](docs/BRAND.md) — brand and UI design guide
- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — inherited problems worth knowing about
- [backend/docs/](backend/docs/) — platform API spec, events, decisions
- [CLAUDE.md](CLAUDE.md) — orientation for agents working in this repo

## Provenance

`frontend/` came from a Replit project (`rest-express`); `backend/` from the
`bones-report` POC. Both were imported at their then-current state. The Replit
project's own 74-commit history was not carried over — this repository starts
fresh.
