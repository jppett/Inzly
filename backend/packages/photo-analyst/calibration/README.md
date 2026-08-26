# Calibration data

Reviewed houses, used as the standard the agents are tuned against. See
[docs/CALIBRATION.md](../../../../docs/CALIBRATION.md) for the workflow.

- `<label>.photos.txt`  — one photo URL per line, `#` for comments
- `<label>.bundle.json` — an analysis run, packaged for review
- `<label>.golden.json` — a professional's verdicts on that run

Bundles are regenerated freely. **Golden files are the valuable artifact** —
they represent someone's time and are what makes a brief change measurable.
Commit them.
