#!/bin/bash

# ZK Rebalancer Validation Circuit - Complete Setup Script
# Compiles circuit, generates proving/verification keys, and tests with sample data

set -e  # Exit on error

# Add common installation paths to PATH
export PATH="$HOME/.cargo/bin:$PATH"

echo "🚀 ZK Rebalancer Validation - Complete Setup"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

# Check for circom in PATH or common locations
CIRCOM_CMD=""
if command -v circom &> /dev/null; then
    CIRCOM_CMD="circom"
elif [ -f "$HOME/.cargo/bin/circom" ]; then
    CIRCOM_CMD="$HOME/.cargo/bin/circom"
    export PATH="$HOME/.cargo/bin:$PATH"
elif [ -f "/usr/local/bin/circom" ]; then
    CIRCOM_CMD="/usr/local/bin/circom"
else
    echo "❌ circom not found. Install from: https://docs.circom.io/getting-started/installation/"
    echo "   Or ensure ~/.cargo/bin is in your PATH"
    exit 1
fi

echo -e "${GREEN}✅ circom found:${NC} $($CIRCOM_CMD --version 2>&1 | head -1)"

if ! command -v snarkjs &> /dev/null; then
    echo "❌ snarkjs not found. Install: npm install -g snarkjs"
    exit 1
fi
SNARKJS_VERSION=$(snarkjs 2>&1 | head -1)
echo -e "${GREEN}✅ snarkjs found:${NC} $SNARKJS_VERSION"

# Create build directory if it doesn't exist
mkdir -p build/rebalancer-validation

echo ""
echo "1️⃣  Compiling circuit..."
$CIRCOM_CMD circuits/rebalancer-validation.circom \
  --r1cs \
  --wasm \
  --sym \
  -o build/rebalancer-validation

echo -e "${GREEN}✅ Circuit compiled${NC}"

echo ""
echo "2️⃣  Circuit information:"
snarkjs ri build/rebalancer-validation/rebalancer-validation.r1cs

echo ""
echo "3️⃣  Powers of Tau ceremony (this may take a minute)..."
if [ -f "build/pot12_final.ptau" ]; then
    echo -e "${YELLOW}⚠️  pot12_final.ptau already exists, skipping ceremony${NC}"
else
    # Start ceremony
    snarkjs ptn bn128 12 build/pot12_0000.ptau -v

    # Contribute to ceremony
    snarkjs ptc build/pot12_0000.ptau build/pot12_0001.ptau \
      --name="First contribution" -v -e="random entropy"

    # Prepare phase 2
    snarkjs pt2 build/pot12_0001.ptau build/pot12_final.ptau -v

    echo -e "${GREEN}✅ Powers of Tau ceremony complete${NC}"
fi

echo ""
echo "4️⃣  Generating proving key..."
snarkjs g16s \
  build/rebalancer-validation/rebalancer-validation.r1cs \
  build/pot12_final.ptau \
  build/rebalancer-validation/rebalancer_validation_0000.zkey

# Add a contribution for extra security
snarkjs zkc \
  build/rebalancer-validation/rebalancer_validation_0000.zkey \
  build/rebalancer-validation/rebalancer_validation_final.zkey \
  --name="Contribution" -v -e="random entropy"

echo -e "${GREEN}✅ Proving key generated${NC}"

echo ""
echo "5️⃣  Exporting verification key..."
snarkjs zkev \
  build/rebalancer-validation/rebalancer_validation_final.zkey \
  build/rebalancer-validation/verification_key.json

echo -e "${GREEN}✅ Verification key exported${NC}"

echo ""
echo "6️⃣  Generating Solidity verifier..."
snarkjs zkesv \
  build/rebalancer-validation/rebalancer_validation_final.zkey \
  contracts/src/RebalancerVerifier.sol

echo -e "${GREEN}✅ Solidity verifier generated${NC}"

echo ""
echo "7️⃣  Testing with example input..."

# Create test witness
node build/rebalancer-validation/rebalancer-validation_js/generate_witness.js \
  build/rebalancer-validation/rebalancer-validation_js/rebalancer-validation.wasm \
  input/rebalancer-input.json \
  build/rebalancer-validation/witness.wtns

echo -e "${GREEN}✅ Test witness is valid${NC}"

echo ""
echo "8️⃣  Generating test proof..."
snarkjs g16p \
  build/rebalancer-validation/rebalancer_validation_final.zkey \
  build/rebalancer-validation/witness.wtns \
  build/rebalancer-validation/proof.json \
  build/rebalancer-validation/public.json

echo -e "${GREEN}✅ Test proof generated${NC}"

echo ""
echo "9️⃣  Verifying test proof..."
snarkjs g16v \
  build/rebalancer-validation/verification_key.json \
  build/rebalancer-validation/public.json \
  build/rebalancer-validation/proof.json

echo -e "${GREEN}✅ Test proof verified successfully!${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Generated files:"
echo "  📁 build/rebalancer-validation/"
echo "     ├── rebalancer-validation.r1cs"
echo "     ├── rebalancer-validation.wasm"
echo "     ├── rebalancer-validation.sym"
echo "     ├── rebalancer_validation_final.zkey"
echo "     ├── verification_key.json"
echo "     ├── witness.wtns"
echo "     ├── proof.json"
echo "     └── public.json"
echo "  📁 contracts/src/"
echo "     └── RebalancerVerifier.sol"

echo ""
echo "Next steps:"
echo "  • Generate proofs: Use rebalancer-validation circuit with your data"
echo "  • Deploy RebalancerVerifier.sol to testnet"
echo "  • Review rebalancer-validation-README.md for input format"
