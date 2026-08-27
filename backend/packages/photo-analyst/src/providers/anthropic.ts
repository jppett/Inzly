import Anthropic from '@anthropic-ai/sdk';
import { AgentCategoryResponseSchema } from '@bones-report/shared';
import { AGENT_RESPONSE_JSON_SCHEMA } from '../agents/response-schema.js';
import type {
  VisionProvider,
  VisionRequest,
  VisionResponse,
  VisionUsage,
  BatchItem,
  BatchItemOutcome,
} from './types.js';

export interface AnthropicVisionOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  /** Trades cost against thoroughness. */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** How often to poll a submitted batch. */
  batchPollIntervalMs?: number;
  /** Give up waiting on a batch after this long. */
  batchMaxWaitMs?: number;
}

const DEFAULT_MODEL = 'claude-opus-5';
const DEFAULT_BATCH_POLL_INTERVAL_MS = 15_000;
const DEFAULT_BATCH_MAX_WAIT_MS = 30 * 60_000;

export class AnthropicVisionProvider implements VisionProvider {
  readonly name = 'anthropic';
  readonly model: string;

  private readonly client: Anthropic;
  private readonly maxTokens: number;
  private readonly effort: NonNullable<AnthropicVisionOptions['effort']>;
  private readonly batchPollIntervalMs: number;
  private readonly batchMaxWaitMs: number;

  constructor(options: AnthropicVisionOptions = {}) {
    // A bare constructor resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or a
    // stored CLI profile, so only pass a key when one was explicitly supplied.
    this.client = options.apiKey ? new Anthropic({ apiKey: options.apiKey }) : new Anthropic();
    this.model = options.model ?? process.env.VISION_MODEL ?? DEFAULT_MODEL;
    this.maxTokens = options.maxTokens ?? 16000;
    this.effort = options.effort ?? (process.env.VISION_EFFORT as never) ?? 'high';
    this.batchPollIntervalMs = options.batchPollIntervalMs ?? DEFAULT_BATCH_POLL_INTERVAL_MS;
    this.batchMaxWaitMs = options.batchMaxWaitMs ?? DEFAULT_BATCH_MAX_WAIT_MS;
  }

  /** Request params shared by the live and batch paths — one definition, two callers. */
  private buildParams(request: VisionRequest): Anthropic.MessageCreateParamsNonStreaming {
    return {
      model: request.model ?? this.model,
      max_tokens: this.maxTokens,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: this.effort,
        format: { type: 'json_schema', schema: AGENT_RESPONSE_JSON_SCHEMA as never },
      },
      // Byte-identical for every agent in a run, so it caches on the live path.
      // Batch requests are not guaranteed to process in submission order, so
      // this cache_control is still correct but the near-100% hit rate the
      // live path gets by seeding the cache with one call first does not
      // carry over — see analyzeBatch's doc comment.
      system: [
        {
          type: 'text',
          text: request.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            ...request.photos.map((photo) => ({
              type: 'image' as const,
              source: { type: 'url' as const, url: photo.url },
            })),
            {
              type: 'text' as const,
              text: request.photoManifest,
              cache_control: { type: 'ephemeral' as const },
            },
            { type: 'text' as const, text: request.brief },
          ],
        },
      ],
    };
  }

  private parseResponse(response: Anthropic.Message): VisionResponse {
    if (response.stop_reason === 'refusal') {
      throw new Error(
        `Vision model declined the request: ${response.stop_details?.explanation ?? 'no explanation given'}`,
      );
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    if (!text.trim()) {
      throw new Error(
        response.stop_reason === 'max_tokens'
          ? 'Vision model hit max_tokens before producing output'
          : 'Vision model returned no text content',
      );
    }

    // Validate against the same schema the rest of the pipeline trusts, rather
    // than assuming the structured-output constraint held.
    const parsed = AgentCategoryResponseSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new Error(`Vision model output failed validation: ${parsed.error.message}`);
    }

    return {
      result: parsed.data,
      usage: {
        inputTokens: response.usage.input_tokens ?? 0,
        outputTokens: response.usage.output_tokens ?? 0,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    };
  }

  async analyze(request: VisionRequest): Promise<VisionResponse> {
    const response = await this.client.messages.create(this.buildParams(request));
    return this.parseResponse(response);
  }

  /**
   * Submit every item as one Message Batch and wait for it to finish.
   *
   * This is the ingestion-time path: category-agent findings for a property
   * that nobody is waiting on a browser tab for. The Batch API charges half
   * of standard per-token pricing in exchange for no delivery-time guarantee
   * — typically well under an hour in practice, but Anthropic makes no promise
   * beyond "within 24 hours."
   *
   * One thing this does NOT preserve from the live path: `analyse()` runs the
   * first agent alone specifically to seed the prompt cache before the rest
   * read it. A batch has no such ordering guarantee — Anthropic may process
   * items in parallel — so the near-100% cache-hit rate measured on the live
   * path is not something batch requests can be relied on to reproduce. The
   * 50% batch discount applies regardless; treat any caching on top of it as
   * a bonus, not something to plan around.
   */
  async analyzeBatch(
    items: BatchItem[],
    onProgress?: (status: string) => void,
  ): Promise<Map<string, BatchItemOutcome>> {
    const outcomes = new Map<string, BatchItemOutcome>();
    if (items.length === 0) return outcomes;

    onProgress?.(`submitting batch of ${items.length} requests`);
    let batch = await this.client.messages.batches.create({
      requests: items.map((item) => ({
        custom_id: item.customId,
        params: this.buildParams(item.request),
      })),
    });

    const deadline = Date.now() + this.batchMaxWaitMs;
    while (batch.processing_status !== 'ended') {
      if (Date.now() > deadline) {
        throw new Error(
          `Batch ${batch.id} did not finish within ${Math.round(this.batchMaxWaitMs / 60_000)} minutes ` +
            `(${batch.request_counts.succeeded}/${items.length} succeeded so far)`,
        );
      }
      await sleep(this.batchPollIntervalMs);
      batch = await this.client.messages.batches.retrieve(batch.id);
      onProgress?.(
        `${batch.processing_status}: ${batch.request_counts.succeeded} succeeded, ` +
          `${batch.request_counts.processing} processing, ${batch.request_counts.errored} errored`,
      );
    }

    for await (const item of await this.client.messages.batches.results(batch.id)) {
      if (item.result.type === 'succeeded') {
        try {
          outcomes.set(item.custom_id, { ok: true, response: this.parseResponse(item.result.message) });
        } catch (error) {
          outcomes.set(item.custom_id, {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown parse error',
          });
        }
      } else if (item.result.type === 'errored') {
        outcomes.set(item.custom_id, { ok: false, error: item.result.error.error.message });
      } else {
        outcomes.set(item.custom_id, { ok: false, error: `batch item ${item.result.type}` });
      }
    }

    return outcomes;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
