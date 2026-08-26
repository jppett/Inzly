// Completion handler that responds to data completion events
import { EventEnvelope, BonesReportResult, MLSListingResult } from '@bones-report/shared';
import { getAddressRequestRepository } from '@bones-report/shared';
import { CompletionChecker } from '../services/completion-checker.js';

export class CompletionHandler {
  private completionChecker: CompletionChecker;

  constructor() {
    this.completionChecker = new CompletionChecker();
  }

  /**
   * Handle BonesReportResult.create events - check if AddressRequest can be completed
   */
  async handleBonesReportCreate(envelope: EventEnvelope): Promise<void> {
    try {
      const bonesReport = envelope.data as BonesReportResult;
      console.log(`📊 [Completion] BonesReportResult created for AddressRequest: ${bonesReport.address_request_id}`);

      // Only process completed reports
      if (bonesReport.status !== 'completed') {
        console.log(`ℹ️ [Completion] BonesReportResult status is '${bonesReport.status}', not 'completed' - skipping`);
        return;
      }

      await this.checkAndCompleteRequest(bonesReport.address_request_id, 'BonesReportResult');
      
    } catch (error) {
      console.error('❌ [Completion] Error handling BonesReportResult.create:', error);
    }
  }

  /**
   * Handle MLSListingResult.create events - check if AddressRequest can be completed
   */
  async handleMLSListingResultCreate(envelope: EventEnvelope): Promise<void> {
    try {
      const mlsResult = envelope.data as MLSListingResult;
      console.log(`🏘️ [Completion] MLSListingResult created: ${mlsResult.id}`);

      // Only process completed results
      if (mlsResult.status !== 'completed') {
        console.log(`ℹ️ [Completion] MLSListingResult status is '${mlsResult.status}', not 'completed' - skipping`);
        return;
      }

      // Find the associated AddressRequest by looking up the MLSListingRequest
      const addressRequestId = await this.findAddressRequestIdForMLSResult(mlsResult);
      
      if (addressRequestId) {
        await this.checkAndCompleteRequest(addressRequestId, 'MLSListingResult');
      } else {
        console.log(`⚠️ [Completion] Could not find AddressRequest for MLSListingResult ${mlsResult.id}`);
      }
      
    } catch (error) {
      console.error('❌ [Completion] Error handling MLSListingResult.create:', error);
    }
  }

  /**
   * Handle BonesReportResult.update events
   */
  async handleBonesReportUpdate(envelope: EventEnvelope): Promise<void> {
    const bonesReport = envelope.data as BonesReportResult;
    
    // If status changed to completed, trigger completion check
    if (bonesReport.status === 'completed') {
      console.log(`🔄 [Completion] BonesReportResult updated to completed: ${bonesReport.address_request_id}`);
      await this.checkAndCompleteRequest(bonesReport.address_request_id, 'BonesReportResult (updated)');
    } else {
      console.log(`ℹ️ [Completion] BonesReportResult.update received - status: ${bonesReport.status}, no action needed`);
    }
  }

  /**
   * Handle MLSListingResult.update events
   */
  async handleMLSListingResultUpdate(envelope: EventEnvelope): Promise<void> {
    const mlsResult = envelope.data as MLSListingResult;
    
    // If status changed to completed, trigger completion check
    if (mlsResult.status === 'completed') {
      console.log(`🔄 [Completion] MLSListingResult updated to completed: ${mlsResult.id}`);
      
      const addressRequestId = await this.findAddressRequestIdForMLSResult(mlsResult);
      if (addressRequestId) {
        await this.checkAndCompleteRequest(addressRequestId, 'MLSListingResult (updated)');
      }
    } else {
      console.log(`ℹ️ [Completion] MLSListingResult.update received - status: ${mlsResult.status}, no action needed`);
    }
  }

  /**
   * Check if an AddressRequest is complete and mark it as processed if so
   */
  private async checkAndCompleteRequest(addressRequestId: string, triggerComponent: string): Promise<void> {
    console.log(`🔍 [Completion] Checking completion for ${addressRequestId} triggered by ${triggerComponent}`);
    
    try {
      const completionStatus = await this.completionChecker.checkCompletion(addressRequestId);
      
      if (completionStatus.isComplete && completionStatus.addressRequest.status === 'processing') {
        // Mark as processed
        const addressRepo = getAddressRequestRepository();
        await addressRepo.markAsProcessed(addressRequestId);
        
        console.log(`🎉 [Completion] AddressRequest ${addressRequestId} marked as PROCESSED!`);
        console.log(`   ✅ Completed components: ${completionStatus.completedComponents.join(', ')}`);
        console.log(`   📍 Address: ${completionStatus.addressRequest.address}`);
        
        // Log summary statistics
        const summary = await this.completionChecker.getCompletionSummary();
        console.log(`📈 [Completion] Summary: ${summary.processed} processed, ${summary.processing} processing, ${summary.pending} pending (${summary.total} total)`);
        
      } else if (completionStatus.addressRequest.status === 'processed') {
        console.log(`ℹ️ [Completion] AddressRequest ${addressRequestId} already marked as processed`);
      } else {
        console.log(`⏳ [Completion] AddressRequest ${addressRequestId} not yet complete - missing: ${completionStatus.missingComponents.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ [Completion] Error checking completion for ${addressRequestId}:`, error);
    }
  }

  /**
   * Find the AddressRequest ID associated with an MLSListingResult
   */
  private async findAddressRequestIdForMLSResult(mlsResult: MLSListingResult): Promise<string | null> {
    try {
      // Get the MLSListingRequest for this result
      const { getMLSListingRequestRepository } = await import('@bones-report/shared');
      const mlsRequestRepo = getMLSListingRequestRepository();
      const mlsRequest = await mlsRequestRepo.findById(mlsResult.mls_listing_request_id);
      
      if (!mlsRequest) {
        console.log(`⚠️ [Completion] MLSListingRequest ${mlsResult.mls_listing_request_id} not found`);
        return null;
      }

      // Find AddressRequest with matching address
      const addressRepo = getAddressRequestRepository();
      const allAddressRequests = await addressRepo.findAll();
      const addressRequest = allAddressRequests.find(req => req.address === mlsRequest.address);
      
      if (!addressRequest) {
        console.log(`⚠️ [Completion] No AddressRequest found for address: ${mlsRequest.address}`);
        return null;
      }

      return addressRequest.id;
      
    } catch (error) {
      console.error('❌ [Completion] Error finding AddressRequest for MLSResult:', error);
      return null;
    }
  }

  /**
   * Perform a manual completion check for all processing requests
   * This can be useful for recovery scenarios or periodic cleanup
   */
  async performManualCompletionCheck(): Promise<void> {
    console.log('🔄 [Completion] Performing manual completion check...');
    
    try {
      const completableRequests = await this.completionChecker.findCompletableRequests();
      
      console.log(`🎯 [Completion] Found ${completableRequests.length} completable requests`);
      
      for (const request of completableRequests) {
        await this.checkAndCompleteRequest(request.id, 'manual check');
      }
      
      const summary = await this.completionChecker.getCompletionSummary();
      console.log(`📈 [Completion] Manual check complete - Summary: ${summary.processed} processed, ${summary.processing} processing, ${summary.pending} pending`);
      
    } catch (error) {
      console.error('❌ [Completion] Error during manual completion check:', error);
    }
  }
}