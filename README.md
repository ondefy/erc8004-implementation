# ZK Rebalancing PoC - Zyfai Rebalancer Validation

A Zero-Knowledge proof system for validating DeFi rebalancing opportunities using Circom and Groth16, with **ERC-8004 Agentic Orchestration** for trustless multi-agent workflows.

## Overview

This project demonstrates privacy-preserving DeFi rebalancing validation using:

- **ZK Circuit**: Zyfai rebalancer validation circuit implementing backend constraints
- **Zero-Knowledge Proofs** (Groth16) to prove constraint satisfaction
- **ERC-8004 Standard** for trustless agent coordination on blockchain
- **On-chain Verification** using auto-generated Solidity verifier contract
- **Reputation System** for service quality tracking and feedback

## Quick Start

```bash
# Complete setup (first time)
npm install

# Setup ZK circuit (one-time, after circuit changes)
npm run setup:zkp:rebalancer

# Verify ZK setup
npm run check:zkp

# Run circuit tests
npm run test:rebalancer-circuit

# Test verifier contract
npm run test:verifier-proof
```

**For project context and debugging**, see [CLAUDE.md](CLAUDE.md) - comprehensive guide for AI-assisted development

## Technology Stack

### Zero-Knowledge Proofs

- **ZK Framework**: Circom 2.0.0+ (Circom 2.x)
- **Proof System**: Groth16 (efficient on-chain verification)
- **Proof Library**: SnarkJS 0.7.5
- **Curve**: bn128 (bn254)
- **Privacy**: All inputs are public signals (circuit validates constraints, not privacy-focused)

### Smart Contracts

- **Standard**: ERC-8004 Trustless Agents
- **Smart Contracts**: Solidity 0.8.20 (Foundry framework)
- **Blockchain Client**: Viem 2.38.0
- **Blockchain**: Ethereum-compatible (Anvil for local testing, Base Sepolia for testnet)

## Project Structure

```
erc8004-rebalancing-poc/
├── circuits/                        # 🔐 ZK Circuit (Circom 2.x)
│   └── rebalancer-validation.circom # Zyfai rebalancer validation circuit
├── contracts/                       # 📜 Smart Contracts (Solidity 0.8.20)
│   ├── src/
│   │   ├── IdentityRegistry.sol    # ERC-721 based agent registration
│   │   ├── ValidationRegistry.sol  # ERC-8004 validation workflows
│   │   ├── ReputationRegistry.sol   # ERC-8004 feedback system
│   │   ├── RebalancerVerifier.sol  # Groth16 verifier (auto-generated)
│   │   └── interfaces/              # Contract interfaces
│   ├── script/
│   │   ├── Deploy.s.sol            # Foundry deployment script
│   │   └── DeployRebalancerVerifier.s.sol # RebalancerVerifier deployment
│   └── test/                       # Solidity tests
├── tests/
│   ├── e2e/
│   │   └── test-zk-rebalancing-workflow.ts  # Complete E2E test
│   ├── test-rebalancer-circuit.ts  # Circuit test suite
│   ├── test-verifier-proof.ts     # Verifier contract test
│   └── rebalancer-circuit-test-cases.json  # Test case data
├── scripts/
│   ├── setup-rebalancer-validation.sh  # ZK setup script
│   ├── check-zkp-setup.js          # Verify ZK artifacts
│   ├── create-deployed-contracts.ts # Contract address extraction
│   ├── register-agent-sepolia.ts   # Agent registration on testnet
│   ├── update-agent-uri.ts         # Update agent metadata
│   ├── update-multi-chain.ts       # Multi-chain agent management
│   └── verify-rebalancer-verifier.sh # Verifier verification script
├── build/                           # ZK proof artifacts
│   └── rebalancer-validation/      # Zyfai circuit artifacts
│       ├── rebalancer-validation.r1cs
│       ├── rebalancer_validation_final.zkey
│       ├── rebalancer-validation_js/
│       │   ├── rebalancer-validation.wasm
│       │   ├── generate_witness.js
│       │   └── witness_calculator.js
│       ├── verification_key.json
│       └── ...
├── input/
│   └── rebalancer-input.json       # Opportunity test data
├── data/                            # Proof storage directory (SHA-256 indexed)
├── validations/                     # Validation results storage
├── CLAUDE.md                        # ⭐ Claude Code project context
├── agent-card-zyfai.json           # Agent metadata for IPFS
├── tsconfig.json                    # TypeScript configuration
├── deployed_contracts.json         # Contract addresses (Base Sepolia)
└── package.json                     # Root npm dependencies
```

