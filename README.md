# ZK Rebalancing Proof - Portfolio Rebalancing Validation

A Zero-Knowledge proof system for validating portfolio rebalancing operations using Circom and Groth16, with **ERC-8004 Agentic Orchestration** for trustless multi-agent workflows.

## Overview

This project demonstrates privacy-preserving portfolio rebalancing validation using:

- **Zero-Knowledge Proofs** (Groth16) to prove constraint satisfaction without revealing positions
- **ERC-8004 Standard** for trustless agent coordination on blockchain
- **Multi-Agent System** with Rebalancer, Validator, and Client agents
- **On-chain Verification** and reputation management

## Quick Start

```bash
# Complete setup (first time)
npm install

# Run the complete demo
./run_demo.sh

# Or use the frontend UI (with Base Sepolia support!)
npm run frontend:install
npm run frontend:dev  # Visit http://localhost:3000
```

**For detailed setup instructions**, see [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)  
**For frontend guide**, see [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md)  
**For Base Sepolia testnet**, see [BASE_SEPOLIA_SETUP.md](BASE_SEPOLIA_SETUP.md)

## Technology Stack

### Zero-Knowledge Proofs

- **ZK Framework**: Circom 2.2.2+ (Circom 2.x)
- **Proof System**: Groth16 (efficient on-chain verification)
- **Proof Library**: SnarkJS 0.7.5
- **Curve**: bn128
- **Privacy**: Old/new balances and prices kept private via witness

### Agentic Orchestration

- **Standard**: ERC-8004 Trustless Agents
- **Smart Contracts**: Solidity (Foundry)
- **Agent Framework**: TypeScript + Viem
- **Blockchain**: Ethereum-compatible (Anvil for testing)

## Project Structure

```
rebalancing-zkp/
├── agents/                          # 🤖 Agentic Orchestration (TypeScript)
│   ├── base-agent.ts               # ERC-8004 base functionality
│   ├── rebalancer-agent.ts         # ZK proof generation service
│   ├── validator-agent.ts          # ZK proof validation service
│   ├── client-agent.ts             # Feedback and reputation
│   └── index.ts                    # Agent exports
├── circuits/
│   └── rebalancing.circom          # Main ZK circuit
├── contracts/                       # 📜 Smart Contracts
│   ├── src/
│   │   ├── IdentityRegistry.sol    # Agent registration
│   │   ├── ValidationRegistry.sol  # Validation workflows
│   │   ├── ReputationRegistry.sol  # Feedback system
│   │   └── Verifier.sol            # ZK proof verifier
│   └── script/
│       └── Deploy.s.sol            # Deployment script
├── frontend/                        # 🎨 Next.js UI
│   ├── app/                        # App router pages & API
│   ├── components/                 # React components
│   └── package.json                # Frontend dependencies
├── tests/
│   └── e2e/
│       └── test-zk-rebalancing-workflow.ts  # Complete demo
├── scripts/
│   └── create-deployed-contracts.ts  # Contract address extraction
├── docs/
│   ├── GETTING_STARTED.md          # Setup guide
│   └── TECHNICAL_REFERENCE.md      # Technical details
├── build/                           # ZK proof artifacts
│   ├── rebalancing.r1cs            # Compiled constraints
│   ├── rebalancing.wasm            # Circuit WebAssembly
│   ├── rebalancing_final.zkey      # Proving key
│   ├── verification_key.json       # Verification key
│   └── ...
├── FRONTEND_GUIDE.md                # Frontend usage guide
├── tsconfig.json                    # TypeScript configuration
├── run_demo.sh                      # 🚀 Complete demo runner
└── package.json                     # npm dependencies
```

## Circuit Specification

### Inputs

**Private Inputs** (hidden from blockchain - kept in witness only):

- `oldBalances[4]`: Token balances before rebalancing
- `newBalances[4]`: Token balances after rebalancing
- `prices[4]`: Current token prices

**Public Inputs** (visible on-chain during verification):

