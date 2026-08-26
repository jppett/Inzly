#!/usr/bin/env bash
set -euo pipefail
API="${API:-http://localhost:8080}"
code=$(curl -s -o /dev/null -w "%%{http_code}" "$API/health" || true)
if [ "$code" != "200" ] && [ "$code" != "204" ]; then
  echo "API health not OK (code=$code)"; exit 1
fi
echo "API health check passed (code=$code)"
