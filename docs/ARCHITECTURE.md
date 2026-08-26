# Architecture

Inzly is two systems with one seam between them.

```
┌─────────────────────────────────────────────────────────────┐
│ frontend/  — the product                                    │
│                                                             │
│  client/   React 19, Vite, Tailwind + shadcn/ui, Wouter,    │
│            TanStack Query, Framer Motion, Recharts          │
│                                                             │
│  server/   Express BFF — auth, sessions, saved homes,       │
│            AI analysis, and property reads                  │
│            platform/  ← adapter to the data platform        │
│                                                             │
│  shared/   Drizzle schema + Zod types shared client/server  │
│                                                             │
│  Postgres: properties, issues, users, saved_properties      │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP (optional)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ backend/  — the data platform                               │
│                                                             │
│  api/               REST surface (:8080)                    │
│  orchestrator/      drives request lifecycle, completion    │
│  rentcast-fetcher/  property data ingest (RentCast or mock) │
│  shared/            types, schemas, Redis repositories      │
│  packages/frontend/ legacy POC UI — superseded              │
│                                                             │
│  Redpanda (Kafka API) for events · Redis for persistence    │
└─────────────────────────────────────────────────────────────┘
```

## The product app

A single Express process serves both the API and the built client. In
development Vite runs in middleware mode for HMR; in production
`script/build.ts` bundles the server with esbuild and the client with Vite.

Auth is session-based: bcrypt password hashing, sessions in Postgres via
`connect-pg-simple`. AI analysis calls OpenAI to produce severity-rated issues
with coordinates that the UI renders as markers on property photos.

Property reads go through the `IStorage` interface, which has two
implementations — Postgres and the platform adapter. Everything else (issues,
users, saved homes) is always Postgres. See
[INTEGRATION.md](INTEGRATION.md).

## The data platform

Stateless services communicating over Redpanda. Events use `<noun>.<operation>`
topics with a `{ type, ts, data }` envelope. Persistence is Redis repositories
behind a `BaseRepository` abstraction, chosen to be replaceable — the `.env`
already anticipates a Postgres migration.

The flow: an address request is created and published; the orchestrator moves it
to `processing`; the RentCast fetcher produces a `BonesReportResult`; a
completion handler marks the request `processed`.

`packages/frontend` is the POC UI that predates the product app. It still
builds, but the app in `frontend/` supersedes it. It is kept for reference and
can be removed once nothing depends on it.

## Why they are not merged

Different runtimes (npm/tsx vs pnpm workspace), different persistence (Postgres
vs Redis), different deploy targets, and different rates of change. Merging them
would mean a lockfile rewrite, a Docker rework, and one build that fails when
either half breaks. Consolidating them in one repository with a documented,
typechecked adapter gets the coordination benefit without the coupling cost.

The trade-off is real: shared types are duplicated at the seam and must be kept
in sync by hand. [INTEGRATION.md](INTEGRATION.md) names the files that must
move together, and the `api-contract` agent exists to catch drift.