- `totalValueCommitment`: Total portfolio value
- `minAllocationPct`: Minimum allocation percentage per asset
- `maxAllocationPct`: Maximum allocation percentage per asset
- `dataHashPublic`: Commitment to verify data integrity

### Constraints

1. **Total Value Preservation**: Ensures old and new portfolio values are equal and match the commitment
2. **Data Integrity**: Computed `dataHash` must match the public `dataHashPublic` input
3. **Allocation Bounds**: Calculates bounds for min/max allocation constraints (note: full range proofs require additional comparison circuits)

### Circuit Statistics

- **Constraints**: ~20 (optimized for privacy)
- **Public Signals**: 4 (minimized for privacy)
- **Private Witness Inputs**: 12 (balances and prices hidden)
- **Outputs**: 1 (dataHash commitment matched to public input)

## Setup Instructions

### Prerequisites

```bash
# Install Circom 2.x (required)
npm install -g circom@latest
circom --version  # Should be >= 2.0.0

# Install SnarkJS
npm install -g snarkjs

# Install project dependencies
npm install
```

### One-Time Setup (Run Once After Circuit Changes)

```bash
# Generate zkey and Verifier.sol
npm run setup:zkp
```

This command:

1. Compiles the circuit to R1CS and WASM
2. Runs Powers of Tau ceremony
3. Generates proving and verification keys
4. Exports Solidity verifier to `contracts/src/Verifier.sol`
5. Tests with example input

**Note**: The `Verifier.sol` remains constant for the same circuit. Only regenerate when you modify `circuits/rebalancing.circom`.

## Usage

### Running the Complete Workflow

```bash
# 1. Start local blockchain (in separate terminal)
npm run anvil

# 2. Run end-to-end test
npm run test:e2e
```

The E2E test:

- Deploys all contracts (IdentityRegistry, ValidationRegistry, ReputationRegistry, Groth16Verifier)
- Registers three agents (Rebalancer, Validator, Client)
- Generates ZK proof for rebalancing plan
- Validates proof **on-chain** using deployed Verifier contract
- Submits validation response to registry
- Handles feedback and reputation tracking

### Generating Proofs for Different Inputs

The proof generation is automatic in the E2E test. To manually generate proofs:

```bash
# Edit input values
nano input/input.json

# Generate proof (done automatically by RebalancerAgent)
# The agent computes dataHashPublic and generates witness + proof
```

### On-Chain Verification

The `ValidatorAgent` now verifies proofs by calling the deployed `Groth16Verifier` contract on-chain:

```typescript
// Automatic in ValidatorAgent.validateProof()
const isValid = await publicClient.readContract({
  address: verifierAddress,
  abi: verifierAbi,
  functionName: "verifyProof",
  args: [pA, pB, pC, pubSignals], // 4 public signals
});
```

**Key Point**: Verification happens on-chain via `eth_call` to the Verifier contract. No off-chain snarkjs verification is used in production flow.

## Example Input

```json
{
  "oldBalances": ["1000", "1000", "1000", "750"],
  "newBalances": ["800", "800", "1200", "950"],
  "prices": ["100", "100", "100", "100"],
  "totalValueCommitment": "375000",
  "minAllocationPct": "10",
  "maxAllocationPct": "40"
}
```

**Verification**:

- Old Total: 1000×100 + 1000×100 + 1000×100 + 750×100 = 375,000 ✓
- New Total: 800×100 + 800×100 + 1200×100 + 950×100 = 375,000 ✓
- Total value preserved ✓

## Testing & Debugging

### Check Circuit Info

```bash
snarkjs r1cs info build/rebalancing.r1cs
```

### Verify Witness Correctness

```bash
snarkjs wtns check build/rebalancing.r1cs build/witness.wtns
```

### Print Circuit Constraints

```bash
snarkjs r1cs print build/rebalancing.r1cs build/rebalancing.sym
```

## ERC-8004 Integration

The generated `Verifier.sol` contract serves as the **AgentValidatorID** in the ERC-8004 standard:

