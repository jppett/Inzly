/**
 * Wire types for the Inzly data platform (the `backend/` services in this repo,
 * historically "bones-report").
 *
 * These mirror `backend/packages/shared/src/types.ts` and the report shape
 * produced by `backend/packages/rentcast-fetcher`. They are duplicated rather
 * than imported because the two halves build independently — see
 * docs/INTEGRATION.md for how the contract is kept in sync.
 */

export type AddressRequestStatus = "pending" | "processing" | "processed" | "failed";

export interface AddressRequest {
  id: string;
  address: string;
  created_at: string;
  status: AddressRequestStatus;
}

export interface BonesReportResult {
  id: string;
  address_request_id: string;
  report_data: BonesReportData;
  created_at: string;
  status: "completed" | "failed";
}

export interface MLSListingResult {
  id: string;
  mls_listing_request_id: string;
  listing_data: {
    address: string;
    price: number;
    bedrooms: number;
    photo_urls: string[];
  };
  created_at: string;
  status: "completed" | "failed";
}

/** Shape written by rentcast-fetcher's `transformToBonesReport`. */
export interface BonesReportData {
  address?: string;
  estimatedValue?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  lotSize?: number;
  rentEstimate?: { high: number; low: number; median: number };
  location?: {
    latitude?: number;
    longitude?: number;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  marketMetrics?: {
    averageDaysOnMarket?: number;
    pricePerSquareFoot?: number;
    appreciationRate?: number;
  };
  comparableProperties?: Array<{
    address: string;
    distance: number;
    bedrooms: number;
    bathrooms: number;
    squareFootage: number;
    lastSalePrice: number;
    lastSaleDate: string;
  }>;
  propertyHistory?: Array<{
    date: string;
    event: "sale" | "listing" | "delisting";
    price?: number;
    description: string;
  }>;
  dataSource?: "mock" | "rentcast";
  fetchedAt?: string;
  summary?: {
    propertyValueRange?: { low: number; high: number };
    monthlyRentRange?: { high: number; low: number; median: number };
    investmentPotential?: number;
  };
  /** Present instead of the above when status is "failed". */
  error?: string;
  message?: string;
}

/** List endpoints wrap their payload; detail endpoints return the bare entity. */
export interface PlatformListResponse<T> {
  data: T[];
  count: number;
  timestamp: string;
}

// --- Photo analysis -------------------------------------------------------
// Mirrors backend/schemas/property-insights-result.json and the types in
// backend/packages/shared/src/insights.ts.

export type InsightSeverity = "critical" | "warning" | "info" | "good";
export type Confidence = "low" | "medium" | "high";
export type CategoryRating = "excellent" | "good" | "fair" | "poor" | "not_visible";

export interface InsightPhotoRef {
  id: string;
  url: string;
  label?: string;
}

export interface InsightEvidence {
  photoId: string;
  photoUrl?: string;
  /** What is literally visible. */
  observed: string;
  /** What it implies, including uncertainty. */
  inference?: string;
  region?: { x: number; y: number; width: number; height: number } | null;
}

export interface PropertyInsight {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  confidence: Confidence;
  costEstimate?: {
    low: number;
    high: number;
    /** How to read low/high. Absent means total. */
    unit?: 'total' | 'per_sq_ft' | 'per_linear_ft' | 'per_unit' | 'per_opening';
    quantity?: number | null;
    total?: { low: number; high: number } | null;
    currency?: string;
    basis?: string;
  } | null;
  recommendedAction?: string;
  evidence: InsightEvidence[];
}

export interface CategoryAssessment {
  category: string;
  rating: CategoryRating;
  confidence: Confidence;
  summary: string;
  provenance?: { runs: number; agreement: number; photosConsidered: number };
}

export interface PropertyInsightsResult {
  id: string;
  address_request_id: string;
  status: "completed" | "partial" | "failed";
  created_at: string;
  model?: string;
  photos: InsightPhotoRef[];
  categories: CategoryAssessment[];
  insights: PropertyInsight[];
  summary: {
    overallCondition: "excellent" | "good" | "fair" | "poor";
    headline: string;
    counts: Record<InsightSeverity, number>;
    estimatedCostRange?: { low: number; high: number; currency: string } | null;
  };
  error?: string;
}
