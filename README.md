# ZK Rebalancing PoC - DeFi Portfolio Rebalancing Validation

A Zero-Knowledge proof system for validating portfolio rebalancing operations using Circom and Groth16, with **ERC-8004 Agentic Orchestration** for trustless multi-agent workflows.

## Overview

This project demonstrates privacy-preserving DeFi rebalancing validation using:

- **Dual ZK Circuits**: Portfolio rebalancing + ZyFI rebalancer validation constraints
- **Zero-Knowledge Proofs** (Groth16) to prove constraint satisfaction without revealing sensitive data
- **ERC-8004 Standard** for trustless agent coordination on blockchain
- **Multi-Agent System** with Rebalancer, Validator, and Client agents implementing ERC-8004 workflows
- **On-chain Verification** using auto-generated Solidity verifier contracts
- **Reputation System** for service quality tracking and feedback

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
rebalancing-poc-main/
├── agents/                          # 🤖 Agentic Orchestration (TypeScript)
│   ├── base-agent.ts               # ERC-8004 base functionality
│   ├── rebalancer-agent.ts         # ZK proof generation (dual circuits)
│   ├── validator-agent.ts          # On-chain ZK proof validation
│   ├── client-agent.ts             # Feedback and reputation
│   └── index.ts                    # Agent exports
├── circuits/                        # 🔐 ZK Circuits (Circom 2.x)
│   ├── rebalancing.circom          # Portfolio rebalancing circuit (4 assets)
│   └── rebalancer-validation.circom # ZyFI rebalancer validation circuit
├── contracts/                       # 📜 Smart Contracts (Solidity 0.8.20)
│   ├── src/
│   │   ├── IdentityRegistry.sol    # ERC-721 based agent registration
│   │   ├── ValidationRegistry.sol  # ERC-8004 validation workflows
│   │   ├── ReputationRegistry.sol  # ERC-8004 feedback system
│   │   ├── Verifier.sol            # Groth16 verifier (rebalancing)
│   │   ├── RebalancerVerifier.sol  # Groth16 verifier (ZyFI validation)
│   │   └── interfaces/             # Contract interfaces
│   ├── script/
│   │   └── Deploy.s.sol            # Foundry deployment script
│   └── test/                       # Solidity tests
├── frontend/                        # 🎨 Next.js 15 UI (App Router)
│   ├── app/
│   │   ├── api/                    # API routes
│   │   │   ├── generate-proof/     # Witness + proof generation
│   │   │   ├── validate-proof/     # On-chain verification
│   │   │   ├── store-proof/        # Proof storage with SHA-256
│   │   │   └── load-input/         # Portfolio data loader
│   │   └── page.tsx                # Main workflow UI
│   ├── components/                 # React components
│   │   ├── opportunity-input-form.tsx
│   │   ├── step-card.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── workflow-executor.ts    # ⭐ Core step execution logic
│   │   ├── contracts.ts            # Contract ABIs and configs
│   │   ├── constants.ts            # Network configurations
│   │   └── wagmi-config.ts         # Wallet integration (Reown AppKit)
│   └── package.json                # Frontend dependencies
├── tests/
│   └── e2e/
│       └── test-zk-rebalancing-workflow.ts  # ⭐ Complete E2E test
├── scripts/
│   ├── setup.sh                    # ZK setup (rebalancing circuit)
│   ├── setup-rebalancer-validation.sh  # ZK setup (rebalancer circuit)
│   ├── create-deployed-contracts.ts # Contract address extraction
│   └── check-zkp-setup.js          # Verify ZK artifacts
├── docs/
│   ├── GETTING_STARTED.md          # Setup guide
│   └── TECHNICAL_REFERENCE.md      # Technical details
├── build/                           # ZK proof artifacts
│   ├── rebalancing.r1cs            # Compiled constraints (portfolio)
│   ├── rebalancing.wasm            # Circuit WebAssembly
│   ├── rebalancing_final.zkey      # Proving key
│   ├── verification_key.json       # Verification key
│   ├── rebalancing_js/             # Circom 2.x witness generator
│   ├── rebalancer-validation/      # ZyFI circuit artifacts
│   │   ├── rebalancer-validation.r1cs
│   │   ├── rebalancer_validation_final.zkey
│   │   └── rebalancer-validation_js/
│   └── ...
├── input/
│   └── input.json                  # Portfolio test data
├── data/                            # Proof storage directory
├── validations/                     # Validation results storage
├── CLAUDE.md                        # ⭐ Claude Code project context
├── tsconfig.json                    # TypeScript configuration
├── deployed_contracts.json          # Contract addresses (anvil/testnet)
└── package.json                     # Root npm dependencies
```

## Circuit Specifications

This project includes **two ZK circuits** for different validation purposes:

### 1. Portfolio Rebalancing Circuit (`circuits/rebalancing.circom`)

Validates that a portfolio rebalancing satisfies allocation constraints without revealing positions.

**Private Inputs** (hidden from blockchain - kept in witness only):
- `oldBalances[4]`: Token balances before rebalancing
- `newBalances[4]`: Token balances after rebalancing
- `prices[4]`: Current token prices (in base units)

**Public Inputs** (visible on-chain during verification):
- `totalValueCommitment`: Total portfolio value
- `minAllocationPct`: Minimum allocation percentage per asset (e.g., 10 = 10%)
- `maxAllocationPct`: Maximum allocation percentage per asset (e.g., 40 = 40%)

**Constraints**:
1. **Total Value Preservation**: Old and new portfolio values must be equal and match commitment
2. **Allocation Bounds**: Calculates min/max bounds (note: full range checks require comparison circuits)

**Circuit Statistics**:
- **Constraints**: ~20 (optimized for privacy)
- **Public Signals**: 3 (minimized for privacy)
- **Private Witness Inputs**: 12 (balances and prices hidden)
- **Verifier Contract**: `Groth16Verifier.sol`

### 2. ZyFI Rebalancer Validation Circuit (`circuits/rebalancer-validation.circom`)

Validates DeFi rebalancing opportunities against ZyFI backend constraints (based on [this gist](https://gist.github.com/PaulDeFi/49d1a386c5d1bb85a1cfbe7bff2bd4d2)).

**Private Inputs** (all hidden from blockchain):
- `liquidity`: Available liquidity in pool (dollars, integer)
- `zyfiTvl`: Current ZyFI TVL in pool (dollars, integer)
- `amount`: Rebalancer amount (token smallest unit, e.g., USDC with 6 decimals)
- `poolTvl`: Total pool TVL (token smallest unit)
- `newApy`: New opportunity APY (scaled by 100, e.g., 550 = 5.50%)
- `oldApy`: Previous opportunity APY (scaled by 100)
- `apyStable7Days`: Boolean (1 if APY stable over 7 days, 0 otherwise)
- `apyStable10Days`: Boolean (1 if APY stable over 10 days, 0 otherwise)
- `tvlStable`: Boolean (1 if TVL is stable, 0 otherwise)

**Public Outputs**:
- `validationCommitment`: Commitment hash of all inputs + result
- `isValid`: 1 if all constraints pass, 0 otherwise

**Constraints** (implements 5 core ZyFI validation rules):
1. **Available Liquidity**: `liquidity * 1.05 > zyfiTvl + (amount / 1_000_000)`
2. **TVL Constraint**: `poolTvl * 1e6 > amount * 4` (ensures max 25% allocation)
3. **APY Performance**: `newApy > oldApy + 10` (requires 0.1% improvement)
4. **APY Stability**: `apyStable7Days || apyStable10Days` (at least one must be true)
5. **TVL Stability**: `tvlStable == 1` (TVL must be stable)

**Circuit Statistics**:
- **Constraints**: ~50-100 (includes comparison circuits)
- **Public Signals**: 2 (commitment + isValid)
- **Private Witness Inputs**: 9 (all rebalancer parameters hidden)
- **Verifier Contract**: `RebalancerVerifier.sol`

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
# Setup portfolio rebalancing circuit
npm run setup:zkp

# Setup ZyFI rebalancer validation circuit
npm run setup:zkp:rebalancer
```

