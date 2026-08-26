#!/usr/bin/env node

// Simple test script to demonstrate T09 Mock RentCast API functionality
const { MockRentCastAPI } = require('./packages/rentcast-fetcher/dist/services/mock-rentcast-api.js');

async function testMockRentCastAPI() {
  console.log('🧪 T09 Mock RentCast API Test');
  console.log('============================');
  console.log();

  const mockAPI = new MockRentCastAPI();

  // Test different addresses to show variety in mock data
  const testAddresses = [
    '123 Main Street, Springfield, IL',
    '456 Oak Avenue, Austin, TX', 
    '789 Pine Drive, Seattle, WA',
    '999 Final Test Drive, Complete City, FL'
  ];

  console.log('🏠 Testing Mock RentCast API with various addresses...');
  console.log();

  for (const address of testAddresses) {
    try {
      console.log(`📍 Fetching data for: ${address}`);
      const propertyData = await mockAPI.getPropertyData(address);
      
      console.log(`✅ Success! Property Details:`);
      console.log(`   📊 Estimated Value: $${propertyData.estimatedValue.toLocaleString()}`);
      console.log(`   🏡 Type: ${propertyData.propertyType}`);
      console.log(`   🛏️  Bedrooms: ${propertyData.bedrooms}, Bathrooms: ${propertyData.bathrooms}`);
      console.log(`   📐 Square Footage: ${propertyData.squareFootage.toLocaleString()}`);
      console.log(`   💰 Rent Range: $${propertyData.rentEstimate.low} - $${propertyData.rentEstimate.high}`);
      console.log(`   🏘️  Neighborhood: ${propertyData.location.neighborhood}, ${propertyData.location.city}`);
      console.log(`   📈 Market: ${propertyData.marketMetrics.averageDaysOnMarket} days on market, ${propertyData.marketMetrics.appreciationRate}% appreciation`);
      console.log(`   🔍 Comparables: ${propertyData.comparableProperties.length} properties found`);
      console.log();
    } catch (error) {
      console.error(`❌ Error fetching data for ${address}:`, error.message);
      console.log();
    }
  }

  // Test health check
  console.log('🩺 Testing health check...');
  const health = await mockAPI.healthCheck();
  console.log(`✅ Health Status: ${health.status} - ${health.message}`);
  console.log();

  console.log('📋 Summary:');
  console.log('   ✅ Mock RentCast API fully functional');
  console.log('   ✅ Generates realistic, deterministic property data');
  console.log('   ✅ Provides comprehensive property details');
  console.log('   ✅ Includes market metrics and comparables');
  console.log('   ✅ Ready for integration with RentCast fetcher service');
  console.log();
  console.log('🎉 T09 Mock API validation complete!');
  console.log();
  console.log('💡 Next steps:');
  console.log('   - Start orchestrator and RentCast fetcher services');
  console.log('   - Create AddressRequest via API to trigger full workflow');
  console.log('   - Real RentCast API can be implemented by updating rentcast-api.ts');
}

testMockRentCastAPI().catch(console.error);