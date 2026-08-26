import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { CreateAddressRequestInput } from '../types/api';

// Query keys
export const QUERY_KEYS = {
  HEALTH: ['health'],
  ADDRESS_REQUESTS: ['address-requests'],
  ADDRESS_REQUEST: (id: string) => ['address-request', id],
  BONES_REPORT_RESULTS: ['bones-report-results'],
  BONES_REPORT_RESULT: (id: string) => ['bones-report-result', id],
  BONES_REPORT_BY_ADDRESS: (addressRequestId: string) => ['bones-report-by-address', addressRequestId],
  MLS_LISTING_REQUESTS: ['mls-listing-requests'],
  MLS_LISTING_RESULTS: ['mls-listing-results'],
} as const;

// Health check hook
export const useHealthCheck = () => {
  return useQuery({
    queryKey: QUERY_KEYS.HEALTH,
    queryFn: api.healthCheck,
    refetchInterval: 30000, // Check health every 30 seconds
  });
};

// Address Requests hooks
export const useAddressRequests = () => {
  return useQuery({
    queryKey: QUERY_KEYS.ADDRESS_REQUESTS,
    queryFn: api.getAddressRequests,
  });
};

export const useAddressRequest = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.ADDRESS_REQUEST(id),
    queryFn: () => api.getAddressRequest(id),
    enabled: !!id,
  });
};

export const useCreateAddressRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateAddressRequestInput) => api.createAddressRequest(input),
    onSuccess: () => {
      // Invalidate and refetch address requests list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDRESS_REQUESTS });
    },
  });
};

export const useSearchAddressRequests = (query: string) => {
  return useQuery({
    queryKey: ['search-address-requests', query],
    queryFn: () => api.searchAddressRequests(query),
    enabled: query.length > 0,
  });
};

// Bones Report Results hooks
export const useBonesReportResults = () => {
  return useQuery({
    queryKey: QUERY_KEYS.BONES_REPORT_RESULTS,
    queryFn: api.getBonesReportResults,
  });
};

export const useBonesReportResult = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.BONES_REPORT_RESULT(id),
    queryFn: () => api.getBonesReportResult(id),
    enabled: !!id,
  });
};

export const useBonesReportByAddressRequest = (addressRequestId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.BONES_REPORT_BY_ADDRESS(addressRequestId),
    queryFn: () => api.getBonesReportResultByAddressRequest(addressRequestId),
    enabled: !!addressRequestId,
  });
};

// MLS hooks
export const useMLSListingRequests = () => {
  return useQuery({
    queryKey: QUERY_KEYS.MLS_LISTING_REQUESTS,
    queryFn: api.getMLSListingRequests,
  });
};

export const useMLSListingResults = () => {
  return useQuery({
    queryKey: QUERY_KEYS.MLS_LISTING_RESULTS,
    queryFn: api.getMLSListingResults,
  });
};