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

# Run the complete demo with agentic orchestration
./run_demo.sh

# Or run individual components:

# 1. Setup ZK proof system
npm run setup:zkp

# 2. Deploy ERC-8004 contracts (in separate terminal with anvil running)
npm run forge:deploy:local

# 3. Run end-to-end test
npm run test:e2e
```

## Technology Stack

### Zero-Knowledge Proofs

- **ZK Framework**: Circom 0.5.46 (Circom 1.x)
- **Proof System**: Groth16 (efficient on-chain verification)
- **Proof Library**: SnarkJS 0.7.5
- **Curve**: bn128

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
├── tests/
│   └── e2e/
│       └── test-zk-rebalancing-workflow.ts  # Complete demo
├── scripts/
│   └── create-deployed-contracts.ts  # Contract address extraction
├── docs/
│   ├── FILE_EXPLANATION.md         # Detailed file documentation
│   └── AGENTIC_WORKFLOW.md         # Agent workflow guide
├── build/                           # ZK proof artifacts
│   ├── rebalancing.r1cs            # Compiled constraints
│   ├── rebalancing.wasm            # Circuit WebAssembly
│   ├── rebalancing_final.zkey      # Proving key
│   ├── verification_key.json       # Verification key
│   └── ...
├── tsconfig.json                    # TypeScript configuration
├── run_demo.sh                      # 🚀 Complete demo runner
└── package.json                     # npm dependencies
```

## Circuit Specification

### Inputs

**Private Inputs** (hidden from blockchain):

- `oldBalances[4]`: Token balances before rebalancing
- `newBalances[4]`: Token balances after rebalancing
- `prices[4]`: Current token prices

**Public Inputs** (visible on-chain):

- `totalValueCommitment`: Total portfolio value (for verification)
- `minAllocationPct`: Minimum allocation percentage per asset
- `maxAllocationPct`: Maximum allocation percentage per asset

### Constraints

1. **Total Value Preservation**: Ensures that the total portfolio value remains the same before and after rebalancing
2. **Allocation Bounds**: Calculates bounds for min/max allocation constraints (note: full range proofs require additional comparison circuits)

### Circuit Statistics

- **Constraints**: 17
- **Wires**: 32
- **Public Inputs**: 15
- **Private Inputs**: 0 (all inputs are public in this version for Circom 1.x compatibility)
- **Outputs**: 1 (dataHash commitment)

## Setup Instructions

### Prerequisites

```bash
# Install Circom
npm install -g circom

# Install SnarkJS
npm install -g snarkjs
```

### Compilation

```bash
# Compile the circuit
circom circuits/rebalancing.circom --r1cs --wasm --sym -o build/

# Move output files to build directory (if using Circom 1.x)
mv rebalancing.r1cs rebalancing.wasm rebalancing.sym build/
```

### Trusted Setup

```bash
cd build

# 1. Start Powers of Tau ceremony
snarkjs powersoftau new bn128 8 pot8_0000.ptau -v

# 2. Contribute to ceremony
snarkjs powersoftau contribute pot8_0000.ptau pot8_0001.ptau --name="First contribution" -v

# 3. Prepare for phase 2
snarkjs powersoftau prepare phase2 pot8_0001.ptau pot8_final.ptau -v

# 4. Generate initial zkey
snarkjs groth16 setup rebalancing.r1cs pot8_final.ptau rebalancing_0000.zkey

# 5. Contribute to phase 2
snarkjs zkey contribute rebalancing_0000.zkey rebalancing_final.zkey --name="1st Contributor" -v

# 6. Export verification key
snarkjs zkey export verificationkey rebalancing_final.zkey verification_key.json

cd ..
```

## Usage

### Generate Proof

```bash
# 1. Calculate witness
snarkjs wtns calculate build/rebalancing.wasm input/input.json build/witness.wtns

# 2. Generate proof
snarkjs groth16 prove build/rebalancing_final.zkey build/witness.wtns build/proof.json build/public.json
```

### Verify Proof (Off-chain)

```bash
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json
```

### Generate Solidity Verifier

```bash
snarkjs zkey export solidityverifier build/rebalancing_final.zkey contracts/Verifier.sol
```

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

Deploy `contracts/Verifier.sol` and call:

```solidity
function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[15] calldata _pubSignals
) public view returns (bool)
```

## Important Notes

### Circom Version Compatibility

This project uses **Circom 1.x (0.5.46)**. Key differences from Circom 2.x:

1. No `pragma circom` statement
2. No `{public [inputs]}` syntax in main component
3. All inputs are treated as public (for witness generation)

