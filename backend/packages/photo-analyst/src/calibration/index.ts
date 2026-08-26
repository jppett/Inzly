export * from './types.js';
export * from './score.js';
export * from './expectations.js';

import { randomUUID } from 'node:crypto';
import type { AnalyseOutcome } from '../services/analyst.js';
import type { ReviewBundle } from './types.js';

/** Package an analysis run for review. */
export function toReviewBundle(
  outcome: AnalyseOutcome,
  label: string,
  model: string,
): ReviewBundle {
  return {
    bundleId: randomUUID(),
    createdAt: new Date().toISOString(),
    label,
    model,
    photos: outcome.result.photos,
    categories: outcome.result.categories,
    insights: outcome.result.insights,
    summary: outcome.result.summary,
  };
}
