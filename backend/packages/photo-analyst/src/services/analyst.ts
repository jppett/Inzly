import { randomUUID, createHash } from 'node:crypto';
import { costTotal } from '@bones-report/shared';
import type {
  AgentCategoryResponse,
  PermitRecord,
  CategoryAssessment,
  CreatePropertyInsightsResultInput,
  InsightsSummary,
  InsightSeverity,
  PhotoRef,
  PropertyInsight,
} from '@bones-report/shared';
import { EXPERT_AGENTS, type ExpertAgent } from '../agents/definitions.js';
import { SHARED_RUBRIC, OUTPUT_CONTRACT } from '../agents/rubric.js';
import { permitContext } from '../agents/permit-context.js';
import type { VisionProvider, VisionUsage } from '../providers/index.js';
import { reconcileCategory, severityRank } from './reconcile.js';

export interface AnalyseOptions {
  /** Cap on photos sent to each agent. Every photo is billed on every run. */
  maxPhotos?: number;
  /** Restrict to a subset of categories. Defaults to all agents. */
  categories?: string[];
  /** Run at most this many agents concurrently. */
  concurrency?: number;
  /**
   * Permits on record. Handed to each agent for the categories they bear on,
   * so findings corroborate the record instead of guessing at age.
   */
  permits?: PermitRecord[];
  /**
   * What the house is, so costs land in the right tier. The same granite is a
   * different number in a $650k house and a $1.8M one.
   */
  property?: PropertyContext;
  /** Cap on findings per photograph. The reviewer asked for three. */
  maxPerPhoto?: number;
}

export interface PropertyContext {
  address?: string;
  listPrice?: number;
  yearBuilt?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
}

export interface AnalyseOutcome {
  result: CreatePropertyInsightsResultInput;
  usage: VisionUsage;
  failures: Array<{ category: string; error: string }>;
}

const DEFAULT_MAX_PHOTOS = 20;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_MAX_PER_PHOTO = 3;

export class PhotoAnalyst {
  constructor(private readonly provider: VisionProvider) {}

  async analyse(
    addressRequestId: string,
    photoUrls: string[],
    options: AnalyseOptions = {},
  ): Promise<AnalyseOutcome> {
    const photos = toPhotoRefs(photoUrls, options.maxPhotos ?? DEFAULT_MAX_PHOTOS);
    const manifest = buildManifest(photos);

    const agents = EXPERT_AGENTS.filter(
      (a) => !options.categories || options.categories.includes(a.category),
    );

    const usage: VisionUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    const failures: Array<{ category: string; error: string }> = [];
    const assessments: CategoryAssessment[] = [];
    const insights: PropertyInsight[] = [];

    if (photos.length === 0) {
      return {
        result: {
          address_request_id: addressRequestId,
          status: 'failed',
          model: this.provider.model,
          photos: [],
          categories: [],
          insights: [],
          summary: emptySummary('No photographs were available for this property.'),
          error: 'no_photos',
        },
        usage,
        failures,
      };
    }

    // The first agent writes the shared photo prefix to cache; the rest read
    // it. Running one before the others makes that hit reliable rather than
    // racing several cold writers.
    const [first, ...rest] = agents;
    if (first) {
      await this.runOne(first, photos, manifest, assessments, insights, failures, usage, options);
    }

    await inBatches(rest, options.concurrency ?? DEFAULT_CONCURRENCY, (agent) =>
      this.runOne(agent, photos, manifest, assessments, insights, failures, usage, options),
    );

    insights.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

    // Agents run blind to each other, so a busy kitchen can collect findings
    // from five of them. Enforce the cap across the whole run, keeping the most
    // consequential per photograph.
    const capped = capPerPhoto(insights, options.maxPerPhoto ?? DEFAULT_MAX_PER_PHOTO);
    insights.length = 0;
    insights.push(...capped);

    const status: CreatePropertyInsightsResultInput['status'] =
      failures.length === 0 ? 'completed' : failures.length < agents.length ? 'partial' : 'failed';

    return {
      result: {
        address_request_id: addressRequestId,
        status,
        model: this.provider.model,
        photos,
        categories: assessments,
        insights,
        summary: buildSummary(insights, assessments),
        error: failures.length ? `${failures.length} categories failed` : undefined,
      },
      usage,
      failures,
    };
  }

