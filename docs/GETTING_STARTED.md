# Getting Started - ZK Rebalancing Proof System

**Complete setup guide for privacy-preserving portfolio rebalancing with TypeScript, viem, and zero-knowledge proofs.**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Quick Start (5 Minutes)](#quick-start-5-minutes)
5. [Running the Demo](#running-the-demo)
6. [Project Structure](#project-structure)
7. [Usage Examples](#usage-examples)
8. [Common Commands](#common-commands)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What This System Does

Build a **privacy-preserving portfolio rebalancing system** with:

- ✅ **Zero-Knowledge Proofs** - Hide portfolio positions while proving compliance
- ✅ **Three Autonomous Agents** - Rebalancer, Validator, and Client working trustlessly
- ✅ **On-Chain Validation** - ERC-8004 registries for agent coordination
- ✅ **TypeScript + Viem** - Modern web3 development stack
- ✅ **Complete Audit Trail** - All interactions recorded on blockchain

### Technology Stack

- **Language**: TypeScript 5.x
- **Web3 Library**: viem 2.x
- **ZK Framework**: Circom + SnarkJS (Groth16)
- **Smart Contracts**: Solidity (Foundry)
- **Blockchain**: Ethereum-compatible (Anvil for testing)
- **Standard**: ERC-8004 Trustless Agents

---

## Prerequisites

### Required Software

```bash
# Check if you have these installed:
node --version    # Need v14.0.0 or higher
npm --version     # Comes with Node.js
```

### Install Node.js (if needed)

- **macOS**: `brew install node` or download from https://nodejs.org/
- **Windows**: Download installer from https://nodejs.org/
- **Linux**: `sudo apt install nodejs npm` or use your package manager

### Install Foundry (for smart contracts)

```bash
# Install foundryup
curl -L https://foundry.paradigm.xyz | bash

# Install forge, anvil, cast
foundryup
```

---

## Installation

### Step 1: Clone or Download

```bash
cd /path/to/rebalancing-poc-main
```

### Step 2: Install Dependencies

```bash
# Install all dependencies (one command!)
npm install
```

This installs:

- TypeScript and ts-node
- viem (web3 library)
- SnarkJS (ZK proof generation)
- All other required packages

### Step 3: Install Global Tools (Optional)

```bash
# Install Circom globally (optional, for circuit development)
npm install -g circom

# Or use the project's local version
```

---

## Quick Start (5 Minutes)

### Option 1: Automated Demo (Recommended)

```bash
# Run the complete demo script
./run_demo.sh
```

This automatically:

1. Checks dependencies
2. Starts Anvil blockchain
3. Sets up ZK proof system
4. Deploys smart contracts
5. Runs the complete agent workflow

**Sit back and watch!** The script handles everything.

### Option 2: Manual Step-by-Step

#### Terminal 1: Start Blockchain

```bash
npm run anvil
```

Keep this running.

#### Terminal 2: Setup & Deploy

```bash
# Setup ZK proof system (first time only)
npm run setup:zkp

# Deploy contracts
npm run forge:deploy:local
```

#### Terminal 3: Run Tests

```bash
# Run end-to-end test
npm run test:e2e
```

---

## Running the Demo

### What You'll See

When you run `./run_demo.sh`, you'll see:

```
======================================================================
  ZK Rebalancing Proof - Complete Demo
======================================================================

Step 1: Checking prerequisites...
✅ Node.js installed
✅ npm installed
✅ Foundry installed

Step 2: Starting Anvil blockchain...
✅ Anvil started on http://127.0.0.1:8545

Step 3: Setting up ZK proof system...
✅ Circuit compiled
✅ Powers of Tau downloaded
✅ Proving key generated
✅ Verification key generated

Step 4: Deploying smart contracts...
✅ IdentityRegistry deployed: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ ValidationRegistry deployed: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ ReputationRegistry deployed: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

Step 5: Running end-to-end workflow...

STEP 1: Initialize Agents
💼 Rebalancer Agent initialized
🔍 Validator Agent initialized
💼 Client Agent initialized

STEP 2: Fund Agents
✅ All agents funded with 0.5 ETH

STEP 3: Register Agents on ERC-8004 Registry
✅ Agent registered successfully with ID: 1
✅ Agent registered successfully with ID: 2
✅ Agent registered successfully with ID: 3

STEP 4: Create Rebalancing Plan
📊 Creating rebalancing plan...
✅ Rebalancing plan created

STEP 5: Generate Zero-Knowledge Proof
🔐 Generating zero-knowledge proof...
✅ Zero-knowledge proof generated successfully

STEP 6: Submit Proof for Validation
📤 Submitting proof for validation
✅ Validation request successful

STEP 7: Validate ZK Proof
🔍 Starting validation for proof data
✅ Proof is cryptographically valid
✅ Rebalancing logic is sound
✅ Validation completed with overall score: 100/100

STEP 8: Submit Validation Response
📤 Submitting validation response
✅ Validation response submitted successfully

STEP 9: Authorize Client Feedback
🔐 Authorizing client to provide feedback
✅ Client feedback authorization successful

STEP 10: Client Evaluation and Feedback
🎯 Evaluating rebalancing service quality...
✅ Feedback submitted successfully

STEP 11: Check Rebalancer Reputation
🔍 Checking reputation for rebalancer agent
   Feedback count: 1
   Average score: 100.0/100

✅ END-TO-END TEST COMPLETE
```

---

## Project Structure

```
rebalancing-poc-main/
├── agents/                     # TypeScript Agents
│   ├── base-agent.ts          # ERC-8004 base functionality
│   ├── rebalancer-agent.ts    # ZK proof generation
│   ├── validator-agent.ts     # Proof validation
│   ├── client-agent.ts        # Feedback & reputation
│   └── index.ts               # Exports
├── circuits/
│   └── rebalancing.circom     # ZK circuit definition
├── contracts/
│   ├── src/
│   │   ├── IdentityRegistry.sol
│   │   ├── ValidationRegistry.sol
│   │   ├── ReputationRegistry.sol
│   │   └── Verifier.sol
│   └── script/
│       └── Deploy.s.sol
├── tests/
│   └── e2e/
│       └── test-zk-rebalancing-workflow.ts
├── scripts/
│   └── create-deployed-contracts.ts
├── build/                      # ZK artifacts (generated)
├── docs/
│   ├── GETTING_STARTED.md     # This file
│   └── TECHNICAL_REFERENCE.md # Technical details
├── tsconfig.json              # TypeScript config
├── package.json               # Dependencies
└── run_demo.sh                # Demo script
```

---

## Usage Examples

### Example 1: Create a Rebalancing Plan

```typescript
import { RebalancerAgent } from "./agents";

// Initialize agent
const rebalancer = new RebalancerAgent(
  "rebalancer.zk-proof.test",
  "0x..." as `0x${string}`
);

// Register on-chain
await rebalancer.registerAgent();

// Create plan
const plan = await rebalancer.createRebalancingPlan(
  ["1000", "1000", "1000", "750"], // Old balances
  ["800", "800", "1200", "950"], // New balances
  ["100", "100", "100", "100"], // Prices
  "10", // Min allocation %
  "40" // Max allocation %
);

console.log("Plan created:", plan.newTotalValue);
```

### Example 2: Generate and Validate ZK Proof

```typescript
import { RebalancerAgent, ValidatorAgent } from "./agents";

// Generate proof
const rebalancer = new RebalancerAgent(...);
const plan = await rebalancer.createRebalancingPlan(...);
const proof = rebalancer.generateZkProof(plan);

// Validate proof
const validator = new ValidatorAgent(...);
const result = await validator.validateProof(proof);

console.log("Proof valid:", result.isValid);
console.log("Score:", result.score);
```

### Example 3: Submit Feedback

```typescript
import { ClientAgent } from "./agents";

const client = new ClientAgent(...);
await client.registerAgent();

// Evaluate quality
const score = client.evaluateRebalancingQuality(proofPackage);

// Submit feedback
client.submitFeedback(
  rebalancerAgentId,
  score,
  "Excellent privacy-preserving service!"
);

// Check reputation
const reputation = client.checkRebalancerReputation(rebalancerAgentId);
console.log("Average score:", reputation.averageScore);
```

---

## Common Commands

### Development

```bash
# Compile TypeScript
npm run build

# Run E2E test
npm run test:e2e

# Start Anvil blockchain
npm run anvil
```

### ZK Proof System

```bash
# Setup (first time only)
npm run setup:zkp

# Compile circuit
npm run circuit:compile

# Generate proof (with input.json)
npm run proof:generate

# Verify proof
npm run proof:verify
```

### Smart Contracts

```bash
# Build contracts
npm run forge:build

# Test contracts
npm run forge:test

# Deploy locally
npm run forge:deploy:local

# Deploy to Sepolia
npm run forge:deploy:sepolia
```

### Cleanup

```bash
# Clean ZK artifacts
npm run clean:zkp

# Clean TypeScript build
npm run clean:ts

# Clean everything
npm run clean
```

---

## Troubleshooting

### Issue: `anvil` command not found

**Solution**: Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Issue: `snarkjs` not found

**Solution**: It's installed locally with npm:

```bash
npm install
# Use: npx snarkjs instead of just snarkjs
```

Or install globally:

```bash
npm install -g snarkjs
```

### Issue: `Cannot find module 'viem'`

**Solution**: Install dependencies:

```bash
npm install
```

### Issue: TypeScript compilation errors

**Solution**: Check TypeScript is installed:

```bash
npm install
npm run build
```

### Issue: Contracts not deployed

**Solution**: Make sure Anvil is running:

```bash
# Terminal 1
npm run anvil

# Terminal 2
npm run forge:deploy:local
```

### Issue: `deployed_contracts.json` not found

**Solution**: Run deployment first:

```bash
npm run forge:deploy:local
```

This automatically creates `deployed_contracts.json`.

### Issue: Proof verification fails

**Possible causes**:

1. Circuit not compiled: `npm run circuit:compile`
2. Setup not run: `npm run setup:zkp`
3. Invalid input data: Check `input/input.json`

**Solution**: Run the full setup:

```bash
npm run setup:zkp
```

### Issue: Transaction reverted

**Common causes**:

1. Agent not registered
2. Insufficient ETH balance
3. Invalid proof data

**Solution**: Check agent is registered and funded:

```typescript
// Register first
await agent.registerAgent();

// Then use agent methods
```

---

## Next Steps

1. ✅ **Run the demo**: `./run_demo.sh`
2. 📚 **Read technical docs**: `docs/TECHNICAL_REFERENCE.md`
3. 🔧 **Modify the circuit**: Edit `circuits/rebalancing.circom`
4. 🤖 **Customize agents**: Extend classes in `agents/`
5. 🚀 **Deploy to testnet**: Use `npm run forge:deploy:sepolia`

---

## Support

For detailed technical information, see:

- **`docs/TECHNICAL_REFERENCE.md`** - Architecture, agent workflow, and technical details

For questions:

1. Check the troubleshooting section above
2. Review the technical reference
3. Inspect the code - it's fully typed and documented!

---

**Happy Building! 🚀**
