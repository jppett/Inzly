// Runtime validation for property summaries. Mirrors ../summary.ts.
import { z } from 'zod';
import { PropertyInsightSchema, CategoryAssessmentSchema, InsightSeveritySchema } from './insights.js';

export const CorroborationNoteSchema = z.object({
  finding: z.string(),
  permitContext: z.string(),
  effect: z.enum(['confirmed', 'contradicted', 'context_only']),
});

export const PropertySummaryResultSchema = z.object({
  id: z.string().uuid(),
  address_request_id: z.string().uuid(),
  status: z.enum(['completed', 'failed']),
  created_at: z.string().datetime(),
  model: z.string().optional(),
  headline: z.string(),
  overallAssessment: z.string(),
  overallCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
  topConcerns: z.array(PropertyInsightSchema),
  topPositives: z.array(PropertyInsightSchema),
  corroboration: z.array(CorroborationNoteSchema),
  estimatedCostRange: z
    .object({ low: z.number(), high: z.number(), currency: z.string() })
    .nullable(),
  counts: z.record(InsightSeveritySchema, z.number().int().min(0)),
  categories: z.array(CategoryAssessmentSchema),
  error: z.string().optional(),
});

export const CreatePropertySummaryResultInputSchema = PropertySummaryResultSchema.pick({
  address_request_id: true,
  headline: true,
  overallAssessment: true,
  overallCondition: true,
  topConcerns: true,
  topPositives: true,
  corroboration: true,
  estimatedCostRange: true,
  counts: true,
  categories: true,
}).extend({
  status: PropertySummaryResultSchema.shape.status.optional(),
  model: z.string().optional(),
  error: z.string().optional(),
});

export type CreatePropertySummaryResultInputType = z.infer<
  typeof CreatePropertySummaryResultInputSchema
>;

/** What the Summary Agent itself returns — the runner supplies id/timestamps. */
export const SummaryAgentResponseSchema = PropertySummaryResultSchema.pick({
  headline: true,
  overallAssessment: true,
  overallCondition: true,
  corroboration: true,
}).extend({
  // The agent names which of the input findings matter most, by id, rather
  // than re-emitting full insight objects — cheaper and avoids drift.
  topConcernIds: z.array(z.string()),
  topPositiveIds: z.array(z.string()),
});

export type SummaryAgentResponse = z.infer<typeof SummaryAgentResponseSchema>;
