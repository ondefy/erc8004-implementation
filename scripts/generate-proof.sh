#!/bin/bash

# Script to generate and verify a ZK proof for portfolio rebalancing
# Usage: ./scripts/generate-proof.sh [input-file]

set -e

# Configuration
INPUT_FILE="${1:-input/input.json}"
BUILD_DIR="build"
WASM_FILE="$BUILD_DIR/rebalancing.wasm"
ZKEY_FILE="$BUILD_DIR/rebalancing_final.zkey"
WITNESS_FILE="$BUILD_DIR/witness.wtns"
PROOF_FILE="$BUILD_DIR/proof.json"
PUBLIC_FILE="$BUILD_DIR/public.json"
VKEY_FILE="$BUILD_DIR/verification_key.json"

echo "🔐 ZK Rebalancing Proof Generator"
echo "=================================="
echo ""

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Input file not found: $INPUT_FILE"
    exit 1
fi

echo "📝 Using input file: $INPUT_FILE"
echo ""

# Step 1: Calculate witness
echo "1️⃣  Calculating witness..."
snarkjs wtns calculate "$WASM_FILE" "$INPUT_FILE" "$WITNESS_FILE"
echo "✅ Witness calculated"
echo ""

# Step 2: Check witness correctness
echo "2️⃣  Checking witness correctness..."
if snarkjs wtns check "$BUILD_DIR/rebalancing.r1cs" "$WITNESS_FILE"; then
    echo "✅ Witness is correct"
else
    echo "❌ Witness check failed - inputs don't satisfy constraints"
    exit 1
fi
echo ""

# Step 3: Generate proof
echo "3️⃣  Generating proof..."
snarkjs groth16 prove "$ZKEY_FILE" "$WITNESS_FILE" "$PROOF_FILE" "$PUBLIC_FILE"
echo "✅ Proof generated: $PROOF_FILE"
echo ""

# Step 4: Verify proof
echo "4️⃣  Verifying proof..."
if snarkjs groth16 verify "$VKEY_FILE" "$PUBLIC_FILE" "$PROOF_FILE"; then
    echo "✅ Proof verified successfully!"
else
    echo "❌ Proof verification failed"
    exit 1
fi
echo ""

# Display public inputs
echo "📊 Public Inputs:"
cat "$PUBLIC_FILE" | jq -r 'to_entries | .[] | "  [\(.key)]: \(.value)"'
echo ""

echo "🎉 Success! Proof generation and verification complete."
echo ""
echo "Generated files:"
echo "  - Witness:      $WITNESS_FILE"
echo "  - Proof:        $PROOF_FILE"
echo "  - Public Inputs: $PUBLIC_FILE"
