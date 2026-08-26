import type { VisionProvider } from './types.js';
import { AnthropicVisionProvider } from './anthropic.js';
import { MockVisionProvider } from './mock.js';

export * from './types.js';
export { AnthropicVisionProvider } from './anthropic.js';
export { MockVisionProvider } from './mock.js';

/**
 * Real provider when credentials are present, mock otherwise — so a developer
 * with no keys still gets a working pipeline end to end.
 */
export function createVisionProvider(): VisionProvider {
  const configured = process.env.VISION_PROVIDER;
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

  if (configured === 'mock') {
    console.log('🎭 [vision] Using mock provider (VISION_PROVIDER=mock)');
    return new MockVisionProvider();
  }

  if (configured === 'anthropic' || hasKey) {
    const provider = new AnthropicVisionProvider();
    console.log(`🔑 [vision] Using Anthropic provider (${provider.model})`);
    return provider;
  }

  console.log('🎭 [vision] No ANTHROPIC_API_KEY found, falling back to mock provider');
  return new MockVisionProvider();
}
