// MLSListingResult repository implementation
import { z } from 'zod';
import { BaseRepository } from './base.js';
import { MLSListingResult } from '../types.js';
import {
  MLSListingResultSchema,
  CreateMLSListingResultInputSchema,
  CreateMLSListingResultInputType,
} from '../schemas/index.js';
import { EVENT_TOPICS, EventTopic } from '../events.js';
import { generateId, createTimestamp } from '../utils.js';

export class MLSListingResultRepository extends BaseRepository<
  MLSListingResult,
  CreateMLSListingResultInputType,
  Partial<CreateMLSListingResultInputType>
> {
  constructor() {
    super('mls_listing_result', 'MLSListingResult');
  }

  protected getCreateSchema(): z.ZodSchema<CreateMLSListingResultInputType> {
    return CreateMLSListingResultInputSchema;
  }

  protected getUpdateSchema(): z.ZodSchema<Partial<CreateMLSListingResultInputType>> {
    return CreateMLSListingResultInputSchema.partial();
  }

  protected getEntitySchema(): z.ZodSchema<MLSListingResult> {
    return MLSListingResultSchema;
  }

  protected createEntity(input: CreateMLSListingResultInputType): MLSListingResult {
    return {
      id: generateId(),
      mls_listing_request_id: input.mls_listing_request_id,
      listing_data: input.listing_data,
      created_at: createTimestamp(),
      status: input.status || 'completed',
    };
  }

  protected updateEntity(
    existing: MLSListingResult, 
    input: Partial<CreateMLSListingResultInputType>
  ): MLSListingResult {
    return {
      ...existing,
      ...input,
      // Don't allow updating id, mls_listing_request_id, or created_at
      id: existing.id,
      mls_listing_request_id: existing.mls_listing_request_id,
      created_at: existing.created_at,
    };
  }

  protected getCreateEventTopic(): EventTopic {
    return EVENT_TOPICS.MLS_LISTING_RESULT_CREATE;
  }

  protected getUpdateEventTopic(): EventTopic {
    return EVENT_TOPICS.MLS_LISTING_RESULT_UPDATE;
  }

  // Custom query methods
  public async findByMLSListingRequestId(mlsListingRequestId: string): Promise<MLSListingResult[]> {
    const all = await this.findAll();
    return all.filter(result => result.mls_listing_request_id === mlsListingRequestId);
  }

  public async findByStatus(status: MLSListingResult['status']): Promise<MLSListingResult[]> {
    const all = await this.findAll();
    return all.filter(result => result.status === status);
  }

  public async findCompleted(): Promise<MLSListingResult[]> {
    return this.findByStatus('completed');
  }

  public async findFailed(): Promise<MLSListingResult[]> {
    return this.findByStatus('failed');
  }

  public async findByAddress(address: string): Promise<MLSListingResult[]> {
    const all = await this.findAll();
    const normalizedAddress = address.toLowerCase().trim();
    return all.filter(result => 
      result.listing_data.address.toLowerCase().trim() === normalizedAddress
    );
  }

  public async findByPriceRange(minPrice: number, maxPrice: number): Promise<MLSListingResult[]> {
    const all = await this.findAll();
    return all.filter(result => 
      result.listing_data.price >= minPrice && result.listing_data.price <= maxPrice
    );
  }

  public async findByBedrooms(bedrooms: number): Promise<MLSListingResult[]> {
    const all = await this.findAll();
    return all.filter(result => result.listing_data.bedrooms === bedrooms);
  }

  // Get the latest result for an MLS listing request
  public async getLatestForMLSListingRequest(mlsListingRequestId: string): Promise<MLSListingResult | null> {
    const results = await this.findByMLSListingRequestId(mlsListingRequestId);
    if (results.length === 0) {
      return null;
    }

    // Sort by created_at descending and return the first one
    return results.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }

  // Helper method to mark as failed
  public async markAsFailed(id: string): Promise<MLSListingResult> {
    return this.update(id, { status: 'failed' });
  }

  // Get all results for a specific address (across all requests)
  public async getAllForAddress(address: string): Promise<MLSListingResult[]> {
    return this.findByAddress(address);
  }
}

// Singleton instance
let mlsListingResultRepository: MLSListingResultRepository | null = null;

export function getMLSListingResultRepository(): MLSListingResultRepository {
  if (!mlsListingResultRepository) {
    mlsListingResultRepository = new MLSListingResultRepository();
  }
  return mlsListingResultRepository;
}