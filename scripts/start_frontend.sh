#!/bin/bash

# ZK Rebalancing Frontend Starter
# This script helps you get the frontend up and running quickly

set -e

echo "═══════════════════════════════════════════════════════════════════"
echo "  ZK Rebalancing Frontend - Quick Start"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Frontend dependencies already installed"
    echo ""
fi

# Check if Anvil is running
echo "🔍 Checking if Anvil (local blockchain) is running..."
if ! curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo ""
    echo "⚠️  Anvil is not running!"
    echo ""
    echo "Please start Anvil in a separate terminal:"
    echo "  npm run anvil"
    echo ""
    echo "Then run this script again."
    exit 1
else
    echo "✅ Anvil is running"
    echo ""
fi

# Check if contracts are deployed
if [ ! -f "deployed_contracts.json" ]; then
    echo "📜 Contracts not deployed yet. Deploying..."
    npm run forge:deploy:local
    echo "✅ Contracts deployed"
    echo ""
else
    echo "✅ Contracts already deployed"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════════════"
echo "  🚀 Starting Frontend Server"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "The frontend will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the frontend
cd frontend && npm run dev

