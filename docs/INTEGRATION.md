# Integration: connecting the product app to the data platform

The two halves of Inzly model property data differently, on purpose. This
document describes the seam between them, what is wired today, and what still
has to be decided as real data connections come online.

## The mismatch, stated plainly

The **platform** (`backend/`) is request-oriented. You submit an address; a
pipeline processes it; a report appears:

```
AddressRequest { id, address, status: pending|processing|processed|failed }
    └── BonesReportResult { id, address_request_id, report_data, status }
MLSListingRequest → MLSListingResult { listing_data: { address, price, bedrooms, photo_urls } }
```

The **product app** (`frontend/`) is property-oriented. The UI renders a home:

```
Property { id, address, city, state, zip, price, beds, baths, sqft, yearBuilt,
           description, foundlyScore, images[], priceHistory[], schools[] }
    └── Issue[] { title, description, severity, category, costEstimate, imageLocation }
```

Neither is wrong. An address request is a *job*; a property is a *thing*. The
adapter's job is to present completed jobs as things.

## Where the seam lives

```
        browser
           │  VITE_API_TARGET / VITE_API_BASE_URL
           ▼
  frontend/server  (Express BFF)          ← INZLY_DATA_SOURCE decides the source
           │
     ┌─────┴─────┐
     ▼           ▼
 Postgres    frontend/server/platform/
 (database)      ├── client.ts   typed HTTP client for the platform REST API
                 ├── mapper.ts   report_data ─→ Property
                 └── storage.ts  PlatformStorage implements IStorage
                         │
                         ▼
                 backend/packages/api  (:8080)
```

Both storage implementations satisfy the same `IStorage` interface
(`frontend/server/storage-types.ts`), so the API routes never learn which one
they are talking to. Selection happens once, in `frontend/server/storage.ts`.

## What the adapter maps today

`mapReportToProperty()` in `frontend/server/platform/mapper.ts` translates a
completed `BonesReportResult` into a `Property`:

| Property field  | Source                                                        |
| --------------- | ------------------------------------------------------------- |
| `id`            | `AddressRequest.id` — the stable id the UI routes on           |
| `address`       | `report_data.address`, parsed; falls back to the request text  |
| `city/state/zip`| `report_data.location`, falling back to the parsed address     |
| `price`         | `report_data.estimatedValue`, else the MLS listing price       |
| `beds`          | `report_data.bedrooms`, else MLS `bedrooms`                    |
| `baths`         | `report_data.bathrooms`                                        |
| `sqft`          | `report_data.squareFootage`                                    |
| `yearBuilt`     | `report_data.yearBuilt`                                        |
| `description`   | composed from property type, neighborhood and size             |
| `priceHistory`  | `report_data.propertyHistory`, sale events only, keyed by year  |
| `images`        | MLS `photo_urls`, matched to the request by normalized address  |
| `features`      | property type and lot size (the UI shows only non-null fields)  |
| `analytics`     | rent estimate, market metrics, comparables, investment score    |
| `images`        | replaced by the analyst's photo manifest when insights exist, so evidence photo ids match image ids and markers land correctly |
| `foundlyScore`  | derived from photo-analysis findings when they exist             |

Platform-only analytics are carried through on `analytics` rather than dropped.
The UI does not render them yet; the data is there when it should.

## What is deliberately *not* mapped

Three things the platform does not produce, and where they come from instead:

**Issues.** Now produced by the platform. The `photo-analyst` service reads the
listing photographs and emits `PropertyInsightsResult`, which the adapter maps
onto Issue rows — see [PHOTO_ANALYSIS.md](PHOTO_ANALYSIS.md). In `platform` mode
`getIssuesByPropertyId` returns those findings, falling back to Postgres when a
property has none, so properties analysed by the older text-only endpoint keep
rendering during rollout.

The front end's `POST /api/properties/:id/analyze` still exists and is still
text-only — it never looked at a photo. It is superseded by the platform
pipeline and should be retired once photo analysis is live for real listings.

**The Inzly Score.** Derived from the photo-analysis findings by
`scoreFromInsights()` — severity-weighted and softened by low confidence — and
`null` when no analysis exists. (The database column is still named
`foundlyScore` from an earlier product name; renaming it is a migration.)

**Schools.** Mapped as `[]`. No platform source exists yet.

Users, sessions and saved homes are likewise always Postgres, in every mode.

## Open questions for when real data lands

These need a decision, and the answer changes the mapping:

1. **`price` semantics.** The UI labels it as the list price; the platform
   supplies an *estimated value*. Once MLS is live, list price should probably
   win, with the estimate shown alongside rather than in place of it.
2. **Address matching to MLS.** Currently a normalized-string match. Fine for a
   POC, fragile in production — worth a real address key (or the platform
   emitting the MLS id on the report).
3. **Polling vs. push.** `createProperty` submits an address request and returns
   a pending shell. The UI has no polling loop yet; the platform has no webhook.
   One of the two has to give.
4. **Issue provenance.** Platform findings and the older text-only insights now
   both land in the same Issue shape with nothing distinguishing them. A source
   field would let the UI say where a finding came from — and let the text-only
   ones be retired cleanly.
5. **Auth.** The platform API is currently unauthenticated. `PlatformClient`
   already sends `Authorization: Bearer` when `PLATFORM_API_KEY` is set; the
   server side does not check it yet.

## Keeping the contract in sync

The platform's wire types are duplicated in
`frontend/server/platform/types.ts` rather than imported, because the two halves
build independently. The sources of truth they mirror:

- `backend/packages/shared/src/types.ts` — entity shapes
- `backend/schemas/*.json` — JSON Schema for HTTP bodies and events
- `backend/packages/rentcast-fetcher/src/handlers/address-request-handler.ts` —
  the `transformToBonesReport` method, which defines what `report_data` actually
  contains
- `frontend/openapi.yaml` — what the product app expects to consume

When you change a shape on one side, change it on the other in the same PR. The
`api-contract` agent in `.claude/agents/` exists to catch drift.

## Trying it end to end

```bash
# terminal 1 — platform
cd backend && docker compose up -d && pnpm run dev

# terminal 2 — product app against the platform
cd frontend
INZLY_DATA_SOURCE=platform PLATFORM_API_URL=http://localhost:8080 \
VITE_API_TARGET=platform npm run dev

curl localhost:5000/api/data-source     # confirm which source is live
curl -X POST localhost:8080/address-requests \
  -H 'content-type: application/json' -d '{"address":"123 Maple Dr, Austin, TX 78701"}'
curl localhost:5000/api/properties      # the request appears, then fills in
```

Without a `RENTCAST_API_KEY` the fetcher uses its deterministic mock, so this
works with no third-party credentials.
