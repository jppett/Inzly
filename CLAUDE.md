# Inzly — repository guide

AI-powered real estate analysis. Two systems, one repository, one seam between
them.

## Layout

- `frontend/` — the product. React 19 client + Express BFF + Postgres. npm, tsx.
- `backend/` — the data platform. Event-driven services on Redpanda + Redis, including the photo-analyst vision agents. pnpm workspace.
- `docs/` — architecture, integration contract, brand guide, known issues.

They build and deploy independently. Do not merge their toolchains or lockfiles.

## Before you start

Read [docs/INTEGRATION.md](docs/INTEGRATION.md) if your change touches how the
two halves talk. Read [docs/BRAND.md](docs/BRAND.md) before any UI work — the
design language is specific and deliberate. Read
[docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) before you "fix" something that
looks broken; it may be a known inherited problem with a reason.

## Commands

```bash
# frontend/
npm run dev        # dev server on :5000
npm run build      # vite + esbuild
npm run check      # tsc --noEmit — see KNOWN_ISSUES.md, 7 pre-existing errors
npm run db:push    # drizzle-kit push

# backend/
pnpm install
pnpm run build     # builds all workspace packages; currently green
docker compose up -d
```

## Conventions that matter here

**The storage seam.** API routes talk to `IStorage`
(`frontend/server/storage-types.ts`), never to a concrete implementation. Adding
a route that reaches into Drizzle directly breaks platform mode. If you add a
method, implement it in both `DatabaseStorage` and `PlatformStorage`.

**Contract duplication is intentional.** `frontend/server/platform/types.ts`
mirrors `backend/packages/shared/src/types.ts` by hand. When one changes, change
the other in the same commit.

**Configuration, not code.** Where data comes from is decided by
`INZLY_DATA_SOURCE` and `VITE_API_TARGET`. Never hardcode a backend URL — that
is exactly what this setup replaced.

**Events.** Topics are `<noun>.<operation>`; envelopes are `{ type, ts, data }`.
`backend/schemas/*.json` is the source of truth for bodies.

**Speed and cost.** Category agents run on `claude-sonnet-5`; the Summary
Agent that synthesises them runs once per property on `claude-opus-5`, text
only. Ingestion-time work (category analysis) goes through the Batch API;
a property view reads the precomputed `PropertySummaryResult` — no model call
in that path. Read
[docs/SPEED_AND_COST.md](docs/SPEED_AND_COST.md) before changing either tier.

**Permits.** `permits-fetcher` puts building permits on record, and the photo
agents use them to corroborate what they see — see
[docs/PERMITS.md](docs/PERMITS.md). Shovels reports money in cents.

**Photo analysis.** The expert vision agents in
`backend/packages/photo-analyst/src/agents/` carry rules that each fix an
observed failure — read [docs/PHOTO_ANALYSIS.md](docs/PHOTO_ANALYSIS.md) before
editing a prompt. Photos are cached across agents; making the prompt prefix vary
per agent is a silent cost regression.

**Secrets.** Never commit real values. Both halves ship `.env.example`.

## Agents

`.claude/agents/` holds specialists for this codebase: `frontend-ui`,
`platform-services`, `photo-agents`, `api-contract`, `data-integration`,
`db-schema`. Use them for work squarely in their area; they carry the
conventions above.
