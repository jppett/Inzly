// Property summary types — the output of the Summary Agent.
//
// The Summary Agent is the one step in the pipeline that reasons over
// everything at once: every category agent's findings, the full permit
// history, and the RentCast data. It runs once per property, after the
// category-level work is done, and it is the only thing the product app
// reads at view time — so the summary is the whole report from the user's
// point of view.

import type { InsightSeverity, PropertyInsight, CategoryAssessment } from './insights.js';

export interface CorroborationNote {
  /** What the photo agents concluded. */
  finding: string;
  /** How the permit record bears on it — confirms, contradicts, or extends. */
  permitContext: string;
  effect: 'confirmed' | 'contradicted' | 'context_only';
}

export interface PropertySummaryResult {
  id: string;
  address_request_id: string;
  status: 'completed' | 'failed';
  created_at: string;
  model?: string;

  /** One sentence, the way an agent would open a walkthrough. */
  headline: string;
  /** A short paragraph synthesising condition across every category. */
  overallAssessment: string;
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';

  /**
   * The findings worth a buyer's attention, ranked and deduplicated across
   * categories — not just the raw union of every agent's warnings. Two
   * agents flagging the same underlying moisture problem from different
   * rooms should surface once, connected.
   */
  topConcerns: PropertyInsight[];
  /** Genuine positives worth highlighting, same treatment. */
  topPositives: PropertyInsight[];

  /** Where photo evidence and permit records reinforce or conflict. */
  corroboration: CorroborationNote[];

  estimatedCostRange: { low: number; high: number; currency: string } | null;
  counts: Record<InsightSeverity, number>;

  /** The category assessments this was built from, carried through. */
  categories: CategoryAssessment[];

  error?: string;
}

export type CreatePropertySummaryResultInput = Pick<
  PropertySummaryResult,
  | 'address_request_id'
  | 'headline'
  | 'overallAssessment'
  | 'overallCondition'
  | 'topConcerns'
  | 'topPositives'
  | 'corroboration'
  | 'estimatedCostRange'
  | 'counts'
  | 'categories'
> &
  Partial<Pick<PropertySummaryResult, 'status' | 'model' | 'error'>>;