**Portfolio rebalancing setup** (`npm run setup:zkp`):
1. Compiles `circuits/rebalancing.circom` to R1CS and WASM
2. Runs Powers of Tau ceremony
3. Generates proving and verification keys
4. Exports Solidity verifier to `contracts/src/Verifier.sol`
5. Tests with example input from `input/input.json`

**ZyFI rebalancer setup** (`npm run setup:zkp:rebalancer`):
1. Compiles `circuits/rebalancer-validation.circom` to R1CS and WASM
2. Runs Powers of Tau ceremony
3. Generates proving and verification keys
4. Exports Solidity verifier to `contracts/src/RebalancerVerifier.sol`
5. Creates artifacts in `build/rebalancer-validation/` directory

**Note**: The verifier contracts (`Verifier.sol`, `RebalancerVerifier.sol`) remain constant for the same circuit. Only regenerate when you modify the corresponding `.circom` files.

## Usage

### Running the Complete Workflow

```bash
# 1. Start local blockchain (in separate terminal)
npm run anvil

# 2. Run end-to-end test
npm run test:e2e
```

The E2E test demonstrates the complete ERC-8004 workflow:

- Deploys all contracts (IdentityRegistry, ValidationRegistry, ReputationRegistry, Groth16Verifier, RebalancerVerifier)
- Registers three agents (Rebalancer, Validator, Client) via NFT-based identity system
- Generates ZK proofs for both circuits (portfolio rebalancing + ZyFI validation)
- Validates proofs **on-chain** using deployed Verifier contracts via eth_call
- Submits validation responses to ValidationRegistry (scores 0-100)
- Generates signed feedback authorization from Rebalancer
- Handles client feedback submission to ReputationRegistry
- Queries reputation summary and validation statistics

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

