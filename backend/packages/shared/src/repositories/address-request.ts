// AddressRequest repository implementation
import { z } from 'zod';
import { BaseRepository } from './base.js';
import { AddressRequest } from '../types.js';
import { 
  AddressRequestSchema, 
  CreateAddressRequestInputSchema,
  UpdateAddressRequestInputSchema,
  CreateAddressRequestInputType,
  UpdateAddressRequestInputType 
} from '../schemas/index.js';
import { EVENT_TOPICS, EventTopic } from '../events.js';
import { generateId, createTimestamp } from '../utils.js';

export class AddressRequestRepository extends BaseRepository<
  AddressRequest,
  CreateAddressRequestInputType,
  UpdateAddressRequestInputType
> {
  constructor() {
    super('address_request', 'AddressRequest');
  }

  protected getCreateSchema(): z.ZodSchema<CreateAddressRequestInputType> {
    return CreateAddressRequestInputSchema;
  }

  protected getUpdateSchema(): z.ZodSchema<UpdateAddressRequestInputType> {
    return UpdateAddressRequestInputSchema;
  }

  protected getEntitySchema(): z.ZodSchema<AddressRequest> {
    return AddressRequestSchema;
  }

  protected createEntity(input: CreateAddressRequestInputType): AddressRequest {
    return {
      id: generateId(),
      address: input.address,
      created_at: createTimestamp(),
      status: 'pending',
    };
  }

  protected updateEntity(
    existing: AddressRequest, 
    input: UpdateAddressRequestInputType
  ): AddressRequest {
    return {
      ...existing,
      ...input,
      // Don't allow updating id or created_at
      id: existing.id,
      created_at: existing.created_at,
    };
  }

  protected getCreateEventTopic(): EventTopic {
    return EVENT_TOPICS.ADDRESS_REQUEST_CREATE;
  }

  protected getUpdateEventTopic(): EventTopic {
    return EVENT_TOPICS.ADDRESS_REQUEST_UPDATE;
  }

  // Custom query methods
  public async findByStatus(status: AddressRequest['status']): Promise<AddressRequest[]> {
    const all = await this.findAll();
    return all.filter(request => request.status === status);
  }

  public async findPending(): Promise<AddressRequest[]> {
    return this.findByStatus('pending');
  }

  public async findProcessing(): Promise<AddressRequest[]> {
    return this.findByStatus('processing');
  }

  public async findCompleted(): Promise<AddressRequest[]> {
    return this.findByStatus('processed');
  }

  public async findByAddress(address: string): Promise<AddressRequest[]> {
    const all = await this.findAll();
    const normalizedAddress = address.toLowerCase().trim();
    return all.filter(request => 
      request.address.toLowerCase().trim() === normalizedAddress
    );
  }

  // Update status helper methods
  public async markAsProcessing(id: string): Promise<AddressRequest> {
    return this.update(id, { status: 'processing' });
  }

  public async markAsProcessed(id: string): Promise<AddressRequest> {
    return this.update(id, { status: 'processed' });
  }

  public async markAsFailed(id: string): Promise<AddressRequest> {
    return this.update(id, { status: 'failed' });
  }
}

// Singleton instance
let addressRequestRepository: AddressRequestRepository | null = null;

export function getAddressRequestRepository(): AddressRequestRepository {
  if (!addressRequestRepository) {
    addressRequestRepository = new AddressRequestRepository();
  }
  return addressRequestRepository;
}