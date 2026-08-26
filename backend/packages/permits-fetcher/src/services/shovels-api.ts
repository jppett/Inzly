import { normalizePermits, type ShovelsPermit } from './normalize.js';
import type { PermitLookup, PermitProvider } from './types.js';

export interface ShovelsOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Earliest permit to return. Older records get sparse and less useful. */
  from?: string;
}

interface ShovelsAddress {
  street_no?: string;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  geo_id?: string;
  name?: string;
}

/**
 * Shovels permit lookup.
 *
 * Two steps, per discovery/apis/shovels/README.md: resolve the address to a
 * geo_id, then pull permits for it.
 */
export class ShovelsAPI implements PermitProvider {
  readonly name = 'shovels';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly from: string;

  constructor(options: ShovelsOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.shovels.ai/v2').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.from = options.from ?? '2000-01-01';
  }

  private async request<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        signal: controller.signal,
        headers: { 'X-API-Key': this.apiKey, Accept: 'application/json' },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Shovels ${res.status}: ${body.slice(0, 200)}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async getPermits(address: string): Promise<PermitLookup> {
    const search = await this.request<{ items?: ShovelsAddress[] }>(
      `/addresses/search?q=${encodeURIComponent(address)}`,
    );

    const match = search.items?.[0];
    if (!match?.geo_id) {
      return { matchedAddress: null, geoId: null, permits: [] };
    }

    const to = new Date().toISOString().slice(0, 10);
    const permits = await this.request<{ items?: ShovelsPermit[] }>(
      `/permits/search?geo_id=${encodeURIComponent(match.geo_id)}` +
        `&permit_from=${this.from}&permit_to=${to}`,
    );

    return {
      matchedAddress:
        match.name ??
        [match.street_no, match.street, match.city, match.state].filter(Boolean).join(' '),
      geoId: match.geo_id,
      permits: normalizePermits(permits.items ?? []),
    };
  }
}
