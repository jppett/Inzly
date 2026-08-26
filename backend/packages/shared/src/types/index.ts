// Re-export all types for easy access
export * from '../types.js';

// Additional type utilities
import type { AddressRequest, BonesReportResult, MLSListingRequest, MLSListingResult } from '../types.js';

export type CreateAddressRequestInput = Pick<AddressRequest, 'address'>;
export type UpdateAddressRequestInput = Partial<Pick<AddressRequest, 'address' | 'status'>>;

export type CreateBonesReportResultInput = Pick<BonesReportResult, 'address_request_id' | 'report_data'> & 
  Partial<Pick<BonesReportResult, 'status'>>;

export type CreateMLSListingRequestInput = Pick<MLSListingRequest, 'address'>;
export type UpdateMLSListingRequestInput = Partial<Pick<MLSListingRequest, 'status'>>;

export type CreateMLSListingResultInput = Pick<MLSListingResult, 'mls_listing_request_id' | 'listing_data'> &
  Partial<Pick<MLSListingResult, 'status'>>;