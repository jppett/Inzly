import type { PermitRecord } from '@bones-report/shared';

/**
 * Fetch permit history for an address without standing up the platform.
 *
 * The permits-fetcher package owns the providers; this pulls them in lazily so
 * the photo-analyst does not hard-depend on it for the event-driven path, where
 * permits arrive from the repository instead.
 */
export async function loadPermits(address: string | undefined): Promise<PermitRecord[]> {
  if (!address) return [];
  try {
    const { createPermitProvider } = await import('@bones-report/permits-fetcher');
    const { permits } = await createPermitProvider().getPermits(address);
    return permits;
  } catch (error) {
    console.warn(
      '⚠️ [photo-analyst] Could not load permits:',
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
