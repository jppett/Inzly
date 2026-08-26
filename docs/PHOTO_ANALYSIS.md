# Photo analysis

The `photo-analyst` service reads a property's listing photographs and produces
the findings the product app shows to buyers. This document covers what it does,
why the agent instructions are written the way they are, and what to watch.

## What it replaces

Two things existed before, and neither was what the product needed.

**The front end's `POST /api/properties/:id/analyze`** was labelled AI analysis
but never looked at a photograph. It sent the model text — address, year built,
bed and bath counts, the listing blurb — and asked for "4-7 realistic insights
based on the property age, location, and typical issues for homes of this era".
The markers on the photos came from a hardcoded table: anything categorised
"roof" was pinned to the hero image at (50, 20), anything "plumbing" to the
kitchen at (40, 65). Plausible generalisations about houses of that vintage,
positioned at fixed coordinates.

**`discovery/expert-agents/camden.json`** is the output of a real vision system —
12 category agents, 96 insights, each citing a specific Zillow photo with a
genuine description of what was in it. That was the right idea. Only the output
survived; the code that produced it was not in either source repository.

This service rebuilds that idea, with the problems in that output fixed.

## What was wrong with the previous output

Read from the 96 insights in `camden.json`:

**Severity was miscalibrated to the point of being misleading.** All 8 findings
marked `critical` were trivial: seven were single-pane or non-Low-E windows, and
one was a missing dishwasher. Meanwhile real defects sat at `warning`. An agent
who opens a report, sees "critical", and finds it means "no dishwasher" stops
trusting the whole report — and the one time it says critical about a foundation,
they will not act on it.

**58% of observations hedged.** "The windows appear to be double-hung", "may
indicate", "suggests", "could lead to". The model was looking at a photograph and
still writing as though guessing. Hedged observations are unusable: the reader
cannot tell what was seen from what was surmised.

**Multi-run aggregation was never reconciled.** Five runs of the windows agent
produced `overallRating: "fair|fair|good|fair|fair"` — the values string-joined
rather than resolved. `confidence` had the same shape. `summary` was five
near-identical paragraphs concatenated. The windows category carried 24 insights,
most of them the same handful of observations restated.

**Fields the product needs were absent.** No `title` (0/96), no `costEstimate`
(0/96), no `category` on the insight, no photo region — so no way to place a
marker, which is why the front end had that hardcoded coordinate table.

**Positive findings were structurally lost.** Agents emitted `severity` of
`critical`/`warning`/`info` plus a separate `sentiment` field. The product's
severity vocabulary is `critical`/`warning`/`info`/`good`. The 35 positive
findings arrived as `severity: "info", sentiment: "positive"` and rendered as
neutral. A report that structurally cannot say "this is good" is not a fair
report of a house.

## How the instructions address that

The agent prompts live in `backend/packages/photo-analyst/src/agents/`:
`rubric.ts` is shared by every agent, `definitions.ts` holds the 14 specialist
briefs.

**Observation and inference are separate fields.** `observed` takes only what is
literally visible and forbids hedging words outright; `inference` takes what it
implies and is where uncertainty belongs. This is the single highest-leverage
change — it makes the model commit to what it saw, and gives the reader two
things they can weigh separately. The UI shows the observation under "In the
photos:".

**Severity is defined by consequence, with worked examples at the boundary.**
The rubric states outright that single-pane windows are `info` when intact and
never `critical`, and that a missing appliance is `info` — the two exact errors
from the previous output. Positive findings are required, not optional.

**`good` is in the severity enum.** No separate sentiment field to lose.

**Every insight must cite a photo.** No evidence, no insight. The runner enforces
this too: findings citing a photo id that was not in the manifest are dropped
before storage, which catches the model inventing a reference.

**Evidence carries a region.** `{x, y, width, height}` as percentages, so markers
land where the model actually looked. The hardcoded coordinate table is gone.

**`not_visible` is a first-class answer.** Most categories genuinely are not
visible in a listing set — you cannot assess electrical with the panel cover on,
and the rubric says so. Making "I can't see this" a correct answer is what stops
the model manufacturing findings to fill the schema.

## Reconciliation

Multiple runs are worth having; concatenating them is not. `services/reconcile.ts`
resolves them:

- **rating** — median across runs, one value.
- **confidence** — capped by how much the runs actually agreed. Runs that
  disagree are collectively less trustworthy than any one of them claims.
- **summary** — taken from the run whose rating matched the verdict. One
  paragraph.
- **insights** — deduplicated by photo plus title overlap. Corroboration across
  runs *raises confidence* rather than producing a duplicate row, and the more
  serious severity wins, on the reasoning that a run which saw damage saw
  something.
- **provenance** — `runs` and `agreement` are recorded, so disagreement is
  visible instead of pasted into the output.

Against the real camden data, `fair|fair|good|fair|fair` reconciles to `fair`
with 0.8 agreement, and 10 window insights collapse to 1 at raised confidence.

## Cost

The photos are identical across all 14 agents, so they are sent once and cached:
the shared rubric sits in `system` with a cache breakpoint, the images and the
photo manifest come first in the user message with a second breakpoint, and only
the category brief varies after it. The first agent writes the cache and is run
alone before the rest specifically so that write lands before the others read.

`runs` is per agent in `definitions.ts`. Foundation and roof run twice, because a
missed structural problem is the expensive kind of miss; everything else runs
once. Raise it deliberately — every run is a full pass over the photos.

`VISION_EFFORT` (`low` … `max`) and `maxPhotos` (default 20) are the other two
levers.

The handler checks for an existing report before analysing, because events
redeliver and this is the most expensive step in the pipeline.

## Running it

```bash
cd backend

# No credentials — deterministic mock, whole pipeline works
pnpm --filter @bones-report/photo-analyst analyse <photo-url> [photo-url...]

# Real analysis
export ANTHROPIC_API_KEY=...
pnpm --filter @bones-report/photo-analyst analyse <photo-url> [photo-url...]

# One category, for tuning a brief
pnpm --filter @bones-report/photo-analyst analyse --category roof <photo-url>
pnpm --filter @bones-report/photo-analyst analyse --list
```

The CLI needs no Redis, Kafka or running stack. Use it when editing a brief: run
before, edit, run again on the same photos, compare.

## Permit corroboration

Where building permits are on record, each agent receives the ones bearing on
its category, and is told not to estimate the age of anything a permit covers.
A roof permitted in 2023 is three years old whatever the shingles look like, and
a genuine conflict between photo and record becomes a finding in its own right.
See [PERMITS.md](PERMITS.md).

## Calibrating it

Judging whether a brief is working by reading a few findings does not scale and
is not repeatable. [CALIBRATION.md](CALIBRATION.md) describes the loop: run the
agents on a house, have a working agent review every finding in a walkthrough
page, and score future runs against those verdicts. Overstated and understated
severity are tracked separately, because they are different failures.

## Watch for

- **Photo URLs must be publicly reachable.** Images are passed by URL, so an
  expiring or authenticated MLS URL will fail at the model, not at fetch time.
- **Address matching is fragile.** MLS results are joined to address requests by
  normalised address string. This is the same weakness noted in
  `INTEGRATION.md`; a real listing key would fix both.
- **The model is not an inspector, and the rubric says so.** Findings are what is
  visible in marketing photographs, which are chosen to flatter. Absence of a
  finding is not evidence of absence of a problem, and the product copy around
  these results should not imply otherwise.
