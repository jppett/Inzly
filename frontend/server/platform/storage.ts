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
import { mapReportToProperty, type MappedProperty } from "./mapper";
import type { MLSListingResult } from "./types";

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

    const [report, mls] = await Promise.all([
      this.client.getLatestReport(id).catch(() => undefined),
      this.mlsByAddress(),
    ]);

    return mapReportToProperty(request, report, mls.get(normalizeAddress(request.address)));
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

  getIssuesByPropertyId(propertyId: string): Promise<Issue[]> {
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
