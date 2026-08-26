/**
 * Review page styling.
 *
 * Palette and type follow docs/BRAND.md — this is an Inzly tool, and it should
 * read like one. Severity colours are deliberately separate from the brand
 * accent so "this needs attention" never competes with "this is a control".
 */
export const PAGE_CSS = `
:root {
  --ground: #F7F8F6;
  --surface: #FFFFFF;
  --stone: #E5E7EA;
  --stone-soft: #EDEFEC;
  --ink: #2B2F33;
  --ink-soft: #5C6469;
  --ink-mute: #8A8F93;
  --slate: #1F2A33;
  --sage: #8FAEA3;
  --clay: #C47A5A;

  --sev-critical: #9E3B26;
  --sev-warning: #B5762F;
  --sev-info: #5E7183;
  --sev-good: #5F8A73;
  --sev-critical-bg: #F6E7E3;
  --sev-warning-bg: #F8EFE2;
  --sev-info-bg: #EAEEF1;
  --sev-good-bg: #E6EFE9;

  --focus: #1F2A33;
  --radius: 6px;
  --shadow: 0 1px 2px rgba(31, 42, 51, .06), 0 4px 14px rgba(31, 42, 51, .05);
}

:root:not([data-theme="light"]) {
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #16191C;
    --surface: #1E2328;
    --stone: #2E353B;
    --stone-soft: #262C31;
    --ink: #E8EAE7;
    --ink-soft: #B2B8BC;
    --ink-mute: #868C90;
    --slate: #C3CDD4;
    --sage: #8FAEA3;
    --clay: #D08F6F;

    --sev-critical: #E28A72;
    --sev-warning: #DDA766;
    --sev-info: #9FB2C2;
    --sev-good: #8FBAA1;
    --sev-critical-bg: #33201B;
    --sev-warning-bg: #33281A;
    --sev-info-bg: #222A31;
    --sev-good-bg: #1E2A24;

    --focus: #8FAEA3;
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --ground: #16191C;
  --surface: #1E2328;
  --stone: #2E353B;
  --stone-soft: #262C31;
  --ink: #E8EAE7;
  --ink-soft: #B2B8BC;
  --ink-mute: #868C90;
  --slate: #C3CDD4;
  --sage: #8FAEA3;
  --clay: #D08F6F;

  --sev-critical: #E28A72;
  --sev-warning: #DDA766;
  --sev-info: #9FB2C2;
  --sev-good: #8FBAA1;
  --sev-critical-bg: #33201B;
  --sev-warning-bg: #33281A;
  --sev-info-bg: #222A31;
  --sev-good-bg: #1E2A24;

  --focus: #8FAEA3;
  color-scheme: dark;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: "Source Sans 3", ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: "DM Sans", "Source Sans 3", system-ui, sans-serif;
  text-wrap: balance;
  margin: 0;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.mono {
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
}

.wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

/* ---- banner ---- */
.banner {
  background: var(--sev-warning-bg);
  border-bottom: 1px solid var(--stone);
  color: var(--ink);
  padding: 12px 0;
  font-size: 14px;
}
.banner strong { color: var(--sev-warning); }

/* ---- header ---- */
.head { padding: 34px 0 22px; border-bottom: 1px solid var(--stone); }
.eyebrow {
  font-size: 11px; text-transform: uppercase; letter-spacing: .1em;
  color: var(--ink-mute); font-weight: 600; margin-bottom: 8px;
}
.head h1 { font-size: 30px; margin-bottom: 6px; }
.head .sub { color: var(--ink-soft); max-width: 62ch; }

.tally { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.tally-item {
  display: inline-flex; align-items: baseline; gap: 6px;
  padding: 5px 11px; border-radius: var(--radius);
  font-size: 13px; font-weight: 600;
}
.tally-item span.n { font-size: 15px; }
.t-critical { background: var(--sev-critical-bg); color: var(--sev-critical); }
.t-warning  { background: var(--sev-warning-bg);  color: var(--sev-warning); }
.t-info     { background: var(--sev-info-bg);     color: var(--sev-info); }
.t-good     { background: var(--sev-good-bg);     color: var(--sev-good); }

/* ---- sticky progress ---- */
.bar {
  position: sticky; top: 0; z-index: 20;
  background: color-mix(in srgb, var(--ground) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--stone);
}
.bar-inner {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 0; flex-wrap: wrap;
}
.progress-track {
  flex: 1; min-width: 140px; height: 5px;
  background: var(--stone); border-radius: 3px; overflow: hidden;
}
.progress-fill {
  height: 100%; width: 0%; background: var(--sage);
  transition: width .3s ease;
}
.progress-label { font-size: 13px; color: var(--ink-soft); white-space: nowrap; }

button {
  font: inherit; cursor: pointer;
  border-radius: var(--radius);
  border: 1px solid var(--stone);
  background: var(--surface); color: var(--ink);
  padding: 7px 13px; font-size: 14px;
  transition: border-color .15s, background .15s;
}
button:hover { border-color: var(--ink-mute); }
button:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.btn-primary {
  background: var(--slate); color: var(--ground);
  border-color: var(--slate); font-weight: 600;
}
:root[data-theme="dark"] .btn-primary,
:root:not([data-theme="light"]) .btn-primary { color: var(--ground); }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .btn-primary { background: var(--sage); border-color: var(--sage); color: #16191C; }
}
.btn-primary:hover { opacity: .9; border-color: var(--slate); }

/* ---- category ---- */
.cat { margin: 40px 0 0; }
.cat-head {
  display: flex; align-items: baseline; gap: 12px;
  padding-bottom: 10px; margin-bottom: 18px;
  border-bottom: 1px solid var(--stone);
  flex-wrap: wrap;
}
.cat-head h2 { font-size: 19px; }
.rating {
  font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
  font-weight: 700; color: var(--ink-mute);
}
.cat-summary { color: var(--ink-soft); font-size: 14.5px; margin: -8px 0 18px; max-width: 68ch; }

/* ---- finding card ---- */
.card {
  background: var(--surface);
  border: 1px solid var(--stone);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 18px;
  overflow: hidden;
  border-left: 3px solid var(--stone);
}
.card[data-sev="critical"] { border-left-color: var(--sev-critical); }
.card[data-sev="warning"]  { border-left-color: var(--sev-warning); }
.card[data-sev="info"]     { border-left-color: var(--sev-info); }
.card[data-sev="good"]     { border-left-color: var(--sev-good); }
.card[data-done="1"] { opacity: .62; }
.card[data-done="1"]:hover { opacity: 1; }

.card-body { display: grid; grid-template-columns: 300px 1fr; gap: 0; }
@media (max-width: 760px) { .card-body { grid-template-columns: 1fr; } }

.shot { position: relative; background: var(--stone-soft); min-height: 200px; overflow: hidden; }
.shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
.region {
  position: absolute; border: 2px solid var(--clay);
  border-radius: 3px;
  box-shadow: 0 0 0 9999px rgba(31, 42, 51, .34);
  pointer-events: none;
}
.shot-note {
  position: absolute; left: 8px; bottom: 8px;
  background: rgba(31, 42, 51, .84); color: #F7F8F6;
  font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase;
  padding: 3px 7px; border-radius: 3px; font-weight: 600;
}

.detail { padding: 18px 20px; min-width: 0; }
.detail-top { display: flex; align-items: flex-start; gap: 10px; justify-content: space-between; }
.detail h3 { font-size: 17px; line-height: 1.3; }
.chip {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
  padding: 3px 8px; border-radius: 3px; white-space: nowrap;
}
.c-critical { background: var(--sev-critical-bg); color: var(--sev-critical); }
.c-warning  { background: var(--sev-warning-bg);  color: var(--sev-warning); }
.c-info     { background: var(--sev-info-bg);     color: var(--sev-info); }
.c-good     { background: var(--sev-good-bg);     color: var(--sev-good); }

.meta { font-size: 12.5px; color: var(--ink-mute); margin-top: 6px; display: flex; gap: 12px; flex-wrap: wrap; }
.cost { color: var(--clay); font-weight: 600; }

.said { margin-top: 14px; display: flex; flex-direction: column; gap: 9px; }
.said-row { display: grid; grid-template-columns: 62px 1fr; gap: 10px; align-items: start; }
.said-key {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: .07em;
  font-weight: 700; color: var(--ink-mute); padding-top: 3px;
}
.said-val { font-size: 14.5px; }
.said-val.observed { color: var(--ink); }
.said-val.inference { color: var(--ink-soft); }

/* ---- verdict controls ---- */
.verdict { border-top: 1px solid var(--stone); background: var(--stone-soft); padding: 14px 20px; }
.v-label {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em;
  font-weight: 700; color: var(--ink-mute); margin-bottom: 8px;
}
.opts { display: flex; flex-wrap: wrap; gap: 6px; }
.opt {
  border: 1px solid var(--stone); background: var(--surface);
  padding: 6px 11px; font-size: 13.5px; border-radius: var(--radius);
}
.opt[aria-pressed="true"] {
  background: var(--slate); border-color: var(--slate); color: var(--ground);
  font-weight: 600;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .opt[aria-pressed="true"] { background: var(--sage); border-color: var(--sage); color: #16191C; }
}
:root[data-theme="dark"] .opt[aria-pressed="true"] { background: var(--sage); border-color: var(--sage); color: #16191C; }

.follow { margin-top: 12px; display: none; flex-direction: column; gap: 10px; }
.follow[data-show="1"] { display: flex; }

textarea, input[type="text"] {
  font: inherit; font-size: 14.5px;
  width: 100%; padding: 9px 11px;
  border: 1px solid var(--stone); border-radius: var(--radius);
  background: var(--surface); color: var(--ink);
  resize: vertical;
}
textarea:focus-visible, input:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
textarea::placeholder, input::placeholder { color: var(--ink-mute); }

/* ---- misses ---- */
.misses { margin: 48px 0; padding: 24px; background: var(--surface); border: 1px solid var(--stone); border-radius: var(--radius); }
.miss-row { display: grid; grid-template-columns: 1fr 130px 40px; gap: 10px; margin-bottom: 10px; align-items: start; }
@media (max-width: 620px) { .miss-row { grid-template-columns: 1fr; } }
select {
  font: inherit; font-size: 14px; padding: 9px 10px;
  border: 1px solid var(--stone); border-radius: var(--radius);
  background: var(--surface); color: var(--ink); width: 100%;
}

.photostrip { display: flex; gap: 6px; overflow-x: auto; padding: 12px 0 4px; }
.photostrip img {
  height: 62px; width: 88px; object-fit: cover; border-radius: 3px;
  border: 1px solid var(--stone); flex: 0 0 auto;
}

footer { border-top: 1px solid var(--stone); margin-top: 56px; padding: 26px 0 60px; color: var(--ink-mute); font-size: 13.5px; }

.toast {
  position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%) translateY(80px);
  background: var(--slate); color: var(--ground);
  padding: 11px 18px; border-radius: var(--radius); font-size: 14px; font-weight: 600;
  box-shadow: var(--shadow); z-index: 100; transition: transform .25s ease; pointer-events: none;
}
.toast[data-show="1"] { transform: translateX(-50%) translateY(0); }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
`;
