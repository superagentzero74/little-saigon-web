#!/bin/bash
# ============================================
# Little Saigon Web — Local Setup Script
# Run this from the project root directory
# ============================================

set -e

echo ""
echo "🏮 Little Saigon Web — Setup"
echo "=============================="
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install it from https://nodejs.org (v18+)"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION"

# 2. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# 3. Check for .env.local
echo ""
if [ ! -f .env.local ]; then
    echo "⚠️  No .env.local found. Creating from template..."
    cp .env.example .env.local
    echo ""
    echo "🔑 You need to fill in your Firebase credentials in .env.local"
    echo ""
    echo "   To find your Firebase API key and App ID:"
    echo "   1. Go to https://console.firebase.google.com"
    echo "   2. Select project: little-saigon-c055a"
    echo "   3. Click ⚙️ Project Settings"
    echo "   4. Scroll to 'Your apps' → Web app"
    echo "   5. If no web app exists, click 'Add app' → Web (</>)"
    echo "   6. Copy apiKey and appId"
    echo ""
    echo "   For Google Maps key:"
    echo "   - Use the same key from your seed/.env (GOOGLE_PLACES_API_KEY)"
    echo "   - Or create one at https://console.cloud.google.com/apis/credentials"
    echo "     (project 570934597896)"
    echo ""
    echo "   Edit .env.local now, then re-run this script or run: npm run dev"
    exit 0
else
    echo "✅ .env.local exists"
    
    # Validate keys are filled in
    if grep -q "your_firebase_api_key" .env.local; then
        echo "⚠️  .env.local still has placeholder values. Fill in your real keys."
        exit 0
    fi
fi

# 4. Done
echo ""
echo "🚀 Ready! Starting dev server..."
echo "   Open http://localhost:3000"
echo ""
npm run dev
