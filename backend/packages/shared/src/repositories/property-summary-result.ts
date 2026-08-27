// PropertySummaryResult repository — the final buyer-facing synthesis.
import { z } from 'zod';
import { BaseRepository } from './base.js';
import { PropertySummaryResult } from '../summary.js';
import {
  PropertySummaryResultSchema,
  CreatePropertySummaryResultInputSchema,
  CreatePropertySummaryResultInputType,
} from '../schemas/summary.js';
import { EVENT_TOPICS, EventTopic } from '../events.js';
import { generateId, createTimestamp } from '../utils.js';

export class PropertySummaryResultRepository extends BaseRepository<
  PropertySummaryResult,
  CreatePropertySummaryResultInputType,
  Partial<CreatePropertySummaryResultInputType>
> {
  constructor() {
    super('property_summary_result', 'PropertySummaryResult');
  }

  protected getCreateSchema(): z.ZodSchema<CreatePropertySummaryResultInputType> {
    return CreatePropertySummaryResultInputSchema;
  }

  protected getUpdateSchema(): z.ZodSchema<Partial<CreatePropertySummaryResultInputType>> {
    return CreatePropertySummaryResultInputSchema.partial();
  }

  protected getEntitySchema(): z.ZodSchema<PropertySummaryResult> {
    return PropertySummaryResultSchema as unknown as z.ZodSchema<PropertySummaryResult>;
  }

  protected createEntity(input: CreatePropertySummaryResultInputType): PropertySummaryResult {
    return {
      id: generateId(),
      address_request_id: input.address_request_id,
      status: input.status || 'completed',
      created_at: createTimestamp(),
      model: input.model,
      headline: input.headline,
      overallAssessment: input.overallAssessment,
      overallCondition: input.overallCondition,
      topConcerns: input.topConcerns,
      topPositives: input.topPositives,
      corroboration: input.corroboration,
      estimatedCostRange: input.estimatedCostRange,
      counts: input.counts,
      categories: input.categories,
      error: input.error,
    } as PropertySummaryResult;
  }

  protected updateEntity(
    existing: PropertySummaryResult,
    input: Partial<CreatePropertySummaryResultInputType>,
  ): PropertySummaryResult {
    return {
      ...existing,
      ...input,
      id: existing.id,
      address_request_id: existing.address_request_id,
      created_at: existing.created_at,
    } as PropertySummaryResult;
  }

  protected getCreateEventTopic(): EventTopic {
    return EVENT_TOPICS.PROPERTY_SUMMARY_RESULT_CREATE;
  }

  protected getUpdateEventTopic(): EventTopic {
    return EVENT_TOPICS.PROPERTY_SUMMARY_RESULT_UPDATE;
  }

  public async findByAddressRequestId(addressRequestId: string): Promise<PropertySummaryResult[]> {
    const all = await this.findAll();
    return all.filter((r) => r.address_request_id === addressRequestId);
  }

  /** The current summary for a property — there is only ever meant to be one. */
  public async getLatestForAddressRequest(
    addressRequestId: string,
  ): Promise<PropertySummaryResult | null> {
    const results = (await this.findByAddressRequestId(addressRequestId)).filter(
      (r) => r.status !== 'failed',
    );
    if (results.length === 0) return null;
    return results.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }
}

let repository: PropertySummaryResultRepository | null = null;

export function getPropertySummaryResultRepository(): PropertySummaryResultRepository {
  if (!repository) {
    repository = new PropertySummaryResultRepository();
  }
  return repository;
}
