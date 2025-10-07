#!/bin/bash

# Complete setup script for ZK Rebalancing Proof system
# This regenerates all build artifacts from source

set -e

echo "🚀 ZK Rebalancing Proof - Complete Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v circom &> /dev/null; then
    echo -e "${RED}❌ circom not found${NC}"
    echo "Install with: npm install -g circom"
    exit 1
fi
echo -e "${GREEN}✅ circom found:${NC} $(circom --version 2>&1 | head -1)"

if ! command -v snarkjs &> /dev/null; then
    echo -e "${RED}❌ snarkjs not found${NC}"
    echo "Install with: npm install -g snarkjs"
    exit 1
fi
echo -e "${GREEN}✅ snarkjs found:${NC} $(snarkjs --version 2>&1 | head -1)"

echo ""

# Create build directory if it doesn't exist
mkdir -p build

# Step 1: Compile circuit
echo "1️⃣  Compiling circuit..."
circom circuits/rebalancing.circom --r1cs --wasm --sym -o build/

# Move files if they were created in root (Circom 1.x behavior)
if [ -f "rebalancing.r1cs" ]; then
    mv rebalancing.r1cs rebalancing.wasm rebalancing.sym build/ 2>/dev/null || true
fi

echo -e "${GREEN}✅ Circuit compiled${NC}"
echo ""

# Step 2: Circuit info
echo "2️⃣  Circuit information:"
snarkjs r1cs info build/rebalancing.r1cs
echo ""

# Step 3: Powers of Tau setup
echo "3️⃣  Powers of Tau ceremony (this may take a minute)..."

cd build

# Check if pot8_final.ptau already exists
if [ -f "pot8_final.ptau" ]; then
    echo -e "${YELLOW}⚠️  pot8_final.ptau already exists, skipping ceremony${NC}"
else
    echo "   Creating new ceremony..."
    snarkjs powersoftau new bn128 8 pot8_0000.ptau > /dev/null
    echo "   Contributing to ceremony..."
    snarkjs powersoftau contribute pot8_0000.ptau pot8_0001.ptau --name="Setup contribution" -e="$(date +%s)" > /dev/null
    echo "   Preparing phase 2..."
    snarkjs powersoftau prepare phase2 pot8_0001.ptau pot8_final.ptau > /dev/null
    echo -e "${GREEN}✅ Powers of Tau ceremony complete${NC}"
fi

echo ""

# Step 4: Generate proving key
echo "4️⃣  Generating proving key..."
if [ -f "rebalancing_final.zkey" ]; then
    echo -e "${YELLOW}⚠️  rebalancing_final.zkey already exists, skipping${NC}"
else
    snarkjs groth16 setup rebalancing.r1cs pot8_final.ptau rebalancing_0000.zkey > /dev/null
    snarkjs zkey contribute rebalancing_0000.zkey rebalancing_final.zkey --name="Final contribution" -e="$(date +%s)" > /dev/null
    echo -e "${GREEN}✅ Proving key generated${NC}"
fi
echo ""

# Step 5: Export verification key
echo "5️⃣  Exporting verification key..."
snarkjs zkey export verificationkey rebalancing_final.zkey verification_key.json > /dev/null
echo -e "${GREEN}✅ Verification key exported${NC}"
echo ""

# Step 6: Generate Solidity verifier
echo "6️⃣  Generating Solidity verifier..."
cd ..
snarkjs zkey export solidityverifier build/rebalancing_final.zkey contracts/Verifier.sol > /dev/null
echo -e "${GREEN}✅ Solidity verifier generated${NC}"
echo ""

# Step 7: Test with example input
echo "7️⃣  Testing with example input..."
snarkjs wtns calculate build/rebalancing.wasm input/input.json build/witness.wtns 2>/dev/null

if snarkjs wtns check build/rebalancing.r1cs build/witness.wtns 2>&1 | grep -q "WITNESS IS CORRECT"; then
    echo -e "${GREEN}✅ Test witness is valid${NC}"
else
    echo -e "${RED}❌ Test witness validation failed${NC}"
    exit 1
fi
echo ""

# Step 8: Generate test proof
echo "8️⃣  Generating test proof..."
snarkjs groth16 prove build/rebalancing_final.zkey build/witness.wtns build/proof.json build/public.json 2>/dev/null
echo -e "${GREEN}✅ Test proof generated${NC}"
echo ""

# Step 9: Verify test proof
echo "9️⃣  Verifying test proof..."
if snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json 2>&1 | grep -q "OK"; then
    echo -e "${GREEN}✅ Test proof verified successfully!${NC}"
else
    echo -e "${RED}❌ Proof verification failed${NC}"
    exit 1
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Generated files:"
echo "  📁 build/"
echo "     ├── rebalancing.r1cs"
echo "     ├── rebalancing.wasm"
echo "     ├── rebalancing.sym"
echo "     ├── pot8_final.ptau"
echo "     ├── rebalancing_final.zkey"
echo "     ├── verification_key.json"
echo "     ├── witness.wtns"
echo "     ├── proof.json"
echo "     └── public.json"
echo "  📁 contracts/"
echo "     └── Verifier.sol"
echo ""
echo "Next steps:"
echo "  • Generate proofs: ./scripts/generate-proof.sh"
echo "  • Deploy Verifier.sol to testnet"
echo "  • Review README.md for more information"
echo ""
