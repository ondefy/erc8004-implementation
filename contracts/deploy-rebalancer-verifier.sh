#!/bin/bash

# Deploy ONLY RebalancerVerifier contract to Base Sepolia
# Make sure you have set the following in your .env file:
# - RPC_URL_BASE_SEPOLIA
# - PRIVATE_KEY

set -e

echo "🚀 Deploying RebalancerVerifier to Base Sepolia..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "  - RPC_URL_BASE_SEPOLIA=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
    echo "  - PRIVATE_KEY=your_private_key_here"
    exit 1
fi

# Load environment variables
source .env

# Verify required variables are set
if [ -z "$RPC_URL_BASE_SEPOLIA" ]; then
    echo "❌ Error: RPC_URL_BASE_SEPOLIA not set in .env"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

echo "📡 Using RPC: ${RPC_URL_BASE_SEPOLIA:0:50}..."
echo ""

# Deploy contract
echo "📝 Deploying RebalancerVerifier contract..."
forge script script/DeployRebalancerVerifier.s.sol:DeployRebalancerVerifier \
    --rpc-url $RPC_URL_BASE_SEPOLIA \
    --private-key $PRIVATE_KEY \
    --broadcast \
    -vvvv

echo ""
echo "✅ Deployment complete!"
echo ""

# Extract the deployed address from the broadcast
BROADCAST_FILE="broadcast/DeployRebalancerVerifier.s.sol/84532/run-latest.json"

if [ -f "$BROADCAST_FILE" ]; then
    echo "📋 Deployment Details:"
    echo ""

    # Extract address using node if available, otherwise show file location
    if command -v node &> /dev/null; then
        ADDRESS=$(node -e "
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('$BROADCAST_FILE', 'utf8'));
            const tx = data.transactions.find(t => t.transactionType === 'CREATE');
            if (tx) console.log(tx.contractAddress);
        ")

        if [ -n "$ADDRESS" ]; then
            echo "RebalancerVerifier Address: $ADDRESS"
            echo ""
            echo "🔗 View on BaseScan:"
            echo "   https://sepolia.basescan.org/address/$ADDRESS"
            echo ""
            echo "📝 Update frontend/lib/constants.ts:"
            echo "   rebalancerVerifier: \"$ADDRESS\" as \`0x\${string}\`,"
            echo ""
        fi
    else
        echo "Check deployment details in:"
        echo "   $BROADCAST_FILE"
    fi
else
    echo "⚠️  Broadcast file not found. Check forge output above for deployment address."
fi

echo "✨ Done!"