## Circuit Specification

### Zyfai Rebalancer Validation Circuit (`circuits/rebalancer-validation.circom`)

Validates DeFi rebalancing opportunities against Zyfai backend constraints. The circuit implements the core validation logic from the Zyfai backend logic, ensuring that rebalancing opportunities meet all required safety and performance criteria.

**Public Inputs** (all 15 inputs are public signals):

**New Opportunity Data**:

- `liquidity`: Available liquidity (scaled by 100, 2 decimal precision)
- `ZyfaiTvl`: Current Zyfai TVL (scaled by 100, 2 decimal precision)
- `amount`: Rebalancer amount (token smallest unit, e.g., USDC with 6 decimals)
- `poolTvl`: Total pool TVL (scaled by 100, 2 decimal precision)
- `newApy`: New opportunity APY (scaled by 10000, 4 decimal precision, e.g., 54352 = 5.4352%)
- `apyStable7Days`: Boolean (1 if APY stable over 7 days, 0 otherwise)
- `tvlStable`: Boolean (1 if TVL is stable, 0 otherwise)

**Old Opportunity Data** (for computing `shouldRebalanceFromOld`):

- `oldApy`: Previous opportunity APY (scaled by 10000, 4 decimal precision, 0 if no old opportunity)
- `oldLiquidity`: Old opportunity liquidity (scaled by 100, 2 decimal precision, 0 if no old opportunity)
- `oldZyfaiTvl`: Old opportunity Zyfai TVL (scaled by 100, 2 decimal precision, 0 if no old opportunity)
- `oldTvlStable`: Boolean (1 if old opportunity TVL is stable, 0 otherwise, defaults to 1)
- `oldUtilizationStable`: Boolean (1 if old opportunity utilization is stable, 0 otherwise, defaults to 1)
- `oldCollateralHealth`: Boolean (1 if old opportunity collateral is healthy, 0 otherwise, defaults to 1)
- `oldZyfaiTVLCheck`: Boolean (1 if old opportunity passes Zyfai TVL check, 0 otherwise, defaults to 1)

**User Preferences**:

- `supportsCurrentPool`: Boolean (1 if current pool is supported, 0 to bypass APY check)

**Constraints** (implements 5 core Zyfai validation rules):

1. **Available Liquidity Check**: `liquidity * 85 > ZyfaiTvl * 100`

   - Ensures sufficient liquidity: `newOpportunity.liquidity * 0.85 > adjustedZyfaiTvl`

2. **TVL Constraint**: `poolTvl * 1e6 > amount * 400`

   - Ensures max 25% allocation: `newOpportunity.tvl * 1e6 > amount * (100n / 25n)`

3. **APY Performance Check** (with edge cases):

   - Base check: `newApy > oldApy + 10` (requires 0.1% improvement)
   - Edge cases (bypass APY check):
     - `oldApy == 0` (no old opportunity)
     - `shouldRebalanceFromOld == 1` (rebalancing from problematic old opportunity)
     - `supportsCurrentPool == 0` (current pool no longer supported)

4. **APY Stability Check**: `apyStable7Days == 1`

   - Requires APY to be stable over 7 days

5. **TVL Stability Check**: `tvlStable == 1`
   - Requires TVL to be stable

**Circuit Statistics**:

- **Constraints**: ~100-200 (includes comparison circuits from circomlib)
- **Public Signals**: 15 (all inputs are public)
- **Verifier Contract**: `RebalancerVerifier.sol`

**Note**: Checks not included in circuit (require service calls or external data):

- `amountCheck`: Protocol-specific minimum amount check
- `ZyfaiTvlCheck`: Protocol-specific TVL limit check
- `slippageCheck`: Daily profit vs slippage calculation
- `collateralHealthCheck`: Collateral health verification
- `utilizationStableCheck`: Utilization stability check

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
# Setup Zyfai rebalancer validation circuit
npm run setup:zkp:rebalancer

