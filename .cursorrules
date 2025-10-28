# Claude Code Project Context - ZK Rebalancing PoC

## Project Summary

This is a Zero-Knowledge proof system for portfolio rebalancing validation using Circom, Groth16, and ERC-8004 multi-agent orchestration. The system includes:

- **Dual ZK Circuits** (Circom 2.x):
  - Portfolio rebalancing validation (4-asset allocation constraints)
  - ZyFI rebalancer validation (DeFi liquidity/APY/TVL constraints)
- **Smart Contracts** (Solidity 0.8.20/Foundry): ERC-8004 agent registries and dual Groth16 verifiers
- **Agents** (TypeScript): Rebalancer, Validator, and Client implementing ERC-8004 workflows
- **Frontend** (Next.js 15): Web UI for interactive agent workflows with wallet integration (Reown AppKit)

## Quick Context for Debugging

### Common Errors and Solutions

#### 1. "tokenOfOwnerByIndex not found on ABI"
**Problem**: IdentityRegistry extends ERC721URIStorage, NOT ERC721Enumerable
**Solution**: Query past `Registered` events using `getLogs` instead
**Location**: `frontend/lib/workflow-executor.ts:236-259`

#### 2. "simulatedDataHash is not defined"
**Problem**: Undefined variable reference in submitForValidation
**Solution**: Use `dataHash` variable that's defined in the current scope
**Location**: `frontend/lib/workflow-executor.ts:626-627`

#### 3. Agent registration fails or agentId not captured
**Problem**: Not extracting agentId from transaction receipt logs
**Solution**: Look for `Registered` event or `Transfer` event (from=0x0) in receipt.logs
**Location**: `frontend/lib/workflow-executor.ts:334-372`

#### 4. Workflow state not persisting between steps
**Problem**: Not returning stateUpdate in StepResult
**Solution**: Always return stateUpdate with extracted data (agentIds, proof, etc.)
**Location**: Check each step function in `workflow-executor.ts`

### Key Files to Check When Stuck

1. **workflow-executor.ts** (`frontend/lib/workflow-executor.ts`): Core step execution logic
   - Each step returns `StepResult` with optional `stateUpdate`
   - State flows through `workflowState` parameter
   - Critical state: `agentIds`, `inputData`, `proof`, `publicInputs`, `requestHash`, `validationResult`

2. **rebalancer-agent.ts** (`agents/rebalancer-agent.ts`): ZK proof generation
   - `createRebalancingPlan()`: Prepares portfolio data
   - `generateZkProof()`: Uses snarkjs to generate Groth16 proof
   - `requestValidationFromValidator()`: Submits proof to ValidationRegistry

3. **validator-agent.ts** (`agents/validator-agent.ts`): On-chain validation
   - `validateProof()`: Calls Verifier.verifyProof() via eth_call (on-chain)
   - `submitValidationResponse()`: Submits score to ValidationRegistry

4. **IdentityRegistry.sol** (`contracts/src/IdentityRegistry.sol`): Agent registration
   - ERC-721 based (NFT identity)
   - `register()` functions (3 overloads)
   - Emits `Registered(uint256 indexed agentId, string tokenURI, address indexed owner)`

5. **API Routes** (`frontend/app/api/*/route.ts`):
   - `generate-proof`: Witness generation + proof generation using snarkjs
   - `validate-proof`: On-chain verification via Verifier contract
   - `store-proof`: Save proof to `data/` directory, return SHA-256 hash
   - `load-input`: Load portfolio data from `input/input.json`

### Architecture Overview

```
User (Wallet) → Frontend → Workflow Executor → Smart Contracts
                    ↓
                API Routes → Agents → Circom/SnarkJS
```

**Workflow Steps**:
1. Register agents (get NFT-based identity)
2. Load input data (portfolio balances, prices)
3. Generate ZK proof (private: balances/prices)
4. Submit for validation (on-chain request)
5. Validate proof (on-chain via Groth16Verifier)
6. Submit validation response (on-chain)
7. Authorize feedback (off-chain signature)
8. Give feedback (on-chain to ReputationRegistry)
9. Check reputation (read on-chain data)

### State Flow

```
Step 0: Register → agentIds{rebalancer, validator, client}
Step 1: Load Input → inputData{oldBalances, newBalances, prices, ...}
Step 2: Generate Proof → proof, publicInputs
Step 3: Submit Validation → requestHash/dataHash
Step 4: Validate → validationResult{isValid, score, dataHash}
Step 5: Submit Response → responseHash
```

**Critical**: Each step must extract relevant data and return it in `stateUpdate` so later steps can access it.

### Technology Stack Notes

- **Circom**: 2.2.2+ (Circom 2.x required, not 1.x) - dual circuits
- **SnarkJS**: 0.7.5 (Groth16 proof system)
- **Solidity**: 0.8.20 (Foundry framework) - updated from 0.8.19
- **Frontend**: Next.js 15.1+ (App Router, not Pages Router)
- **Wallet**: Reown AppKit (formerly WalletConnect v3)
- **Blockchain**: Viem (not ethers.js)

