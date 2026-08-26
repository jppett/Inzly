/**
 * Render a review bundle into a publishable page.
 *
 *   pnpm --filter @bones-report/photo-analyst page --bundle <file> --out <file>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildReviewPage } from './build-page.js';
import type { ReviewBundle } from '../calibration/types.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const bundlePath = arg('bundle');
const out = arg('out') ?? 'review.html';
const placeholder = process.argv.includes('--placeholder');

if (!bundlePath) {
  console.error('Usage: page --bundle <file> [--out <file>] [--placeholder]');
  process.exit(1);
}

const bundle: ReviewBundle = JSON.parse(readFileSync(resolve(bundlePath), 'utf-8'));

// Carry forward verdicts already recorded, so re-rendering never loses work.
const statePath = arg('state');
const state = statePath ? JSON.parse(readFileSync(resolve(statePath), 'utf-8')) : undefined;

const html = buildReviewPage(bundle, { placeholder, state });

mkdirSync(dirname(resolve(out)), { recursive: true });
writeFileSync(resolve(out), html);

console.log(
  `Wrote ${out} — ${bundle.insights.length} findings, ${bundle.photos.length} photos` +
    `${placeholder ? ' (marked as placeholder)' : ''}`,
);
