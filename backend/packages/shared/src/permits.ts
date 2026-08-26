// Permit history types — building permits on record for a property.
//
// Mirrors schemas/permit-history-result.json.

import type { InsightCategory } from './insights.js';

export interface PermitRecord {
  id: string;
  number?: string | null;
  description: string;
  type?: string | null;
  subtype?: string | null;
  status?: string | null;
  jurisdiction?: string | null;
  /** ISO date. Absent on a minority of records. */
  issueDate?: string | null;
  finalDate?: string | null;
  /** Whole currency units. Shovels reports cents; the fetcher divides. */
  jobValue?: number | null;
  /** Work tags as reported by the source. */
  tags: string[];
  /** Insight categories this permit bears on, mapped from tags. */
  categories: InsightCategory[];
}

export interface PermitHistoryResult {
  id: string;
  address_request_id: string;
  status: 'completed' | 'not_found' | 'failed';
  created_at: string;
  source?: string;
  matchedAddress?: string | null;
  geoId?: string | null;
  permits: PermitRecord[];
  error?: string;
}

export type CreatePermitHistoryResultInput =
  Pick<PermitHistoryResult, 'address_request_id' | 'permits'> &
  Partial<Pick<PermitHistoryResult, 'status' | 'source' | 'matchedAddress' | 'geoId' | 'error'>>;

/**
 * Source work tags to the agent categories they bear on.
 *
 * A tag can map to several: a `remodel` permit tells the cabinetry, countertop
 * and flooring agents something, and window_door work matters to whoever is
 * judging window condition. Tags absent here simply carry no category.
 */
export const PERMIT_TAG_CATEGORIES: Record<string, InsightCategory[]> = {
  roofing: ['roof'],
  siding: ['siding'],
  window_door: ['windows'],
  windows: ['windows'],
  plumbing: ['plumbing'],
  water_heater: ['plumbing'],
  sewer: ['plumbing'],
  electrical: ['electrical'],
  electric_meter: ['electrical'],
  solar: ['electrical'],
  hvac: ['hvac'],
  gas: ['hvac'],
  furnace: ['hvac'],
  air_conditioning: ['hvac'],
  foundation: ['foundation'],
  grading: ['foundation', 'landscaping'],
  new_construction: ['foundation'],
  addition: ['foundation'],
  remodel: ['cabinetry', 'countertops', 'flooring', 'tile', 'wall_finishes'],
  kitchen: ['cabinetry', 'countertops', 'appliances'],
  bathroom: ['tile', 'plumbing'],
  flooring: ['flooring'],
  deck: ['landscaping'],
  pool: ['landscaping'],
  landscaping: ['landscaping'],
};

export function categoriesForTags(tags: string[]): InsightCategory[] {
  const out = new Set<InsightCategory>();
  for (const tag of tags) {
    for (const category of PERMIT_TAG_CATEGORIES[tag] ?? []) out.add(category);
  }
  return [...out];
}

/** Permits bearing on one category, most recent first. */
export function permitsForCategory(
  permits: PermitRecord[],
  category: InsightCategory,
): PermitRecord[] {
  return permits
    .filter((p) => p.categories.includes(category))
    .sort((a, b) => (b.issueDate ?? '').localeCompare(a.issueDate ?? ''));
}
