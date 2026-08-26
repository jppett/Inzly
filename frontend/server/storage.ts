import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, and } from "drizzle-orm";
import type { IStorage } from "./storage-types";
import { PlatformClient } from "./platform/client";
import { PlatformStorage } from "./platform/storage";
import {
  properties,
  issues,
  users,
  savedProperties,
  type Property,
  type InsertProperty,
  type Issue,
  type InsertIssue,
  type User,
  type SavedProperty,
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);


export class DatabaseStorage implements IStorage {
  async getProperty(id: string): Promise<Property | undefined> {
    const result = await db.select().from(properties).where(eq(properties.id, id));
    return result[0];
  }

  async getAllProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const result = await db.insert(properties).values(insertProperty).returning();
    return result[0];
  }

  async updateProperty(id: string, updateData: Partial<InsertProperty>): Promise<Property | undefined> {
    const result = await db
      .update(properties)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return result[0];
  }

  async deleteProperty(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  async getIssuesByPropertyId(propertyId: string): Promise<Issue[]> {
    return await db.select().from(issues).where(eq(issues.propertyId, propertyId));
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const result = await db.insert(issues).values(insertIssue).returning();
    return result[0];
  }

  async deleteIssuesByPropertyId(propertyId: string): Promise<void> {
    await db.delete(issues).where(eq(issues.propertyId, propertyId));
  }

  async createUser(email: string, name: string, passwordHash: string): Promise<User> {
    const result = await db.insert(users).values({ email, name, passwordHash }).returning();
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async saveProperty(userId: string, propertyId: string): Promise<SavedProperty> {
    const existing = await db.select().from(savedProperties).where(
      and(eq(savedProperties.userId, userId), eq(savedProperties.propertyId, propertyId))
    );
    if (existing.length > 0) return existing[0];
    const result = await db.insert(savedProperties).values({ userId, propertyId }).returning();
    return result[0];
  }

  async unsaveProperty(userId: string, propertyId: string): Promise<void> {
    await db.delete(savedProperties).where(
      and(eq(savedProperties.userId, userId), eq(savedProperties.propertyId, propertyId))
    );
  }

  async getSavedPropertyRows(userId: string): Promise<SavedProperty[]> {
    return await db.select().from(savedProperties).where(eq(savedProperties.userId, userId));
  }

  async getSavedProperties(userId: string): Promise<(SavedProperty & { property: Property })[]> {
    const saved = await this.getSavedPropertyRows(userId);
    const results: (SavedProperty & { property: Property })[] = [];
    for (const s of saved) {
      const prop = await this.getProperty(s.propertyId);
      if (prop) results.push({ ...s, property: prop });
    }
    return results;
  }

  async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
    const result = await db.select().from(savedProperties).where(
      and(eq(savedProperties.userId, userId), eq(savedProperties.propertyId, propertyId))
    );
    return result.length > 0;
  }
}

/**
 * Where property data comes from.
 *
 * - `database` (default) — the local Postgres tables, seeded via `npm run db:push`.
 * - `platform`           — the event-driven services in `backend/`, read over HTTP.
 *
 * Issues, users and saved homes always live in Postgres; see
 * server/platform/storage.ts.
 */
export type DataSource = "database" | "platform";

export const DATA_SOURCE: DataSource =
  process.env.INZLY_DATA_SOURCE === "platform" ? "platform" : "database";

function createStorage(): IStorage {
  const database = new DatabaseStorage();
  if (DATA_SOURCE !== "platform") return database;

  const baseUrl = process.env.PLATFORM_API_URL;
  if (!baseUrl) {
    throw new Error(
      "INZLY_DATA_SOURCE=platform requires PLATFORM_API_URL (e.g. http://localhost:8080)",
    );
  }

  console.log(`[storage] property data source: platform (${baseUrl})`);
  return new PlatformStorage(
    database,
    new PlatformClient({
      baseUrl,
      apiKey: process.env.PLATFORM_API_KEY,
      timeoutMs: Number(process.env.PLATFORM_API_TIMEOUT_MS ?? 10_000),
    }),
  );
}

export const storage: IStorage = createStorage();

export type { IStorage };
