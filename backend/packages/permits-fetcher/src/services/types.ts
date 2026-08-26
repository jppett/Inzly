import type { PermitRecord } from '@bones-report/shared';

export interface PermitLookup {
  matchedAddress: string | null;
  geoId: string | null;
  permits: PermitRecord[];
}

/**
 * Swappable so the pipeline runs with no credentials — the same convention the
 * RentCast fetcher uses.
 */
export interface PermitProvider {
  readonly name: string;
  getPermits(address: string): Promise<PermitLookup>;
}
