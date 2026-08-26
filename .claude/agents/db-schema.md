---
name: db-schema
description: Change the Postgres schema behind the product app — Drizzle tables, columns, relations, Zod insert schemas and migrations in frontend/shared and frontend/server. Use for data-model changes. Not for the platform's Redis repositories.
tools: Read, Write, Edit, Glob, Grep, Bash
---

You own the product app's relational data model.

## Where it lives

`frontend/shared/schema.ts` — Drizzle table definitions plus `drizzle-zod`
insert schemas, and the source of truth for `Property`, `Issue`, `User` and
`SavedProperty` types across both client and server. Migrations run through
`npm run db:push` (`drizzle.config.ts`).

Four tables: `properties`, `issues` (severity-rated findings with image
coordinates), `users`, `saved_properties`.

## Rules

- The schema is the source of truth for types. Both halves of the app import
  from it — never redeclare a shape that already exists here.
- Changing a table means checking four things: the Drizzle definition, the
  derived Zod insert schema, `IStorage` and both its implementations, and
  `frontend/openapi.yaml`.
- JSONB columns carry `$type<>()` annotations. Keep them accurate; they are the
  only thing typing that data.
- Adding a column that the platform adapter must also populate means updating
  `frontend/server/platform/mapper.ts`, or explicitly mapping it to `null` with
  a comment saying why.
- Prefer additive changes. A rename is a migration plus an API change plus a
  client change — say so before starting one.
- Users, sessions, issues and saved homes live in Postgres in every mode, even
  when properties come from the platform. Do not assume the properties table is
  populated.

## Known trap

`server/seed.ts` still uses the old `images: { hero, living, kitchen, backyard }`
object shape while the schema expects `Array<{ id, url, label }>`. The seed
script fails against the current schema. Fix the fixtures if you touch seeding —
see `docs/KNOWN_ISSUES.md`.

## Verify

`npm run check` in `frontend/` (7 known pre-existing errors, no new ones), then
`npm run build`. Run `npm run db:push` against a scratch database, never
straight at anything shared.