## Example Inputs

### Portfolio Rebalancing (`input/input.json`)

```json
{
  "oldBalances": ["1000", "1000", "1000", "750"],
  "newBalances": ["1350", "1300", "725", "375"],
  "prices": ["100", "100", "100", "100"],
  "totalValueCommitment": "375000",
  "minAllocationPct": "10",
  "maxAllocationPct": "40"
}
```

**Verification**:
- Old Total: 1000×100 + 1000×100 + 1000×100 + 750×100 = 375,000 ✓
- New Total: 1350×100 + 1300×100 + 725×100 + 375×100 = 375,000 ✓
- Total value preserved ✓

### ZyFI Rebalancer Validation (Example)

```json
{
  "liquidity": 10000000,
  "zyfiTvl": 5000000,
  "amount": 1000000,
  "poolTvl": 50000000,
  "newApy": 550,
  "oldApy": 450,
  "apyStable7Days": 1,
  "apyStable10Days": 1,
  "tvlStable": 1
}
```

**Verification** (all constraints must pass):
1. Liquidity Check: 10,000,000 × 1.05 = 10,500,000 > 5,000,000 + 1 ✓
2. TVL Constraint: 50,000,000 × 1,000,000 > 1,000,000 × 4 ✓
3. APY Performance: 550 > 450 + 10 ✓
4. APY Stability: (1 || 1) = 1 ✓
5. TVL Stability: 1 ✓
6. Result: isValid = 1 ✓

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

This project implements the **ERC-8004 Trustless Agents** standard for on-chain agent coordination:

### Smart Contracts

1. **IdentityRegistry** (ERC-721 based)
   - NFT-based agent identity system
   - Each agent gets a unique `agentId` (tokenId)
   - Supports metadata and URI for agent profiles
   - Emits `Registered(uint256 agentId, string tokenURI, address owner)`

2. **ValidationRegistry**
   - Manages validation requests and responses
   - `validationRequest()`: Rebalancer submits proof hash for validation
   - `validationResponse()`: Validator submits on-chain verification result (score 0-100)
   - Tracks validation history per agent and validator
   - Provides `getSummary()` for aggregated validation scores

3. **ReputationRegistry**
   - Feedback system with signature-based authorization
   - `giveFeedback()`: Client provides ratings with signed authorization from Rebalancer
   - `revokeFeedback()`: Clients can revoke their feedback
   - `appendResponse()`: Agents can respond to feedback
   - Anti-self-feedback protection (owner/operators cannot give feedback to themselves)
   - Provides `getSummary()` and `readAllFeedback()` for reputation queries

### Verifier Contracts

The auto-generated Groth16 verifier contracts serve as **AgentValidatorIDs**:

#### Portfolio Rebalancing Verifier (`Verifier.sol`)

```solidity
function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[3] calldata _pubSignals  // 3 public signals (privacy-focused)
) public view returns (bool)
```

