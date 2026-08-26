#!/usr/bin/env bash

# T08 Manual Demo: Create AddressRequest via API and observe orchestrator response

echo "🧪 T08 Manual Demo: Orchestrator AddressRequest.create reaction"
echo "================================================================"

echo
echo "📋 This demo will:"
echo "   1. Create an AddressRequest via the REST API"
echo "   2. Show that the orchestrator automatically:"
echo "      - Updates the status to 'processing'"
echo "      - Creates an MLSListingRequest"

echo
echo "⚠️  Prerequisites:"
echo "   - Redis and Redpanda running (docker-compose up redis redpanda)"
echo "   - API service running on port 8080"
echo "   - Orchestrator service running and listening to events"

echo
echo "🚀 Creating AddressRequest via API..."
echo

# Create an AddressRequest via the API
RESPONSE=$(curl -s -X POST http://localhost:8080/address-requests \
  -H "Content-Type: application/json" \
  -d '{"address": "742 Evergreen Terrace, Springfield"}')

if [[ $? -eq 0 ]] && [[ ! -z "$RESPONSE" ]]; then
  echo "✅ AddressRequest created:"
  echo "$RESPONSE" | jq '.'
  
  # Extract the ID for follow-up checks
  ADDRESS_REQUEST_ID=$(echo "$RESPONSE" | jq -r '.id')
  
  echo
  echo "⏳ Waiting 3 seconds for orchestrator to process..."
  sleep 3
  
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
  echo "🔍 Checking if MLSListingRequest was created..."
  MLS_REQUESTS=$(curl -s http://localhost:8080/mls-listing-requests)
  echo "$MLS_REQUESTS" | jq '.'
  
  # Check if any MLS request has the same address
  ADDRESS="742 Evergreen Terrace, Springfield"
  MLS_COUNT=$(echo "$MLS_REQUESTS" | jq --arg addr "$ADDRESS" '[.[] | select(.address == $addr)] | length')
  
  if [[ "$MLS_COUNT" -gt 0 ]]; then
    echo "✅ MLSListingRequest created by orchestrator!"
    echo "$MLS_REQUESTS" | jq --arg addr "$ADDRESS" '[.[] | select(.address == $addr)]'
  else
    echo "❌ No MLSListingRequest found for the address"
  fi
  
  echo
  echo "📊 Demo Summary:"
  echo "   - AddressRequest ID: $ADDRESS_REQUEST_ID"
  echo "   - Current Status: $STATUS"
  echo "   - MLS Requests Created: $MLS_COUNT"
  
  if [[ "$STATUS" == "processing" ]] && [[ "$MLS_COUNT" -gt 0 ]]; then
    echo "🎉 SUCCESS: Orchestrator is working correctly!"
  else
    echo "❌ ISSUES: Some orchestrator functions may not be working"
  fi
  
else
  echo "❌ Failed to create AddressRequest via API"
  echo "   Make sure the API service is running on port 8080"
fi

echo
echo "💡 Check the orchestrator logs to see the event processing messages!"
echo "✨ Demo complete"