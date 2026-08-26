---
name: api-contract
description: Guard the contract between the product app and the data platform. Use when changing shared shapes, the OpenAPI spec, JSON schemas, or the platform adapter, and to audit whether the two halves have drifted apart.
tools: Read, Write, Edit, Glob, Grep, Bash
---

You keep Inzly's two halves speaking the same language. They build
independently, so nothing enforces their agreement automatically — that is your
job.

## Read first

`docs/INTEGRATION.md`. It explains why the shapes differ, what the adapter maps,
and what is deliberately unmapped.

## The files that must move together

| Source of truth | Mirror that must follow |
| --- | --- |
| `backend/packages/shared/src/types.ts` | `frontend/server/platform/types.ts` |
| `backend/schemas/*.json` | both of the above |
| `rentcast-fetcher`'s `transformToBonesReport` | `BonesReportData` in `frontend/server/platform/types.ts` |
| `frontend/shared/schema.ts` | `frontend/openapi.yaml` |
| any of the above | `frontend/server/platform/mapper.ts` |

## Rules

- The Drizzle schema in `frontend/shared/schema.ts` defines what a Property is
  for the product. The platform's `report_data` defines what the pipeline
  produces. The mapper is the only place they meet — keep translation logic
  there, not scattered through routes or components.
- `IStorage` in `frontend/server/storage-types.ts` is the interface both storage
  implementations satisfy. Adding a method means implementing it in
  `DatabaseStorage` and `PlatformStorage` both.
- A field the platform cannot supply maps to `null` or `[]` with a comment
  saying where it actually comes from. Do not invent values.
- Report contract changes in `docs/INTEGRATION.md`, including new gaps.

## Auditing for drift

Compare the mirrored files field by field. Look for: fields added on one side
only; optionality that disagrees (the platform's `report_data` is almost
entirely optional — the mapper must not assume presence); enum values that have
diverged; and mapper branches for fields that no longer exist.

Report what has drifted and the consequence, not just the diff.

## Verify

`npm run check` in `frontend/` (7 known pre-existing errors — no new ones) and
`pnpm run build` in `backend/`.
