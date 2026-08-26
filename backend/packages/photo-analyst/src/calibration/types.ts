import type {
  CategoryAssessment,
  InsightSeverity,
  PhotoRef,
  PropertyInsight,
} from '@bones-report/shared';

/**
 * What a reviewer is asked about one finding.
 *
 * Deliberately narrow. Every field maps to a decision the agents make, so a
 * verdict can be turned back into an instruction rather than a vague note.
 */
export interface FindingVerdict {
  insightId: string;

  /**
   * - `agree`        — right finding, right severity
   * - `severity`     — real finding, wrong severity (see correctedSeverity)
   * - `not_real`     — the thing described is not there, or not what it says
   * - `not_material` — real, but not worth a buyer's attention
   */
  verdict: 'agree' | 'severity' | 'not_real' | 'not_material';

  correctedSeverity?: InsightSeverity;

  /**
   * Whether the money is credible. The reviewer flagged both directions of
   * error here, and "shouldn't have a number at all" is a distinct failure
   * from a wrong number.
   */
  costVerdict?: 'about_right' | 'too_high' | 'too_low' | 'should_be_absent' | 'should_be_present';
  correctedCost?: { low: number; high: number };

  /** How a professional would actually put it, in their own words. */
  wouldSay?: string;

  notes?: string;
}

/** Something the agents did not report and should have. */
export interface MissedFinding {
  photoId?: string;
  category?: string;
  severity: InsightSeverity;
  whatISee: string;
  wouldSay?: string;
  estimatedCost?: { low: number; high: number };
}

/** One property's findings, packaged for review. */
export interface ReviewBundle {
  bundleId: string;
  createdAt: string;
  label: string;
  model: string;
  photos: PhotoRef[];
  categories: CategoryAssessment[];
  insights: PropertyInsight[];
  summary: {
    overallCondition: string;
    headline: string;
    counts: Record<InsightSeverity, number>;
    estimatedCostRange?: { low: number; high: number; currency: string } | null;
  };
}

/**
 * A reviewed bundle. This is the ground truth agent changes are measured
 * against — keep them in version control next to the briefs they judge.
 */
export interface GoldenFile {
  bundleId: string;
  label: string;
  reviewedAt: string;
  reviewer?: string;
  /** Model and brief revision the verdicts were recorded against. */
  reviewedModel: string;
  verdicts: FindingVerdict[];
  missed: MissedFinding[];
  /** Reviewer's own read of the house, to compare against the summary. */
  overallNote?: string;
}
