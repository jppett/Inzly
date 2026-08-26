// MLSListingRequest repository implementation
import { z } from 'zod';
import { BaseRepository } from './base.js';
import { MLSListingRequest } from '../types.js';
import {
  MLSListingRequestSchema,
  CreateMLSListingRequestInputSchema,
  UpdateMLSListingRequestInputSchema,
  CreateMLSListingRequestInputType,
  UpdateMLSListingRequestInputType,
} from '../schemas/index.js';
import { EVENT_TOPICS, EventTopic } from '../events.js';
import { generateId, createTimestamp } from '../utils.js';

export class MLSListingRequestRepository extends BaseRepository<
  MLSListingRequest,
  CreateMLSListingRequestInputType,
  UpdateMLSListingRequestInputType
> {
  constructor() {
    super('mls_listing_request', 'MLSListingRequest');
  }

  protected getCreateSchema(): z.ZodSchema<CreateMLSListingRequestInputType> {
    return CreateMLSListingRequestInputSchema;
  }

  protected getUpdateSchema(): z.ZodSchema<UpdateMLSListingRequestInputType> {
    return UpdateMLSListingRequestInputSchema;
  }

  protected getEntitySchema(): z.ZodSchema<MLSListingRequest> {
    return MLSListingRequestSchema;
  }

  protected createEntity(input: CreateMLSListingRequestInputType): MLSListingRequest {
    return {
      id: generateId(),
      address: input.address,
      created_at: createTimestamp(),
      status: 'pending',
    };
  }

  protected updateEntity(
    existing: MLSListingRequest, 
    input: UpdateMLSListingRequestInputType
  ): MLSListingRequest {
    return {
      ...existing,
      ...input,
      // Don't allow updating id or created_at
      id: existing.id,
      created_at: existing.created_at,
    };
  }

  protected getCreateEventTopic(): EventTopic {
    return EVENT_TOPICS.MLS_LISTING_REQUEST_CREATE;
  }

  protected getUpdateEventTopic(): EventTopic {
    return EVENT_TOPICS.MLS_LISTING_REQUEST_UPDATE;
  }

  // Custom query methods
  public async findByStatus(status: MLSListingRequest['status']): Promise<MLSListingRequest[]> {
    const all = await this.findAll();
    return all.filter(request => request.status === status);
  }

  public async findPending(): Promise<MLSListingRequest[]> {
    return this.findByStatus('pending');
  }

  public async findProcessed(): Promise<MLSListingRequest[]> {
    return this.findByStatus('processed');
  }

  public async findFailed(): Promise<MLSListingRequest[]> {
    return this.findByStatus('failed');
  }

  public async findByAddress(address: string): Promise<MLSListingRequest[]> {
    const all = await this.findAll();
    const normalizedAddress = address.toLowerCase().trim();
    return all.filter(request => 
      request.address.toLowerCase().trim() === normalizedAddress
    );
  }

  // Update status helper methods
  public async markAsProcessed(id: string): Promise<MLSListingRequest> {
    return this.update(id, { status: 'processed' });
  }

  public async markAsFailed(id: string): Promise<MLSListingRequest> {
    return this.update(id, { status: 'failed' });
  }

  // Get latest request for an address
  public async getLatestForAddress(address: string): Promise<MLSListingRequest | null> {
    const requests = await this.findByAddress(address);
    if (requests.length === 0) {
      return null;
    }

    // Sort by created_at descending and return the first one
    return requests.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }
}

// Singleton instance
let mlsListingRequestRepository: MLSListingRequestRepository | null = null;

export function getMLSListingRequestRepository(): MLSListingRequestRepository {
  if (!mlsListingRequestRepository) {
    mlsListingRequestRepository = new MLSListingRequestRepository();
  }
  return mlsListingRequestRepository;
}