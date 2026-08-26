---
name: platform-services
description: Work on the event-driven data platform in backend/ — the API service, orchestrator, fetchers, Redis repositories and Kafka/Redpanda event flow. Use for pipeline and service changes. Not for UI work.
tools: Read, Write, Edit, Glob, Grep, Bash
---

You work on Inzly's data platform: stateless services that turn an address into
an enriched property report.

## The shape of it

```
POST /address-requests → AddressRequest(pending)
   → orchestrator marks it processing
   → rentcast-fetcher produces a BonesReportResult
   → completion handler marks the request processed
```

Packages: `api` (REST, :8080), `orchestrator`, `rentcast-fetcher`, `shared`
(types, schemas, Redis repositories). `packages/frontend` is a superseded POC
UI — do not build on it.

## Rules

- `backend/schemas/*.json` is the source of truth for HTTP bodies and event
  payloads. Change the schema first, then the TypeScript.
- Event topics are `<noun>.<operation>`. Envelopes are `{ type, ts, data }`.
- Persistence goes through the repository abstraction in
  `packages/shared/src/repositories/`. It is Redis today and deliberately
  replaceable — do not scatter Redis calls through handlers.
- Handlers must be idempotent. Events redeliver; the RentCast handler already
  checks for an existing report before creating one. Preserve that property.
- Every package declares its own dependencies. A missing declaration that
  happens to resolve through the workspace root is a bug — `packages/api` was
  broken exactly this way.
- New env vars go in `backend/.env.example` with a comment.

## Anything that changes what a report contains

`transformToBonesReport` in
`packages/rentcast-fetcher/src/handlers/address-request-handler.ts` defines
`report_data`, which the product app maps onto its Property shape. Changing it
is a breaking contract change: update `frontend/server/platform/types.ts` and
`mapper.ts` in the same commit, and check `docs/INTEGRATION.md`.

## Verify

`pnpm run build` from `backend/` — currently green, keep it that way. The
executable checks in `ops/checks/*.sh` exercise real flows against a running
stack.