### Networks

- **Local**: Anvil (Foundry's local testnet) - Chain ID 31337
- **Testnet**: Base Sepolia - Chain ID 84532

### Contract Addresses

Addresses are in `deployed_contracts.json` (root) or `frontend/lib/deployed-contracts-*.json`:
- `IdentityRegistry`: Agent registration (ERC-721 based)
- `ValidationRegistry`: Validation requests/responses
- `ReputationRegistry`: Feedback system
- `Groth16Verifier`: Portfolio rebalancing proof verifier (auto-generated)
- `RebalancerVerifier`: ZyFI rebalancer validation proof verifier (auto-generated)

### Testing

- **E2E Test**: `tests/e2e/test-zk-rebalancing-workflow.ts` - Complete workflow
- **Run**: `npm run test:e2e` (requires Anvil running)
- **Frontend**: `npm run frontend:dev` (requires contracts deployed)

## Troubleshooting Checklist

When encountering errors:

1. ✅ Is Anvil running? (`npm run anvil`)
2. ✅ Are contracts deployed? (Check `frontend/lib/deployed-contracts-anvil.json`)
3. ✅ Is ZK setup done? (`npm run setup:zkp` after circuit changes)
4. ✅ Are agent wallets configured correctly in frontend?
5. ✅ Is the correct wallet connected for the current step?
6. ✅ Does workflowState contain required data from previous steps?
7. ✅ Are agentIds extracted from registration receipts/events?
8. ✅ Are event logs being parsed correctly (check event signatures)?

## Development Best Practices

1. **Always test E2E first**: If E2E test passes, issue is likely in frontend
2. **Check workflow state**: Log `workflowState` at start of each step
3. **Verify events**: Use `console.log(receipt.logs)` to inspect event data
4. **Test incremental**: Make small changes and test immediately
5. **Read E2E test**: It's the source of truth for correct workflow

## Common Patterns

### Extracting agentId from receipt

```typescript
// Look for Transfer event (minting from address(0))
const transferLog = receipt.logs.find((log: any) =>
  log.address.toLowerCase() === contractAddress.toLowerCase() &&
  log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" &&
  log.topics[1] === "0x0000000000000000000000000000000000000000000000000000000000000000"
);

if (transferLog && transferLog.topics[3]) {
  const agentId = parseInt(transferLog.topics[3], 16);
}
```

### Querying past events

```typescript
const events = await publicClient.getLogs({
  address: contractAddress,
  event: {
    type: 'event',
    name: 'Registered',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'tokenURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true }
    ]
  },
  args: { owner: currentAddress as `0x${string}` },
  fromBlock: 'earliest',
  toBlock: 'latest'
});
```

### Returning state updates

```typescript
return {
  success: true,
  details: "Step completed successfully",
  txHash: hash,
  stateUpdate: {
    agentIds: {
      [role]: extractedAgentId
    },
    proof: generatedProof,
    publicInputs: publicSignals
  }
};
```

## File Structure Reference

```
rebalancing-poc-main/
├── agents/                    # TypeScript agent classes
│   ├── base-agent.ts         # ERC-8004 base functionality
│   ├── rebalancer-agent.ts   # Dual proof generation (portfolio + ZyFI)
│   ├── validator-agent.ts    # On-chain validation (auto-detects verifier)
│   └── client-agent.ts       # Feedback
├── circuits/                  # ⭐ Dual ZK circuits
│   ├── rebalancing.circom    # Portfolio rebalancing (4 assets)
│   └── rebalancer-validation.circom  # ZyFI validation (5 constraints)
├── contracts/src/            # Solidity contracts (Foundry)
│   ├── IdentityRegistry.sol  # Agent registration (ERC-721)
│   ├── ValidationRegistry.sol # Validation workflows
│   ├── ReputationRegistry.sol # Feedback system
│   ├── Verifier.sol          # Groth16 verifier (portfolio, generated)
│   ├── RebalancerVerifier.sol # Groth16 verifier (ZyFI, generated)
│   └── interfaces/           # Contract interfaces
├── frontend/
│   ├── app/
│   │   ├── api/              # Next.js API routes
│   │   │   ├── generate-proof/
│   │   │   ├── validate-proof/
│   │   │   ├── store-proof/
│   │   │   └── load-input/
│   │   └── page.tsx          # Main workflow page
│   ├── components/           # React components
│   │   ├── opportunity-input-form.tsx
│   │   └── step-card.tsx
│   └── lib/
│       ├── workflow-executor.ts  # ⭐ Core step logic
│       ├── contracts.ts          # Contract configs
│       └── constants.ts          # Network configs
├── tests/e2e/
│   └── test-zk-rebalancing-workflow.ts  # ⭐ E2E test (reference)
├── build/                    # ZK artifacts
│   ├── rebalancing.r1cs      # Portfolio circuit (r1cs, wasm, zkey)
│   ├── rebalancing_final.zkey
│   ├── rebalancing_js/       # Circom 2.x witness generator
│   └── rebalancer-validation/  # ZyFI circuit artifacts
│       ├── rebalancer-validation.r1cs
│       ├── rebalancer_validation_final.zkey
│       └── rebalancer-validation_js/
├── input/input.json          # Portfolio test data
├── data/                     # Proof storage (SHA-256 hash filenames)
├── validations/              # Validation results storage
├── deployed_contracts.json   # ⭐ Contract addresses (root)
├── CLAUDE.md                 # ⭐ This file (project context)
└── package.json              # Root dependencies
```

## When to Consult What

- **Circuit issues**:
  - Portfolio: `circuits/rebalancing.circom`
  - ZyFI validation: `circuits/rebalancer-validation.circom`
  - Setup: `scripts/setup.sh` and `scripts/setup-rebalancer-validation.sh`
- **Contract issues**: Check `contracts/src/*.sol`, run Foundry tests
- **Verifier issues**:
  - `contracts/src/Verifier.sol` (portfolio, auto-generated)
  - `contracts/src/RebalancerVerifier.sol` (ZyFI, auto-generated)
  - Regenerate with `npm run setup:zkp` or `npm run setup:zkp:rebalancer`
- **Frontend issues**: Check `workflow-executor.ts`, API routes, E2E test
- **Agent issues**:
  - Proof generation: `agents/rebalancer-agent.ts` (dual circuits)
  - Validation: `agents/validator-agent.ts` (auto-detects verifier)
  - Base: `agents/base-agent.ts`
- **State management**: Check `workflow-executor.ts` stateUpdate logic
- **Event extraction**: Check E2E test for reference implementations
- **ZK artifacts**: Check `build/README.md` for detailed documentation

## Key Differences from Typical Projects

1. **Dual ZK circuits**: Portfolio + ZyFI validation (not single circuit)
2. **No ethers.js**: Uses Viem for blockchain interactions
3. **No WalletConnect v2**: Uses Reown AppKit (WalletConnect v3)
4. **No ERC721Enumerable**: IdentityRegistry uses basic ERC721URIStorage
5. **State flows through steps**: Not typical React state management
6. **On-chain validation**: Validator calls Verifier contract, not snarkjs
7. **Event-based agentId**: Must extract from logs, not direct return value
8. **Auto-verifier detection**: ValidatorAgent determines Groth16Verifier vs RebalancerVerifier based on proof type
9. **Dual verifier contracts**: Both deployed and managed separately

## Quick Reference Commands

```bash
# Start local blockchain
npm run anvil

# Setup ZK circuits (after circuit changes)
npm run setup:zkp              # Portfolio rebalancing circuit
npm run setup:zkp:rebalancer   # ZyFI rebalancer validation circuit

# Deploy contracts (new terminal, anvil must be running)
npm run forge:build            # Compile contracts (includes verifiers)
npm run forge:deploy:local     # Deploy to local Anvil
# or
cd contracts && forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
cd .. && ts-node scripts/create-deployed-contracts.ts

# Run E2E test (verifies everything works)
npm run test:e2e

# Start frontend
npm run frontend:dev
# Visit http://localhost:3000

# Check circuit constraints
snarkjs r1cs info build/rebalancing.r1cs
snarkjs r1cs info build/rebalancer-validation/rebalancer-validation.r1cs

# Verify artifacts exist
npm run check:zkp
```

## Most Important Files for Claude Code

When stuck, always check these files in this order:

1. `README.md` - ⭐ Comprehensive project overview and latest documentation
2. `frontend/lib/workflow-executor.ts` - Step execution and state management
3. `tests/e2e/test-zk-rebalancing-workflow.ts` - Reference implementation
4. `agents/rebalancer-agent.ts` - Dual proof generation (portfolio + ZyFI)
5. `agents/validator-agent.ts` - On-chain validation with auto-verifier detection
6. `circuits/rebalancing.circom` - Portfolio rebalancing circuit
7. `circuits/rebalancer-validation.circom` - ZyFI validation circuit
8. `build/README.md` - ⭐ ZK artifacts documentation
9. `contracts/src/IdentityRegistry.sol` - Registration contract ABI
10. `CLAUDE.md` - This file (debugging context)

## Remember

- **Dual circuits**: Portfolio rebalancing + ZyFI validation (separate setup commands)
- **Auto-verifier detection**: ValidatorAgent checks proof type to determine which verifier to use
- **Frontend workflow-executor ≠ Backend agents**: Frontend adapts agent logic for browser
- **Always extract agentIds**: They're required for validation and feedback steps
- **State is immutable**: Each step receives workflowState, returns stateUpdate
- **Events are critical**: AgentIds and hashes come from event logs, not return values
- **Test E2E first**: If E2E passes, frontend integration is the issue
- **Verifier mismatch**: Ensure circuit artifacts match deployed verifier contracts
- **Solidity 0.8.20**: Updated from 0.8.19 (check pragma in contracts)
- **Dual deployed contracts**: Both Groth16Verifier and RebalancerVerifier must be deployed
