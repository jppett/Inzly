// Types matching the API structure
export interface AddressRequest {
  id: string;
  address: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  created_at: string;
}

export interface BonesReportResult {
  id: string;
  address_request_id: string;
  report_data: {
    address?: string;
    estimatedValue?: number;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    yearBuilt?: number;
    lotSize?: string;
    rentEstimate?: {
      low: number;
      median: number;
      high: number;
    };
    location?: {
      latitude: number;
      longitude: number;
      city: string;
      state: string;
      zipCode: string;
    };
    marketMetrics?: {
      averageDaysOnMarket: number;
      pricePerSquareFoot: number;
      appreciationRate: number;
    };
    summary?: {
      propertyValueRange: {
        low: number;
        high: number;
      };
      monthlyRentRange: {
        low: number;
        median: number;
        high: number;
      };
      investmentPotential: number;
    };
    [key: string]: any;
  };
  status: 'completed' | 'failed';
  created_at: string;
}

export interface MLSListingRequest {
  id: string;
  address: string;
  status: 'pending' | 'processed' | 'failed';
  created_at: string;
}

export interface MLSListingResult {
  id: string;
  mls_listing_request_id: string;
  listing_data: {
    price?: number;
    listingType?: string;
    daysOnMarket?: number;
    mlsNumber?: string;
    [key: string]: any;
  };
  status: 'completed' | 'failed';
  created_at: string;
}

export interface APIResponse<T> {
  data?: T[];
  count?: number;
  timestamp?: string;
}

export interface CreateAddressRequestInput {
  address: string;
}