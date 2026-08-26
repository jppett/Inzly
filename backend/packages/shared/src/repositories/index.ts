// Repository exports and initialization
export * from './base.js';
export * from './address-request.js';
export * from './bones-report-result.js';
export * from './mls-listing-request.js';
export * from './mls-listing-result.js';
export * from './property-insights-result.js';

// Import types and functions for internal use
import {
  getAddressRequestRepository,
  AddressRequestRepository,
} from './address-request.js';

import {
  getBonesReportResultRepository,
  BonesReportResultRepository,
} from './bones-report-result.js';

import {
  getMLSListingRequestRepository,
  MLSListingRequestRepository,
} from './mls-listing-request.js';

import {
  getMLSListingResultRepository,
  MLSListingResultRepository,
} from './mls-listing-result.js';

import {
  getPropertyInsightsResultRepository,
  PropertyInsightsResultRepository,
} from './property-insights-result.js';

// Convenience function to get all repositories
export interface AllRepositories {
  addressRequest: AddressRequestRepository;
  bonesReportResult: BonesReportResultRepository;
  mlsListingRequest: MLSListingRequestRepository;
  mlsListingResult: MLSListingResultRepository;
  propertyInsightsResult: PropertyInsightsResultRepository;
}

export function getAllRepositories(): AllRepositories {
  return {
    addressRequest: getAddressRequestRepository(),
    bonesReportResult: getBonesReportResultRepository(),
    mlsListingRequest: getMLSListingRequestRepository(),
    mlsListingResult: getMLSListingResultRepository(),
    propertyInsightsResult: getPropertyInsightsResultRepository(),
  };
}

// Health check for all repositories
export async function healthCheckAllRepositories(): Promise<{
  status: 'healthy' | 'unhealthy';
  repositories: Record<string, { status: 'healthy' | 'unhealthy'; count?: number }>;
}> {
  const repos = getAllRepositories();
  const results: Record<string, { status: 'healthy' | 'unhealthy'; count?: number }> = {};

  try {
    const [
      addressRequestHealth,
      bonesReportResultHealth,
      mlsListingRequestHealth,
      mlsListingResultHealth,
    ] = await Promise.all([
      repos.addressRequest.healthCheck(),
      repos.bonesReportResult.healthCheck(),
      repos.mlsListingRequest.healthCheck(),
      repos.mlsListingResult.healthCheck(),
    ]);

    results.addressRequest = addressRequestHealth;
    results.bonesReportResult = bonesReportResultHealth;
    results.mlsListingRequest = mlsListingRequestHealth;
    results.mlsListingResult = mlsListingResultHealth;

    const allHealthy = Object.values(results).every(r => r.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      repositories: results,
    };
  } catch (error) {
    console.error('Error checking repository health:', error);
    return {
      status: 'unhealthy',
      repositories: results,
    };
  }
}

// Initialize all repositories (useful for warming up connections)
export async function initializeAllRepositories(): Promise<void> {
  const repos = getAllRepositories();
  
  // This will trigger connection establishment for all repositories
  await Promise.all([
    repos.addressRequest.count(),
    repos.bonesReportResult.count(),
    repos.mlsListingRequest.count(),
    repos.mlsListingResult.count(),
    repos.propertyInsightsResult.count(),
  ]);

  console.log('All repositories initialized');
}
