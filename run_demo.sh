#!/bin/bash
# Run the complete ZK Rebalancing Proof Demo with Agentic Orchestration

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║   ZK Rebalancing Proof - Complete Agentic Demo                  ║"
echo "║   ERC-8004 + Zero-Knowledge Proofs                              ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check dependencies
echo "🔍 Checking dependencies..."

# Check if Anvil is running
if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Anvil is not running. Starting Anvil...${NC}"
    echo ""
    echo "Please run this in a separate terminal:"
    echo "  npm run anvil"
    echo ""
    echo -e "${YELLOW}Press Enter once Anvil is running...${NC}"
    read
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo -e "${RED}❌ snarkjs is not installed${NC}"
    echo "Please install: npm install -g snarkjs"
    exit 1
fi

# Check if Python dependencies are installed
if ! python3 -c "import web3" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Installing Python dependencies...${NC}"
    pip3 install web3 python-dotenv
fi

echo -e "${GREEN}✅ All dependencies installed${NC}"
echo ""

# Ensure Foundry is in PATH
export PATH="$HOME/.foundry/bin:$PATH"

# Check if forge-std is installed
if [ ! -d "contracts/lib/forge-std" ]; then
    echo -e "${YELLOW}📦 Installing forge-std library...${NC}"
    npm run setup:forge
fi

# Check if ZK setup is complete
if [ ! -f "build/rebalancing_final.zkey" ]; then
    echo -e "${YELLOW}📝 ZK setup not complete. Running setup...${NC}"
    npm run setup:zkp
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ ZK setup failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ ZK setup already complete${NC}"
fi
echo ""

# Check if contracts are deployed
if [ ! -f "deployed_contracts.json" ]; then
    echo -e "${YELLOW}📝 Deploying contracts...${NC}"
    npm run forge:deploy:local
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Contract deployment failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Contracts already deployed${NC}"
fi
echo ""

# Run the end-to-end test
echo -e "${BLUE}🚀 Running ZK Rebalancing Demo...${NC}"
echo ""

python3 tests/e2e/test_zk_rebalancing_workflow.py

if [ $? -eq 0 ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║   ✨ Demo Complete - All Systems Working!                       ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${GREEN}The demo successfully demonstrated:${NC}"
    echo "  • Zero-knowledge proof generation for portfolio rebalancing"
    echo "  • Cryptographic validation of rebalancing constraints"
    echo "  • Privacy-preserving position disclosure"
    echo "  • ERC-8004 agentic orchestration"
    echo "  • Agent registration on blockchain"
    echo "  • Trustless validation workflows"
    echo "  • Feedback authorization and submission"
    echo "  • Reputation management"
    echo ""
    echo -e "${BLUE}Architecture:${NC}"
    echo "  • Rebalancer Agent: Generates ZK proofs for rebalancing"
    echo "  • Validator Agent: Verifies proofs cryptographically"
    echo "  • Client Agent: Evaluates service quality and provides feedback"
    echo ""
    echo -e "${BLUE}Key Files:${NC}"
    echo "  • circuits/rebalancing.circom - ZK circuit definition"
    echo "  • agents/rebalancer_agent.py - Proof generation service"
    echo "  • agents/validator_agent.py - Proof validation service"
    echo "  • agents/client_agent.py - Feedback and reputation"
    echo "  • docs/FILE_EXPLANATION.md - Detailed file documentation"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  • Deploy to testnet: npm run forge:deploy:sepolia"
    echo "  • Integrate with frontend application"
    echo "  • Add more complex rebalancing strategies"
    echo "  • Implement on-chain proof verification"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Demo encountered an error. Please check the output above.${NC}"
    exit 1
fi