# Check if ZK setup is complete
npm run check:zkp
```

**Zyfai rebalancer setup** (`npm run setup:zkp:rebalancer`):

1. Compiles `circuits/rebalancer-validation.circom` to R1CS and WASM
2. Runs Powers of Tau ceremony (12 constraints)
3. Generates proving and verification keys
4. Exports Solidity verifier to `contracts/src/RebalancerVerifier.sol`
5. Creates artifacts in `build/rebalancer-validation/` directory
6. Tests with example input from `input/rebalancer-input.json`

**Note**: The verifier contract (`RebalancerVerifier.sol`) remains constant for the same circuit. Only regenerate when you modify the `.circom` file.

### Available NPM Scripts

**ZK Proof Setup**:

- `npm run setup:zkp:rebalancer` - Setup Zyfai validation circuit
- `npm run check:zkp` - Verify ZK artifacts exist

**Smart Contracts (Foundry)**:

- `npm run forge:build` - Compile contracts
- `npm run forge:test` - Run Solidity tests
- `npm run forge:deploy:local` - Deploy to Anvil
- `npm run forge:deploy:base-sepolia` - Deploy to Base Sepolia
- `npm run forge:clean` - Clean build artifacts

**Testing**:

- `npm run test:rebalancer-circuit` - Run circuit test suite
- `npm run test:verifier-proof` - Test verifier contract with proof

**Utilities**:

- `npm run clean:zkp` - Clean ZK artifacts only
- `npm run clean:ts` - Clean TypeScript builds
- `npm run clean` - Clean all build artifacts

## Usage

### Running Circuit Tests

```bash
# Run comprehensive circuit test suite
npm run test:rebalancer-circuit
```

The test suite validates:

- Normal case: Higher APY, all checks pass
- Edge cases: No old opportunity, lower APY with shouldRebalanceFromOld, etc.
- Constraint violations: Each constraint failure scenario
- Boolean validation: Ensures boolean inputs are 0 or 1

### Testing Verifier Contract

```bash
# Test verifier contract with a proof
npm run test:verifier-proof
```

This test:

- Loads a pre-generated proof
- Calls `RebalancerVerifier.verifyProof()` on-chain
- Validates that the proof verifies correctly

### Generating Proofs

```bash
# Edit input values
nano input/rebalancer-input.json

# Generate witness
node build/rebalancer-validation/rebalancer-validation_js/generate_witness.js \
  build/rebalancer-validation/rebalancer-validation_js/rebalancer-validation.wasm \
  input/rebalancer-input.json \
  build/rebalancer-validation/witness.wtns

# Generate proof
snarkjs g16p \
  build/rebalancer-validation/rebalancer_validation_final.zkey \
  build/rebalancer-validation/witness.wtns \
  build/rebalancer-validation/proof.json \
  build/rebalancer-validation/public.json

# Verify proof offline
snarkjs g16v \
  build/rebalancer-validation/verification_key.json \
  build/rebalancer-validation/public.json \
  build/rebalancer-validation/proof.json
```

### On-Chain Verification

The verifier contract can be called on-chain:

```typescript
// Example: Verify proof on-chain
const isValid = await publicClient.readContract({
  address: rebalancerVerifierAddress,
  abi: rebalancerVerifierAbi,
  functionName: "verifyProof",
  args: [pA, pB, pC, pubSignals], // 15 public signals
});
```

**Key Point**: Verification happens on-chain via `eth_call` to the RebalancerVerifier contract.

## Example Inputs

### Zyfai Rebalancer Validation (`input/rebalancer-input.json`)

```json
{
  "liquidity": 10000000,
  "ZyfaiTvl": 500000,
  "amount": 1000000,
  "poolTvl": 10000000,
  "newApy": 120000,
  "apyStable7Days": 1,
  "tvlStable": 1,
  "oldApy": 100000,
  "oldLiquidity": 8000000,
  "oldZyfaiTvl": 400000,
  "oldTvlStable": 1,
  "oldUtilizationStable": 1,
  "oldCollateralHealth": 1,
  "oldZyfaiTVLCheck": 1,
  "supportsCurrentPool": 1
}
```

**Input Format Notes**:

- `liquidity`, `ZyfaiTvl`, `poolTvl`, `oldLiquidity`, `oldZyfaiTvl`: Scaled by 100 (2 decimal precision)
- `newApy`, `oldApy`: Scaled by 10000 (4 decimal precision, e.g., 120000 = 12.0000%)
- `amount`: Token smallest unit (no scaling, e.g., USDC with 6 decimals)
- Boolean fields: Must be exactly 0 or 1

**Verification** (all constraints must pass):

1. Liquidity Check: 10,000,000 × 85 = 850,000,000 > 500,000 × 100 = 50,000,000 ✓
2. TVL Constraint: 10,000,000 × 1,000,000 = 10,000,000,000,000 > 1,000,000 × 400 = 400,000,000 ✓
3. APY Performance: 120,000 > 100,000 + 10 = 100,010 ✓
4. APY Stability: 1 ✓
5. TVL Stability: 1 ✓
6. Result: All checks pass ✓

## Testing & Debugging

### Check Circuit Info

```bash
snarkjs r1cs info build/rebalancer-validation/rebalancer-validation.r1cs
```

### Verify Witness Correctness

```bash
snarkjs wtns check \
  build/rebalancer-validation/rebalancer-validation.r1cs \
  build/rebalancer-validation/witness.wtns
