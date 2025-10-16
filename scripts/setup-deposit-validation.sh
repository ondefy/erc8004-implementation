#!/bin/bash

# ZK Deposit Validation Circuit - Complete Setup Script
# Compiles circuit, generates proving/verification keys, and tests with sample data

set -e  # Exit on error

echo "🚀 ZK Deposit Validation - Complete Setup"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."
if ! command -v circom &> /dev/null; then
    echo "❌ circom not found. Install from: https://docs.circom.io/getting-started/installation/"
    exit 1
fi
echo -e "${GREEN}✅ circom found:${NC} $(circom --version)"

if ! command -v snarkjs &> /dev/null; then
    echo "❌ snarkjs not found. Install: npm install -g snarkjs"
    exit 1
fi
echo -e "${GREEN}✅ snarkjs found:${NC} snarkjs@$(snarkjs --version)"

# Create build directory if it doesn't exist
mkdir -p build/deposit-validation

echo ""
echo "1️⃣  Compiling circuit..."
circom circuits/deposit-validation.circom \
  --r1cs \
  --wasm \
  --sym \
  -o build/deposit-validation

echo -e "${GREEN}✅ Circuit compiled${NC}"

echo ""
echo "2️⃣  Circuit information:"
snarkjs r1cs info build/deposit-validation/deposit-validation.r1cs

echo ""
echo "3️⃣  Powers of Tau ceremony (this may take a minute)..."
if [ -f "build/pot12_final.ptau" ]; then
    echo -e "${YELLOW}⚠️  pot12_final.ptau already exists, skipping ceremony${NC}"
else
    # Start ceremony
    snarkjs powersoftau new bn128 12 build/pot12_0000.ptau -v

    # Contribute to ceremony
    snarkjs powersoftau contribute build/pot12_0000.ptau build/pot12_0001.ptau \
      --name="First contribution" -v -e="random entropy"

    # Prepare phase 2
    snarkjs powersoftau prepare phase2 build/pot12_0001.ptau build/pot12_final.ptau -v

    echo -e "${GREEN}✅ Powers of Tau ceremony complete${NC}"
fi

echo ""
echo "4️⃣  Generating proving key..."
snarkjs groth16 setup \
  build/deposit-validation/deposit-validation.r1cs \
  build/pot12_final.ptau \
  build/deposit-validation/deposit_validation_0000.zkey

# Add a contribution for extra security
snarkjs zkey contribute \
  build/deposit-validation/deposit_validation_0000.zkey \
  build/deposit-validation/deposit_validation_final.zkey \
  --name="Contribution" -v -e="random entropy"

echo -e "${GREEN}✅ Proving key generated${NC}"

echo ""
echo "5️⃣  Exporting verification key..."
snarkjs zkey export verificationkey \
  build/deposit-validation/deposit_validation_final.zkey \
  build/deposit-validation/verification_key.json

echo -e "${GREEN}✅ Verification key exported${NC}"

echo ""
echo "6️⃣  Generating Solidity verifier..."
snarkjs zkey export solidityverifier \
  build/deposit-validation/deposit_validation_final.zkey \
  contracts/src/DepositValidationVerifier.sol

echo -e "${GREEN}✅ Solidity verifier generated${NC}"

echo ""
echo "7️⃣  Testing with example input..."

# Create test witness
node build/deposit-validation/deposit-validation_js/generate_witness.js \
  build/deposit-validation/deposit-validation_js/deposit-validation.wasm \
  input/deposit-input.json \
  build/deposit-validation/witness.wtns

echo -e "${GREEN}✅ Test witness is valid${NC}"

echo ""
echo "8️⃣  Generating test proof..."
snarkjs groth16 prove \
  build/deposit-validation/deposit_validation_final.zkey \
  build/deposit-validation/witness.wtns \
  build/deposit-validation/proof.json \
  build/deposit-validation/public.json

echo -e "${GREEN}✅ Test proof generated${NC}"

echo ""
echo "9️⃣  Verifying test proof..."
snarkjs groth16 verify \
  build/deposit-validation/verification_key.json \
  build/deposit-validation/public.json \
  build/deposit-validation/proof.json

echo -e "${GREEN}✅ Test proof verified successfully!${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Generated files:"
echo "  📁 build/deposit-validation/"
echo "     ├── deposit-validation.r1cs"
echo "     ├── deposit-validation.wasm"
echo "     ├── deposit-validation.sym"
echo "     ├── deposit_validation_final.zkey"
echo "     ├── verification_key.json"
echo "     ├── witness.wtns"
echo "     ├── proof.json"
echo "     └── public.json"
echo "  📁 contracts/src/"
echo "     └── DepositValidationVerifier.sol"

echo ""
echo "Next steps:"
echo "  • Generate proofs: Use deposit-validation circuit with your data"
echo "  • Deploy DepositValidationVerifier.sol to testnet"
echo "  • Review DEPOSIT-VALIDATION-README.md for input format"
