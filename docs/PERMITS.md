# Permit history

Building permits are a fact about a house that photographs cannot give you. The
`permits-fetcher` service puts them on record, and the photo agents use them to
corroborate or contradict what they think they see.

## Why this matters

A vision agent looking at a roof can estimate its age from granule loss, cupping
and colour. It will often be roughly right and occasionally badly wrong, and it
has no way to tell which. A permit removes the guess:

```
2023-09-19 — Reroof/tearoff house & detached garage, declared value $29,449
```

That roof is three years old. Any finding resting on it being near end of life
is simply wrong, and the agent is now told so before it writes anything.

The reverse case is more interesting. When the photographs genuinely conflict
with the record, that is itself a finding worth reporting — *"the record shows a
2023 tear-off, but these shingles show wear consistent with an older covering;
either the photos predate the work or it did not cover this section"* — and it is
the kind of observation an agent walking a client through a house would actually
make.

## How it flows

```
AddressRequest → processing
      │
      ├── permits-fetcher   → PermitHistoryResult   (Shovels, or the fixture)
      └── rentcast-fetcher  → BonesReportResult
                    │
              MLSListingResult (photos)
                    │
                    ▼
              photo-analyst
                reads permit history for the address request
                hands each agent the permits bearing on its category
                    │
                    ▼
              PropertyInsightsResult
```

Permits are an enrichment, never a gate: if the lookup fails or finds nothing,
analysis proceeds without them.

## Mapping permits to agents

Shovels tags work with labels like `roofing`, `plumbing`, `window_door`.
`PERMIT_TAG_CATEGORIES` in `backend/packages/shared/src/permits.ts` maps those
onto Inzly's insight categories, and a tag may map to several — a `remodel`
permit bears on cabinetry, countertops, flooring, tile and wall finishes.

Each agent receives only the permits for its own category, appended to its
brief. That placement is deliberate: the brief sits *after* the prompt cache
breakpoint, so per-category permit text does not make the photo prefix vary and
force a re-upload of every image.

**The mapping is lossy in one known way.** The `window_door` tag covers both,
so a permit for a fire-rated garage door reaches the windows agent. The
description is passed through verbatim, so the model can see what the work
actually was, but it is noise. A tighter mapping would need to read the
description, not just the tag.

## Two details that will bite

**Job values are in cents.** Shovels reports that reroof as `2944900`. Read as
dollars it becomes $2.9M — a routine roof replacement priced like a mansion.
`normalizePermit` divides by 100; anything else consuming Shovels directly must
do the same.

**Absence proves nothing.** Plenty of work happens without a permit, and
coverage varies by jurisdiction. The rubric tells agents never to report a
missing permit as a defect. Resist the temptation to treat permit coverage as a
maintenance score.

## Running it

```bash
cd backend

# Look up permits for an address and see which agents each one reaches
pnpm --filter @bones-report/permits-fetcher lookup "407 Turners Xrd N, Golden Valley, MN"

# Analyse photos with permit corroboration
pnpm --filter @bones-report/photo-analyst analyse \
  --address "407 Turners Xrd N, Golden Valley, MN" <photo-url>...
```

Without `SHOVELS_API_KEY` both use `MockPermitsAPI`, which serves a **real
captured Shovels response** — 27 genuine permits for 407 Turners Xrd N spanning
2001 to 2023 — sampled deterministically by address hash. So permit-aware
behaviour can be exercised against realistic dates, values and tags with no
credentials, and the same address always yields the same history.

Set `SHOVELS_API_KEY` to go live. `SHOVELS_PERMIT_FROM` bounds how far back to
search (default 2000-01-01); older records get sparse.

## API

- `GET /permit-history` — list, `?address_request_id=` to filter
- `GET /permit-history/:id`