```

### Print Circuit Constraints

```bash
snarkjs r1cs print \
  build/rebalancer-validation/rebalancer-validation.r1cs \
  build/rebalancer-validation/rebalancer-validation.sym
```

## ERC-8004 Integration

This project implements the **ERC-8004 Trustless Agents** standard for on-chain agent coordination:

### Smart Contracts

1. **IdentityRegistry** (ERC-721 based)

   - NFT-based agent identity system
   - Each agent gets a unique `agentId` (tokenId)
   - Supports metadata and URI for agent profiles
   - Emits `Registered(uint256 agentId, string tokenURI, address owner)`
   - Available in both standard and upgradeable versions (UUPS pattern)

2. **ValidationRegistry**

   - Manages validation requests and responses
   - `validationRequest()`: Rebalancer submits proof hash for validation
   - `validationResponse()`: Validator submits on-chain verification result (score 0-100)
   - Tracks validation history per agent and validator
   - Provides `getSummary()` for aggregated validation scores
   - Available in both standard and upgradeable versions (UUPS pattern)

3. **ReputationRegistry**

   - Feedback system with signature-based authorization
   - `giveFeedback()`: Client provides ratings with signed authorization from Rebalancer
   - `revokeFeedback()`: Clients can revoke their feedback
   - `appendResponse()`: Agents can respond to feedback
   - Anti-self-feedback protection (owner/operators cannot give feedback to themselves)
   - Provides `getSummary()` and `readAllFeedback()` for reputation queries
   - Available in both standard and upgradeable versions (UUPS pattern)

4. **ERC1967Proxy**
   - Transparent proxy for upgradeable contracts
   - OpenZeppelin implementation wrapper

### Verifier Contract

The auto-generated Groth16 verifier contract serves as an **AgentValidatorID**:

#### Zyfai Rebalancer Verifier (`RebalancerVerifier.sol`)

```solidity
function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[15] calldata _pubSignals  // 15 public signals
) public view returns (bool)
```

**Public Signals Order**:

1. `liquidity` - Available liquidity (scaled by 100)
2. `ZyfaiTvl` - Current Zyfai TVL (scaled by 100)
3. `amount` - Rebalancer amount (token smallest unit)
4. `poolTvl` - Total pool TVL (scaled by 100)
5. `newApy` - New opportunity APY (scaled by 10000)
6. `apyStable7Days` - Boolean (0 or 1)
7. `tvlStable` - Boolean (0 or 1)
8. `oldApy` - Previous opportunity APY (scaled by 10000)
9. `oldLiquidity` - Old opportunity liquidity (scaled by 100)
10. `oldZyfaiTvl` - Old opportunity Zyfai TVL (scaled by 100)
11. `oldTvlStable` - Boolean (0 or 1)
12. `oldUtilizationStable` - Boolean (0 or 1)
13. `oldCollateralHealth` - Boolean (0 or 1)
14. `oldZyfaiTVLCheck` - Boolean (0 or 1)
15. `supportsCurrentPool` - Boolean (0 or 1)

## Network Deployment

### Deployed Contracts (Base Sepolia)

The project is deployed on Base Sepolia testnet with the following contract addresses:

```json
{
  "chainId": 84532,
  "name": "Base Sepolia",
  "contracts": {
    "IdentityRegistry": "0xCfec11aF0101f1D1C034E5fa8A8F490b78D3d188",
    "ValidationRegistry": "0xc4708fdE00Af35888D8ecC183D24e60fe3bE37b0",
    "ReputationRegistry": "0x9547b6d3F808A8A8F9e0aF3EfED53595e6E172dC",
    "RebalancerVerifier": "0x3CcB02561f39133214F5801626643c623D916e01"
  },
  "deploymentBlock": 33018974
}
```

### Local Development

For local development with Anvil:

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy contracts
npm run forge:deploy:local

# Terminal 3: Run tests
npm run test:rebalancer-circuit
npm run test:verifier-proof
```

