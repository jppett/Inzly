import type { Property, Issue } from "@shared/schema";
import type {
  AddressRequest,
  BonesReportData,
  BonesReportResult,
  MLSListingResult,
  PropertyInsight as PlatformPropertyInsight,
  PropertyInsightsResult,
} from "./types";

/**
 * Optional feature block the Property Details tab renders. Only non-null
 * fields are displayed, so partial coverage is fine.
 * Mirrors `PropertyFeatures` in client/src/lib/api.ts.
 */
export interface PropertyFeatures {
  type?: string | null;
  lotSize?: string | null;
  hoaFee?: string | null;
  roofType?: string | null;
  foundationDetails?: string | null;
  constructionMaterials?: string | null;
  heating?: string | null;
  cooling?: string | null;
  appliances?: string | null;
  fireplaceFeatures?: string | null;
  windowFeatures?: string | null;
  flooring?: string | null;
  fencing?: string | null;
  basement?: string | null;
  parking?: string | null;
  stories?: string | null;
}

/** Platform-only analytics the UI does not model yet, carried through verbatim. */
export interface PropertyAnalytics {
  estimatedValue?: number;
  rentEstimate?: BonesReportData["rentEstimate"];
  marketMetrics?: BonesReportData["marketMetrics"];
  comparableProperties?: BonesReportData["comparableProperties"];
  investmentPotential?: number;
  dataSource?: string;
  fetchedAt?: string;
}

export interface MappedProperty extends Property {
  features?: PropertyFeatures;
  analytics?: PropertyAnalytics;
  /** Lifecycle of the underlying address request: pending until the report lands. */
  status?: AddressRequest["status"];
}

/**
 * Split a free-text address into street / city / state / zip.
 *
 * The platform stores whatever the user typed, so this is best-effort and the
 * structured `location` block from the report always wins when present.
 */
