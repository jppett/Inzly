import { randomUUID, createHash } from 'node:crypto';
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
}

export interface AnalyseOutcome {
  result: CreatePropertyInsightsResultInput;
  usage: VisionUsage;
  failures: Array<{ category: string; error: string }>;
}

const DEFAULT_MAX_PHOTOS = 20;
const DEFAULT_CONCURRENCY = 4;

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
      await this.runOne(first, photos, manifest, assessments, insights, failures, usage, options.permits);
    }

    await inBatches(rest, options.concurrency ?? DEFAULT_CONCURRENCY, (agent) =>
      this.runOne(agent, photos, manifest, assessments, insights, failures, usage, options.permits),
    );

    insights.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

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
    permits?: PermitRecord[],
  ): Promise<void> {
    const runs: AgentCategoryResponse[] = [];

    for (let i = 0; i < agent.runs; i += 1) {
      try {
        const response = await this.provider.analyze({
          systemPrompt: SHARED_RUBRIC,
          photos,
          photoManifest: manifest,
          // Permit context sits with the brief, after the cache breakpoint,
          // so the photo prefix stays identical across agents.
          brief: `${agent.brief}${permitContext(permits, agent.category)}\n\n${OUTPUT_CONTRACT}`,
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

  let low = 0;
  let high = 0;
  for (const insight of insights) {
    if (insight.costEstimate) {
      low += insight.costEstimate.low;
      high += insight.costEstimate.high;
    }
  }

  const overallCondition = deriveCondition(counts, assessments);

  return {
    overallCondition,
    headline: buildHeadline(counts, overallCondition),
    counts,
    estimatedCostRange: high > 0 ? { low, high, currency: 'USD' } : null,
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
