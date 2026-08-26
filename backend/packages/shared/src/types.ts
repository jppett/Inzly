// TypeScript interfaces that match JSON schemas exactly

export interface AddressRequest {
  id: string;
  address: string;
  created_at: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
}

export interface BonesReportResult {
  id: string;
  address_request_id: string;
  report_data: Record<string, any>;
  created_at: string;
  status: 'completed' | 'failed';
}

export interface MLSListingRequest {
  id: string;
  address: string;
  created_at: string;
  status: 'pending' | 'processed' | 'failed';
}

export interface MLSListingData {
  address: string;
  price: number;
  bedrooms: number;
  photo_urls: string[];
}

export interface MLSListingResult {
  id: string;
  mls_listing_request_id: string;
  listing_data: MLSListingData;
  created_at: string;
  status: 'completed' | 'failed';
}

export interface EventEnvelope<T = any> {
  type: string;
  ts: string;
  data: T;
}

// Status type unions for reuse
export type AddressRequestStatus = AddressRequest['status'];
export type BonesReportResultStatus = BonesReportResult['status'];
export type MLSListingRequestStatus = MLSListingRequest['status'];
export type MLSListingResultStatus = MLSListingResult['status'];