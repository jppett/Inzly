# Speed and cost: tiered models, the Summary Agent, and why "instant" means precomputed

Three changes, one architecture. Recorded together because they only make
sense together: tiering models cuts cost, batching cuts it further, and both
only work because the Summary Agent turns "many category calls" into "one
report" that a property view can read instantly.

## The tension this resolves

The Batch API and "click and it's there" pull in opposite directions. Batch
processing has no delivery-time guarantee — Anthropic's only commitment is
"within 24 hours," typically much faster in practice, but never something to
promise a browser tab. You cannot route a request through it and also have it
appear the moment someone clicks.

The resolution is to stop treating those as the same request. **Analysis
happens at ingestion time, when photos and permits first arrive and no one is
waiting. A property view is a database read.** That split isn't a workaround —
it's how every "instant" real-estate search actually works. Zillow doesn't
analyze a listing when you click it; it's already indexed by the time you
search. The `AddressRequest: pending → processing → processed` lifecycle
already modeled this before any of the below existed — this makes the photo
pipeline follow the same shape RentCast and MLS already do.

## The pipeline

```
AddressRequest → processing
      │
      ├── permits-fetcher   → PermitHistoryResult
      ├── rentcast-fetcher  → BonesReportResult
      └── MLSListingResult (photos)
                │
                ▼
          photo-analyst          14 category agents, claude-sonnet-5
            (Batch API)          bounded visual judgment against a rubric
                │
                ▼
          PropertyInsightsResult
                │
      ┌─────────┴─────────┐
      │                   │
PropertyInsightsResult   PermitHistoryResult
      │                   │
      └─────────┬─────────┘
                ▼
        orchestrator: SummaryTriggerHandler
        (fires once both exist)
                │
                ▼
          Summary Agent           one call, claude-opus-5, text only
                │                 full permit history + every finding
                ▼
        PropertySummaryResult  ←── the product app reads only this
```

A property view calls `GET /api/properties/:id`, which reads
`PropertySummaryResult` — no model call sits in that path. Whatever ran to
produce it, ran earlier.

## Tiered models

Category agents moved from `claude-opus-5` to `claude-sonnet-5` — 2.5x
cheaper on both input and output. This is a reasonable trade because of what
each tier is actually being asked to do:

- **Category agents** work within a fixed rubric that already has worked
  examples for where judgment tends to go wrong (see `docs/PHOTO_ANALYSIS.md`).
  Bounded, well-specified visual classification is not where the top model
  tier earns its price.
- **The Summary Agent** does the one thing with no rubric to lean on:
  reasoning across fourteen independent reports and a permit history to decide
  what actually matters. That's real synthesis, and it stays on Opus.

Override per-agent in `packages/photo-analyst/src/agents/definitions.ts`
(`ExpertAgent.model`) if calibration shows a specific category needs more —
`CATEGORY_MODEL` sets the default for everything else.

**This has not been re-validated against the calibration data.** Camden's
numbers (56 findings, 2% hedging, correct severity calls — see
`docs/CALIBRATION.md`) were produced on Opus. Re-run Camden on Sonnet and score
it against the same expectations file before trusting this in production; the
harness for that already exists.

## Batch API

`AnthropicVisionProvider.analyzeBatch()` submits every category-agent request
as one Message Batch — 50% off standard pricing, in exchange for no delivery
SLA. `PhotoAnalyst.analyseBatch()` builds the same requests `analyse()` does
(same `buildRequest`, same `reconcileCategory`, same cap and summary logic —
the only thing that differs is submission), so nothing about calibration
changes by switching paths.

**One caching tradeoff worth knowing.** The live path deliberately runs the
first agent alone to seed the prompt cache before the rest read it — that's
where the 96% cache-hit rate measured on Camden came from. A batch has no such
ordering guarantee; Anthropic may process items in parallel. The 50% batch
discount applies regardless of caching, but don't expect the live path's cache
numbers to carry over — treat any caching on top of the discount as a bonus,
not something to plan around.

Providers that don't implement `analyzeBatch` (the mock, currently) fall back
to running the same requests sequentially through `analyze()` — batching is a
cost optimization the analyst runner degrades out of gracefully, never a
requirement callers branch on.

**Not yet run live.** The request construction and response parsing are
identical to the already-verified live path (same two methods, `buildParams`
and `parseResponse`), so the risk surface is the polling loop and result
iteration — both written directly against the installed SDK's type
definitions. Worth one supervised live run before this carries real traffic.

## The Summary Agent

`packages/photo-analyst/src/summary/`. Takes every category finding (id,
title, severity, confidence, cost) and every category assessment, plus the
**full** permit history — not the per-category slice each vision agent sees —
and produces:

- `headline` / `overallAssessment` / `overallCondition` — the report
- `topConcerns` / `topPositives` — a curated few, not the raw union of every
  category's findings
- `corroboration` — where a permit and a finding confirm, contradict, or
  merely inform each other, reasoned across categories a single agent never
  saw together (a roof permit and a landscaping drainage finding, both
  bearing on foundation moisture, are exactly the pattern this step exists to
  catch)

It selects findings by id rather than re-emitting them, which is what keeps it
cheap: no images, and the output is small relative to what it read. On Camden
(56 findings, 0 permits matched) one call ran 63 seconds and correctly
reasoned "no permits on record" as context rather than manufacturing false
corroboration.

Triggered by `orchestrator`'s `SummaryTriggerHandler`, listening for
`PropertyInsightsResult.create` and `PermitHistoryResult.create`. Deliberately
independent of `AddressRequest.processed` — that status predates photos and
permits, other things already key off it, and RentCast + MLS are typically
ready well before photo analysis finishes. Making `processed` wait on the
summary would slow down a signal nothing asked it to depend on.

## What "instant" still cannot promise

None of this makes analysis instant for an address that has never been seen
before. Precomputation only works when there's something to precompute against
— a corpus continuously ingested ahead of any search, the way MLS-fed sites
actually populate their catalogs. For a genuinely new address, the honest
choices are:

1. **Continuous pre-ingestion** — properties enter the pipeline as they hit
   the market, analysis runs on batch/ingestion time as above, and by the time
   anyone searches, the report is already sitting there. This is the real
   Zillow model, and it's what the rest of this document assumes.
2. **A visible "analyzing" state** for the rare on-demand address — the
   `AddressRequest.status` lifecycle already carries `pending → processing →
   processed`; the frontend does not yet poll it (a gap noted in
   `docs/INTEGRATION.md`). Closing that gap is what makes an on-demand search
   honest rather than a spinner with no state behind it.

These aren't mutually exclusive. Which one matters depends on whether "search"
in the product means "look up something already in the catalog" or "go find
out about an address nobody has asked about yet" — a product decision, not an
architecture one.