- **AgentValidatorID**: The deployed Verifier contract address
- **AgentServerID**: Off-chain service that generates proofs
- **DataHash**: Circuit output commitment (from `dataHash` signal)

### On-Chain Verification

The `Groth16Verifier` contract is automatically deployed and called by `ValidatorAgent`:

```solidity
function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[5] calldata _pubSignals  // Only 4 signals exposed (privacy-focused)
) public view returns (bool)
```

**Public Signals Order** (visible on-chain):

1. `totalValueCommitment` - Total portfolio value
2. `minAllocationPct` - Minimum allocation percentage
3. `maxAllocationPct` - Maximum allocation percentage
4. `dataHashPublic` - Data integrity commitment
5. `dataHash` - Output commitment (auto-generated)

## Important Notes

### Circom Version Compatibility

This project **requires Circom 2.x** (>= 2.0.0). Key features used:

1. `pragma circom 2.0.0` statement
2. `{public [inputs]}` syntax to control which inputs are public
3. Private witness inputs (balances/prices) not exposed on-chain
4. Circom 2.x witness generator (`build/rebalancing_js/`)

**Important**: Circom 1.x will NOT work with this circuit.

### Input Format

- All numeric values must be strings in JSON
- Values should be within field size limits (bn128 curve ~254 bits)
- Arrays must match the circuit size (4 assets in this case)
- `dataHashPublic` is computed automatically by RebalancerAgent

### Circuit Limitations

This is a **proof-of-concept**. For production:

1. ✅ Privacy achieved: balances/prices kept in witness
2. 🔲 Add range check circuits for allocation constraints (LessThan/GreaterThan from circomlib)
3. 🔲 Implement Poseidon hash for commitments (more efficient than simple addition)
4. 🔲 Conduct security audit
5. 🔲 Perform multi-party computation (MPC) ceremony for trusted setup
6. 🔲 Support dynamic portfolio sizes (currently fixed at 4 assets)

## Gas Considerations

- Groth16 verification: ~250k-300k gas on Ethereum
- Proof size: Constant (3 G1 points + 1 G2 point)
- Public signals: **4 field elements** (optimized for privacy)
- On-chain storage: Validation responses stored in ValidationRegistry

## Security Notes

⚠️ **For Development/Testing Only**

- The trusted setup uses test entropy (`date +%s`)
- No proper MPC ceremony conducted
- Circuit needs security audit before production use
- Current setup regenerates zkey on every `npm run setup:zkp`

✅ **Privacy Achieved**:

- Old/new balances and prices are kept private (witness-only)
- Only commitments and bounds visible on-chain
- Uses Circom 2.x `{public [...]}` syntax for privacy control

For production deployment:

1. Conduct proper multi-party computation (MPC) ceremony for trusted setup
2. Audit circuit logic and constraints
3. Use battle-tested circomlib components for range checks
4. Deploy Verifier.sol once and reuse across all proofs
5. Implement proper key management for agent private keys

## Troubleshooting

### Circom Version Mismatch

**Error**: `Parse error on line 1: pragma circom 2.0.0`

**Solution**: Upgrade to Circom 2.x:

```bash
npm uninstall -g circom
npm install -g circom@latest
circom --version  # Should be >= 2.0.0
```

### Invalid Public List Error

**Error**: `dataHash is not an input signal`

**Cause**: Circom 2.x `{public [...]}` list only accepts inputs, not outputs.

**Solution**: Use a mirror input (`dataHashPublic`) and constrain it to match the output.

### Invalid Proof Verification

**Possible causes**:

1. **Public signal mismatch**: Ensure proof was generated with same circuit/zkey as deployed Verifier
2. **Stale Verifier**: Run `npm run setup:zkp` to regenerate after circuit changes
3. **pi_b coordinate ordering**: Solidity expects FQ2 elements swapped (handled by ValidatorAgent)
4. **Input constraint violation**: Check that input values satisfy all circuit constraints

**Debug steps**:

```bash
# Verify off-chain first
npm run proof:verify

# Check public signals match
cat build/public.json  # Should have 5 elements

# Ensure Verifier was regenerated
ls -la contracts/src/Verifier.sol
```

