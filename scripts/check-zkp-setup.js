#!/usr/bin/env node

/**
 * Check if ZK artifacts have been generated
 * This script verifies that the necessary build files exist before running tests
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const requiredFiles = [
  "build/rebalancer-validation/rebalancer-validation.r1cs",
  "build/rebalancer-validation/rebalancer-validation.sym",
  "build/rebalancer-validation/rebalancer-validation_js/rebalancer-validation.wasm",
  "build/rebalancer-validation/rebalancer-validation_js/generate_witness.js",
  "build/rebalancer-validation/rebalancer-validation_js/witness_calculator.js",
  "build/rebalancer-validation/rebalancer_validation_final.zkey",
  "build/rebalancer-validation/verification_key.json",
  "contracts/src/RebalancerVerifier.sol",
];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error("\n❌ ZK setup incomplete. Missing required files:");
  missingFiles.forEach((file) => console.error(`   - ${file}`));
  console.error("\n💡 Run the setup script to generate ZK artifacts:");
  console.error("   npm run setup:zkp:rebalancer\n");
  process.exit(1);
}

// Also check if Verifier.sol is up to date with the circuit
const circuitPath = "circuits/rebalancer-validation.circom";
const verifierPath = "contracts/src/RebalancerVerifier.sol";

const circuitStats = fs.statSync(circuitPath);
const verifierStats = fs.statSync(verifierPath);

if (circuitStats.mtime > verifierStats.mtime) {
  console.warn(
    "\n⚠️  WARNING: Circuit was modified after RebalancerVerifier.sol was generated"
  );
  console.warn("   Consider regenerating ZK artifacts:");
  console.warn("   npm run setup:zkp:rebalancer\n");
}

console.log("✅ ZK setup verified - all required artifacts exist\n");
process.exit(0);
