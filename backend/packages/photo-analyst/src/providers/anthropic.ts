import Anthropic from '@anthropic-ai/sdk';
import { AgentCategoryResponseSchema } from '@bones-report/shared';
import { AGENT_RESPONSE_JSON_SCHEMA } from '../agents/response-schema.js';
import type { VisionProvider, VisionRequest, VisionResponse } from './types.js';

export interface AnthropicVisionOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  /** Trades cost against thoroughness. */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

const DEFAULT_MODEL = 'claude-opus-5';

export class AnthropicVisionProvider implements VisionProvider {
  readonly name = 'anthropic';
  readonly model: string;

  private readonly client: Anthropic;
  private readonly maxTokens: number;
  private readonly effort: NonNullable<AnthropicVisionOptions['effort']>;

  constructor(options: AnthropicVisionOptions = {}) {
    // A bare constructor resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or a
    // stored CLI profile, so only pass a key when one was explicitly supplied.
    this.client = options.apiKey ? new Anthropic({ apiKey: options.apiKey }) : new Anthropic();
    this.model = options.model ?? process.env.VISION_MODEL ?? DEFAULT_MODEL;
    this.maxTokens = options.maxTokens ?? 16000;
    this.effort = options.effort ?? (process.env.VISION_EFFORT as never) ?? 'high';
  }

  async analyze(request: VisionRequest): Promise<VisionResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: this.effort,
        format: { type: 'json_schema', schema: AGENT_RESPONSE_JSON_SCHEMA as never },
      },
      // Byte-identical for every agent in a run, so it caches.
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
            // Photos come first and are the same for every agent in this run.
            // The breakpoint sits after the manifest so the remaining agents
            // read the images from cache instead of re-uploading them.
            ...request.photos.map((photo) => ({
              type: 'image' as const,
              source: { type: 'url' as const, url: photo.url },
            })),
            {
              type: 'text' as const,
              text: request.photoManifest,
              cache_control: { type: 'ephemeral' as const },
            },
            // Only this varies between agents.
            { type: 'text' as const, text: request.brief },
          ],
        },
      ],
    });

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
}
