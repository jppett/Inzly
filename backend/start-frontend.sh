#!/usr/bin/env bash

# Frontend development server starter script

set -euo pipefail

echo "🎨 Starting Bones Report Frontend Development Server"
echo "=================================================="

# Check if API is running
API_URL="http://localhost:8080"
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo "✅ API service is running on port 8080"
else
    echo "⚠️  API service is not running on port 8080"
    echo "   Please start the API service first:"
    echo "   cd packages/api && npm run dev"
    echo ""
fi

echo "🚀 Starting frontend development server on port 3000..."
echo "   Frontend: http://localhost:3000"
echo "   API Proxy: /api/* -> http://localhost:8080/*"
echo ""

cd packages/frontend
npm run dev