### Witness Generation Fails

**Error**: `witness check failed`

**Solution**: Ensure `dataHashPublic` is computed correctly:

```javascript
const dataHashPublic = newBalances.reduce(
  (sum, bal, i) => sum + parseInt(bal) + parseInt(prices[i]),
  0
);
```

## Agentic Workflow

This project implements a complete multi-agent system following ERC-8004:

### Agent Roles

1. **Rebalancer Agent (Server)**

   - Creates portfolio rebalancing plans
   - Generates zero-knowledge proofs
   - Submits proofs for validation
   - Manages client feedback authorization

2. **Validator Agent**

   - Validates ZK proofs via **on-chain** Groth16Verifier contract
   - Calls `verifyProof()` with eth_call (no off-chain snarkjs)
   - Submits validation responses to ValidationRegistry
   - Maintains validation audit trail

3. **Client Agent**
   - Evaluates service quality
   - Provides feedback and ratings
   - Checks rebalancer reputation
   - Manages service requests

### Complete Workflow

```
1. Agents register on ERC-8004 Identity Registry (get NFT-based identity)
2. Rebalancer creates plan and generates ZK proof (private: balances/prices)
3. Rebalancer submits proof hash to ValidationRegistry
4. Validator downloads proof and calls Groth16Verifier.verifyProof() on-chain
5. Validator submits validation response (score 0-100) to registry
6. Rebalancer authorizes client feedback via signed message
7. Client evaluates quality and provides feedback to ReputationRegistry
8. Reputation system tracks service quality over time
```

**Key Privacy Features**:

- Balances and prices never touch the blockchain
- Only 4 public commitments visible during verification
- Verifier contract validates constraints without seeing sensitive data

**See [docs/AGENTIC_WORKFLOW.md](docs/AGENTIC_WORKFLOW.md) for complete details.**

## Key Features

✅ **Privacy**: Balances and prices kept private (witness-only, not on-chain)  
✅ **On-Chain Verification**: Proofs verified via deployed Groth16Verifier contract  
✅ **Trust**: Cryptographic validation without revealing sensitive data  
✅ **Transparency**: Validation responses and feedback recorded on-chain  
✅ **Reputation**: Decentralized feedback system for service quality  
✅ **Composability**: ERC-8004 standard for multi-agent coordination  
✅ **Efficiency**: Only 4 public signals (minimized calldata/gas)

## Documentation

### 📚 Complete Guides

1. **[GETTING_STARTED.md](docs/GETTING_STARTED.md)** - Complete setup guide

   - Prerequisites and installation
   - Quick start (5 minutes)
   - Running the demo
   - Usage examples
   - Common commands
   - Troubleshooting

2. **[TECHNICAL_REFERENCE.md](docs/TECHNICAL_REFERENCE.md)** - Technical details
   - System architecture
   - Agentic workflow
   - Zero-knowledge proof system
   - File explanations
   - Smart contracts
   - TypeScript implementation
   - Circuit design
   - Security considerations

## Next Steps

### Completed ✅

1. ✅ Circuit compilation
2. ✅ Trusted setup (Powers of Tau)
3. ✅ Proof generation and verification
4. ✅ Solidity verifier generation
5. ✅ ERC-8004 registry integration
6. ✅ Multi-agent orchestration
7. ✅ Feedback and reputation system
8. ✅ End-to-end demo workflow

### Roadmap 🔲

1. ✅ Build web UI for agent interaction
2. ✅ Upgrade to Circom 2.x for private witness inputs
3. ✅ Add on-chain proof verification via Verifier contract
4. ✅ Minimize public signals (4 instead of 16) for privacy
5. 🔲 Deploy to testnet (Sepolia/Base Sepolia)
6. 🔲 Implement TEE-based key management
7. 🔲 Add range check circuits for allocation constraints (circomlib)
8. 🔲 Production MPC ceremony for trusted setup
9. 🔲 Security audit

## License

MIT

## References

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
