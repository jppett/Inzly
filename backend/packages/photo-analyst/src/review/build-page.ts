import { formatCost } from '@bones-report/shared';
import type { PropertyInsight, CategoryAssessment } from '@bones-report/shared';
import type { ReviewBundle } from '../calibration/types.js';
import { PAGE_CSS } from './page-css.js';
import { PAGE_SCRIPT } from './page-script.js';

const SEVERITIES = ['critical', 'warning', 'info', 'good'] as const;

function esc(s: string | number): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** JSON embedded in a script tag must not be able to close it. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Never print a unit rate as though it were a total. */
function money(cost: PropertyInsight['costEstimate']): string {
  return formatCost(cost) ?? '';
}

function humanise(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function optionGroup(
  field: string,
  insightId: string,
  options: Array<{ value: string; label: string }>,
): string {
  const buttons = options
    .map(
      (o) =>
        `<button type="button" class="opt" data-opt="${esc(o.value)}" data-field="${esc(field)}"` +
        ` data-for="${esc(insightId)}" aria-pressed="false">${esc(o.label)}</button>`,
    )
    .join('');
  return `<div class="opts" data-group="${esc(field)}-${esc(insightId)}">${buttons}</div>`;
}

function findingCard(insight: PropertyInsight, bundle: ReviewBundle): string {
  const anchor = insight.evidence.find((e) => e.region) ?? insight.evidence[0];
  const photo = bundle.photos.find((p) => p.id === anchor?.photoId);
  const region = anchor?.region;

  const shot = photo
    ? `<div class="shot">
        <img src="${esc(photo.url)}" alt="${esc(insight.title)}" loading="lazy">
        ${
          region
            ? `<div class="region" style="left:${region.x}%;top:${region.y}%;width:${region.width}%;height:${region.height}%"></div>`
            : ''
        }
        <div class="shot-note">${region ? 'What it pointed at' : 'Whole photo'}</div>
      </div>`
    : '<div class="shot"></div>';

  const evidence = insight.evidence
    .map(
      (e) => `
      <div class="said-row">
        <div class="said-key">Saw</div>
        <div class="said-val observed">${esc(e.observed)}</div>
      </div>
      ${
        e.inference
          ? `<div class="said-row">
               <div class="said-key">So</div>
               <div class="said-val inference">${esc(e.inference)}</div>
             </div>`
          : ''
      }`,
    )
    .join('');

  const cost = money(insight.costEstimate);

  return `
  <article class="card" data-card="${esc(insight.id)}" data-sev="${esc(insight.severity)}" data-done="0">
    <div class="card-body">
      ${shot}
      <div class="detail">
        <div class="detail-top">
          <h3>${esc(insight.title)}</h3>
          <span class="chip c-${esc(insight.severity)}">${esc(insight.severity)}</span>
        </div>
        <div class="meta">
          <span>${esc(humanise(insight.category))}</span>
          <span>confidence: ${esc(insight.confidence)}</span>
          ${cost ? `<span class="cost">${esc(cost)}</span>` : '<span>no cost given</span>'}
        </div>
        <div class="said">${evidence}</div>
        ${
          insight.recommendedAction
            ? `<div class="said-row" style="margin-top:10px">
                 <div class="said-key">Do</div>
                 <div class="said-val inference">${esc(insight.recommendedAction)}</div>
               </div>`
            : ''
        }
      </div>
    </div>

    <div class="verdict">
      <div class="v-label">Your call</div>
      ${optionGroup('verdict', insight.id, [
        { value: 'agree', label: 'Agree' },
        { value: 'severity', label: 'Wrong severity' },
        { value: 'not_real', label: "Not there" },
        { value: 'not_material', label: "Wouldn't mention it" },
      ])}

      <div class="follow" data-follow="${esc(insight.id)}">
        <div>
          <div class="v-label">Should be</div>
          ${optionGroup(
            'correctedSeverity',
            insight.id,
            SEVERITIES.map((s) => ({ value: s, label: s })),
          )}
        </div>
      </div>

      ${
        cost
          ? `<div style="margin-top:12px">
               <div class="v-label">The money</div>
               ${optionGroup('costVerdict', insight.id, [
                 { value: 'about_right', label: 'About right' },
                 { value: 'too_high', label: 'Too high' },
                 { value: 'too_low', label: 'Too low' },
                 { value: 'should_be_absent', label: "Shouldn't have a number" },
               ])}
             </div>`
          : `<div style="margin-top:12px">
               <div class="v-label">The money</div>
               ${optionGroup('costVerdict', insight.id, [
                 { value: 'about_right', label: 'Fine without one' },
                 { value: 'should_be_present', label: 'Needs a number' },
               ])}
             </div>`
      }

      <div style="margin-top:12px">
        <div class="v-label">How you'd say it</div>
        <textarea rows="2" data-text-for="${esc(insight.id)}" data-field="wouldSay"
          placeholder="In your words, walking a client past this."></textarea>
      </div>
    </div>
  </article>`;
}

function categoryBlock(assessment: CategoryAssessment, bundle: ReviewBundle): string {
  const findings = bundle.insights.filter((i) => i.category === assessment.category);
  if (assessment.rating === 'not_visible' && findings.length === 0) return '';

  const agreement =
    assessment.provenance && assessment.provenance.runs > 1
      ? ` · ${Math.round(assessment.provenance.agreement * 100)}% run agreement`
      : '';

  return `
  <section class="cat">
    <div class="cat-head">
      <h2>${esc(humanise(assessment.category))}</h2>
      <span class="rating">${esc(assessment.rating)} · ${esc(assessment.confidence)} confidence${agreement}</span>
    </div>
    <p class="cat-summary">${esc(assessment.summary)}</p>
    ${findings.map((f) => findingCard(f, bundle)).join('')}
  </section>`;
}

export interface BuildPageOptions {
  /** Warn on the page that these findings are placeholders. */
  placeholder?: boolean;
  /** Verdicts already recorded, to re-render a page mid-review. */
  state?: unknown;
}

export function buildReviewPage(bundle: ReviewBundle, options: BuildPageOptions = {}): string {
  const counts = bundle.summary.counts;
  const state = options.state ?? { verdicts: {}, missed: [] };

  const tally = SEVERITIES.map(
    (s) =>
      `<div class="tally-item t-${s}"><span class="n">${counts[s] ?? 0}</span> ${s}</div>`,
  ).join('');

  const strip = bundle.photos
    .map((p) => `<img src="${esc(p.url)}" alt="" loading="lazy">`)
    .join('');

  return `<title>Camden Findings Review</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@400;500;600;700&display=swap">
<style>${PAGE_CSS}</style>

${
  options.placeholder
    ? `<div class="banner"><div class="wrap"><strong>Placeholder findings.</strong>
       These came from the mock provider, not real image analysis — the text is filler.
       Review the <em>questions</em> here, not the findings: are these the right things to be asked
       about each one? Real findings replace these once a vision key is configured.</div></div>`
    : ''
}

<header class="head">
  <div class="wrap">
    <div class="eyebrow">Agent calibration · ${esc(bundle.model)}</div>
    <h1>${esc(bundle.label)}</h1>
    <p class="sub">${esc(bundle.summary.headline)} Go through each finding and say what you'd
      actually tell a client. Your calls become the standard the agents are tuned against.</p>
    <div class="tally">${tally}</div>
    <div class="photostrip">${strip}</div>
  </div>
</header>

<div class="bar">
  <div class="wrap bar-inner">
    <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
    <div class="progress-label" id="progress-label">0 of ${bundle.insights.length} reviewed</div>
    <button type="button" id="export-btn">Download</button>
    <button type="button" id="save-btn" class="btn-primary">Save for Claude</button>
  </div>
</div>

<main class="wrap">
  ${bundle.categories.map((c) => categoryBlock(c, bundle)).join('')}

  <section class="misses">
    <h2 style="font-size:19px;margin-bottom:6px">What did they miss?</h2>
    <p style="color:var(--ink-soft);margin:0 0 16px;max-width:64ch">
      The findings above are only what the agents thought to report. What would you have
      flagged walking this house that isn't here? These matter more than corrections —
      a miss is invisible to the agents otherwise.
    </p>
    <div id="miss-list"></div>
    <button type="button" id="add-miss">Add something they missed</button>

    <div style="margin-top:26px">
      <div class="v-label">Your read on the house overall</div>
      <textarea id="overall-note" rows="3"
        placeholder="How you'd sum this place up for a client."></textarea>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    Inzly agent calibration · ${esc(bundle.photos.length)} photos ·
    ${esc(bundle.insights.length)} findings · bundle <span class="mono">${esc(bundle.bundleId.slice(0, 8))}</span>
  </div>
</footer>

<div class="toast" id="toast" data-show="0"></div>

<script id="bundle-data" type="application/json">${safeJson(bundle)}</script>
<script id="review-state" type="application/json">${safeJson(state)}</script>
<script>${PAGE_SCRIPT}</script>`;
}