### Network Configuration

The project supports multiple networks:

- **Local (Anvil)**: Chain ID 31337
- **Base Sepolia**: Chain ID 84532

Contract addresses are stored in:

- Root: `deployed_contracts.json` (Base Sepolia)

## Important Notes

### Circom Version Compatibility

This project **requires Circom 2.x** (>= 2.0.0). Key features used:

1. `pragma circom 2.0.0` statement
2. `{public [inputs]}` syntax to control which inputs are public
3. Circom 2.x witness generator (`build/rebalancer-validation_js/`)

**Important**: Circom 1.x will NOT work with this circuit.

### Input Format

- All numeric values must be integers (not strings) in JSON
- Values should be within field size limits (bn128 curve ~254 bits)
- Boolean fields must be exactly 0 or 1 (enforced by circuit)
- Scaling factors:
  - Liquidity/TVL values: Scaled by 100 (2 decimal precision)
  - APY values: Scaled by 10000 (4 decimal precision)
  - Amount: Token smallest unit (no scaling)

### Circuit Limitations

This is a **proof-of-concept**. For production:

1. ✅ Comparison circuits implemented (GreaterThan, IsEqual from circomlib)
2. ✅ Boolean validation for stability flags (0 or 1 enforcement)
3. ✅ Edge case handling (shouldRebalanceFromOld, no old opportunity, etc.)
4. 🔲 Add overflow protection for large numbers
5. 🔲 Conduct security audit for business logic constraints
6. 🔲 Perform multi-party computation (MPC) ceremony for trusted setup
7. 🔲 Implement privacy features (currently all inputs are public)

## Gas Considerations

- Groth16 verification: ~250k-300k gas per proof
- Proof size: Constant (3 G1 points + 1 G2 point) regardless of circuit complexity
- Public signals: **15 signals** (all inputs are public)
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
- Current setup regenerates zkey on every `npm run setup:zkp:rebalancer`

✅ **Current Implementation**:

- All inputs are public signals (no privacy features)
- Circuit validates constraints without revealing sensitive computation
- Uses Circom 2.x `{public [...]}` syntax for public inputs
- Zero-knowledge property: Verifier learns only proof validity, not internal constraint logic

For production deployment:

1. Conduct proper multi-party computation (MPC) ceremony for trusted setup
2. Audit circuit logic and constraints
3. Use battle-tested circomlib components for comparisons
4. Deploy RebalancerVerifier.sol once and reuse across all proofs
5. Implement proper key management for agent private keys
6. Consider adding privacy features if sensitive data needs protection

## Troubleshooting

### Circom Version Mismatch

**Error**: `Parse error on line 1: pragma circom 2.0.0`

**Solution**: Upgrade to Circom 2.x:

```bash
npm uninstall -g circom
npm install -g circom@latest
circom --version  # Should be >= 2.0.0
```

### Invalid Proof Verification

**Possible causes**:

1. **Public signal mismatch**: Ensure proof was generated with same circuit/zkey as deployed Verifier
2. **Stale Verifier**: Run `npm run setup:zkp:rebalancer` to regenerate after circuit changes
3. **Input constraint violation**: Check that input values satisfy all circuit constraints
4. **Boolean validation**: Ensure boolean inputs are exactly 0 or 1

**Debug steps**:

```bash
# Verify off-chain first
snarkjs g16v \
  build/rebalancer-validation/verification_key.json \
  build/rebalancer-validation/public.json \
  build/rebalancer-validation/proof.json

# Check public signals match (should have 15 elements)
cat build/rebalancer-validation/public.json

# Ensure Verifier was regenerated
ls -la contracts/src/RebalancerVerifier.sol
```

### Witness Generation Fails

**Error**: `witness check failed`

**Solution**: Ensure input values satisfy all circuit constraints:

1. Check liquidity constraint: `liquidity * 85 > ZyfaiTvl * 100`
2. Check TVL constraint: `poolTvl * 1000000 > amount * 400`
3. Check APY constraint: `newApy > oldApy + 10` (or edge cases)
4. Check stability: `apyStable7Days == 1` and `tvlStable == 1`
5. Ensure boolean inputs are 0 or 1

