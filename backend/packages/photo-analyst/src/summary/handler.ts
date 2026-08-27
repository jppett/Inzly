import {
  getPropertyInsightsResultRepository,
  getPermitHistoryResultRepository,
  getPropertySummaryResultRepository,
} from '@bones-report/shared';
import { SummaryAgent } from './agent.js';

/**
 * Runs the Summary Agent for an address request, once its inputs are ready.
 *
 * Callable directly (used by the CLI) or from an event trigger — it does not
 * assume how it was invoked, only that photo insights already exist. It waits
 * on permits only up to a timeout, since permits are an optional enrichment
 * everywhere else in this pipeline and a summary delayed indefinitely by a
 * slow or absent permit lookup would defeat the point of precomputing it.
 */
export class SummaryHandler {
  private readonly agent: SummaryAgent;

  constructor(agent = new SummaryAgent()) {
    this.agent = agent;
  }

  async summariseAddressRequest(addressRequestId: string): Promise<void> {
    const insightsRepo = getPropertyInsightsResultRepository();
    const permitsRepo = getPermitHistoryResultRepository();
    const summaryRepo = getPropertySummaryResultRepository();

    const insights = await insightsRepo.getLatestForAddressRequest(addressRequestId);
    if (!insights || insights.insights.length === 0) {
      console.log(`ℹ️ [summary] No usable insights yet for ${addressRequestId}, skipping`);
      return;
    }

    const existing = await summaryRepo.findByAddressRequestId(addressRequestId);
    if (existing.some((s) => s.status !== 'failed')) {
      console.log(`ℹ️ [summary] Summary already exists for ${addressRequestId}, skipping`);
      return;
    }

    const permits = await permitsRepo.getLatestForAddressRequest(addressRequestId).catch(() => null);

    console.log(
      `🧭 [summary] Synthesising ${insights.insights.length} findings` +
        (permits ? ` with ${permits.permits.length} permits` : ' (no permits on record)') +
        ` for ${addressRequestId}`,
    );

    try {
      const input = await this.agent.summarise(insights, permits);
      const stored = await summaryRepo.create(input);
      console.log(
        `✅ [summary] ${stored.id}: "${stored.headline}" ` +
          `(${stored.topConcerns.length} concerns, ${stored.topPositives.length} positives, ` +
          `${stored.corroboration.length} permit corroborations)`,
      );
    } catch (error) {
      console.error('❌ [summary] Synthesis failed:', error);
      await summaryRepo
        .create({
          address_request_id: addressRequestId,
          status: 'failed',
          headline: '',
          overallAssessment: '',
          overallCondition: 'fair',
          topConcerns: [],
          topPositives: [],
          corroboration: [],
          estimatedCostRange: null,
          counts: { critical: 0, warning: 0, info: 0, good: 0 },
          categories: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .catch((e: unknown) => console.error('❌ [summary] Could not record failure:', e));
    }
  }
}