### Input Format

- All numeric values must be strings in JSON
- Values should be within field size limits (bn128 curve)
- Arrays must match the circuit size (4 assets in this case)

### Circuit Limitations

This is a **simplified proof-of-concept**. For production:

1. Add proper range check circuits for allocation constraints
2. Implement Poseidon hash for commitments (more efficient)
3. Use circomlib comparison circuits (LessThan, GreaterThan)
4. Upgrade to Circom 2.x for better syntax
5. Conduct security audit
6. Perform multi-party computation (MPC) ceremony for trusted setup

## Gas Considerations

- Groth16 verification: ~250k-300k gas on Ethereum
- Proof size: Constant (3 G1 points + 1 G2 point)
- Public inputs: 15 field elements (can be optimized)

## Security Notes

⚠️ **For Development/Testing Only**

- The trusted setup uses test entropy
- No proper MPC ceremony conducted
- Circuit needs security audit
- Private inputs are not truly private in current Circom 1.x setup

For production:

1. Conduct proper MPC ceremony
2. Audit circuit logic
3. Upgrade to Circom 2.x for true private inputs
4. Use battle-tested circomlib components

## Troubleshooting

### Parse Error on Pragma

If you see errors about `pragma circom 2.x.x`, you're using Circom 1.x but have Circom 2.x syntax. Remove the pragma line.

### Type NQ Cannot Be Converted to QEX

This means you're trying to assign non-quadratic expressions to signals. Avoid:

- Assigning `var` to `signal`
- Division in signal constraints
- Use intermediate signals for complex expressions

### Invalid Proof

Check that:

1. Input values satisfy all constraints
2. Witness generation succeeds without errors
3. Public inputs match between proof generation and verification

## Agentic Workflow

This project implements a complete multi-agent system following ERC-8004:

### Agent Roles

1. **Rebalancer Agent (Server)**

   - Creates portfolio rebalancing plans
   - Generates zero-knowledge proofs
   - Submits proofs for validation
   - Manages client feedback authorization

2. **Validator Agent**

   - Validates ZK proofs cryptographically
   - Verifies rebalancing logic
   - Submits validation responses on-chain
   - Maintains validation audit trail

3. **Client Agent**
   - Evaluates service quality
   - Provides feedback and ratings
   - Checks rebalancer reputation
   - Manages service requests

### Complete Workflow

```
1. Agents register on ERC-8004 Identity Registry
2. Rebalancer creates plan and generates ZK proof
3. Rebalancer submits proof for validation
4. Validator verifies proof cryptographically
5. Validator submits validation response on-chain
6. Rebalancer authorizes client feedback
7. Client evaluates quality and provides feedback
8. Reputation system tracks service quality
```

**See [docs/AGENTIC_WORKFLOW.md](docs/AGENTIC_WORKFLOW.md) for complete details.**

## Key Features

✅ **Privacy**: Portfolio positions hidden via ZK proofs  
✅ **Trust**: Cryptographic validation of constraints  
✅ **Transparency**: All interactions recorded on-chain  
✅ **Reputation**: Feedback system for service quality  
✅ **Composability**: ERC-8004 standard for agent interoperability

## Documentation

- **[FILE_EXPLANATION.md](docs/FILE_EXPLANATION.md)** - Detailed explanation of every file
- **[AGENTIC_WORKFLOW.md](docs/AGENTIC_WORKFLOW.md)** - Complete agent workflow guide
- **[AGENTIC_CLARIFICATION.md](docs/AGENTIC_CLARIFICATION.md)** - Why "agentic" ≠ AI (important!)
- **[INTEGRATION_SUMMARY.md](docs/INTEGRATION_SUMMARY.md)** - What was integrated
- **[QUICK_START.md](docs/QUICK_START.md)** - 5-minute quick start
- **[FOUNDRY_SETUP.md](docs/FOUNDRY_SETUP.md)** - Foundry contract setup
- **[NPM_SCRIPTS.md](docs/NPM_SCRIPTS.md)** - Available npm scripts

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

1. 🔲 Deploy to testnet (Sepolia/Base Sepolia)
2. 🔲 Add on-chain proof verification
3. 🔲 Implement TEE-based key management
4. 🔲 Add range check circuits for allocation constraints
5. 🔲 Upgrade to Circom 2.x
6. 🔲 Build web UI for agent interaction
7. 🔲 Production MPC ceremony for trusted setup
8. 🔲 Security audit

## License

MIT

## References

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