export function parseAddress(raw: string): {
  address: string;
  city: string;
  state: string;
  zip: string;
} {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const address = parts[0] ?? raw.trim();
  const city = parts[1] ?? "";

  // Trailing segment is typically "ST 12345" or just "ST".
  const tail = parts[2] ?? "";
  const match = tail.match(/^([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?$/);

  return {
    address,
    city,
    state: match?.[1]?.toUpperCase() ?? "",
    zip: match?.[2] ?? parts[3] ?? "",
  };
}

/** Sale events in the report history become the price-history chart series. */
function toPriceHistory(report: BonesReportData): Array<{ year: string; price: number }> {
  const sales = (report.propertyHistory ?? []).filter(
    (event): event is typeof event & { price: number } =>
      event.event === "sale" && typeof event.price === "number",
  );

  const byYear = new Map<string, number>();
  for (const sale of sales) {
    const year = new Date(sale.date).getFullYear();
    if (Number.isNaN(year)) continue;
    byYear.set(String(year), sale.price);
  }

  return Array.from(byYear, ([year, price]) => ({ year, price })).sort(
    (a, b) => Number(a.year) - Number(b.year),
  );
}

function toFeatures(report: BonesReportData): PropertyFeatures {
  return {
    type: report.propertyType ?? null,
    lotSize: typeof report.lotSize === "number" ? `${report.lotSize.toLocaleString()} sq ft` : null,
  };
}

function toImages(mls?: MLSListingResult): Property["images"] {
  const urls = mls?.listing_data?.photo_urls ?? [];
  return urls.map((url, index) => ({
    id: `mls-${index}`,
    url,
    label: index === 0 ? "Exterior" : `Photo ${index + 1}`,
  }));
}

/**
 * Map a completed platform report onto the Property shape the Inzly UI renders.
 *
 * `issues` are deliberately not produced here — they come from the AI analysis
 * step (`POST /api/properties/:id/analyze`) and live in Postgres, because the
 * platform has no concept of them. See docs/INTEGRATION.md.
 */
export function mapReportToProperty(
  request: AddressRequest,
  result?: BonesReportResult,
  mls?: MLSListingResult,
): MappedProperty {
  const report = result?.report_data ?? {};
  const parsed = parseAddress(report.address ?? request.address);
  const location = report.location ?? {};
  const createdAt = new Date(request.created_at);
  const updatedAt = result ? new Date(result.created_at) : createdAt;

  return {
    // The address request id is the stable identifier the UI routes on.
    id: request.id,
    address: parsed.address,
    city: location.city ?? parsed.city,
    state: location.state ?? parsed.state,
    zip: location.zipCode ?? parsed.zip,
    price:
      typeof report.estimatedValue === "number"
        ? String(report.estimatedValue)
        : mls?.listing_data?.price != null
          ? String(mls.listing_data.price)
          : "",
    beds: report.bedrooms ?? mls?.listing_data?.bedrooms ?? 0,
    baths: report.bathrooms != null ? String(report.bathrooms) : "",
    sqft: report.squareFootage ?? 0,
    yearBuilt: report.yearBuilt ?? 0,
    description: buildDescription(report, location.neighborhood),
    // The Inzly Score is produced by the AI analysis step, not by the platform.
    foundlyScore: null,
    images: toImages(mls),
    priceHistory: toPriceHistory(report),
    schools: [],
    createdAt,
    updatedAt,
    features: toFeatures(report),
    analytics: {
      estimatedValue: report.estimatedValue,
      rentEstimate: report.rentEstimate,
      marketMetrics: report.marketMetrics,
      comparableProperties: report.comparableProperties,
      investmentPotential: report.summary?.investmentPotential,
      dataSource: report.dataSource,
      fetchedAt: report.fetchedAt,
    },
    status: request.status,
  };
}

function buildDescription(report: BonesReportData, neighborhood?: string): string {
  if (!report.propertyType && !neighborhood) return "";

  const type = report.propertyType ?? "Property";
  const where = neighborhood ? ` in ${neighborhood}` : "";
  const size =
    report.squareFootage && report.bedrooms
      ? ` ${report.bedrooms} bed, ${report.squareFootage.toLocaleString()} sq ft.`
      : "";

  return `${type}${where}.${size}`.trim();
}

// --- Photo analysis -------------------------------------------------------

/**
 * Turn photo-analysis insights into the Issue rows the product app renders.
 *
 * The shapes line up closely by design: the platform's severity vocabulary is
 * the same four values the UI already styles, so nothing is lost in
 * translation. Two things need care:
 *
 *   - `referencePhotos` carries absolute URLs here, where database-backed
 *     issues carry bare filenames. PropertyDetails handles both.
 *   - `imageLocation` is derived from the evidence region's centre, so markers
 *     land where the model actually looked instead of on the fixed per-category
 *     coordinates the old text-only analysis used.
 */
export function mapInsightsToIssues(
  propertyId: string,
  insights: PlatformPropertyInsight[],
): Issue[] {
  return insights.map((insight) => {
    const anchor = insight.evidence.find((e) => e.region) ?? insight.evidence[0];

    return {
      id: insight.id,
      propertyId,
      title: insight.title,
      description: buildIssueDescription(insight),
      severity: insight.severity,
      category: humaniseCategory(insight.category),
      costEstimate: formatCost(insight.costEstimate),
      imageLocation: anchor?.region
        ? {
            imageId: anchor.photoId,
            x: anchor.region.x + anchor.region.width / 2,
            y: anchor.region.y + anchor.region.height / 2,
          }
        : null,
      referencePhotos: insight.evidence
        .map((e) => e.photoUrl)
        .filter((url): url is string => Boolean(url)),
      createdAt: new Date(),
    } as Issue;
  });
}

/**
 * The evidence split is the point of the new analysis, so surface it: what was
 * seen, then what it means. Falls back to the description alone when an agent
 * gave no inference.
 */
function buildIssueDescription(insight: PlatformPropertyInsight): string {
  const parts = [insight.description];

  const observed = insight.evidence.map((e) => e.observed).filter(Boolean);
  if (observed.length > 0) {
    parts.push(`In the photos: ${observed.join(" ")}`);
  }

  if (insight.recommendedAction) {
    parts.push(insight.recommendedAction);
  }

  if (insight.confidence === "low") {
    parts.push("This one is hard to judge from photographs alone and is worth confirming in person.");
  }

  return parts.join("\n\n");
}

function formatCost(cost: PlatformPropertyInsight["costEstimate"]): string | null {
  if (!cost) return null;
  const currency = cost.currency ?? "USD";
  const symbol = currency === "USD" ? "$" : `${currency} `;
  if (cost.low === cost.high) return `${symbol}${cost.low.toLocaleString()}`;
  return `${symbol}${cost.low.toLocaleString()}–${symbol}${cost.high.toLocaleString()}`;
}

function humaniseCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The Inzly Score, derived from what the agents actually found.
 *
 * Weighted by severity and softened by low confidence, so a report built from
 * uncertain readings does not swing the score as hard as a confident one.
 */
export function scoreFromInsights(insights: PlatformPropertyInsight[]): number {
  let penalty = 0;
  let bonus = 0;

  for (const insight of insights) {
    const weight = insight.confidence === "high" ? 1 : insight.confidence === "medium" ? 0.7 : 0.4;
    if (insight.severity === "critical") penalty += 20 * weight;
    else if (insight.severity === "warning") penalty += 8 * weight;
    else if (insight.severity === "good") bonus += 4 * weight;
  }

  return Math.max(0, Math.min(100, Math.round(100 - penalty + bonus)));
}
