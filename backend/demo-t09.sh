#!/usr/bin/env bash

# T09 Manual Demo: RentCast Fetcher Worker Integration

echo "🏠 T09 Manual Demo: RentCast Fetcher Worker"
echo "==========================================="

echo
echo "📋 This demo will:"
echo "   1. Create an AddressRequest via the REST API"
echo "   2. Show that the RentCast fetcher automatically:"
echo "      - Consumes the AddressRequest.create event"
echo "      - Fetches property data from RentCast (mocked)"
echo "      - Creates a BonesReportResult with property details"

echo
echo "⚠️  Prerequisites:"
echo "   - Redis and Redpanda running (docker-compose up redis redpanda)"
echo "   - API service running on port 8080"
echo "   - Orchestrator service running (to update status to processing)"
echo "   - RentCast fetcher service running and listening to events"

echo
echo "🚀 Creating AddressRequest via API..."
echo

# Create an AddressRequest via the API
RESPONSE=$(curl -s -X POST http://localhost:8080/address-requests \
  -H "Content-Type: application/json" \
  -d '{"address": "456 Mock Avenue, Demo City, CA"}')

if [[ $? -eq 0 ]] && [[ ! -z "$RESPONSE" ]]; then
  echo "✅ AddressRequest created:"
  echo "$RESPONSE" | jq '.'
  
  # Extract the ID for follow-up checks
  ADDRESS_REQUEST_ID=$(echo "$RESPONSE" | jq -r '.id')
  
  echo
  echo "⏳ Waiting 8 seconds for orchestrator and RentCast fetcher to process..."
  sleep 8
  
  echo
  echo "🔍 Checking if orchestrator updated the status..."
  UPDATED_REQUEST=$(curl -s http://localhost:8080/address-requests/$ADDRESS_REQUEST_ID)
  echo "$UPDATED_REQUEST" | jq '.'
  
  STATUS=$(echo "$UPDATED_REQUEST" | jq -r '.status')
  if [[ "$STATUS" == "processing" ]]; then
    echo "✅ Status updated to 'processing' by orchestrator!"
  else
    echo "❌ Status not updated. Current status: $STATUS"
  fi
  
  echo
  echo "🔍 Checking if RentCast fetcher created BonesReportResult..."
  BONES_REPORTS=$(curl -s "http://localhost:8080/bones-report-results?address_request_id=$ADDRESS_REQUEST_ID")
  echo "$BONES_REPORTS" | jq '.'
  
  # Check if any bones report was created for this address request
  BONES_COUNT=$(echo "$BONES_REPORTS" | jq '.data | length')
  
  if [[ "$BONES_COUNT" -gt 0 ]]; then
    echo "✅ BonesReportResult created by RentCast fetcher!"
    echo
    echo "📊 Property Report Summary:"
    echo "$BONES_REPORTS" | jq '.data[0].report_data | {
      address: .address,
      estimatedValue: .estimatedValue,
      propertyType: .propertyType,
      bedrooms: .bedrooms,
      bathrooms: .bathrooms,
      squareFootage: .squareFootage,
      dataSource: .dataSource,
      monthlyRentRange: .summary.monthlyRentRange,
      investmentScore: .summary.investmentPotential
    }'
  else
    echo "❌ No BonesReportResult found for the address request"
  fi
  
  echo
  echo "🔍 Checking if MLSListingRequest was created by orchestrator..."
  MLS_REQUESTS=$(curl -s http://localhost:8080/mls-listing-requests)
  ADDRESS="456 Mock Avenue, Demo City, CA"
  MLS_COUNT=$(echo "$MLS_REQUESTS" | jq --arg addr "$ADDRESS" '[.data[] | select(.address == $addr)] | length')
  
  if [[ "$MLS_COUNT" -gt 0 ]]; then
    echo "✅ MLSListingRequest also created by orchestrator!"
  fi
  
  echo
  echo "📊 Demo Summary:"
  echo "   - AddressRequest ID: $ADDRESS_REQUEST_ID"
  echo "   - Current Status: $STATUS"
  echo "   - BonesReports Created: $BONES_COUNT"
  echo "   - MLS Requests Created: $MLS_COUNT"
  
  if [[ "$STATUS" == "processing" ]] && [[ "$BONES_COUNT" -gt 0 ]]; then
    echo "🎉 SUCCESS: RentCast fetcher is working correctly!"
    echo "   - Event consumption: ✅"
    echo "   - Mock API integration: ✅"
    echo "   - BonesReportResult creation: ✅"
    echo "   - Data transformation: ✅"
  else
    echo "❌ ISSUES: Some RentCast fetcher functions may not be working"
  fi
  
else
  echo "❌ Failed to create AddressRequest via API"
  echo "   Make sure the API service is running on port 8080"
fi

echo
echo "💡 Check the RentCast fetcher logs to see the property data fetching process!"
echo "🏠 The mock API generates realistic property data including:"
echo "   - Property valuation and details"
echo "   - Rental estimates"
echo "   - Comparable properties"
echo "   - Market metrics"
echo "   - Investment potential score"
echo
echo "✨ Demo complete"