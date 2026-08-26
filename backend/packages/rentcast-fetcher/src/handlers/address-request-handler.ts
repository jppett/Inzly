import { EventEnvelope, AddressRequest, BonesReportResult, getBonesReportResultRepository, getAddressRequestRepository } from '@bones-report/shared';
import { MockRentCastAPI, RentCastPropertyData } from '../services/mock-rentcast-api.js';
import { RentCastAPI } from '../services/rentcast-api.js';

export class RentCastAddressRequestHandler {
  private mockAPI: MockRentCastAPI;
  private realAPI: RentCastAPI | null = null;
  private useMockAPI: boolean;

  constructor() {
    // Initialize mock API
    this.mockAPI = new MockRentCastAPI();
    
    // Try to initialize real API if credentials are available
    const apiKey = process.env.RENTCAST_API_KEY;
    const baseUrl = process.env.RENTCAST_BASE_URL || 'https://api.rentcast.io';
    
    if (apiKey && apiKey !== 'mock-key' && apiKey.length > 10) {
      console.log('🔑 [RentCast] Real API key detected, will attempt real API calls');
      this.realAPI = new RentCastAPI({ baseUrl, apiKey });
      this.useMockAPI = false;
    } else {
      console.log('🎭 [RentCast] Using mock API for POC (set RENTCAST_API_KEY for real API)');
      this.useMockAPI = true;
    }
  }

  /**
   * Handle AddressRequest.create events by fetching RentCast data
   * and creating a BonesReportResult
   */
  async handleCreate(envelope: EventEnvelope): Promise<void> {
    try {
      const addressRequest = envelope.data as AddressRequest;
      console.log(`🏠 [RentCast] Processing AddressRequest for: ${addressRequest.address}`);

      // Only process if the request is in 'processing' status
      if (addressRequest.status !== 'processing') {
        console.log(`ℹ️ [RentCast] Skipping AddressRequest ${addressRequest.id} - status is '${addressRequest.status}', not 'processing'`);
        return;
      }

      // Check if we already created a BonesReportResult for this AddressRequest
      const bonesRepo = getBonesReportResultRepository();
      const existing = await bonesRepo.findAll();
      const existingReport = existing.find(report => report.address_request_id === addressRequest.id);
      
      if (existingReport) {
        console.log(`ℹ️ [RentCast] BonesReportResult already exists for AddressRequest ${addressRequest.id}, skipping`);
        return;
      }

      // Fetch property data from RentCast (mock or real)
      const propertyData = await this.fetchPropertyData(addressRequest.address);
      
      // Transform the RentCast data into a BonesReportResult
      const reportData = this.transformToBonesReport(addressRequest.address, propertyData);
      
      // Create BonesReportResult record
      const bonesReport = await bonesRepo.create({
        address_request_id: addressRequest.id,
        report_data: reportData,
        status: 'completed'
      });

      console.log(`✅ [RentCast] Created BonesReportResult ${bonesReport.id} for ${addressRequest.address}`);
      console.log(`📊 [RentCast] Property value: $${reportData.estimatedValue?.toLocaleString()}`);
      
    } catch (error) {
      console.error('❌ [RentCast] Error processing AddressRequest.create:', error);
      
      // Create a failed BonesReportResult to track the error
      try {
        const addressRequest = envelope.data as AddressRequest;
        const bonesRepo = getBonesReportResultRepository();
        await bonesRepo.create({
          address_request_id: addressRequest.id,
          report_data: {
            error: 'Failed to fetch RentCast data',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          },
          status: 'failed'
        });
        console.log(`📝 [RentCast] Created failed BonesReportResult for ${addressRequest.address}`);
      } catch (reportError) {
        console.error('❌ [RentCast] Failed to create error report:', reportError);
      }
    }
  }

  /**
   * Handle AddressRequest.update events when status changes to processing
   */
  async handleUpdate(envelope: EventEnvelope): Promise<void> {
    const updateData = envelope.data as { id: string; status?: string; address?: string };
    
    // Process if the status was updated to 'processing'
    if (updateData.status === 'processing') {
      console.log(`🎯 [RentCast] AddressRequest ${updateData.id} status updated to 'processing' - triggering RentCast fetch`);
      
      // We need to fetch the full AddressRequest record since the update event only contains partial data
      try {
        const addressRepo = getAddressRequestRepository();
        const fullAddressRequest = await addressRepo.findById(updateData.id);
        
        if (!fullAddressRequest) {
          console.error(`❌ [RentCast] AddressRequest ${updateData.id} not found when processing update event`);
          return;
        }
        
        // Create a new envelope with the full AddressRequest data for processing
        const fullEnvelope: EventEnvelope = {
          ...envelope,
          data: fullAddressRequest
        };
        
        await this.handleCreate(fullEnvelope);
      } catch (error) {
        console.error(`❌ [RentCast] Error fetching full AddressRequest ${updateData.id}:`, error);
      }
    } else {
      console.log(`ℹ️ [RentCast] AddressRequest.update received for ${updateData.id} - status is '${updateData.status}', no action needed`);
    }
  }

  /**
   * Fetch property data using the appropriate API (mock or real)
   */
  private async fetchPropertyData(address: string): Promise<RentCastPropertyData> {
    if (this.useMockAPI || !this.realAPI) {
      return await this.mockAPI.getPropertyData(address);
    }

    try {
      // Try real API first
      return await this.realAPI.getPropertyData(address);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ [RentCast] Real API failed, falling back to mock: ${errorMessage}`);
      return await this.mockAPI.getPropertyData(address);
    }
  }

  /**
   * Transform RentCast property data into our BonesReport format
   */
  private transformToBonesReport(address: string, propertyData: RentCastPropertyData): Record<string, any> {
    return {
      address: address,
      estimatedValue: propertyData.estimatedValue,
      propertyType: propertyData.propertyType,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      squareFootage: propertyData.squareFootage,
      yearBuilt: propertyData.yearBuilt,
      lotSize: propertyData.lotSize,
      rentEstimate: propertyData.rentEstimate,
      location: propertyData.location,
      marketMetrics: {
        averageDaysOnMarket: propertyData.marketMetrics.averageDaysOnMarket,
        pricePerSquareFoot: propertyData.marketMetrics.pricePerSquareFoot,
        appreciationRate: propertyData.marketMetrics.appreciationRate,
      },
      comparableProperties: propertyData.comparableProperties.slice(0, 3), // Limit to top 3
      propertyHistory: propertyData.propertyHistory.slice(0, 5), // Limit to recent 5 events
      dataSource: this.useMockAPI ? 'mock' : 'rentcast',
      fetchedAt: new Date().toISOString(),
      summary: {
        propertyValueRange: {
          low: Math.floor(propertyData.estimatedValue * 0.9),
          high: Math.floor(propertyData.estimatedValue * 1.1),
        },
        monthlyRentRange: propertyData.rentEstimate,
        investmentPotential: this.calculateInvestmentScore(propertyData),
      }
    };
  }

  /**
   * Calculate a simple investment potential score (0-100)
   */
  private calculateInvestmentScore(propertyData: RentCastPropertyData): number {
    const rentYield = (propertyData.rentEstimate.median * 12) / propertyData.estimatedValue;
    const appreciationScore = Math.min(propertyData.marketMetrics.appreciationRate / 10, 1);
    const marketScore = Math.max(0, (60 - propertyData.marketMetrics.averageDaysOnMarket) / 60);
    
    const score = (rentYield * 40) + (appreciationScore * 35) + (marketScore * 25);
    return Math.round(Math.min(100, Math.max(0, score * 100)));
  }
}