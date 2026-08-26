// Validation utilities using Zod schemas
import {
  AddressRequestSchema,
  BonesReportResultSchema,
  MLSListingRequestSchema,
  MLSListingResultSchema,
  EventEnvelopeSchema,
  CreateAddressRequestInputSchema,
  UpdateAddressRequestInputSchema,
  CreateBonesReportResultInputSchema,
  CreateMLSListingRequestInputSchema,
  UpdateMLSListingRequestInputSchema,
  CreateMLSListingResultInputSchema,
} from '../schemas/index.js';

import type {
  AddressRequest,
  BonesReportResult,
  MLSListingRequest,
  MLSListingResult,
  EventEnvelope,
} from '../types.js';

import { ValidationError } from '../utils.js';
import { z } from 'zod';

// Validation result type
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// Generic validation function
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
  };
}

// Validation functions for each entity
export function validateAddressRequest(data: unknown): ValidationResult<AddressRequest> {
  return validate(AddressRequestSchema, data);
}

export function validateBonesReportResult(data: unknown): ValidationResult<BonesReportResult> {
  return validate(BonesReportResultSchema, data);
}

export function validateMLSListingRequest(data: unknown): ValidationResult<MLSListingRequest> {
  return validate(MLSListingRequestSchema, data);
}

export function validateMLSListingResult(data: unknown): ValidationResult<MLSListingResult> {
  return validate(MLSListingResultSchema, data);
}

export function validateEventEnvelope<T = any>(data: unknown): ValidationResult<EventEnvelope<T>> {
  const result = validate(EventEnvelopeSchema, data);
  return result as ValidationResult<EventEnvelope<T>>;
}

// Input validation functions
export function validateCreateAddressRequestInput(data: unknown) {
  return validate(CreateAddressRequestInputSchema, data);
}

export function validateUpdateAddressRequestInput(data: unknown) {
  return validate(UpdateAddressRequestInputSchema, data);
}

export function validateCreateBonesReportResultInput(data: unknown) {
  return validate(CreateBonesReportResultInputSchema, data);
}

export function validateCreateMLSListingRequestInput(data: unknown) {
  return validate(CreateMLSListingRequestInputSchema, data);
}

export function validateUpdateMLSListingRequestInput(data: unknown) {
  return validate(UpdateMLSListingRequestInputSchema, data);
}

export function validateCreateMLSListingResultInput(data: unknown) {
  return validate(CreateMLSListingResultInputSchema, data);
}

// Throwing validation functions (for when you want to throw on error)
export function validateAddressRequestOrThrow(data: unknown): AddressRequest {
  const result = validateAddressRequest(data);
  if (!result.success) {
    throw new ValidationError(`Address request validation failed: ${result.errors?.join(', ')}`);
  }
  return result.data!;
}

export function validateBonesReportResultOrThrow(data: unknown): BonesReportResult {
  const result = validateBonesReportResult(data);
  if (!result.success) {
    throw new ValidationError(`Bones report result validation failed: ${result.errors?.join(', ')}`);
  }
  return result.data!;
}

export function validateMLSListingRequestOrThrow(data: unknown): MLSListingRequest {
  const result = validateMLSListingRequest(data);
  if (!result.success) {
    throw new ValidationError(`MLS listing request validation failed: ${result.errors?.join(', ')}`);
  }
  return result.data!;
}

export function validateMLSListingResultOrThrow(data: unknown): MLSListingResult {
  const result = validateMLSListingResult(data);
  if (!result.success) {
    throw new ValidationError(`MLS listing result validation failed: ${result.errors?.join(', ')}`);
  }
  return result.data!;
}

export function validateEventEnvelopeOrThrow<T>(data: unknown): EventEnvelope<T> {
  const result = validateEventEnvelope<T>(data);
  if (!result.success) {
    throw new ValidationError(`Event envelope validation failed: ${result.errors?.join(', ')}`);
  }
  return result.data!;
}

// Partial validation (useful for updates)
export function validatePartialAddressRequest(data: unknown) {
  return validate(AddressRequestSchema.partial(), data);
}

export function validatePartialBonesReportResult(data: unknown) {
  return validate(BonesReportResultSchema.partial(), data);
}

export function validatePartialMLSListingRequest(data: unknown) {
  return validate(MLSListingRequestSchema.partial(), data);
}

export function validatePartialMLSListingResult(data: unknown) {
  return validate(MLSListingResultSchema.partial(), data);
}