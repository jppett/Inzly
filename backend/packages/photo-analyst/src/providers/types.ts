import type { AgentCategoryResponse } from '@bones-report/shared';
import type { PhotoRef } from '@bones-report/shared';

export interface VisionRequest {
  /** Model to use for this call. Falls back to the provider's default. */
  model?: string;
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
export interface BatchItem {
  customId: string;
  request: VisionRequest;
}

export type BatchItemOutcome =
  | { ok: true; response: VisionResponse }
  | { ok: false; error: string };

export interface VisionProvider {
  readonly name: string;
  readonly model: string;
  analyze(request: VisionRequest): Promise<VisionResponse>;
  /**
   * Submit every request as one batch job and wait for it to finish.
   *
   * Optional: not every provider needs to support batching, and callers that
   * want it must check for it (`analyzeBatch` in) rather than assume — the
   * analyst runner falls back to sequential `analyze()` calls when it is
   * absent, so batching is a cost optimisation, never a requirement.
   */
  analyzeBatch?(items: BatchItem[], onProgress?: (status: string) => void): Promise<Map<string, BatchItemOutcome>>;
}
