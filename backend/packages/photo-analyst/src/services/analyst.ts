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
import { DEFAULT_CATEGORY_MODEL } from '../agents/definitions.js';
import { permitContext } from '../agents/permit-context.js';
import type { VisionProvider, VisionUsage, VisionRequest, BatchItem, BatchItemOutcome } from '../providers/index.js';
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

/** One (agent, run) unit of work — the thing both execution paths schedule. */
interface PlannedRequest {
  agent: ExpertAgent;
  runIndex: number;
  customId: string;
  request: VisionRequest;
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
    const { photos, agents, empty } = this.plan(addressRequestId, photoUrls, options);
    if (empty) return empty;

    const manifest = buildManifest(photos);
    const usage = emptyUsage();
    const failures: Array<{ category: string; error: string }> = [];
    const assessments: CategoryAssessment[] = [];
    const insights: PropertyInsight[] = [];

    const runOne = async (agent: ExpertAgent) => {
      const runs: AgentCategoryResponse[] = [];

      for (let i = 0; i < agent.runs; i += 1) {
        try {
          const response = await this.provider.analyze(
            this.buildRequest(agent, photos, manifest, options),
          );
          runs.push(response.result);
          addUsage(usage, response.usage);
        } catch (error) {
          console.error(`❌ [photo-analyst] ${agent.category} run ${i + 1} failed:`, error);
        }
      }

      this.collect(agent, runs, photos, assessments, insights, failures);
    };

    // The first agent writes the shared photo prefix to cache; the rest read
    // it. Running one before the others makes that hit reliable rather than
    // racing several cold writers.
    const [first, ...rest] = agents;
    if (first) await runOne(first);
    await inBatches(rest, options.concurrency ?? DEFAULT_CONCURRENCY, runOne);

    return this.assemble(addressRequestId, photos, agents, assessments, insights, failures, usage, options);
  }

  /**
   * Same result as `analyse()`, submitted as a single Message Batch instead of
   * one call per (agent, run). For providers that don't support batching (the
   * mock, chiefly) this falls back to running everything sequentially through
   * `analyze()` — batching is a cost optimisation, not something callers
   * should have to branch on.
   */
  async analyseBatch(
    addressRequestId: string,
    photoUrls: string[],
    options: AnalyseOptions = {},
    onProgress?: (status: string) => void,
  ): Promise<AnalyseOutcome> {
    const { photos, agents, empty } = this.plan(addressRequestId, photoUrls, options);
    if (empty) return empty;

    const manifest = buildManifest(photos);
    const usage = emptyUsage();
    const failures: Array<{ category: string; error: string }> = [];
    const assessments: CategoryAssessment[] = [];
    const insights: PropertyInsight[] = [];

    const planned: PlannedRequest[] = [];
    for (const agent of agents) {
      for (let runIndex = 0; runIndex < agent.runs; runIndex += 1) {
        planned.push({
          agent,
          runIndex,
          customId: `${agent.category}::${runIndex}`,
          request: this.buildRequest(agent, photos, manifest, options),
        });
      }
    }

    const outcomes = this.provider.analyzeBatch
      ? await this.provider.analyzeBatch(
          planned.map(({ customId, request }) => ({ customId, request })),
          onProgress,
        )
      : await this.runSequentiallyAsBatch(planned, onProgress);

    const runsByCategory = new Map<string, AgentCategoryResponse[]>();
    for (const item of planned) {
      const outcome = outcomes.get(item.customId);
      if (!outcome) {
        console.error(`❌ [photo-analyst] ${item.customId} missing from batch results`);
        continue;
      }
      if (!outcome.ok) {
        console.error(`❌ [photo-analyst] ${item.customId} failed: ${outcome.error}`);
        continue;
      }
      addUsage(usage, outcome.response.usage);
      const list = runsByCategory.get(item.agent.category) ?? [];
      list.push(outcome.response.result);
      runsByCategory.set(item.agent.category, list);
    }

    for (const agent of agents) {
      this.collect(agent, runsByCategory.get(agent.category) ?? [], photos, assessments, insights, failures);
    }

    return this.assemble(addressRequestId, photos, agents, assessments, insights, failures, usage, options);
  }

  /** Fallback for providers without native batch support: same requests, run one at a time. */
  private async runSequentiallyAsBatch(
    planned: PlannedRequest[],
    onProgress?: (status: string) => void,
  ): Promise<Map<string, BatchItemOutcome>> {
    const outcomes = new Map<string, BatchItemOutcome>();
    for (const [i, item] of planned.entries()) {
      onProgress?.(`${i + 1}/${planned.length} (sequential fallback — provider has no batch support)`);
      try {
        const response = await this.provider.analyze(item.request);
        outcomes.set(item.customId, { ok: true, response });
      } catch (error) {
        outcomes.set(item.customId, {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return outcomes;
  }

  private plan(
    addressRequestId: string,
    photoUrls: string[],
    options: AnalyseOptions,
  ): { photos: PhotoRef[]; agents: ExpertAgent[]; empty?: AnalyseOutcome } {
    const photos = toPhotoRefs(photoUrls, options.maxPhotos ?? DEFAULT_MAX_PHOTOS);
    const agents = EXPERT_AGENTS.filter(
      (a) => !options.categories || options.categories.includes(a.category),
    );

    if (photos.length === 0) {
      return {
        photos,
        agents,
        empty: {
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
          usage: emptyUsage(),
          failures: [],
        },
      };
    }

    return { photos, agents };
  }

  private buildRequest(
    agent: ExpertAgent,
    photos: PhotoRef[],
    manifest: string,
    options: AnalyseOptions,
  ): VisionRequest {
    return {
      model: agent.model ?? DEFAULT_CATEGORY_MODEL,
      systemPrompt: SHARED_RUBRIC,
      photos,
      photoManifest: manifest,
      // Permit context sits with the brief, after the cache breakpoint, so
      // the photo prefix stays identical across agents.
      brief:
        `${agent.brief}` +
        `${propertyContext(options.property)}` +
        `${permitContext(options.permits, agent.category)}\n\n${OUTPUT_CONTRACT}`,
    };
  }

  private collect(
    agent: ExpertAgent,
    runs: AgentCategoryResponse[],
    photos: PhotoRef[],
    assessments: CategoryAssessment[],
    insights: PropertyInsight[],
    failures: Array<{ category: string; error: string }>,
  ): void {
    if (runs.length === 0) {
      failures.push({ category: agent.category, error: 'all runs failed' });
      return;
    }

    const { assessment, insights: reconciled } = reconcileCategory(
      agent.category,
      runs,
      photos.length,
      agent.model ?? DEFAULT_CATEGORY_MODEL,
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

  private assemble(
    addressRequestId: string,
    photos: PhotoRef[],
    agents: ExpertAgent[],
    assessments: CategoryAssessment[],
    insights: PropertyInsight[],
    failures: Array<{ category: string; error: string }>,
    usage: VisionUsage,
    options: AnalyseOptions,
  ): AnalyseOutcome {
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
        // Distinct models actually used, not just the provider's default —
        // categories can run on different tiers.
        model:
          [...new Set(assessments.map((a) => a.model).filter(Boolean))].join(', ') ||
          this.provider.model,
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
}

function emptyUsage(): VisionUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

function addUsage(total: VisionUsage, delta?: VisionUsage): void {
  if (!delta) return;
  total.inputTokens += delta.inputTokens;
  total.outputTokens += delta.outputTokens;
  total.cacheReadTokens += delta.cacheReadTokens;
  total.cacheWriteTokens += delta.cacheWriteTokens;
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
