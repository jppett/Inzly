import {
  EventEnvelope,
  PropertyInsightsResult,
  PermitHistoryResult,
  getPropertyInsightsResultRepository,
  getPermitHistoryResultRepository,
} from '@bones-report/shared';
import { SummaryHandler } from '@bones-report/photo-analyst';

/**
 * Fires the Summary Agent once an address request has both photo insights and
 * a permit lookup on record.
 *
 * Deliberately separate from CompletionHandler's `AddressRequest.processed`
 * logic: that status predates photo analysis and permits, existing consumers
 * key off it, and the property basics (RentCast + MLS) are typically ready
 * long before photos finish. Making "processed" wait on the summary would
 * slow down a signal other things already depend on. This handler adds a
 * second, independent readiness check purely for the summary.
 *
 * Permits are required-but-tolerant: a `not_found` permit result still counts
 * as "we tried," so a property with no permit history on record does not
 * block its summary forever.
 */
export class SummaryTriggerHandler {
  private readonly summaryHandler: SummaryHandler;

  constructor(summaryHandler = new SummaryHandler()) {
    this.summaryHandler = summaryHandler;
  }

  async handlePropertyInsightsCreate(envelope: EventEnvelope): Promise<void> {
    const insights = envelope.data as PropertyInsightsResult;
    if (insights.status === 'failed' || insights.insights.length === 0) {
      console.log(
        `ℹ️ [summary-trigger] PropertyInsightsResult ${insights.id} has no usable findings, skipping`,
      );
      return;
    }
    await this.checkAndTrigger(insights.address_request_id, 'PropertyInsightsResult');
  }

  async handlePermitHistoryCreate(envelope: EventEnvelope): Promise<void> {
    const permits = envelope.data as PermitHistoryResult;
    await this.checkAndTrigger(permits.address_request_id, 'PermitHistoryResult');
  }

  private async checkAndTrigger(addressRequestId: string, triggeredBy: string): Promise<void> {
    try {
      const [insights, permits] = await Promise.all([
        getPropertyInsightsResultRepository().getLatestForAddressRequest(addressRequestId),
        getPermitHistoryResultRepository().getLatestForAddressRequest(addressRequestId),
      ]);

      // Permits are optional in the sense that "not_found" still counts as
      // ready — getLatestForAddressRequest already filters out only 'failed',
      // so a present-but-empty lookup satisfies this.
      const permitAttempted =
        permits !== null ||
        (await getPermitHistoryResultRepository().findByAddressRequestId(addressRequestId))
          .length > 0;

      if (!insights || insights.insights.length === 0) {
        console.log(`ℹ️ [summary-trigger] ${addressRequestId} has no insights yet, waiting`);
        return;
      }
      if (!permitAttempted) {
        console.log(`ℹ️ [summary-trigger] ${addressRequestId} has no permit lookup yet, waiting`);
        return;
      }

      console.log(
        `🎯 [summary-trigger] ${addressRequestId} ready (triggered by ${triggeredBy}), running Summary Agent`,
      );
      await this.summaryHandler.summariseAddressRequest(addressRequestId);
    } catch (error) {
      console.error(`❌ [summary-trigger] Error checking ${addressRequestId}:`, error);
    }
  }
}