  private async runOne(
    agent: ExpertAgent,
    photos: PhotoRef[],
    manifest: string,
    assessments: CategoryAssessment[],
    insights: PropertyInsight[],
    failures: Array<{ category: string; error: string }>,
    usage: VisionUsage,
    options: AnalyseOptions,
  ): Promise<void> {
    const permits = options.permits;
    const runs: AgentCategoryResponse[] = [];

    for (let i = 0; i < agent.runs; i += 1) {
      try {
        const response = await this.provider.analyze({
          systemPrompt: SHARED_RUBRIC,
          photos,
          photoManifest: manifest,
          // Permit context sits with the brief, after the cache breakpoint,
          // so the photo prefix stays identical across agents.
          brief:
            `${agent.brief}` +
            `${propertyContext(options.property)}` +
            `${permitContext(permits, agent.category)}\n\n${OUTPUT_CONTRACT}`,
        });
        runs.push(response.result);
        if (response.usage) {
          usage.inputTokens += response.usage.inputTokens;
          usage.outputTokens += response.usage.outputTokens;
          usage.cacheReadTokens += response.usage.cacheReadTokens;
          usage.cacheWriteTokens += response.usage.cacheWriteTokens;
        }
      } catch (error) {
        console.error(`❌ [photo-analyst] ${agent.category} run ${i + 1} failed:`, error);
      }
    }

    if (runs.length === 0) {
      failures.push({ category: agent.category, error: 'all runs failed' });
      return;
    }

    const { assessment, insights: reconciled } = reconcileCategory(
      agent.category,
      runs,
      photos.length,
    );

    assessments.push(assessment);
    for (const insight of reconciled) {
      // Drop findings citing a photo id the model invented.
      const evidence = insight.evidence.filter((e) => photos.some((p) => p.id === e.photoId));
      if (evidence.length === 0) continue;

      insights.push({
        ...insight,
        id: randomUUID(),
        evidence: evidence.map((e) => ({
          ...e,
          photoUrl: e.photoUrl ?? photos.find((p) => p.id === e.photoId)?.url,
        })),
      });
    }
  }
}

/** Short, stable ids derived from the url, so they survive re-analysis. */
function toPhotoRefs(urls: string[], max: number): PhotoRef[] {
  return urls
    .filter((url) => typeof url === 'string' && /^https?:\/\//.test(url))
    .slice(0, max)
    .map((url, index) => ({
      id: createHash('sha1').update(url).digest('hex').slice(0, 10),
      url,
      label: `Photo ${index + 1}`,
    }));
}

function buildManifest(photos: PhotoRef[]): string {
  const lines = photos.map((p, i) => `${i + 1}. id: ${p.id}`).join('\n');
  return `The ${photos.length} images above are the photographs for this property, in order. Cite these ids exactly in your evidence:\n\n${lines}`;
}

function buildSummary(
  insights: PropertyInsight[],
  assessments: CategoryAssessment[],
): InsightsSummary {
  const counts: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
    good: 0,
  };
  for (const insight of insights) counts[insight.severity] += 1;

  // Only sum costs that are genuinely totals. Adding a $4/sq ft roof rate to a
  // $900 dishwasher produces a number that means nothing, which is what the
  // first version of this did.
  let low = 0;
  let high = 0;
  let summed = 0;
  for (const insight of insights) {
    const total = costTotal(insight.costEstimate);
    if (!total) continue;
    low += total.low;
    high += total.high;
    summed += 1;
  }

  const overallCondition = deriveCondition(counts, assessments);

  return {
    overallCondition,
    headline: buildHeadline(counts, overallCondition),
    counts,
    estimatedCostRange: summed > 0 ? { low, high, currency: 'USD' } : null,
  };
}

