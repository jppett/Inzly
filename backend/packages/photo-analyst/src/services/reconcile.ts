import type {
  AgentCategoryResponse,
  CategoryAssessment,
  CategoryRating,
  Confidence,
  InsightCategory,
  PropertyInsight,
} from '@bones-report/shared';

const RATING_ORDER: CategoryRating[] = ['poor', 'fair', 'good', 'excellent'];
const CONFIDENCE_ORDER: Confidence[] = ['low', 'medium', 'high'];

/**
 * Merge several independent runs of one agent into a single assessment.
 *
 * The previous generation of this analysis joined runs with a delimiter, which
 * is why camden.json contains ratings like "fair|fair|good|fair|fair" and
 * summaries that repeat themselves five times. Multiple runs are worth having —
 * they surface disagreement — but the disagreement has to be resolved into one
 * answer, and the degree of it recorded rather than pasted into the output.
 */
export function reconcileCategory(
  category: InsightCategory,
  runs: AgentCategoryResponse[],
  photosConsidered: number,
  model?: string,
): { assessment: CategoryAssessment; insights: Omit<PropertyInsight, 'id'>[] } {
  const usable = runs.filter((r) => r.rating !== 'not_visible');

  if (usable.length === 0) {
    return {
      assessment: {
        category,
        model,
        rating: 'not_visible',
        confidence: runs.length > 0 ? 'high' : 'low',
        summary:
          runs[0]?.summary ?? 'This category is not visible in the supplied photographs.',
        provenance: { runs: runs.length, agreement: 1, photosConsidered },
      },
      insights: [],
    };
  }

  const rating = medianRating(usable.map((r) => r.rating));
  const agreement = agreementRatio(usable.map((r) => r.rating));

  // Runs that disagree are, collectively, less trustworthy than any one of them
  // claims to be. Cap confidence by how much they actually agreed.
  const claimed = medianConfidence(usable.map((r) => r.confidence));
  const confidence = agreement < 0.5 ? 'low' : agreement < 0.8 ? capAt(claimed, 'medium') : claimed;

  return {
    assessment: {
      category,
      model,
      rating,
      confidence,
      // One summary, from the run whose rating matched the reconciled verdict —
      // never a concatenation.
      summary: (usable.find((r) => r.rating === rating) ?? usable[0]).summary,
      provenance: { runs: runs.length, agreement, photosConsidered },
    },
    insights: dedupeInsights(category, usable.flatMap((r) => r.insights)),
  };
}

/**
 * Collapse findings that different runs reported about the same thing.
 *
 * Two insights are the same finding when they sit on the same photo and their
 * titles overlap substantially. Corroboration across runs raises confidence
 * rather than producing a duplicate row — camden.json listed 24 window insights
 * from 5 runs of the same agent, most of them restatements.
 */
export function dedupeInsights(
  category: InsightCategory,
  insights: AgentCategoryResponse['insights'],
): Omit<PropertyInsight, 'id'>[] {
  const kept: Array<Omit<PropertyInsight, 'id'> & { seen: number }> = [];

  for (const insight of insights) {
    const photoIds = new Set(insight.evidence.map((e) => e.photoId));
    const match = kept.find(
      (k) =>
        k.evidence.some((e) => photoIds.has(e.photoId)) &&
        titlesOverlap(k.title, insight.title),
    );

    if (match) {
      match.seen += 1;
      // Independent agreement is real signal — promote confidence once.
      if (match.seen >= 2 && match.confidence !== 'high') {
        match.confidence = match.confidence === 'low' ? 'medium' : 'high';
      }
      // Keep the more serious reading; a run that saw damage saw something.
      if (severityRank(insight.severity) > severityRank(match.severity)) {
        match.severity = insight.severity;
        match.description = insight.description;
      }
      continue;
    }

    kept.push({ ...insight, category, seen: 1 });
  }

  return kept.map(({ seen: _seen, ...insight }) => insight);
}

function titlesOverlap(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return false;

  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.min(wa.size, wb.size) >= 0.5;
}

export function severityRank(severity: PropertyInsight['severity']): number {
  switch (severity) {
    case 'critical':
      return 3;
    case 'warning':
      return 2;
    case 'info':
      return 1;
    default:
      return 0;
  }
}

function medianRating(ratings: CategoryRating[]): CategoryRating {
  const sorted = [...ratings].sort(
    (a, b) => RATING_ORDER.indexOf(a) - RATING_ORDER.indexOf(b),
  );
  return sorted[Math.floor(sorted.length / 2)];
}

function medianConfidence(values: Confidence[]): Confidence {
  const sorted = [...values].sort(
    (a, b) => CONFIDENCE_ORDER.indexOf(a) - CONFIDENCE_ORDER.indexOf(b),
  );
  return sorted[Math.floor(sorted.length / 2)];
}

function capAt(value: Confidence, ceiling: Confidence): Confidence {
  return CONFIDENCE_ORDER.indexOf(value) > CONFIDENCE_ORDER.indexOf(ceiling) ? ceiling : value;
}

/** Share of runs landing on the most common rating. */
function agreementRatio(ratings: CategoryRating[]): number {
  if (ratings.length <= 1) return 1;
  const counts = new Map<CategoryRating, number>();
  for (const r of ratings) counts.set(r, (counts.get(r) ?? 0) + 1);
  return Math.max(...counts.values()) / ratings.length;
}
