import { EventEnvelope, AddressRequest, MLSListingRequest } from '@bones-report/shared';
import { 
  getAddressRequestRepository,
  getMLSListingRequestRepository
} from '@bones-report/shared';

export class AddressRequestHandler {
  
  /**
   * Handle AddressRequest.create events by updating status to processing
   * and creating an MLSListingRequest
   */
  async handleCreate(envelope: EventEnvelope): Promise<void> {
    try {
      console.log('Processing AddressRequest.create event');
      
      const addressRequest = envelope.data as AddressRequest;
      console.log(`Processing address request for: ${addressRequest.address}`);

      // Get repository instances
      const addressRepo = getAddressRequestRepository();
      const mlsRepo = getMLSListingRequestRepository();

      // Step 1: Update AddressRequest status to 'processing'
      await addressRepo.markAsProcessing(addressRequest.id);
      console.log(`Updated AddressRequest ${addressRequest.id} status to processing`);

      // Step 2: Create MLSListingRequest for this address
      const createdMlsRequest = await mlsRepo.create({
        address: addressRequest.address
      });
      console.log(`Created MLSListingRequest ${createdMlsRequest.id} for address ${addressRequest.address}`);

    } catch (error) {
      console.error('Error processing AddressRequest.create:', error);
      
      // In a production system, we would implement retry logic
      // For POC, just log the error and continue
    }
  }

  /**
   * Handle AddressRequest.update events (currently no-op)
   */
  async handleUpdate(envelope: EventEnvelope): Promise<void> {
    const addressRequest = envelope.data as AddressRequest;
    console.log(`AddressRequest.update received for ${addressRequest.id} - no action needed`);
  }
}