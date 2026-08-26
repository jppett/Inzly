// BonesReportResult repository implementation
import { z } from 'zod';
import { BaseRepository } from './base.js';
import { BonesReportResult } from '../types.js';
import {
  BonesReportResultSchema,
  CreateBonesReportResultInputSchema,
  CreateBonesReportResultInputType,
} from '../schemas/index.js';
import { EVENT_TOPICS, EventTopic } from '../events.js';
import { generateId, createTimestamp } from '../utils.js';

export class BonesReportResultRepository extends BaseRepository<
  BonesReportResult,
  CreateBonesReportResultInputType,
  Partial<CreateBonesReportResultInputType>
> {
  constructor() {
    super('bones_report_result', 'BonesReportResult');
  }

  protected getCreateSchema(): z.ZodSchema<CreateBonesReportResultInputType> {
    return CreateBonesReportResultInputSchema;
  }

  protected getUpdateSchema(): z.ZodSchema<Partial<CreateBonesReportResultInputType>> {
    return CreateBonesReportResultInputSchema.partial();
  }

  protected getEntitySchema(): z.ZodSchema<BonesReportResult> {
    return BonesReportResultSchema;
  }

  protected createEntity(input: CreateBonesReportResultInputType): BonesReportResult {
    return {
      id: generateId(),
      address_request_id: input.address_request_id,
      report_data: input.report_data,
      created_at: createTimestamp(),
      status: input.status || 'completed',
    };
  }

  protected updateEntity(
    existing: BonesReportResult, 
    input: Partial<CreateBonesReportResultInputType>
  ): BonesReportResult {
    return {
      ...existing,
      ...input,
      // Don't allow updating id, address_request_id, or created_at
      id: existing.id,
      address_request_id: existing.address_request_id,
      created_at: existing.created_at,
    };
  }

  protected getCreateEventTopic(): EventTopic {
    return EVENT_TOPICS.BONES_REPORT_RESULT_CREATE;
  }

  protected getUpdateEventTopic(): EventTopic {
    return EVENT_TOPICS.BONES_REPORT_RESULT_UPDATE;
  }

  // Custom query methods
  public async findByAddressRequestId(addressRequestId: string): Promise<BonesReportResult[]> {
    const all = await this.findAll();
    return all.filter(result => result.address_request_id === addressRequestId);
  }

  public async findByStatus(status: BonesReportResult['status']): Promise<BonesReportResult[]> {
    const all = await this.findAll();
    return all.filter(result => result.status === status);
  }

  public async findCompleted(): Promise<BonesReportResult[]> {
    return this.findByStatus('completed');
  }

  public async findFailed(): Promise<BonesReportResult[]> {
    return this.findByStatus('failed');
  }

  // Get the latest result for an address request
  public async getLatestForAddressRequest(addressRequestId: string): Promise<BonesReportResult | null> {
    const results = await this.findByAddressRequestId(addressRequestId);
    if (results.length === 0) {
      return null;
    }

    // Sort by created_at descending and return the first one
    return results.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }

  // Helper method to mark as failed
  public async markAsFailed(id: string): Promise<BonesReportResult> {
    return this.update(id, { status: 'failed' });
  }
}

// Singleton instance
let bonesReportResultRepository: BonesReportResultRepository | null = null;

export function getBonesReportResultRepository(): BonesReportResultRepository {
  if (!bonesReportResultRepository) {
    bonesReportResultRepository = new BonesReportResultRepository();
  }
  return bonesReportResultRepository;
}