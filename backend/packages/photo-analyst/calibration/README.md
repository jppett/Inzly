# Calibration data

Reviewed houses, used as the standard the agents are tuned against. See
[docs/CALIBRATION.md](../../../../docs/CALIBRATION.md) for the workflow.

## Files

- `<label>.photos.txt`  — one photo URL per line, `#` for comments
- `<label>.bundle.json` — an analysis run, packaged for review
- `<label>.golden.json` — a professional's verdicts on that run

Bundles are regenerated freely. **Golden files are the valuable artifact** —
they represent someone's time and are what makes a brief change measurable.
Commit them.

## Houses ready to analyse

All photo URLs verified reachable.

| Label          | Property                            | Photos |
| -------------- | ----------------------------------- | ------ |
| `camden`       | the house the old agents analysed   | 30     |
| `noble-cir`    | 10552 Noble Cir N, Brooklyn Park    | 33     |
| `wooddale-ave` | 155 Wooddale Ave, Wayzata           | 66     |
| `tonkawood-dr` | 15760 Tonkawood Dr, Minnetonka      | 47     |
| `oliver-ave`   | 3550 Oliver Ave N, Minneapolis      | 16     |
| `sherwood-ave` | 675 Sherwood Ave, Saint Paul        | 30     |

**Start with `camden`.** The previous generation of agents analysed that exact
house, and their output is preserved in
`backend/discovery/expert-agents/camden.json` — so it is the one property where
old and new findings can be set side by side on identical photographs.

`oliver-ave` is the cheapest to iterate on at 16 photos; `wooddale-ave` at 66 is
the most expensive and the best test of whether the agents stay disciplined when
given a lot to look at.

## Before spending

```bash
pnpm --filter @bones-report/photo-analyst review \
  --label noble-cir --photos calibration/noble-cir.photos.txt --dry-run
```

Reports photo count and model calls without sending anything.
