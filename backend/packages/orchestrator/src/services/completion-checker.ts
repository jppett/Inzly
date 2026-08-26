// Completion checker service to determine if an AddressRequest has all required data
import { 
  AddressRequest, 
  BonesReportResult, 
  MLSListingRequest,
  MLSListingResult,
  getAddressRequestRepository,
  getBonesReportResultRepository,
  getMLSListingRequestRepository,
  getMLSListingResultRepository
} from '@bones-report/shared';

export interface CompletionStatus {
  addressRequest: AddressRequest;
  isComplete: boolean;
  hasBonesReport: boolean;
  hasMLSRequest: boolean;
  hasMLSResult: boolean;
  missingComponents: string[];
  completedComponents: string[];
}

export class CompletionChecker {
  
  /**
   * Check if an AddressRequest has all required data to be marked as 'processed'
   */
  async checkCompletion(addressRequestId: string): Promise<CompletionStatus> {
    console.log(`🔍 [Completion] Checking completion status for AddressRequest: ${addressRequestId}`);
    
    // Get the AddressRequest
    const addressRepo = getAddressRequestRepository();
    const addressRequest = await addressRepo.findById(addressRequestId);
    
    if (!addressRequest) {
      throw new Error(`AddressRequest ${addressRequestId} not found`);
    }

    // Check for BonesReportResult
    const bonesRepo = getBonesReportResultRepository();
    const allBonesReports = await bonesRepo.findAll();
    const bonesReport = allBonesReports.find(report => 
      report.address_request_id === addressRequestId && report.status === 'completed'
    );
    const hasBonesReport = !!bonesReport;

    // Check for MLSListingRequest
    const mlsRequestRepo = getMLSListingRequestRepository();
    const allMLSRequests = await mlsRequestRepo.findAll();
    const mlsRequest = allMLSRequests.find(request => 
      request.address === addressRequest.address
    );
    const hasMLSRequest = !!mlsRequest;

    // Check for MLSListingResult (if MLS request exists)
    let hasMLSResult = false;
    if (mlsRequest) {
      const mlsResultRepo = getMLSListingResultRepository();
      const allMLSResults = await mlsResultRepo.findAll();
      const mlsResult = allMLSResults.find(result => 
        result.mls_listing_request_id === mlsRequest.id && result.status === 'completed'
      );
      hasMLSResult = !!mlsResult;
    }

    // Determine completion status
    const completedComponents: string[] = [];
    const missingComponents: string[] = [];

    if (hasBonesReport) {
      completedComponents.push('BonesReportResult');
    } else {
      missingComponents.push('BonesReportResult');
    }

    if (hasMLSRequest) {
      completedComponents.push('MLSListingRequest');
    } else {
      missingComponents.push('MLSListingRequest');
    }

    if (hasMLSResult) {
      completedComponents.push('MLSListingResult');
    } else if (hasMLSRequest) {
      missingComponents.push('MLSListingResult');
    }

    // T10 completion logic: require BOTH BonesReport AND MLSResult to be completed
    // An AddressRequest is only complete when we have:
    // 1. BonesReportResult (completed) - property data from RentCast
    // 2. MLSListingRequest (created) - MLS request initiated by orchestrator  
    // 3. MLSListingResult (completed) - MLS data provided by user/external system
    const isComplete = hasBonesReport && hasMLSRequest && hasMLSResult;

    const status: CompletionStatus = {
      addressRequest,
      isComplete,
      hasBonesReport,
      hasMLSRequest,
      hasMLSResult,
      completedComponents,
      missingComponents
    };

    console.log(`📊 [Completion] Status for ${addressRequestId}:`);
    console.log(`   Complete: ${isComplete ? '✅' : '❌'}`);
    console.log(`   Components: ${completedComponents.join(', ') || 'none'}`);
    console.log(`   Missing: ${missingComponents.join(', ') || 'none'}`);

    return status;
  }

  /**
   * Check completion for all AddressRequests currently in 'processing' status
   */
  async checkAllProcessingRequests(): Promise<CompletionStatus[]> {
    console.log('🔄 [Completion] Checking completion for all processing requests...');
    
    const addressRepo = getAddressRequestRepository();
    const processingRequests = await addressRepo.findProcessing();
    
    console.log(`📋 [Completion] Found ${processingRequests.length} processing requests`);
    
    const results: CompletionStatus[] = [];
    
    for (const request of processingRequests) {
      try {
        const status = await this.checkCompletion(request.id);
        results.push(status);
      } catch (error) {
        console.error(`❌ [Completion] Error checking ${request.id}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Find AddressRequests that are ready to be marked as processed
   */
  async findCompletableRequests(): Promise<AddressRequest[]> {
    const statuses = await this.checkAllProcessingRequests();
    const completable = statuses
      .filter(status => status.isComplete)
      .map(status => status.addressRequest);
    
    console.log(`🎯 [Completion] Found ${completable.length} requests ready for completion`);
    
    return completable;
  }

  /**
   * Get a summary of completion statistics
   */
  async getCompletionSummary(): Promise<{
    total: number;
    pending: number;
    processing: number;
    processed: number;
    completable: number;
  }> {
    const addressRepo = getAddressRequestRepository();
    const all = await addressRepo.findAll();
    
    const pending = all.filter(r => r.status === 'pending').length;
    const processing = all.filter(r => r.status === 'processing').length;
    const processed = all.filter(r => r.status === 'processed').length;
    
    const completable = (await this.findCompletableRequests()).length;
    
    return {
      total: all.length,
      pending,
      processing,
      processed,
      completable
    };
  }
}