**Public Signals Order**:
1. `totalValueCommitment` - Total portfolio value
2. `minAllocationPct` - Minimum allocation percentage
3. `maxAllocationPct` - Maximum allocation percentage

#### ZyFI Rebalancer Verifier (`RebalancerVerifier.sol`)

```solidity
function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[2] calldata _pubSignals  // 2 public signals (commitment + isValid)
) public view returns (bool)
```

**Public Signals Order**:
1. `validationCommitment` - Commitment hash of all inputs + result
2. `isValid` - 1 if all constraints pass, 0 otherwise

### Agent Workflow

```
1. Agents register → IdentityRegistry.register() → get NFT-based agentId
2. Rebalancer generates ZK proof → off-chain (snarkjs)
3. Rebalancer submits proof hash → ValidationRegistry.validationRequest()
4. Validator downloads proof → reads from data/ directory
5. Validator verifies on-chain → Verifier.verifyProof() via eth_call
6. Validator submits response → ValidationRegistry.validationResponse()
7. Rebalancer authorizes feedback → signs FeedbackAuth struct
8. Client gives feedback → ReputationRegistry.giveFeedback()
9. Query reputation → ReputationRegistry.getSummary()
```

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

**Portfolio Rebalancing Circuit**:
1. ✅ Privacy achieved: balances/prices kept in witness
2. 🔲 Add range check circuits for allocation constraints (currently only bounds are calculated)
3. 🔲 Implement Poseidon hash for commitments (more efficient than simple addition)
4. 🔲 Support dynamic portfolio sizes (currently fixed at 4 assets)
5. 🔲 Conduct security audit
6. 🔲 Perform multi-party computation (MPC) ceremony for trusted setup

**ZyFI Rebalancer Validation Circuit**:
1. ✅ Privacy achieved: all rebalancer parameters kept in witness
2. ✅ Comparison circuits implemented (GreaterThan, IsPositive, IsZero)
3. ⚠️ Uses simple comparison logic (production should use battle-tested circomlib components)
4. 🔲 Add overflow protection for large numbers
5. 🔲 Conduct security audit for business logic constraints
6. 🔲 Perform multi-party computation (MPC) ceremony for trusted setup

## Gas Considerations

- Groth16 verification: ~250k-300k gas per proof (both circuits use same proof system)
- Proof size: Constant (3 G1 points + 1 G2 point) regardless of circuit complexity
- Public signals: **3 signals** (portfolio) + **2 signals** (rebalancer) - minimized for privacy
- On-chain storage:
  - Agent registration: ~100k gas (ERC-721 mint)
  - Validation request: ~80k gas (ValidationRegistry)
  - Validation response: ~60k gas (ValidationRegistry)
  - Feedback submission: ~100k gas (ReputationRegistry with signature verification)

## Security Notes

⚠️ **For Development/Testing Only**

- The trusted setup uses test entropy (`date +%s`)
- No proper MPC ceremony conducted
- Circuit needs security audit before production use
- Current setup regenerates zkey on every `npm run setup:zkp`

✅ **Privacy Achieved**:

- **Portfolio Circuit**: Old/new balances and prices are kept private (witness-only)
- **Rebalancer Circuit**: All 9 validation parameters kept private (liquidity, TVL, APY, etc.)
- Only commitments and results visible on-chain (3 + 2 public signals)
- Uses Circom 2.x `{public [...]}` syntax and public outputs for privacy control
- Zero-knowledge property: Verifier learns nothing except proof validity

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

This project implements a complete multi-agent system following **ERC-8004 Trustless Agents** standard:

### Agent Roles

1. **Rebalancer Agent (Server)**
   - Registers via IdentityRegistry (NFT-based identity)
   - Creates portfolio rebalancing plans
   - Generates zero-knowledge proofs for both circuits:
     - Portfolio rebalancing validation (balances/prices private)
     - ZyFI rebalancer validation (liquidity/APY/TVL private)
   - Submits proof hashes to ValidationRegistry
   - Generates signed feedback authorizations (EIP-191 + ERC-1271)
   - Stores proofs in `data/` directory with SHA-256 hash

