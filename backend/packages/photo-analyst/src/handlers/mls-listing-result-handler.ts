import {
  EventEnvelope,
  MLSListingResult,
  getPropertyInsightsResultRepository,
  getMLSListingRequestRepository,
  getAddressRequestRepository,
} from '@bones-report/shared';
import { PhotoAnalyst } from '../services/analyst.js';
import { createVisionProvider } from '../providers/index.js';

/**
 * Photos arrive with the MLS listing result, so that is what triggers analysis.
 */
export class MLSListingResultHandler {
  private readonly analyst: PhotoAnalyst;

  constructor() {
    this.analyst = new PhotoAnalyst(createVisionProvider());
  }

  async handleCreate(envelope: EventEnvelope): Promise<void> {
    const result = envelope.data as MLSListingResult;

    if (result.status !== 'completed') {
      console.log(`ℹ️ [photo-analyst] Skipping ${result.id} — status is '${result.status}'`);
      return;
    }

    const photoUrls = result.listing_data?.photo_urls ?? [];
    if (photoUrls.length === 0) {
      console.log(`ℹ️ [photo-analyst] Skipping ${result.id} — no photos in listing`);
      return;
    }

    const addressRequestId = await this.resolveAddressRequestId(result);
    if (!addressRequestId) {
      console.warn(
        `⚠️ [photo-analyst] No address request matches listing ${result.id}; cannot attach insights`,
      );
      return;
    }

    const repo = getPropertyInsightsResultRepository();

    // Events redeliver. Analysis is the most expensive thing in the pipeline,
    // so check before spending.
    const existing = await repo.findByAddressRequestId(addressRequestId);
    if (existing.some((r: { status: string }) => r.status !== 'failed')) {
      console.log(
        `ℹ️ [photo-analyst] Insights already exist for address request ${addressRequestId}, skipping`,
      );
      return;
    }

    console.log(
      `📸 [photo-analyst] Analysing ${photoUrls.length} photos for ${result.listing_data.address}`,
    );

    try {
      const { result: insights, usage, failures } = await this.analyst.analyse(
        addressRequestId,
        photoUrls,
      );

      const stored = await repo.create(insights);

      const cacheRate =
        usage.cacheReadTokens + usage.inputTokens > 0
          ? Math.round(
              (usage.cacheReadTokens / (usage.cacheReadTokens + usage.inputTokens)) * 100,
            )
          : 0;

      console.log(
        `✅ [photo-analyst] ${stored.id}: ${insights.insights.length} insights across ` +
          `${insights.categories.length} categories (${insights.summary.overallCondition})`,
      );
      console.log(
        `📊 [photo-analyst] tokens in=${usage.inputTokens} out=${usage.outputTokens} ` +
          `cached=${usage.cacheReadTokens} (${cacheRate}% of input served from cache)`,
      );
      if (failures.length > 0) {
        console.warn(
          `⚠️ [photo-analyst] ${failures.length} categories failed: ${failures
            .map((f) => f.category)
            .join(', ')}`,
        );
      }
    } catch (error) {
      console.error('❌ [photo-analyst] Analysis failed:', error);
      await repo
        .create({
          address_request_id: addressRequestId,
          status: 'failed',
          photos: [],
          categories: [],
          insights: [],
          summary: {
            overallCondition: 'fair',
            headline: 'Photo analysis could not be completed.',
            counts: { critical: 0, warning: 0, info: 0, good: 0 },
            estimatedCostRange: null,
          },
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .catch((e: unknown) => console.error('❌ [photo-analyst] Could not record failure:', e));
    }
  }

  /**
   * MLS listings and address requests are joined by address today. That is
   * fragile and documented as an open question in docs/INTEGRATION.md.
   */
  private async resolveAddressRequestId(result: MLSListingResult): Promise<string | null> {
    const listingRequest = await getMLSListingRequestRepository()
      .findById(result.mls_listing_request_id)
      .catch(() => null);

    const address = listingRequest?.address ?? result.listing_data?.address;
    if (!address) return null;

    const normalised = normalise(address);
    const requests = await getAddressRequestRepository().findAll();
    const match = requests.find((r) => normalise(r.address) === normalised);

    return match?.id ?? null;
  }
}

function normalise(address: string): string {
  return address.toLowerCase().replace(/\s+/g, ' ').trim();
}
