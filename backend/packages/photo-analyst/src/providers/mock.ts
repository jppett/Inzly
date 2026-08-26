import type { AgentCategoryResponse } from '@bones-report/shared';
import type { VisionProvider, VisionRequest, VisionResponse } from './types.js';

/**
 * Deterministic stand-in so the whole pipeline runs with no credentials.
 *
 * Seeded from the brief and photo urls, so the same property always yields the
 * same report — which makes it usable in acceptance checks, not just demos.
 * Follows the same real-or-mock convention as the RentCast fetcher.
 */
export class MockVisionProvider implements VisionProvider {
  readonly name = 'mock';
  readonly model = 'mock-vision';

  async analyze(request: VisionRequest): Promise<VisionResponse> {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const seed = hash(request.brief + request.photos.map((p) => p.url).join(''));
    const random = seeded(seed);

    // A third of categories genuinely aren't visible in a listing set.
    if (random() < 0.33 || request.photos.length === 0) {
      return {
        result: {
          rating: 'not_visible',
          confidence: 'high',
          summary: 'This category is not visible in the supplied photographs.',
          insights: [],
        },
      };
    }

    const ratings = ['excellent', 'good', 'fair', 'poor'] as const;
    const rating = ratings[Math.floor(random() * ratings.length)];
    const count = 1 + Math.floor(random() * 3);
    const photos = request.photos;

    const insights: AgentCategoryResponse['insights'] = [];
    for (let i = 0; i < count; i += 1) {
      const photo = photos[Math.floor(random() * photos.length)];
      const severity = pickSeverity(random());
      insights.push({
        title: `Mock finding ${i + 1}`,
        description:
          'Placeholder finding produced by the mock vision provider. Set ANTHROPIC_API_KEY and VISION_PROVIDER=anthropic for real analysis.',
        severity,
        confidence: 'medium',
        costEstimate:
          severity === 'critical' || severity === 'warning'
            ? { low: 500, high: 5000, currency: 'USD', basis: 'Mock estimate' }
            : null,
        recommendedAction: 'No action — this is mock data.',
        evidence: [
          {
            photoId: photo.id,
            photoUrl: photo.url,
            observed: 'Mock observation anchored to a real photo id.',
            inference: 'Mock inference.',
            region: { x: 25, y: 25, width: 20, height: 20 },
          },
        ],
      });
    }

    return {
      result: {
        rating,
        confidence: 'medium',
        summary: `Mock assessment (${rating}). Not a real inspection.`,
        insights,
      },
    };
  }
}

/** Weighted so mock data resembles a real distribution: mostly info and good. */
function pickSeverity(r: number): 'critical' | 'warning' | 'info' | 'good' {
  if (r < 0.05) return 'critical';
  if (r < 0.3) return 'warning';
  if (r < 0.7) return 'info';
  return 'good';
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seeded(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
