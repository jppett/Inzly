// Runtime validation for property insights. Mirrors schemas/property-insights-result.json.
import { z } from 'zod';
import { INSIGHT_CATEGORIES } from '../insights.js';

export const InsightCategorySchema = z.enum(INSIGHT_CATEGORIES);
export const InsightSeveritySchema = z.enum(['critical', 'warning', 'info', 'good']);
export const ConfidenceSchema = z.enum(['low', 'medium', 'high']);
export const CategoryRatingSchema = z.enum(['excellent', 'good', 'fair', 'poor', 'not_visible']);

export const PhotoRefSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  label: z.string().optional(),
});

export const CostEstimateSchema = z.object({
  low: z.number().nonnegative(),
  high: z.number().nonnegative(),
  currency: z.string().optional(),
  basis: z.string().optional(),
});

export const EvidenceRegionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100),
  height: z.number().min(0).max(100),
});

export const InsightEvidenceSchema = z.object({
  photoId: z.string().min(1),
  photoUrl: z.string().url().optional(),
  observed: z.string().min(1),
  inference: z.string().optional(),
  region: EvidenceRegionSchema.nullish(),
});

export const PropertyInsightSchema = z.object({
  id: z.string().min(1),
  category: InsightCategorySchema,
  title: z.string().min(1).max(80),
  description: z.string().min(1),
  severity: InsightSeveritySchema,
  confidence: ConfidenceSchema,
  costEstimate: CostEstimateSchema.nullish(),
  recommendedAction: z.string().optional(),
  evidence: z.array(InsightEvidenceSchema).min(1),
});

export const CategoryAssessmentSchema = z.object({
  category: InsightCategorySchema,
  rating: CategoryRatingSchema,
  confidence: ConfidenceSchema,
  summary: z.string(),
  provenance: z
    .object({
      runs: z.number().int().min(1),
      agreement: z.number().min(0).max(1),
      photosConsidered: z.number().int().min(0),
    })
    .optional(),
});

export const InsightsSummarySchema = z.object({
  overallCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
  headline: z.string(),
  counts: z.object({
    critical: z.number().int().min(0),
    warning: z.number().int().min(0),
    info: z.number().int().min(0),
    good: z.number().int().min(0),
  }),
  estimatedCostRange: z
    .object({ low: z.number(), high: z.number(), currency: z.string() })
    .nullish(),
});

export const PropertyInsightsResultSchema = z.object({
  id: z.string().uuid(),
  address_request_id: z.string().uuid(),
  status: z.enum(['completed', 'partial', 'failed']),
  created_at: z.string().datetime(),
  model: z.string().optional(),
  photos: z.array(PhotoRefSchema),
  categories: z.array(CategoryAssessmentSchema),
  insights: z.array(PropertyInsightSchema),
  summary: InsightsSummarySchema,
  error: z.string().optional(),
});

export const CreatePropertyInsightsResultInputSchema = PropertyInsightsResultSchema.pick({
  address_request_id: true,
  photos: true,
  categories: true,
  insights: true,
  summary: true,
}).extend({
  status: PropertyInsightsResultSchema.shape.status.optional(),
  model: z.string().optional(),
  error: z.string().optional(),
});

export type CreatePropertyInsightsResultInputType = z.infer<
  typeof CreatePropertyInsightsResultInputSchema
>;

/**
 * What a single expert agent returns for one category, before reconciliation.
 * The agent-facing contract is narrower than the stored one: no ids, no
 * provenance — the runner supplies those.
 */
export const AgentCategoryResponseSchema = z.object({
  rating: CategoryRatingSchema,
  confidence: ConfidenceSchema,
  summary: z.string(),
  insights: z.array(
    PropertyInsightSchema.omit({ id: true, category: true }),
  ),
});

export type AgentCategoryResponse = z.infer<typeof AgentCategoryResponseSchema>;
