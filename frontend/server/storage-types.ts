import type {
  Property,
  InsertProperty,
  Issue,
  InsertIssue,
  User,
  SavedProperty,
} from "@shared/schema";

/**
 * The storage contract the API routes are written against.
 *
 * Kept in its own module (types only, no runtime imports) so that concrete
 * implementations — DatabaseStorage, PlatformStorage — can depend on it
 * without importing each other.
 */
export interface IStorage {
  getProperty(id: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<void>;

  getIssuesByPropertyId(propertyId: string): Promise<Issue[]>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  deleteIssuesByPropertyId(propertyId: string): Promise<void>;

  createUser(email: string, name: string, passwordHash: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;

  saveProperty(userId: string, propertyId: string): Promise<SavedProperty>;
  unsaveProperty(userId: string, propertyId: string): Promise<void>;
  getSavedProperties(userId: string): Promise<(SavedProperty & { property: Property })[]>;
  /** Raw join rows, without resolving the property body. */
  getSavedPropertyRows(userId: string): Promise<SavedProperty[]>;
  isPropertySaved(userId: string, propertyId: string): Promise<boolean>;
}
