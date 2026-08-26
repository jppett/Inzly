#!/usr/bin/env bash
set -euo pipefail
API="${API:-http://localhost:8080}"
ID=$(curl -s -X POST "$API/address-requests" -H "Content-Type: application/json" -d '{"address":"123 main st, springfield il"}' | jq -r '.id' || true)
test "$ID" != "null" && test -n "$ID"
STATUS=$(curl -s "$API/address-requests/$ID" | jq -r '.status' || true)
test "$STATUS" = "pending"
echo "Address flow OK: id=$ID status=$STATUS"
