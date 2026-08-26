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

export interface CostEstimate {
  low: number;
  high: number;
  currency?: string;
  basis?: string;
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
