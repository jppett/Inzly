// Zod schemas for runtime validation based on JSON schemas
import { z } from 'zod';

export * from './insights.js';


// EventEnvelope schema
export const EventEnvelopeSchema = z.object({
  type: z.string(),
  ts: z.string().datetime(),
  data: z.record(z.any()),
});

// AddressRequest schema
export const AddressRequestSchema = z.object({
  id: z.string().uuid(),
  address: z.string().min(1),
  created_at: z.string().datetime(),
  status: z.enum(['pending', 'processing', 'processed', 'failed']),
});

// BonesReportResult schema
export const BonesReportResultSchema = z.object({
  id: z.string().uuid(),
  address_request_id: z.string().uuid(),
  report_data: z.record(z.any()),
  created_at: z.string().datetime(),
  status: z.enum(['completed', 'failed']),
});

// MLSListingRequest schema
export const MLSListingRequestSchema = z.object({
  id: z.string().uuid(),
  address: z.string().min(1),
  created_at: z.string().datetime(),
  status: z.enum(['pending', 'processed', 'failed']),
});

// MLSListingData schema
export const MLSListingDataSchema = z.object({
  address: z.string(),
  price: z.number(),
  bedrooms: z.number().int().min(0),
  photo_urls: z.array(z.string().url()),
});

// MLSListingResult schema
export const MLSListingResultSchema = z.object({
  id: z.string().uuid(),
  mls_listing_request_id: z.string().uuid(),
  listing_data: MLSListingDataSchema,
  created_at: z.string().datetime(),
  status: z.enum(['completed', 'failed']),
});

// Input schemas for creating resources (omit generated fields)
export const CreateAddressRequestInputSchema = AddressRequestSchema.pick({
  address: true,
});

export const UpdateAddressRequestInputSchema = AddressRequestSchema.pick({
  address: true,
  status: true,
}).partial();

export const CreateBonesReportResultInputSchema = BonesReportResultSchema
  .pick({
    address_request_id: true,
    report_data: true,
  })
  .extend({
    status: z.enum(['completed', 'failed']).optional(),
  });

export const CreateMLSListingRequestInputSchema = MLSListingRequestSchema.pick({
  address: true,
});

export const UpdateMLSListingRequestInputSchema = MLSListingRequestSchema.pick({
  status: true,
}).partial();

export const CreateMLSListingResultInputSchema = MLSListingResultSchema
  .pick({
    mls_listing_request_id: true,
    listing_data: true,
  })
  .extend({
    status: z.enum(['completed', 'failed']).optional(),
  });

// Infer types from schemas to ensure consistency
export type AddressRequestType = z.infer<typeof AddressRequestSchema>;
export type BonesReportResultType = z.infer<typeof BonesReportResultSchema>;
export type MLSListingRequestType = z.infer<typeof MLSListingRequestSchema>;
export type MLSListingResultType = z.infer<typeof MLSListingResultSchema>;
export type MLSListingDataType = z.infer<typeof MLSListingDataSchema>;
export type EventEnvelopeType<T = any> = z.infer<typeof EventEnvelopeSchema> & { data: T };

// Input types
export type CreateAddressRequestInputType = z.infer<typeof CreateAddressRequestInputSchema>;
export type UpdateAddressRequestInputType = z.infer<typeof UpdateAddressRequestInputSchema>;
export type CreateBonesReportResultInputType = z.infer<typeof CreateBonesReportResultInputSchema>;
export type CreateMLSListingRequestInputType = z.infer<typeof CreateMLSListingRequestInputSchema>;
export type UpdateMLSListingRequestInputType = z.infer<typeof UpdateMLSListingRequestInputSchema>;
export type CreateMLSListingResultInputType = z.infer<typeof CreateMLSListingResultInputSchema>;