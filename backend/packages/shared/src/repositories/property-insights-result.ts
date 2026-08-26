// PropertyInsightsResult repository — stores photo-analyst output.
import { z } from 'zod';
import { BaseRepository } from './base.js';
import { PropertyInsightsResult } from '../insights.js';
import {
  PropertyInsightsResultSchema,
  CreatePropertyInsightsResultInputSchema,
  CreatePropertyInsightsResultInputType,
} from '../schemas/insights.js';
import { EVENT_TOPICS, EventTopic } from '../events.js';
import { generateId, createTimestamp } from '../utils.js';

export class PropertyInsightsResultRepository extends BaseRepository<
  PropertyInsightsResult,
  CreatePropertyInsightsResultInputType,
  Partial<CreatePropertyInsightsResultInputType>
> {
  constructor() {
    super('property_insights_result', 'PropertyInsightsResult');
  }

  protected getCreateSchema(): z.ZodSchema<CreatePropertyInsightsResultInputType> {
    return CreatePropertyInsightsResultInputSchema;
  }

  protected getUpdateSchema(): z.ZodSchema<Partial<CreatePropertyInsightsResultInputType>> {
    return CreatePropertyInsightsResultInputSchema.partial();
  }

  protected getEntitySchema(): z.ZodSchema<PropertyInsightsResult> {
    return PropertyInsightsResultSchema as unknown as z.ZodSchema<PropertyInsightsResult>;
  }

  protected createEntity(input: CreatePropertyInsightsResultInputType): PropertyInsightsResult {
    return {
      id: generateId(),
      address_request_id: input.address_request_id,
      status: input.status || 'completed',
      created_at: createTimestamp(),
      model: input.model,
      photos: input.photos,
      categories: input.categories,
      insights: input.insights,
      summary: input.summary,
      error: input.error,
    } as PropertyInsightsResult;
  }

  protected updateEntity(
    existing: PropertyInsightsResult,
    input: Partial<CreatePropertyInsightsResultInputType>,
  ): PropertyInsightsResult {
    return {
      ...existing,
      ...input,
      id: existing.id,
      address_request_id: existing.address_request_id,
      created_at: existing.created_at,
    } as PropertyInsightsResult;
  }

  protected getCreateEventTopic(): EventTopic {
    return EVENT_TOPICS.PROPERTY_INSIGHTS_RESULT_CREATE;
  }

  protected getUpdateEventTopic(): EventTopic {
    return EVENT_TOPICS.PROPERTY_INSIGHTS_RESULT_UPDATE;
  }

  public async findByAddressRequestId(addressRequestId: string): Promise<PropertyInsightsResult[]> {
    const all = await this.findAll();
    return all.filter((r) => r.address_request_id === addressRequestId);
  }

  /** Most recent usable report for an address request. */
  public async getLatestForAddressRequest(
    addressRequestId: string,
  ): Promise<PropertyInsightsResult | null> {
    const results = (await this.findByAddressRequestId(addressRequestId)).filter(
      (r) => r.status !== 'failed',
    );
    if (results.length === 0) return null;
    return results.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }
}

let repository: PropertyInsightsResultRepository | null = null;

export function getPropertyInsightsResultRepository(): PropertyInsightsResultRepository {
  if (!repository) {
    repository = new PropertyInsightsResultRepository();
  }
  return repository;
}
