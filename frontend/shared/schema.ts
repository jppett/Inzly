import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  price: text("price").notNull(),
  beds: integer("beds").notNull(),
  baths: text("baths").notNull(),
  sqft: integer("sqft").notNull(),
  yearBuilt: integer("year_built").notNull(),
  description: text("description").notNull(),
  foundlyScore: integer("foundly_score"),
  images: jsonb("images").notNull().$type<Array<{
    id: string;
    url: string;
    label: string;
  }>>(),
  priceHistory: jsonb("price_history").$type<Array<{ year: string; price: number }>>(),
  schools: jsonb("schools").$type<Array<{ name: string; type: string; grades: string; rating: number; distance: string }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const issues = pgTable("issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().$type<"critical" | "warning" | "info" | "good">(),
  category: text("category").notNull(),
  costEstimate: text("cost_estimate"),
  imageLocation: jsonb("image_location").$type<{
    imageId: string;
    x: number;
    y: number;
  }>(),
  referencePhotos: jsonb("reference_photos").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedProperties = pgTable("saved_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIssueSchema = createInsertSchema(issues).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSavedPropertySchema = createInsertSchema(savedProperties).omit({
  id: true,
  savedAt: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSavedProperty = z.infer<typeof insertSavedPropertySchema>;
export type SavedProperty = typeof savedProperties.$inferSelect;

// Export chat models
export * from "./models/chat";
