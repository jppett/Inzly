// Property insight types — the output of the photo-analyst service.
// Mirrors schemas/property-insights-result.json exactly.

export const INSIGHT_CATEGORIES = [
  'windows', 'hvac', 'ventilation', 'foundation', 'roof', 'siding', 'plumbing',
  'electrical', 'cabinetry', 'appliances', 'tile', 'countertops',
  'lighting', 'wall_finishes', 'flooring', 'deck', 'landscaping',
] as const;

export type InsightCategory = typeof INSIGHT_CATEGORIES[number];

/**
 * Deliberately identical to the product app's Issue severity vocabulary,
 * including 'good'. A positive finding is a first-class result, not the
 * absence of a negative one.
 */
export type InsightSeverity = 'critical' | 'warning' | 'info' | 'good';

export type Confidence = 'low' | 'medium' | 'high';

export type CategoryRating = 'excellent' | 'good' | 'fair' | 'poor' | 'not_visible';

export interface PhotoRef {
  id: string;
  url: string;
  label?: string;
}

/**
 * How to read `low`/`high`.
 *
 * Trades price by the unit, so agents are asked to give rates. Without an
 * explicit unit a rate is indistinguishable from a total, and a roof
 * replacement quoted per square foot renders as "$4" — which is how this
 * field first shipped.
 */
export type CostUnit =
  | 'total'
  | 'per_sq_ft'
  | 'per_linear_ft'
  | 'per_unit'
  | 'per_opening';

export interface CostEstimate {
  low: number;
  high: number;
  /** Defaults to 'total' when absent, for records written before this existed. */
  unit?: CostUnit;
  /** How many units, when the agent could establish it. */
  quantity?: number | null;
  /** Extended cost. Only present when quantity is known, or unit is 'total'. */
  total?: { low: number; high: number } | null;
  currency?: string;
  basis?: string;
}

/** The extended cost when it can be computed, otherwise null. */
export function costTotal(cost: CostEstimate | null | undefined): { low: number; high: number } | null {
  if (!cost) return null;
  if (cost.total) return cost.total;
  const unit = cost.unit ?? 'total';
  if (unit === 'total') return { low: cost.low, high: cost.high };
  if (typeof cost.quantity === 'number' && cost.quantity > 0) {
    return { low: cost.low * cost.quantity, high: cost.high * cost.quantity };
  }
  return null;
}

const UNIT_LABELS: Record<CostUnit, string> = {
  total: '',
  per_sq_ft: ' per sq ft',
  per_linear_ft: ' per linear ft',
  per_unit: ' each',
  per_opening: ' per opening',
};

/** Human-readable cost, never a bare rate that reads as a total. */
export function formatCost(cost: CostEstimate | null | undefined): string | null {
  if (!cost) return null;
  const symbol = !cost.currency || cost.currency === 'USD' ? '$' : `${cost.currency} `;
  const money = (n: number) => `${symbol}${Math.round(n).toLocaleString()}`;
  const range = cost.low === cost.high ? money(cost.low) : `${money(cost.low)}–${money(cost.high)}`;

  const unit = cost.unit ?? 'total';
  const rate = `${range}${UNIT_LABELS[unit]}`;

  const extended = costTotal(cost);
  // A quantity of one extends to the same number, so the parenthetical would
  // just repeat the rate.
  if (unit === 'total' || !extended || (cost.quantity ?? 0) <= 1) return rate;

  const total =
    extended.low === extended.high
      ? money(extended.low)
      : `${money(extended.low)}–${money(extended.high)}`;
  return `${rate} (about ${total})`;
}

/** Region of a photo, in percentages, so the UI can place a marker on it. */
export interface EvidenceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InsightEvidence {
  photoId: string;
  photoUrl?: string;
  /** Only what is literally visible. Hedging is not permitted here. */
  observed: string;
  /** What the observation implies. Uncertainty belongs here. */
  inference?: string;
  region?: EvidenceRegion | null;
}

export interface PropertyInsight {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  severity: InsightSeverity;
  confidence: Confidence;
  costEstimate?: CostEstimate | null;
  recommendedAction?: string;
  /** At least one. An insight with no photo behind it is not reported. */
  evidence: InsightEvidence[];
}

export interface CategoryAssessment {
  category: InsightCategory;
  /** A single reconciled value — never a delimited list of per-run results. */
  rating: CategoryRating;
  confidence: Confidence;
  /** One paragraph — never concatenated per-run summaries. */
  summary: string;
  provenance?: {
    runs: number;
    /** 0–1: how much independent runs agreed. Low agreement lowers confidence. */
    agreement: number;
    photosConsidered: number;
  };
}

export interface InsightsSummary {
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
  headline: string;
  counts: Record<InsightSeverity, number>;
  estimatedCostRange?: { low: number; high: number; currency: string } | null;
}

export interface PropertyInsightsResult {
  id: string;
  address_request_id: string;
  status: 'completed' | 'partial' | 'failed';
  created_at: string;
  model?: string;
  photos: PhotoRef[];
  categories: CategoryAssessment[];
  insights: PropertyInsight[];
  summary: InsightsSummary;
  error?: string;
}

export type CreatePropertyInsightsResultInput =
  Pick<PropertyInsightsResult, 'address_request_id' | 'photos' | 'categories' | 'insights' | 'summary'> &
  Partial<Pick<PropertyInsightsResult, 'status' | 'model' | 'error'>>;
