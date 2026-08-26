/**
 * Calibration workflow.
 *
 *   review  — run the agents over a house and write a review bundle
 *   score   — measure a bundle against a reviewer's recorded verdicts
 *
 * Usage:
 *   pnpm --filter @bones-report/photo-analyst review --label camden --photos photos.txt
 *   pnpm --filter @bones-report/photo-analyst score  --bundle <file> --golden <file>
 */
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PhotoAnalyst } from './services/analyst.js';
import { createVisionProvider } from './providers/index.js';
import { toReviewBundle, scoreRun, formatReport } from './calibration/index.js';
import { EXPERT_AGENTS } from './agents/definitions.js';
import type { GoldenFile, ReviewBundle } from './calibration/types.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function review(): Promise<void> {
  const label = arg('label') ?? 'unlabelled';
  const photosFile = arg('photos');
  const out = arg('out') ?? `calibration/${label}.bundle.json`;

  const urls = photosFile
    ? readFileSync(resolve(photosFile), 'utf-8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
    : process.argv.slice(3).filter((a) => a.startsWith('http'));

  if (urls.length === 0) {
    console.error('No photos. Pass --photos <file> or list URLs.');
    process.exit(1);
  }

  // Say what this will cost before spending it. Every run is a full pass over
  // the photos, so the call count is the number that matters.
  const calls = EXPERT_AGENTS.reduce((n, a) => n + a.runs, 0);
  console.log(
    `${urls.length} photos · ${EXPERT_AGENTS.length} agents · ${calls} model calls\n` +
      `Photos are sent once and cached, so only the first call pays full image cost.`,
  );

  if (process.argv.includes('--dry-run')) {
    console.log('\nDry run — nothing sent.');
    return;
  }

  const provider = createVisionProvider();
  const analyst = new PhotoAnalyst(provider);

  console.log(`\nAnalysing with ${provider.model}...`);
  const started = Date.now();
  const outcome = await analyst.analyse(randomUUID(), urls, { maxPhotos: urls.length });
  const bundle = toReviewBundle(outcome, label, provider.model);

  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), JSON.stringify(bundle, null, 2));

  console.log(
    `\n${bundle.insights.length} findings across ${bundle.categories.length} categories ` +
      `in ${((Date.now() - started) / 1000).toFixed(0)}s`,
  );
  console.log(
    `  ${bundle.summary.counts.critical} critical · ${bundle.summary.counts.warning} warning · ` +
      `${bundle.summary.counts.info} info · ${bundle.summary.counts.good} good`,
  );
  const cached = outcome.usage.cacheReadTokens;
  const total = cached + outcome.usage.inputTokens;
  if (total > 0) {
    console.log(`  ${Math.round((cached / total) * 100)}% of input tokens served from cache`);
  }
  console.log(`\nWrote ${out}`);
  console.log('Next: publish it for review, then record verdicts as a golden file.');
}

function score(): void {
  const bundlePath = arg('bundle');
  const goldenPath = arg('golden');

  if (!bundlePath || !goldenPath) {
    console.error('Usage: score --bundle <file> --golden <file>');
    process.exit(1);
  }

  const bundle: ReviewBundle = JSON.parse(readFileSync(resolve(bundlePath), 'utf-8'));
  const golden: GoldenFile = JSON.parse(readFileSync(resolve(goldenPath), 'utf-8'));

  console.log(formatReport(scoreRun(bundle, golden)));
}

const command = process.argv[2];
if (command === 'review') {
  review().catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
} else if (command === 'score') {
  score();
} else {
  console.error('Usage: review | score');
  process.exit(1);
}
