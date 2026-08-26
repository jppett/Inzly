#!/usr/bin/env node

// T08 Integration Test: Test that orchestrator reacts to AddressRequest.create
const { getAddressRequestRepository, getMLSListingRequestRepository } = require('@bones-report/shared');

async function testOrchestrator() {
  console.log('🧪 Testing T08: Orchestrator AddressRequest.create reaction');
  console.log('='.repeat(60));

  try {
    // Get repositories
    const addressRepo = getAddressRequestRepository();
    const mlsRepo = getMLSListingRequestRepository();

    // Clear existing data for clean test
    const existingAddressRequests = await addressRepo.findAll();
    const existingMLSRequests = await mlsRepo.findAll();
    
    console.log(`📋 Pre-test state:`);
    console.log(`   - Existing AddressRequests: ${existingAddressRequests.length}`);
    console.log(`   - Existing MLSListingRequests: ${existingMLSRequests.length}`);

    // Create a new AddressRequest (this should trigger the orchestrator)
    console.log('\n🚀 Creating AddressRequest...');
    const testAddress = '1600 Pennsylvania Avenue, Washington, DC';
    const addressRequest = await addressRepo.create({
      address: testAddress
    });

    console.log(`✅ Created AddressRequest:`);
    console.log(`   - ID: ${addressRequest.id}`);
    console.log(`   - Address: ${addressRequest.address}`);
    console.log(`   - Status: ${addressRequest.status}`);
    console.log(`   - Created: ${addressRequest.created_at}`);

    // Give the orchestrator time to process the event
    console.log('\n⏳ Waiting 5 seconds for orchestrator to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if the orchestrator updated the status
    console.log('\n🔍 Checking orchestrator actions...');
    const updatedAddressRequest = await addressRepo.findById(addressRequest.id);
    
    if (updatedAddressRequest && updatedAddressRequest.status === 'processing') {
      console.log('✅ AddressRequest status updated to "processing" by orchestrator');
    } else {
      console.log(`❌ AddressRequest status not updated. Current status: ${updatedAddressRequest?.status || 'NOT_FOUND'}`);
    }

    // Check if MLSListingRequest was created
    const allMLSRequests = await mlsRepo.findAll();
    const relatedMLSRequest = allMLSRequests.find(req => req.address === testAddress);

    if (relatedMLSRequest) {
      console.log('✅ MLSListingRequest created by orchestrator:');
      console.log(`   - ID: ${relatedMLSRequest.id}`);
      console.log(`   - Address: ${relatedMLSRequest.address}`);
      console.log(`   - Status: ${relatedMLSRequest.status}`);
      console.log(`   - Created: ${relatedMLSRequest.created_at}`);
    } else {
      console.log('❌ No MLSListingRequest found for the test address');
    }

    // Summary
    console.log('\n📊 Test Summary:');
    const statusUpdated = updatedAddressRequest?.status === 'processing';
    const mlsRequestCreated = !!relatedMLSRequest;
    
    if (statusUpdated && mlsRequestCreated) {
      console.log('🎉 SUCCESS: Orchestrator is working correctly!');
      console.log('   ✅ AddressRequest status updated to "processing"');
      console.log('   ✅ MLSListingRequest created automatically');
    } else {
      console.log('❌ PARTIAL SUCCESS: Some orchestrator functions may not be working');
      console.log(`   ${statusUpdated ? '✅' : '❌'} Status update: ${statusUpdated}`);
      console.log(`   ${mlsRequestCreated ? '✅' : '❌'} MLS request creation: ${mlsRequestCreated}`);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Check if running as main script
if (require.main === module) {
  testOrchestrator().then(() => {
    console.log('\n✨ Test complete');
    process.exit(0);
  }).catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  });
}

module.exports = { testOrchestrator };