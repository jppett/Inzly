import axios from 'axios';
import type { 
  AddressRequest, 
  BonesReportResult, 
  MLSListingRequest, 
  MLSListingResult,
  CreateAddressRequestInput,
  APIResponse 
} from '../types/api';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const healthCheck = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

// Address Requests
export const getAddressRequests = async (): Promise<AddressRequest[]> => {
  const response = await apiClient.get<APIResponse<AddressRequest>>('/address-requests');
  return response.data.data || [];
};

export const getAddressRequest = async (id: string): Promise<AddressRequest> => {
  const response = await apiClient.get<AddressRequest>(`/address-requests/${id}`);
  return response.data;
};

export const createAddressRequest = async (input: CreateAddressRequestInput): Promise<AddressRequest> => {
  const response = await apiClient.post<AddressRequest>('/address-requests', input);
  return response.data;
};

export const searchAddressRequests = async (query: string): Promise<AddressRequest[]> => {
  const allRequests = await getAddressRequests();
  return allRequests.filter(request => 
    request.address.toLowerCase().includes(query.toLowerCase())
  );
};

// Bones Report Results
export const getBonesReportResults = async (): Promise<BonesReportResult[]> => {
  const response = await apiClient.get<APIResponse<BonesReportResult>>('/bones-report-results');
  return response.data.data || [];
};

export const getBonesReportResult = async (id: string): Promise<BonesReportResult> => {
  const response = await apiClient.get<BonesReportResult>(`/bones-report-results/${id}`);
  return response.data;
};

export const getBonesReportResultByAddressRequest = async (addressRequestId: string): Promise<BonesReportResult | null> => {
  const response = await apiClient.get<APIResponse<BonesReportResult>>(`/bones-report-results?address_request_id=${addressRequestId}`);
  const results = response.data.data || [];
  return results.length > 0 ? results[0] : null;
};

// MLS Listing Requests
export const getMLSListingRequests = async (): Promise<MLSListingRequest[]> => {
  const response = await apiClient.get<APIResponse<MLSListingRequest>>('/mls-listing-requests');
  return response.data.data || [];
};

// MLS Listing Results
export const getMLSListingResults = async (): Promise<MLSListingResult[]> => {
  const response = await apiClient.get<APIResponse<MLSListingResult>>('/mls-listing-results');
  return response.data.data || [];
};

export const getMLSListingResultByRequestId = async (mlsRequestId: string): Promise<MLSListingResult | null> => {
  const response = await apiClient.get<APIResponse<MLSListingResult>>(`/mls-listing-results?mls_listing_request_id=${mlsRequestId}`);
  const results = response.data.data || [];
  return results.length > 0 ? results[0] : null;
};