import type {
  Property,
  InsertProperty,
  Issue,
  InsertIssue,
  User,
  SavedProperty,
} from "@shared/schema";
import type { IStorage } from "../storage-types";
import { PlatformClient, PlatformError } from "./client";
import { mapReportToProperty, mapInsightsToIssues, scoreFromInsights, type MappedProperty } from "./mapper";
import type { MLSListingResult, PropertyInsightsResult, PropertySummaryResult } from "./types";

/**
 * Reads properties from the Inzly data platform instead of the local database.
 *
 * Everything the platform does not model — AI-generated issues, user accounts,
 * saved homes — is delegated to the database implementation passed in, so this
 * is a partial overlay rather than a replacement.
 */
export class PlatformStorage implements IStorage {
  constructor(
    private readonly db: IStorage,
    private readonly client: PlatformClient,
  ) {}

  private async mlsByAddress(): Promise<Map<string, MLSListingResult>> {
    try {
      const listings = await this.client.listMlsListingResults();
      return new Map(
        listings
          .filter((l) => l.status === "completed" && l.listing_data?.address)
          .map((l) => [normalizeAddress(l.listing_data.address), l]),
      );
    } catch {
      // MLS is an optional enrichment; a property without photos still renders.
      return new Map();
    }
  }

  async getAllProperties(): Promise<Property[]> {
    const [requests, mls] = await Promise.all([
      this.client.listAddressRequests(),
      this.mlsByAddress(),
    ]);

    const properties = await Promise.all(
      requests.map(async (request) => {
        const report =
          request.status === "processed"
            ? await this.client.getLatestReport(request.id).catch(() => undefined)
            : undefined;
        return mapReportToProperty(request, report, mls.get(normalizeAddress(request.address)));
      }),
    );

    return properties;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const request = await this.client.getAddressRequest(id);
    if (!request) return undefined;

    const [report, mls, insights, summary] = await Promise.all([
      this.client.getLatestReport(id).catch(() => undefined),
      this.mlsByAddress(),
      this.client.getLatestInsights(id).catch(() => undefined),
      this.client.getLatestSummary(id).catch(() => undefined),
    ]);

    const property = mapReportToProperty(
      request,
      report,
      mls.get(normalizeAddress(request.address)),
    );

    return withInsights(withSummary(property, summary), insights, Boolean(summary && summary.status !== "failed"));
  }

  /**
   * Submitting a property means asking the platform to process an address.
   * The returned property is a pending shell — the pipeline fills it in, and
   * the UI polls until status flips to "processed".
   */
  async createProperty(property: InsertProperty): Promise<Property> {
    const address = [property.address, property.city, `${property.state} ${property.zip}`.trim()]
      .filter(Boolean)
      .join(", ");

    const request = await this.client.createAddressRequest(address);
    return mapReportToProperty(request);
  }

  async updateProperty(): Promise<Property | undefined> {
    throw new PlatformError(
      "Properties are derived from platform reports and cannot be edited directly",
      405,
      "/address-requests",
    );
  }

  async deleteProperty(id: string): Promise<void> {
    await this.client.deleteAddressRequest(id);
    await this.db.deleteIssuesByPropertyId(id);
  }

  // --- Not modelled by the platform: delegated to the database -------------

  /**
   * Photo-analysis findings from the platform, when it has any.
   *
   * Falls back to the database so properties analysed by the older text-only
   * endpoint keep rendering while the pipeline is being rolled out.
   */
  async getIssuesByPropertyId(propertyId: string): Promise<Issue[]> {
    // Three tiers, most curated first: the Summary Agent's chosen concerns
    // and positives, then the full unreconciled insight set (mid-rollout, or
    // if the summary step hasn't run yet), then the database.
    const summary = await this.client.getLatestSummary(propertyId).catch(() => undefined);
    if (summary && (summary.topConcerns.length > 0 || summary.topPositives.length > 0)) {
      return mapInsightsToIssues(propertyId, [...summary.topConcerns, ...summary.topPositives]);
    }

    const insights = await this.client.getLatestInsights(propertyId).catch(() => undefined);
    if (insights && insights.insights.length > 0) {
      return mapInsightsToIssues(propertyId, insights.insights);
    }

    return this.db.getIssuesByPropertyId(propertyId);
  }

