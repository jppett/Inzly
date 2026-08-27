import Anthropic from '@anthropic-ai/sdk';
import {
  SummaryAgentResponseSchema,
  type SummaryAgentResponse,
  type PropertyInsightsResult,
  type PermitHistoryResult,
  type CreatePropertySummaryResultInput,
  type PropertyInsight,
} from '@bones-report/shared';
import { SUMMARY_RUBRIC, SUMMARY_OUTPUT_CONTRACT } from './rubric.js';
import { SUMMARY_RESPONSE_JSON_SCHEMA } from './response-schema.js';
import { fullPermitContext } from './permit-context.js';

export const DEFAULT_SUMMARY_MODEL = 'claude-opus-5';

export interface SummaryAgentOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

/**
 * Synthesises every category agent's findings plus the full permit history
 * into the one report the product app actually shows.
 *
 * Deliberately its own class rather than a mode on PhotoAnalyst: it sends no
 * images, so it shares none of the vision provider's caching or photo-manifest
 * machinery, and it runs once per property rather than once per category.
 */
export class SummaryAgent {
  readonly model: string;

  private readonly client: Anthropic;
  private readonly maxTokens: number;
  private readonly effort: NonNullable<SummaryAgentOptions['effort']>;

  constructor(options: SummaryAgentOptions = {}) {
    this.client = options.apiKey ? new Anthropic({ apiKey: options.apiKey }) : new Anthropic();
    this.model = options.model ?? process.env.SUMMARY_MODEL ?? DEFAULT_SUMMARY_MODEL;
    this.maxTokens = options.maxTokens ?? 4000;
    this.effort = options.effort ?? (process.env.SUMMARY_EFFORT as never) ?? 'high';
  }

  async summarise(
    insights: PropertyInsightsResult,
    permits: PermitHistoryResult | null,
  ): Promise<CreatePropertySummaryResultInput> {
    const findingsJson = JSON.stringify(
      insights.insights.map((i) => ({
        id: i.id,
        category: i.category,
        title: i.title,
        description: i.description,
        severity: i.severity,
        confidence: i.confidence,
        costEstimate: i.costEstimate,
      })),
      null,
      2,
    );

    const categoriesJson = JSON.stringify(
      insights.categories.map((c) => ({ category: c.category, rating: c.rating, summary: c.summary })),
      null,
      2,
    );

    const userText =
      `## Category findings (${insights.insights.length} total)\n\n${findingsJson}` +
      `\n\n## Category assessments\n\n${categoriesJson}` +
      fullPermitContext(permits?.permits ?? []) +
      `\n\n${SUMMARY_OUTPUT_CONTRACT}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: this.effort,
        format: { type: 'json_schema', schema: SUMMARY_RESPONSE_JSON_SCHEMA as never },
      },
      // The rubric is identical across every property, so this is a real
      // cache anchor at scale even though each call is otherwise standalone.
      system: [{ type: 'text', text: SUMMARY_RUBRIC, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userText }],
    });

    if (response.stop_reason === 'refusal') {
      throw new Error(
        `Summary agent declined: ${response.stop_details?.explanation ?? 'no explanation given'}`,
      );
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    if (!text.trim()) {
      throw new Error(
        response.stop_reason === 'max_tokens'
          ? 'Summary agent hit max_tokens before producing output'
          : 'Summary agent returned no text content',
      );
    }

    const parsed = SummaryAgentResponseSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new Error(`Summary agent output failed validation: ${parsed.error.message}`);
    }

    return this.buildResult(parsed.data, insights);
  }

  private buildResult(
    agentResponse: SummaryAgentResponse,
    insights: PropertyInsightsResult,
  ): CreatePropertySummaryResultInput {
    const byId = new Map(insights.insights.map((i) => [i.id, i]));

    // The agent selects by id rather than re-emitting findings; resolve here,
    // and drop any id it invented rather than trusting it.
    const resolve = (ids: string[]): PropertyInsight[] =>
      ids.map((id) => byId.get(id)).filter((i): i is PropertyInsight => Boolean(i));

    return {
      address_request_id: insights.address_request_id,
      headline: agentResponse.headline,
      overallAssessment: agentResponse.overallAssessment,
      overallCondition: agentResponse.overallCondition,
      topConcerns: resolve(agentResponse.topConcernIds),
      topPositives: resolve(agentResponse.topPositiveIds),
      corroboration: agentResponse.corroboration,
      // Carried through from the full analysis rather than recomputed, so the
      // headline cost figure always reflects every finding, not just the ones
      // chosen as "top".
      estimatedCostRange: insights.summary.estimatedCostRange ?? null,
      counts: insights.summary.counts,
      categories: insights.categories,
      model: this.model,
    };
  }
}
