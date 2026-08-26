import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePermits, type ShovelsPermit } from './normalize.js';
import type { PermitLookup, PermitProvider } from './types.js';

/**
 * Deterministic stand-in built from a real Shovels response.
 *
 * Uses the captured 407 Turners Xrd N history — 27 genuine permits spanning
 * 2001 to 2023 — rather than invented records, so permit-aware behaviour can be
 * exercised against realistic dates, values and tags with no credentials.
 * A hash of the address selects a stable subset, so two addresses differ but
 * the same address always returns the same history.
 */
export class MockPermitsAPI implements PermitProvider {
  readonly name = 'mock';

  private readonly all: ShovelsPermit[];

  constructor() {
    const here = dirname(fileURLToPath(import.meta.url));
    // dist/services -> package root; src/services -> package root
    const fixture = resolve(here, '../../fixtures/permit-response_407-turners-xrd-n.json');
    const parsed = JSON.parse(readFileSync(fixture, 'utf-8')) as { items?: ShovelsPermit[] };
    this.all = parsed.items ?? [];
  }

  async getPermits(address: string): Promise<PermitLookup> {
    await new Promise((r) => setTimeout(r, 40));

    const random = seeded(hash(address));

    // A real address search misses sometimes; reproduce that honestly.
    if (random() < 0.15) {
      return { matchedAddress: null, geoId: null, permits: [] };
    }

    const keep = this.all.filter(() => random() > 0.35);

    return {
      matchedAddress: address,
      geoId: `mock-${hash(address).toString(36).slice(0, 10)}`,
      permits: normalizePermits(keep.length > 0 ? keep : this.all.slice(0, 3)),
    };
  }
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
