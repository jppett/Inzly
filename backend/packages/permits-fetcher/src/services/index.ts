import type { PermitProvider } from './types.js';
import { ShovelsAPI } from './shovels-api.js';
import { MockPermitsAPI } from './mock-permits-api.js';

export * from './types.js';
export * from './normalize.js';
export { ShovelsAPI } from './shovels-api.js';
export { MockPermitsAPI } from './mock-permits-api.js';

/** Real provider when a key is present, mock otherwise. */
export function createPermitProvider(): PermitProvider {
  const apiKey = process.env.SHOVELS_API_KEY;

  if (apiKey && apiKey.length > 10 && apiKey !== 'mock-key') {
    console.log('🔑 [permits] Shovels API key detected, using live permit data');
    return new ShovelsAPI({
      apiKey,
      baseUrl: process.env.SHOVELS_BASE_URL,
      from: process.env.SHOVELS_PERMIT_FROM,
    });
  }

  console.log('🎭 [permits] No SHOVELS_API_KEY, using mock permit history');
  return new MockPermitsAPI();
}
