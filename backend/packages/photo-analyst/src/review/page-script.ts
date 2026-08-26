/**
 * Client script for the review page.
 *
 * Working state lives in localStorage so typing is instant and nothing is lost.
 * Publishing is explicit, because `artifact.publish` reloads every open view —
 * including the reviewer's — and doing that mid-sentence would be hostile.
 */
export const PAGE_SCRIPT = String.raw`
// Captured before any mutation, so republishing rewrites the source document
// rather than a serialized live DOM.
var PRISTINE = document.documentElement.outerHTML;

var BUNDLE = JSON.parse(document.getElementById('bundle-data').textContent);
var state = JSON.parse(document.getElementById('review-state').textContent);
var STORAGE_KEY = 'inzly-review-' + BUNDLE.bundleId;

state.verdicts = state.verdicts || {};
state.missed = state.missed || [];

try {
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    var parsed = JSON.parse(saved);
    // Keep whichever is further along; a published version may be newer.
    if (Object.keys(parsed.verdicts || {}).length >= Object.keys(state.verdicts).length) {
      state = parsed;
      state.verdicts = state.verdicts || {};
      state.missed = state.missed || [];
    }
  }
} catch (e) { /* private window, blocked storage — carry on unsaved */ }

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  paintProgress();
}

function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.setAttribute('data-show', '1');
  setTimeout(function () { el.setAttribute('data-show', '0'); }, 2400);
}

function paintProgress() {
  var total = BUNDLE.insights.length;
  var done = Object.keys(state.verdicts).filter(function (k) {
    return state.verdicts[k] && state.verdicts[k].verdict;
  }).length;
  var pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = done + ' of ' + total + ' reviewed';

  BUNDLE.insights.forEach(function (ins) {
    var card = document.querySelector('[data-card="' + ins.id + '"]');
    if (!card) return;
    var v = state.verdicts[ins.id];
    card.setAttribute('data-done', v && v.verdict ? '1' : '0');
  });
}

function getVerdict(id) {
  if (!state.verdicts[id]) state.verdicts[id] = { insightId: id };
  return state.verdicts[id];
}

// --- verdict buttons -------------------------------------------------------
document.addEventListener('click', function (ev) {
  var btn = ev.target.closest('[data-opt]');
  if (!btn) return;

  var id = btn.getAttribute('data-for');
  var field = btn.getAttribute('data-field');
  var value = btn.getAttribute('data-opt');
  var v = getVerdict(id);

  // Clicking the active option clears it.
  v[field] = v[field] === value ? undefined : value;

  var group = btn.parentElement;
  Array.prototype.forEach.call(group.querySelectorAll('[data-opt]'), function (b) {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-opt') === v[field]));
  });

  if (field === 'verdict') {
    var follow = document.querySelector('[data-follow="' + id + '"]');
    if (follow) follow.setAttribute('data-show', v.verdict === 'severity' ? '1' : '0');
  }

  persist();
});

// --- free text -------------------------------------------------------------
document.addEventListener('input', function (ev) {
  var el = ev.target;
  var id = el.getAttribute('data-text-for');
  if (id) {
    var v = getVerdict(id);
    v[el.getAttribute('data-field')] = el.value || undefined;
    persist();
    return;
  }
  if (el.id === 'overall-note') {
    state.overallNote = el.value || undefined;
    persist();
  }
});

// --- misses ----------------------------------------------------------------
function renderMisses() {
  var host = document.getElementById('miss-list');
  host.innerHTML = '';
  state.missed.forEach(function (m, i) {
    var row = document.createElement('div');
    row.className = 'miss-row';

    var text = document.createElement('input');
    text.type = 'text';
    text.value = m.whatISee || '';
    text.placeholder = 'What you see that they missed';
    text.addEventListener('input', function () { m.whatISee = text.value; persist(); });

    var sev = document.createElement('select');
    ['critical', 'warning', 'info', 'good'].forEach(function (s) {
      var o = document.createElement('option');
      o.value = s; o.textContent = s;
      if (m.severity === s) o.selected = true;
      sev.appendChild(o);
    });
    sev.addEventListener('change', function () { m.severity = sev.value; persist(); });

    var del = document.createElement('button');
    del.textContent = '×';
    del.setAttribute('aria-label', 'Remove this one');
    del.addEventListener('click', function () {
      state.missed.splice(i, 1); renderMisses(); persist();
    });

    row.appendChild(text); row.appendChild(sev); row.appendChild(del);
    host.appendChild(row);
  });
}

document.getElementById('add-miss').addEventListener('click', function () {
  state.missed.push({ severity: 'warning', whatISee: '' });
  renderMisses();
  persist();
});

// --- save & export ---------------------------------------------------------
function buildGolden() {
  return {
    bundleId: BUNDLE.bundleId,
    label: BUNDLE.label,
    reviewedAt: new Date().toISOString(),
    reviewedModel: BUNDLE.model,
    verdicts: Object.keys(state.verdicts)
      .map(function (k) { return state.verdicts[k]; })
      .filter(function (v) { return v && v.verdict; }),
    missed: state.missed.filter(function (m) { return m.whatISee; }),
    overallNote: state.overallNote
  };
}

document.getElementById('save-btn').addEventListener('click', async function () {
  var btn = this;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  var artifact = await window.claude.use('artifact');
  if (!artifact) {
    btn.disabled = false;
    btn.textContent = 'Save for Claude';
    toast('Saving is not available in this view — use Download instead.');
    return;
  }

  var next = PRISTINE.replace(
    /(<script id="review-state" type="application\/json">)[\s\S]*?(<\/script>)/,
    '$1' + JSON.stringify(state).replace(/\$/g, '$$$$') + '$2'
  );

  try {
    await artifact.publish('<!doctype html>\n' + next);
    // The view reloads on success, so this line rarely runs.
    toast('Saved');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Save for Claude';
    toast(err && err.code === 'conflict'
      ? 'Someone else saved first — reload and redo this change.'
      : 'Could not save. Your work is still here; try Download.');
  }
});

document.getElementById('export-btn').addEventListener('click', async function () {
  var json = JSON.stringify(buildGolden(), null, 2);
  var downloads = await window.claude.use('downloads');
  if (downloads) {
    try {
      await downloads.save({ filename: BUNDLE.label + '.golden.json', data: json });
      return;
    } catch (e) { /* declined or unavailable — fall through to clipboard */ }
  }
  try {
    await navigator.clipboard.writeText(json);
    toast('Copied to clipboard — paste it to Claude');
  } catch (e) {
    toast('Could not copy. Use Save for Claude instead.');
  }
});

// --- init ------------------------------------------------------------------
BUNDLE.insights.forEach(function (ins) {
  var v = state.verdicts[ins.id];
  if (!v) return;
  ['verdict', 'correctedSeverity', 'costVerdict'].forEach(function (field) {
    if (!v[field]) return;
    var group = document.querySelector('[data-group="' + field + '-' + ins.id + '"]');
    if (!group) return;
    Array.prototype.forEach.call(group.querySelectorAll('[data-opt]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-opt') === v[field]));
    });
  });
  if (v.verdict === 'severity') {
    var follow = document.querySelector('[data-follow="' + ins.id + '"]');
    if (follow) follow.setAttribute('data-show', '1');
  }
  ['wouldSay', 'notes'].forEach(function (field) {
    var ta = document.querySelector('[data-text-for="' + ins.id + '"][data-field="' + field + '"]');
    if (ta && v[field]) ta.value = v[field];
  });
});

if (state.overallNote) document.getElementById('overall-note').value = state.overallNote;
renderMisses();
paintProgress();
`;
