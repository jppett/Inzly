import type { AgentCategoryResponse } from '@bones-report/shared';
import type { PhotoRef } from '@bones-report/shared';

export interface VisionRequest {
  /** Stable across every agent in a run — the cache anchor. */
  systemPrompt: string;
  /** Stable across every agent in a run — sent before the brief. */
  photos: PhotoRef[];
  photoManifest: string;
  /** Category-specific; the only part that varies between agents. */
  brief: string;
}

export interface VisionUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface VisionResponse {
  result: AgentCategoryResponse;
  usage?: VisionUsage;
}

/**
 * Swappable so the analyst is not welded to one vendor, and so the whole
 * pipeline can run against the mock with no credentials — the same pattern
 * the RentCast fetcher uses.
 */
export interface VisionProvider {
  readonly name: string;
  readonly model: string;
  analyze(request: VisionRequest): Promise<VisionResponse>;
}