2. **Validator Agent**
   - Registers via IdentityRegistry (NFT-based identity)
   - Downloads proofs from `data/` directory using dataHash
   - Validates ZK proofs **on-chain** via Groth16Verifier contracts
   - Calls `verifyProof()` with `eth_call` (no off-chain snarkjs verification)
   - Determines which verifier to use based on proof type
   - Submits validation responses (score 0-100) to ValidationRegistry
   - Stores validation results in `validations/` directory
   - Maintains validation audit trail on-chain

3. **Client Agent**
   - Registers via IdentityRegistry (NFT-based identity)
   - Evaluates rebalancer service quality
   - Provides feedback with signed authorization from Rebalancer
   - Submits ratings (score 0-100) to ReputationRegistry
   - Can revoke feedback if needed
   - Checks rebalancer reputation via on-chain queries
   - Protected from self-feedback (anti-sybil)

### Complete Workflow

```
1. Agent Registration (ERC-8004 Identity)
   ├─ Rebalancer.register() → IdentityRegistry → agentId (NFT)
   ├─ Validator.register() → IdentityRegistry → agentId (NFT)
   └─ Client.register() → IdentityRegistry → agentId (NFT)

2. Proof Generation (Off-chain, Private)
   ├─ RebalancerAgent.createRebalancingPlan(balances, prices)
   ├─ RebalancerAgent.generateZkProof() → snarkjs witness + proof
   ├─ RebalancerAgent.generateRebalancerValidationProof(liquidity, apy, tvl)
   └─ Proofs stored in data/ with SHA-256 hash

3. Validation Request (On-chain)
   ├─ RebalancerAgent.requestValidationFromValidator()
   └─ ValidationRegistry.validationRequest(validatorAddress, agentId, requestUri, dataHash)

4. Proof Validation (On-chain via eth_call)
   ├─ ValidatorAgent.validateProof(dataHash)
   ├─ Load proof from data/${dataHash}.json
   ├─ Determine verifier: Groth16Verifier or RebalancerVerifier
   ├─ publicClient.readContract(verifier, "verifyProof", [pA, pB, pC, pubSignals])
   └─ Result: isValid (boolean), score (0-100)

5. Validation Response (On-chain)
   ├─ ValidatorAgent.submitValidation(result)
   └─ ValidationRegistry.validationResponse(requestHash, score, responseUri, responseHash)

6. Feedback Authorization (Off-chain Signature)
   ├─ RebalancerAgent.generateFeedbackAuthorization(clientAddress, indexLimit, expiry)
   ├─ Create FeedbackAuth struct (agentId, client, limit, expiry, chainId, registry)
   ├─ Sign with EIP-191 (personal_sign) or ERC-1271 (smart contract)
   └─ Return feedbackAuth (224 bytes struct + 65 bytes signature)

7. Feedback Submission (On-chain)
   ├─ ClientAgent.giveFeedback(agentId, score, tags, feedbackUri, feedbackAuth)
   ├─ ReputationRegistry verifies signature and authorization
   ├─ Anti-self-feedback check (client != agent owner/operator)
   └─ Store feedback with 1-indexed feedbackIndex

8. Reputation Queries (On-chain View Calls)
   ├─ ReputationRegistry.getSummary(agentId, clients, tag1, tag2) → (count, avgScore)
   ├─ ReputationRegistry.readAllFeedback(agentId, ...) → detailed feedback array
   └─ ValidationRegistry.getSummary(agentId, validators, tag) → validation stats
```

### Key Privacy Features

- **Portfolio Circuit**: Balances and prices never touch the blockchain
- **Rebalancer Circuit**: Liquidity, TVL, APY parameters remain private
- Only minimal public signals visible on-chain:
  - Portfolio: 3 signals (totalValue, minAllocation, maxAllocation)
  - Rebalancer: 2 signals (commitment, isValid)
- Verifier contracts validate constraints without seeing sensitive data
- Zero-knowledge property: Verifier learns only proof validity, not inputs

### Frontend Integration

The frontend (`frontend/lib/workflow-executor.ts`) adapts agent logic for browser:
- Connects via Reown AppKit (WalletConnect v3)
- Uses Viem for blockchain interactions (not ethers.js)
- Executes workflow steps with state management
- Extracts agentIds from transaction event logs
- Supports both Anvil (local) and Base Sepolia (testnet)

**See `tests/e2e/test-zk-rebalancing-workflow.ts` for complete reference implementation.**

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
