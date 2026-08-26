# Calibrating the agents against professional judgement

Agent quality is not something to argue about in the abstract. This is the loop
that turns "that severity is wrong" into a measured, repeatable number.

The principle: **a working real estate professional walks a house's findings and
says what they would actually tell a client. Those calls become the standard.**
Every subsequent change to the agent briefs is scored against them, so a prompt
edit either measurably improves calibration or it does not.

## The loop

```
  run agents  →  review page  →  verdicts  →  score  →  edit briefs  →  run again
       ▲                                                                    │
       └────────────────────────────────────────────────────────────────────┘
```

### 1. Run

```bash
cd backend
export ANTHROPIC_API_KEY=...
pnpm --filter @bones-report/photo-analyst review \
  --label "1247-camden-ave" \
  --photos calibration/camden.photos.txt
```

Writes `calibration/<label>.bundle.json` — every finding, with the photo and
region each is anchored to. A photo list is one URL per line; `#` comments are
ignored.

### 2. Review

```bash
pnpm --filter @bones-report/photo-analyst page \
  --bundle calibration/<label>.bundle.json --out review.html
```

Publish that page as an Artifact and walk it. Each finding shows the photograph
with the region the agent pointed at, what it says it saw, and what it inferred.
For each one the reviewer records:

- **Your call** — agree · wrong severity · not there · wouldn't mention it
- **Should be** — the correct severity, when severity is the problem
- **The money** — about right · too high · too low · shouldn't have a number ·
  needs a number
- **How you'd say it** — the finding in the reviewer's own words

And at the end, the part that matters most: **what did they miss?** Corrections
are cheap; misses are invisible to the agents otherwise and are the only signal
that catches a category of blindness rather than a calibration error.

Work is held in the browser as you go. **Save for Claude** publishes it back so
it can be read directly; **Download** exports the same thing as JSON.

### 3. Score

Save the verdicts as `calibration/<label>.golden.json`, then:

```bash
pnpm --filter @bones-report/photo-analyst score \
  --bundle calibration/<label>.bundle.json \
  --golden calibration/<label>.golden.json
```

```
  precision        84%  (findings judged real and material)
  severity right   71%  (of those judged real)

  overstated       9
  understated      2
  not real         4
  missed entirely  6

  severity bias    +0.62  — runs hot (overstates)

  cost             5/14 about right · 7 too high · 0 too low · 2 shouldn't have a number

  worst categories (most disagreement first):
    windows         3/9 agreed · 5 over · 0 under · 1 not real
```

**Overstated and understated are reported separately on purpose.** They are
different failures needing different fixes: overstating costs trust, understating
creates liability. A single "accuracy" number hides which one is happening.

`severityBias` gives the direction at a glance. Positive means the agents run
hot.

### 4. Edit, then re-run

Take the worst category, open its brief in
`backend/packages/photo-analyst/src/agents/definitions.ts`, and change the thing
the verdicts point at. Then re-run and re-score **against the same golden file**.
The numbers move or they do not.

The most effective edits are concrete, not exhortative. Adding "be more careful
about severity" does nothing. Adding "a worn but intact roof covering is
`warning`, not `critical`; reserve `critical` for visible sag or exposed
decking" moves the number — the existing briefs are written this way because
that is what works.

Verdicts on **how you'd say it** are the raw material for the rubric's voice
section. When several corrections read as the reviewer softening the agent's
language the same way, that is a rubric change, not fourteen brief changes.

## Keeping golden files honest

- Commit them next to the briefs they judge. They are the test suite.
- Record `reviewedModel` — a golden file collected against one model is still
  useful against another, but the comparison is no longer apples to apples.
- Re-review after a **contract** change (new fields, changed severity meanings).
  Prompt edits alone do not invalidate a golden file — that is the entire point.
- Two or three reviewed houses beat one. A single house cannot tell a general
  calibration error from something specific to that property.
- Don't tune until precision stops improving and only bias remains. Bias is a
  one-line rubric fix; low precision is a brief problem.

## What this cannot tell you

The score measures agreement with one professional's judgement on the houses
reviewed. It does not measure whether the findings are true, and it will happily
reward an agent that has learned that reviewer's particular preferences. Treat a
high score as evidence the agents are usable, not as evidence they are right.
