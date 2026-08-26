#!/usr/bin/env bash

# T10 Manual Demo: Complete End-to-End Workflow with Orchestrator Completion Logic

echo "🎯 T10 Manual Demo: Complete Workflow with Completion Logic"
echo "==========================================================="

echo
echo "📋 This demo will test the complete end-to-end workflow:"
echo "   1. Create AddressRequest via API"
echo "   2. Orchestrator updates status to 'processing' + creates MLSListingRequest"
echo "   3. RentCast fetcher creates BonesReportResult"
echo "   4. Orchestrator detects completion and marks request as 'processed'"

echo
echo "⚠️  Prerequisites:"
echo "   - Redis and Redpanda running (docker-compose up redis redpanda)"
echo "   - API service running on port 8080"
echo "   - Orchestrator service running (T08 + T10 completion logic)"
echo "   - RentCast fetcher service running"

echo
echo "🚀 Starting complete workflow test..."
echo

# Create a unique address for this test
TIMESTAMP=$(date +%s)
TEST_ADDRESS="$TIMESTAMP Workflow Test Street, Complete City, TX"

echo "📍 Creating AddressRequest for: $TEST_ADDRESS"
RESPONSE=$(curl -s -X POST http://localhost:8080/address-requests \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$TEST_ADDRESS\"}")

if [[ $? -eq 0 ]] && [[ ! -z "$RESPONSE" ]]; then
  echo "✅ AddressRequest created:"
  echo "$RESPONSE" | jq '.'
  
  ADDRESS_REQUEST_ID=$(echo "$RESPONSE" | jq -r '.id')
  
  echo
  echo "⏳ Step 1: Waiting 5 seconds for orchestrator to process..."
  sleep 5
  
  # Check orchestrator processing
  echo "🔍 Checking if orchestrator updated status to 'processing'..."
  UPDATED_REQUEST=$(curl -s http://localhost:8080/address-requests/$ADDRESS_REQUEST_ID)
  STATUS_1=$(echo "$UPDATED_REQUEST" | jq -r '.status')
  echo "   Status: $STATUS_1"
  
  if [[ "$STATUS_1" == "processing" ]]; then
    echo "✅ Step 1 Complete: Orchestrator updated status to 'processing'"
  else
    echo "❌ Step 1 Failed: Status not updated to 'processing'"
  fi
  
  echo
  echo "⏳ Step 2: Waiting 8 seconds for RentCast fetcher to create BonesReportResult..."
  sleep 8
  
  # Check RentCast fetcher results
  echo "🔍 Checking if RentCast fetcher created BonesReportResult..."
  BONES_REPORTS=$(curl -s "http://localhost:8080/bones-report-results?address_request_id=$ADDRESS_REQUEST_ID")
  BONES_COUNT=$(echo "$BONES_REPORTS" | jq '.data | length')
  
  if [[ "$BONES_COUNT" -gt 0 ]]; then
    echo "✅ Step 2 Complete: RentCast fetcher created BonesReportResult"
    BONES_STATUS=$(echo "$BONES_REPORTS" | jq -r '.data[0].status')
    ESTIMATED_VALUE=$(echo "$BONES_REPORTS" | jq -r '.data[0].report_data.estimatedValue')
    echo "   BonesReport Status: $BONES_STATUS"
    echo "   Property Value: \$$(echo $ESTIMATED_VALUE | sed ':a;s/\B[0-9]\{3\}\>/,&/;ta')"
  else
    echo "❌ Step 2 Failed: No BonesReportResult created"
  fi
  
  echo
  echo "⏳ Step 3: Waiting 5 seconds for orchestrator completion logic..."
  sleep 5
  
  # Check final completion status
  echo "🔍 Checking if orchestrator completion logic marked request as 'processed'..."
  FINAL_REQUEST=$(curl -s http://localhost:8080/address-requests/$ADDRESS_REQUEST_ID)
  FINAL_STATUS=$(echo "$FINAL_REQUEST" | jq -r '.status')
  echo "   Final Status: $FINAL_STATUS"
  
  if [[ "$FINAL_STATUS" == "processed" ]]; then
    echo "🎉 Step 3 Complete: Orchestrator completion logic marked request as 'PROCESSED'!"
  else
    echo "⏳ Step 3 Pending: Request not yet marked as 'processed' (current: $FINAL_STATUS)"
  fi
  
  echo
  echo "🔍 Checking MLSListingRequest creation..."
  MLS_REQUESTS=$(curl -s http://localhost:8080/mls-listing-requests)
  MLS_COUNT=$(echo "$MLS_REQUESTS" | jq --arg addr "$TEST_ADDRESS" '[.data[] | select(.address == $addr)] | length')
  
  if [[ "$MLS_COUNT" -gt 0 ]]; then
    echo "✅ MLSListingRequest created by orchestrator"
  else
    echo "❌ No MLSListingRequest found"
  fi
  
  echo
  echo "📊 Complete Workflow Summary:"
  echo "   - AddressRequest ID: $ADDRESS_REQUEST_ID"
  echo "   - Final Status: $FINAL_STATUS"
  echo "   - BonesReports Created: $BONES_COUNT"
  echo "   - MLS Requests Created: $MLS_COUNT"
  echo "   - Property Address: $TEST_ADDRESS"
  
  if [[ "$BONES_COUNT" -gt 0 ]]; then
    echo "   - Property Value: \$$(echo $ESTIMATED_VALUE | sed ':a;s/\B[0-9]\{3\}\>/,&/;ta')"
  fi
  
  echo
  if [[ "$FINAL_STATUS" == "processed" ]] && [[ "$BONES_COUNT" -gt 0 ]]; then
    echo "🎉 SUCCESS: Complete end-to-end workflow functioning perfectly!"
    echo "   ✅ Orchestrator initiation (T08)"
    echo "   ✅ RentCast data fetching (T09)"
    echo "   ✅ Completion detection (T10)"
    echo "   ✅ Status progression: pending → processing → processed"
  elif [[ "$FINAL_STATUS" == "processing" ]] && [[ "$BONES_COUNT" -gt 0 ]]; then
    echo "🔄 PARTIAL SUCCESS: Workflow working, completion logic may need more time"
    echo "   ✅ Orchestrator initiation"
    echo "   ✅ RentCast data fetching"
    echo "   ⏳ Completion detection (in progress)"
  else
    echo "❌ ISSUES: Some workflow components may not be working"
    echo "   Check service logs for details"
  fi
  
  echo
  echo "📈 Getting overall completion statistics..."
  STATS=$(curl -s http://localhost:8080/address-requests)
  TOTAL=$(echo "$STATS" | jq '.count')
  PENDING_COUNT=$(echo "$STATS" | jq '[.data[] | select(.status == "pending")] | length')
  PROCESSING_COUNT=$(echo "$STATS" | jq '[.data[] | select(.status == "processing")] | length')
  PROCESSED_COUNT=$(echo "$STATS" | jq '[.data[] | select(.status == "processed")] | length')
  
  echo "📊 System-wide Statistics:"
  echo "   Total Requests: $TOTAL"
  echo "   Pending: $PENDING_COUNT"
  echo "   Processing: $PROCESSING_COUNT"
  echo "   Processed: $PROCESSED_COUNT"
  
else
  echo "❌ Failed to create AddressRequest via API"
  echo "   Make sure the API service is running on port 8080"
fi

echo
echo "💡 Check orchestrator and RentCast fetcher logs to see the complete event flow!"
echo "🎯 T10 completion logic should trigger when BonesReportResult is created"
echo "✨ Demo complete"