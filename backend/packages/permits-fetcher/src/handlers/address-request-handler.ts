import {
  EventEnvelope,
  AddressRequest,
  getPermitHistoryResultRepository,
} from '@bones-report/shared';
import { createPermitProvider, type PermitProvider } from '../services/index.js';

/**
 * Pull permit history when an address enters processing, so it is on record
 * before the photo agents run and can be handed to them as constraints.
 */
export class PermitsAddressRequestHandler {
  private readonly provider: PermitProvider;

  constructor() {
    this.provider = createPermitProvider();
  }

  async handleCreate(envelope: EventEnvelope): Promise<void> {
    const request = envelope.data as AddressRequest;

    if (request.status !== 'processing') {
      console.log(
        `ℹ️ [permits] Skipping ${request.id} — status is '${request.status}', not 'processing'`,
      );
      return;
    }

    const repo = getPermitHistoryResultRepository();

    // Events redeliver; don't pay for the same lookup twice.
    const existing = await repo.findByAddressRequestId(request.id);
    if (existing.some((r) => r.status !== 'failed')) {
      console.log(`ℹ️ [permits] History already on record for ${request.id}, skipping`);
      return;
    }

    console.log(`🏗️ [permits] Looking up permits for ${request.address}`);

    try {
      const lookup = await this.provider.getPermits(request.address);

      const stored = await repo.create({
        address_request_id: request.id,
        status: lookup.permits.length > 0 ? 'completed' : 'not_found',
        source: this.provider.name,
        matchedAddress: lookup.matchedAddress,
        geoId: lookup.geoId,
        permits: lookup.permits,
      });

      if (lookup.permits.length === 0) {
        console.log(`ℹ️ [permits] No permits found for ${request.address}`);
        return;
      }

      const newest = lookup.permits[0];
      console.log(
        `✅ [permits] ${stored.id}: ${lookup.permits.length} permits, ` +
          `most recent ${newest.issueDate ?? 'undated'} (${newest.tags.join(', ') || 'untagged'})`,
      );
    } catch (error) {
      console.error('❌ [permits] Lookup failed:', error);
      await repo
        .create({
          address_request_id: request.id,
          status: 'failed',
          source: this.provider.name,
          permits: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .catch((e: unknown) => console.error('❌ [permits] Could not record failure:', e));
    }
  }

  async handleUpdate(envelope: EventEnvelope): Promise<void> {
    const update = envelope.data as { id: string; status?: string };
    if (update.status !== 'processing') return;

    // Update events carry only the changed fields; the handler needs the whole
    // record, and the address in particular.
    const { getAddressRequestRepository } = await import('@bones-report/shared');
    const full = await getAddressRequestRepository()
      .findById(update.id)
      .catch(() => null);

    if (!full) {
      console.error(`❌ [permits] AddressRequest ${update.id} not found`);
      return;
    }

    await this.handleCreate({ ...envelope, data: full });
  }
}