  createIssue(issue: InsertIssue): Promise<Issue> {
    return this.db.createIssue(issue);
  }

  deleteIssuesByPropertyId(propertyId: string): Promise<void> {
    return this.db.deleteIssuesByPropertyId(propertyId);
  }

  createUser(email: string, name: string, passwordHash: string): Promise<User> {
    return this.db.createUser(email, name, passwordHash);
  }

  getUserByEmail(email: string): Promise<User | undefined> {
    return this.db.getUserByEmail(email);
  }

  getUserById(id: string): Promise<User | undefined> {
    return this.db.getUserById(id);
  }

  saveProperty(userId: string, propertyId: string): Promise<SavedProperty> {
    return this.db.saveProperty(userId, propertyId);
  }

  unsaveProperty(userId: string, propertyId: string): Promise<void> {
    return this.db.unsaveProperty(userId, propertyId);
  }

  getSavedPropertyRows(userId: string): Promise<SavedProperty[]> {
    return this.db.getSavedPropertyRows(userId);
  }

  /** Saved rows live in Postgres, but the property bodies come from the platform. */
  async getSavedProperties(userId: string): Promise<(SavedProperty & { property: Property })[]> {
    const saved = await this.db.getSavedPropertyRows(userId);
    const results: (SavedProperty & { property: Property })[] = [];

    for (const row of saved) {
      const property = await this.getProperty(row.propertyId).catch(() => undefined);
      if (property) results.push({ ...row, property });
    }

    return results;
  }

  isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
    return this.db.isPropertySaved(userId, propertyId);
  }
}

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/\s+/g, " ").trim();
}

export type { MappedProperty };

/**
 * Fold a photo-analysis report into the property.
 *
 * The analyst's photo manifest becomes the property's images, because insight
 * evidence cites those ids — using them here is what lets the UI put a marker
 * on the right photo. The Inzly Score comes from the findings rather than being
 * left null.
 */
/**
 * Fold the Summary Agent's synthesis into the property's description.
 *
 * The headline and assessment are the report — written by the one step that
 * reasons across every category and the full permit history, rather than the
 * raw per-category text a single agent produced in isolation. Runs before
 * `withInsights`, which still supplies images and, when no summary exists
 * yet, the fallback score.
 */
function withSummary(
  property: MappedProperty,
  summary?: PropertySummaryResult,
): MappedProperty {
  if (!summary || summary.status === "failed") return property;

  return {
    ...property,
    description: `${summary.headline} ${summary.overallAssessment}`.trim(),
    foundlyScore: scoreFromCondition(summary.overallCondition, summary.counts),
  };
}

/** Deterministic 0-100 score from the Summary Agent's own condition call. */
function scoreFromCondition(
  condition: PropertySummaryResult["overallCondition"],
  counts: PropertySummaryResult["counts"],
): number {
  const base = { excellent: 92, good: 78, fair: 60, poor: 38 }[condition] ?? 60;
  const penalty = counts.critical * 8 + counts.warning * 2;
  const bonus = counts.good;
  return Math.max(0, Math.min(100, Math.round(base - penalty + bonus)));
}

function withInsights(
  property: MappedProperty,
  insights?: PropertyInsightsResult,
  /** True once withSummary has already set the score — don't overwrite it. */
  scoreFromSummary = false,
): MappedProperty {
  if (!insights || insights.status === "failed") return property;

  return {
    ...property,
    images: insights.photos.length
      ? insights.photos.map((photo, index) => ({
          id: photo.id,
          url: photo.url,
          label: photo.label ?? `Photo ${index + 1}`,
        }))
      : property.images,
    foundlyScore:
      scoreFromSummary || !insights.insights.length
        ? property.foundlyScore
        : scoreFromInsights(insights.insights),
  };
}
