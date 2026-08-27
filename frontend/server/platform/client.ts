import type {
  AddressRequest,
  BonesReportResult,
  MLSListingResult,
  PlatformListResponse,
  PropertyInsightsResult,
  PropertySummaryResult,
} from "./types";

export interface PlatformClientOptions {
  baseUrl: string;
  /** Optional bearer token, once the platform grows auth. */
  apiKey?: string;
  timeoutMs?: number;
}

export class PlatformError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "PlatformError";
  }
}

/**
 * Thin typed HTTP client for the Inzly data platform.
 *
 * Endpoints match `backend/docs/API_SPEC.md`. List routes return
 * `{ data, count, timestamp }`; detail routes return the entity directly.
 */
export class PlatformClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor({ baseUrl, apiKey, timeoutMs = 10_000 }: PlatformClientOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          ...init.headers,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new PlatformError(
          `Platform request failed (${res.status}): ${body.slice(0, 200)}`,
          res.status,
          url,
        );
      }

      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (error) {
      if (error instanceof PlatformError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new PlatformError(`Platform request timed out after ${this.timeoutMs}ms`, 504, url);
      }
      throw new PlatformError(
        error instanceof Error ? error.message : "Unknown platform error",
        502,
        url,
      );
    }
  }

  async health(): Promise<{ status: string }> {
    return this.request("/health");
  }

  async listAddressRequests(): Promise<AddressRequest[]> {
    const res = await this.request<PlatformListResponse<AddressRequest>>("/address-requests");
    return res.data ?? [];
  }

  async getAddressRequest(id: string): Promise<AddressRequest | undefined> {
    try {
      return await this.request<AddressRequest>(`/address-requests/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof PlatformError && error.status === 404) return undefined;
      throw error;
    }
  }

  async createAddressRequest(address: string): Promise<AddressRequest> {
    return this.request<AddressRequest>("/address-requests", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  }

  async deleteAddressRequest(id: string): Promise<void> {
    await this.request<void>(`/address-requests/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async listBonesReportResults(addressRequestId?: string): Promise<BonesReportResult[]> {
    const query = addressRequestId
      ? `?address_request_id=${encodeURIComponent(addressRequestId)}`
      : "";
    const res = await this.request<PlatformListResponse<BonesReportResult>>(
      `/bones-report-results${query}`,
    );
    return res.data ?? [];
  }

  /** Most recent completed report for an address request, if any. */
  async getLatestReport(addressRequestId: string): Promise<BonesReportResult | undefined> {
    const results = await this.listBonesReportResults(addressRequestId);
    return results
      .filter((r) => r.status === "completed")
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  }

  async listPropertyInsights(addressRequestId?: string): Promise<PropertyInsightsResult[]> {
    const query = addressRequestId
      ? `?address_request_id=${encodeURIComponent(addressRequestId)}`
      : "";
    const res = await this.request<PlatformListResponse<PropertyInsightsResult>>(
      `/property-insights${query}`,
    );
    return res.data ?? [];
  }

  /** Most recent usable photo-analysis report for an address request. */
  async getLatestInsights(addressRequestId: string): Promise<PropertyInsightsResult | undefined> {
    const results = await this.listPropertyInsights(addressRequestId);
    return results
      .filter((r) => r.status !== "failed")
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  }

  async listPropertySummaries(addressRequestId?: string): Promise<PropertySummaryResult[]> {
    const query = addressRequestId
      ? `?address_request_id=${encodeURIComponent(addressRequestId)}`
      : "";
    const res = await this.request<PlatformListResponse<PropertySummaryResult>>(
      `/property-summary${query}`,
    );
    return res.data ?? [];
  }

  /**
   * The precomputed report for a property, if the Summary Agent has run.
   *
   * This is the read the product app should prefer: it is the only thing in
   * the platform pipeline that reasons across every category agent and the
   * full permit history at once, and reading it is a plain lookup — no model
   * call sits in this request's path, which is what makes a property view
   * fast regardless of how long the analysis behind it took.
   */
  async getLatestSummary(addressRequestId: string): Promise<PropertySummaryResult | undefined> {
    const results = await this.listPropertySummaries(addressRequestId);
    return results
      .filter((r) => r.status !== "failed")
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  }

  async listMlsListingResults(): Promise<MLSListingResult[]> {
    const res = await this.request<PlatformListResponse<MLSListingResult>>("/mls-listing-results");
    return res.data ?? [];
  }
}
