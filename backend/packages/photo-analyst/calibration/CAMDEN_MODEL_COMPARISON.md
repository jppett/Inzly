# Camden: Opus vs Sonnet category agents

Same 30 photos, same rubric, same permit lookup. Only the category-agent model
changed. `camden-opus.bundle.json` and `camden-sonnet.bundle.json` are the raw
runs; this is the diff.

Run with:
```bash
pnpm --filter @bones-report/photo-analyst review --label camden --photos calibration/camden.photos.txt --address "Camden, Minneapolis, MN"
```

## Timing (live path, not batch)

|                        | Opus     | Sonnet   |
| ---------------------- | -------- | -------- |
| Category agents (19 calls, concurrency 4) | ~400–430s | 351s |
| Summary Agent (1 call, text-only)         | 63s       | 34s  |
| **Total, address to report**              | **~460–500s (~8 min)** | **~385s (~6.4 min)** |

Sonnet is faster as well as cheaper. Neither number describes the Batch API
path — batch has no delivery SLA and isn't meant to be timed against a click.

## What agreed

- **17/17 categories**, same rating direction on 15 of them.
- Both correctly returned zero critical findings.
- Hedging near-zero on both (2 hedged observations each) — the rubric's
  restraint rules hold on both tiers.
- Both Summary Agents independently zeroed in on the same thing: no water
  staining anywhere in the house, offered as evidence against chronic leaks.
  That's real cross-category reasoning surviving the model swap, not a
  templated response.

## What differed

**Two category ratings flipped** — `countertops` and `deck`, both fair→good
on Sonnet. In both cases Opus read ambiguity (couldn't confirm countertop
material; called out incidental porch/step details) as grounds for "fair,"
Sonnet read the same photos as clearly fine. Neither is obviously wrong from
the text alone — this is a confidence-calibration difference, not a factual
one, and it's exactly the kind of thing `docs/CALIBRATION.md`'s scoring
exists to settle rather than guess at.

**Cost estimates dropped by more than half**: 29/56 findings costed on Opus,
11/50 on Sonnet (52% → 22%). Sonnet is markedly more conservative about
attaching a price to an `info`-level finding — a dated but sound cabinet run,
a missing ceiling fixture, patterned sheet vinyl. Whether that's an
improvement is a real open question, not a settled one:

- It could be **better calibrated to the reviewer's own stated preference** —
  "I like the insight but it doesn't need a repair cost" was his exact
  complaint about the previous generation of agents.
- It could be **under-delivering** on the product's core promise — Inzly
  exists to surface hidden costs, and a cost the reviewer would have wanted
  priced is now silently absent rather than flagged as wrong.

This needs the reviewer's eye, not mine. It is the first thing to check
against `professional-notes.md` on a house he actually reviewed.

**7 findings total moved between silent and reported** across the two runs —
one model's warning is sometimes the other's unreported info, on both sides.
Overlapping-but-not-identical wording throughout (expected; nothing in the
rubric asks for literal phrase agreement).

## Reading this

15/17 identical category ratings and near-zero hedging on both tiers is a
genuinely reassuring result — nothing about switching to Sonnet broke the
restraint work. The cost-estimate gap is the one finding here that should
gate the decision, not just inform it: re-run this against Noble's structured
expectations file (`noble-cir.expectations.json`) before treating Sonnet as
the default in production. That file has real severity and cost judgments
from the reviewer to score against, which this comparison — Opus vs Sonnet
with no human ground truth — cannot provide on its own.
