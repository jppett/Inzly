#!/usr/bin/env node

/**
 * Simple test to verify T05 API functionality
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8080';

async function testAPI() {
  console.log('🧪 Testing T05 API Functionality\n');

  try {
    // Test 1: Health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Response: ${JSON.stringify(healthData, null, 2)}`);
    console.log();

    // Test 2: Create address request
    console.log('2. Testing POST /address-requests...');
    const createResponse = await fetch(`${API_BASE}/address-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: '123 Test St, Test City, TS 12345'
      })
    });
    
    const createData = await createResponse.json();
    console.log(`   Status: ${createResponse.status}`);
    console.log(`   Response: ${JSON.stringify(createData, null, 2)}`);
    console.log();

    if (createResponse.ok && createData.id) {
      const addressId = createData.id;

      // Test 3: Get address request
      console.log('3. Testing GET /address-requests/:id...');
      const getResponse = await fetch(`${API_BASE}/address-requests/${addressId}`);
      const getData = await getResponse.json();
      console.log(`   Status: ${getResponse.status}`);
      console.log(`   Response: ${JSON.stringify(getData, null, 2)}`);
      console.log();

      // Test 4: Update address request
      console.log('4. Testing PATCH /address-requests/:id...');
      const updateResponse = await fetch(`${API_BASE}/address-requests/${addressId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'processing'
        })
      });
      
      const updateData = await updateResponse.json();
      console.log(`   Status: ${updateResponse.status}`);
      console.log(`   Response: ${JSON.stringify(updateData, null, 2)}`);
      console.log();

      // Test 5: List address requests
      console.log('5. Testing GET /address-requests...');
      const listResponse = await fetch(`${API_BASE}/address-requests`);
      const listData = await listResponse.json();
      console.log(`   Status: ${listResponse.status}`);
      console.log(`   Count: ${listData.count || 'N/A'}`);
      console.log();

      // Test 6: Delete address request
      console.log('6. Testing DELETE /address-requests/:id...');
      const deleteResponse = await fetch(`${API_BASE}/address-requests/${addressId}`, {
        method: 'DELETE'
      });
      console.log(`   Status: ${deleteResponse.status}`);
      console.log();
    }

    console.log('✅ API tests completed!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the API server is running on port 8080');
    }
  }
}

testAPI();