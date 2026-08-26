// PermitHistoryResult repository — building permits on record for a property.
import { z } from 'zod';
import { BaseRepository } from './base.js';
import { PermitHistoryResult } from '../permits.js';
import {
  PermitHistoryResultSchema,
  CreatePermitHistoryResultInputSchema,
  CreatePermitHistoryResultInputType,
} from '../schemas/permits.js';
import { EVENT_TOPICS, EventTopic } from '../events.js';
import { generateId, createTimestamp } from '../utils.js';

export class PermitHistoryResultRepository extends BaseRepository<
  PermitHistoryResult,
  CreatePermitHistoryResultInputType,
  Partial<CreatePermitHistoryResultInputType>
> {
  constructor() {
    super('permit_history_result', 'PermitHistoryResult');
  }

  protected getCreateSchema(): z.ZodSchema<CreatePermitHistoryResultInputType> {
    return CreatePermitHistoryResultInputSchema;
  }

  protected getUpdateSchema(): z.ZodSchema<Partial<CreatePermitHistoryResultInputType>> {
    return CreatePermitHistoryResultInputSchema.partial();
  }

  protected getEntitySchema(): z.ZodSchema<PermitHistoryResult> {
    return PermitHistoryResultSchema as unknown as z.ZodSchema<PermitHistoryResult>;
  }

  protected createEntity(input: CreatePermitHistoryResultInputType): PermitHistoryResult {
    return {
      id: generateId(),
      address_request_id: input.address_request_id,
      status: input.status || 'completed',
      created_at: createTimestamp(),
      source: input.source,
      matchedAddress: input.matchedAddress,
      geoId: input.geoId,
      permits: input.permits,
      error: input.error,
    } as PermitHistoryResult;
  }

  protected updateEntity(
    existing: PermitHistoryResult,
    input: Partial<CreatePermitHistoryResultInputType>,
  ): PermitHistoryResult {
    return {
      ...existing,
      ...input,
      id: existing.id,
      address_request_id: existing.address_request_id,
      created_at: existing.created_at,
    } as PermitHistoryResult;
  }

  protected getCreateEventTopic(): EventTopic {
    return EVENT_TOPICS.PERMIT_HISTORY_RESULT_CREATE;
  }

  protected getUpdateEventTopic(): EventTopic {
    return EVENT_TOPICS.PERMIT_HISTORY_RESULT_UPDATE;
  }

  public async findByAddressRequestId(addressRequestId: string): Promise<PermitHistoryResult[]> {
    const all = await this.findAll();
    return all.filter((r) => r.address_request_id === addressRequestId);
  }

  /** Most recent usable permit history for an address request. */
  public async getLatestForAddressRequest(
    addressRequestId: string,
  ): Promise<PermitHistoryResult | null> {
    const results = (await this.findByAddressRequestId(addressRequestId)).filter(
      (r) => r.status !== 'failed',
    );
    if (results.length === 0) return null;
    return results.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }
}

let repository: PermitHistoryResultRepository | null = null;

export function getPermitHistoryResultRepository(): PermitHistoryResultRepository {
  if (!repository) {
    repository = new PermitHistoryResultRepository();
  }
  return repository;
}
