# Known issues

Problems inherited with the imported code, recorded here so nobody rediscovers
them the hard way. None block development; all are worth fixing deliberately.

## `frontend` — 7 pre-existing type errors

`npm run check` (`tsc --noEmit`) in `frontend/` reports 7 errors. All predate
the import and none stop the build, which uses esbuild and Vite rather than
`tsc`. Verified against the original Replit tree at import time.

| File | Problem |
| ---- | ------- |
| `server/seed.ts:261` | Seed data uses the old `images: { hero, living, kitchen, backyard }` object shape; the schema now expects `Array<{ id, url, label }>`. **The seed script will fail against the current schema** — this is the one with real consequences. |
| `server/storage.ts` (`createIssue`) | `severity` is typed `string` but the column expects the `critical\|warning\|info\|good` union. |
| `server/replit_integrations/batch/utils.ts` ×2 | `p-retry` v7 no longer exports `AbortError` as a property. |
| `server/replit_integrations/image/client.ts` ×2, `image/routes.ts` | `response.data` is possibly `undefined` and is not guarded. |

Fixing `seed.ts` means rewriting the seed fixtures to the array shape — a data
change, not a type change, which is why it was left alone during the import.

## `backend` — fixed during import

Two things were broken on arrival and repaired, because they stopped the code
from building at all:

- `packages/api` used `zod` without declaring it. Added to its dependencies.
- `packages/frontend` had 4 strict-null errors and an unused import that failed
  `tsc`. Fixed in place.

`pnpm run build` at `backend/` is green as of the import.

## Naming drift

- The database column and API field are `foundlyScore`; the product calls it the
  **Inzly Score**. Renaming is a migration plus an API change, so it was left as
  is.
- `frontend/package.json` is still named `rest-express`, and `backend/`'s root
  package is `bones-report`, with a `repository` field pointing at
  `dkjosbru/bones-report`.

## The text-only "AI analysis"

`POST /api/properties/:id/analyze` in the front end is labelled AI analysis but
never looks at a photograph. It sends the model the address, year built, room
counts and listing blurb, and asks for "realistic insights based on the property
age, location, and typical issues for homes of this era". The markers it places
on photos come from a hardcoded lookup table — anything categorised "roof" is
pinned to the hero image at (50, 20).

It is superseded by the `photo-analyst` service (see
[PHOTO_ANALYSIS.md](PHOTO_ANALYSIS.md)) and left running so the app keeps working
during rollout. Retire it once photo analysis is live against real listings.

## Superseded code

`backend/packages/frontend` is the POC UI that the app in `frontend/` replaces.
It still builds and is part of the workspace build. Removing it is safe once you
are sure nothing references it.