function deriveCondition(
  counts: Record<InsightSeverity, number>,
  assessments: CategoryAssessment[],
): InsightsSummary['overallCondition'] {
  if (counts.critical >= 2) return 'poor';
  if (counts.critical === 1 || counts.warning >= 5) return 'fair';

  const rated = assessments.filter((a) => a.rating !== 'not_visible');
  if (rated.length === 0) return 'fair';

  const score =
    rated.reduce((total, a) => {
      if (a.rating === 'excellent') return total + 3;
      if (a.rating === 'good') return total + 2;
      if (a.rating === 'fair') return total + 1;
      return total;
    }, 0) / rated.length;

  if (score >= 2.5) return 'excellent';
  if (score >= 1.8) return 'good';
  if (score >= 1) return 'fair';
  return 'poor';
}

/** Calm and specific — the brand guide's "knowledgeable guide", not a headline. */
function buildHeadline(
  counts: Record<InsightSeverity, number>,
  condition: InsightsSummary['overallCondition'],
): string {
  if (counts.critical > 0) {
    return `This home shows ${counts.critical} finding${counts.critical === 1 ? '' : 's'} worth resolving before you go further.`;
  }
  if (counts.warning > 0) {
    return `Generally ${condition} condition, with ${counts.warning} item${counts.warning === 1 ? '' : 's'} to budget for.`;
  }
  if (counts.good > 0) {
    return `Nothing concerning stood out in the photographs, and ${counts.good} detail${counts.good === 1 ? '' : 's'} showed well.`;
  }
  return 'Nothing concerning stood out in the photographs.';
}

function emptySummary(headline: string): InsightsSummary {
  return {
    overallCondition: 'fair',
    headline,
    counts: { critical: 0, warning: 0, info: 0, good: 0 },
    estimatedCostRange: null,
  };
}

async function inBatches<T>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

/**
 * Keep at most `max` findings on any one photograph.
 *
 * Ordered by severity, then by whether a cost is attached, then by confidence —
 * the reviewer's stated priority: "prioritized by importance/cost". A finding
 * dropped here is dropped entirely rather than merged, because compressing two
 * findings into one produces a sentence that says neither clearly.
 */
export function capPerPhoto(insights: PropertyInsight[], max: number): PropertyInsight[] {
  const perPhoto = new Map<string, number>();
  const confidenceRank = { high: 2, medium: 1, low: 0 } as const;

  const ordered = [...insights].sort((a, b) => {
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev !== 0) return sev;
    const cost = Number(Boolean(b.costEstimate)) - Number(Boolean(a.costEstimate));
    if (cost !== 0) return cost;
    return confidenceRank[b.confidence] - confidenceRank[a.confidence];
  });

  return ordered.filter((insight) => {
    const photoId = insight.evidence[0]?.photoId;
    if (!photoId) return true;
    const used = perPhoto.get(photoId) ?? 0;
    if (used >= max) return false;
    perPhoto.set(photoId, used + 1);
    return true;
  });
}

/** What the house is, so cost ranges land in the right tier. */
function propertyContext(property?: PropertyContext): string {
  if (!property || (!property.listPrice && !property.yearBuilt)) return '';

  const parts: string[] = [];
  if (property.address) parts.push(property.address);
  if (property.listPrice) parts.push(`listed at $${property.listPrice.toLocaleString()}`);
  if (property.yearBuilt) parts.push(`built ${property.yearBuilt}`);
  if (property.beds && property.baths) parts.push(`${property.beds} bed, ${property.baths} bath`);
  if (property.sqft) parts.push(`${property.sqft.toLocaleString()} sq ft`);

  return (
    '\n\n## This property\n\n' +
    `${parts.join(' · ')}\n\n` +
    'Place any cost range in the tier this price implies, rather than quoting a ' +
    'national average. Use the size and age above when they help you scope work.'
  );
}