## Key Features

✅ **Constraint Validation**: Validates Zyfai rebalancing opportunities against backend rules  
✅ **On-Chain Verification**: Proofs verified via deployed RebalancerVerifier contract  
✅ **Trust**: Cryptographic validation of constraint satisfaction  
✅ **Transparency**: All inputs are public signals (no privacy, but verifiable)  
✅ **Composability**: ERC-8004 standard for multi-agent coordination  
✅ **Testnet Ready**: Deployed on Base Sepolia with verified contracts  
✅ **Comprehensive Testing**: Circuit test suite with edge cases

## Documentation

### 📚 Key Resources

1. **[CLAUDE.md](CLAUDE.md)** - Comprehensive project context for AI-assisted development

   - Project summary and quick context for debugging
   - Common errors and solutions
   - Key files reference
   - Architecture overview
   - State flow and data management
   - Technology stack notes
   - Troubleshooting checklist
   - Development best practices

## Development Status

### Completed ✅

1. ✅ ZK circuit implementation (Zyfai rebalancer validation)
2. ✅ Circuit compilation and trusted setup (Powers of Tau)
3. ✅ Proof generation and verification (Groth16)
4. ✅ Solidity verifier generation (RebalancerVerifier)
5. ✅ ERC-8004 registry integration (Identity, Validation, Reputation)
6. ✅ End-to-end workflow test
7. ✅ Circuit test suite with comprehensive edge cases
8. ✅ Verifier contract testing
9. ✅ Circom 2.x for public inputs
10. ✅ On-chain proof verification via Verifier contract
11. ✅ Deployed to Base Sepolia testnet
12. ✅ Comparison circuits for constraints (circomlib)
13. ✅ Upgradeable contracts (UUPS pattern)
14. ✅ Agent metadata management

### Roadmap 🔲

1. 🔲 Implement privacy features (make sensitive inputs private)
2. 🔲 Production MPC ceremony for trusted setup (replace test entropy)
3. 🔲 Security audit of circuits and smart contracts
4. 🔲 Gas optimization for on-chain operations
5. 🔲 Additional validation rules and constraint types
6. 🔲 Multi-chain deployment (Ethereum mainnet, Polygon, Arbitrum)
7. 🔲 Real-time monitoring dashboard for validators
8. 🔲 Advanced reputation scoring algorithms
9. 🔲 Integration with live DeFi protocols

## License

MIT

## Key Project Files

When exploring the codebase, start with these files:

### Core Implementation

1. **[circuits/rebalancer-validation.circom](circuits/rebalancer-validation.circom)** - Zyfai validation ZK circuit
2. **[tests/test-rebalancer-circuit.ts](tests/test-rebalancer-circuit.ts)** - Circuit test suite
3. **[tests/test-verifier-proof.ts](tests/test-verifier-proof.ts)** - Verifier contract test

### Smart Contracts

4. **[contracts/src/IdentityRegistry.sol](contracts/src/IdentityRegistry.sol)** - Agent registration (ERC-721)
5. **[contracts/src/ValidationRegistry.sol](contracts/src/ValidationRegistry.sol)** - Validation workflows
6. **[contracts/src/ReputationRegistry.sol](contracts/src/ReputationRegistry.sol)** - Feedback system
7. **[contracts/src/RebalancerVerifier.sol](contracts/src/RebalancerVerifier.sol)** - Zyfai verifier (auto-generated)

### Scripts

8. **[scripts/setup-rebalancer-validation.sh](scripts/setup-rebalancer-validation.sh)** - ZK circuit setup script
9. **[scripts/check-zkp-setup.js](scripts/check-zkp-setup.js)** - Verify ZK artifacts

### Documentation

10. **[CLAUDE.md](CLAUDE.md)** - ⭐ Comprehensive project context

## Environment Variables

### Root Project

No environment variables required for local development.

### Deployment

For testnet deployment, set in your shell:

```bash
# Base Sepolia RPC URL
export RPC_URL_BASE_SEPOLIA="https://sepolia.base.org"

# BaseScan API key (for contract verification)
export BASESCAN_API_KEY="your_basescan_api_key"
```

## References

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [Viem Documentation](https://viem.sh/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Base Sepolia Testnet](https://docs.base.org/network-information/)
