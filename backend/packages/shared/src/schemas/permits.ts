// Runtime validation for permit history. Mirrors schemas/permit-history-result.json.
import { z } from 'zod';
import { InsightCategorySchema } from './insights.js';

export const PermitRecordSchema = z.object({
  id: z.string().min(1),
  number: z.string().nullish(),
  description: z.string(),
  type: z.string().nullish(),
  subtype: z.string().nullish(),
  status: z.string().nullish(),
  jurisdiction: z.string().nullish(),
  issueDate: z.string().nullish(),
  finalDate: z.string().nullish(),
  jobValue: z.number().nullish(),
  tags: z.array(z.string()),
  categories: z.array(InsightCategorySchema),
});

export const PermitHistoryResultSchema = z.object({
  id: z.string().uuid(),
  address_request_id: z.string().uuid(),
  status: z.enum(['completed', 'not_found', 'failed']),
  created_at: z.string().datetime(),
  source: z.string().optional(),
  matchedAddress: z.string().nullish(),
  geoId: z.string().nullish(),
  permits: z.array(PermitRecordSchema),
  error: z.string().optional(),
});

export const CreatePermitHistoryResultInputSchema = PermitHistoryResultSchema.pick({
  address_request_id: true,
  permits: true,
}).extend({
  status: PermitHistoryResultSchema.shape.status.optional(),
  source: z.string().optional(),
  matchedAddress: z.string().nullish(),
  geoId: z.string().nullish(),
  error: z.string().optional(),
});

export type CreatePermitHistoryResultInputType = z.infer<
  typeof CreatePermitHistoryResultInputSchema
>;
