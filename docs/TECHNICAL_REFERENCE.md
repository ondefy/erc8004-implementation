# Technical Reference - ZK Rebalancing Proof System

**Complete technical documentation covering architecture, implementation details, and explanations.**

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Agentic Workflow](#agentic-workflow)
3. [Zero-Knowledge Proof System](#zero-knowledge-proof-system)
4. [File Explanations](#file-explanations)
5. [Smart Contracts](#smart-contracts)
6. [TypeScript Implementation](#typescript-implementation)
7. [Circuit Design](#circuit-design)
8. [Security Considerations](#security-considerations)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERC-8004 Registry Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Identity   │  │  Validation  │  │  Reputation  │          │
│  │   Registry   │  │   Registry   │  │   Registry   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼─────────┐   ┌───────▼─────────┐   ┌───────▼─────────┐
│  Rebalancer     │   │   Validator     │   │     Client      │
│     Agent       │   │     Agent       │   │     Agent       │
│  (TypeScript)   │   │  (TypeScript)   │   │  (TypeScript)   │
│                 │   │                 │   │                 │
│ • Creates plan  │   │ • Validates ZK  │   │ • Evaluates     │
│ • Generates ZK  │   │   proofs        │   │   quality       │
│   proof         │   │ • Cryptographic │   │ • Provides      │
│ • Submits for   │   │   verification  │   │   feedback      │
│   validation    │   │ • On-chain      │   │ • Checks        │
│                 │   │   response      │   │   reputation    │
└─────────────────┘   └─────────────────┘   └─────────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  ZK Proof System    │
                    │                     │
                    │ • Circom Circuit    │
                    │ • Groth16 Prover    │
                    │ • SnarkJS Verifier  │
                    └─────────────────────┘
```

### Component Interaction Flow

```
1. Rebalancer creates plan and generates ZK proof
   ↓
2. Rebalancer submits proof hash to ValidationRegistry
   ↓
3. Validator retrieves proof, validates cryptographically
   ↓
4. Validator submits validation response on-chain
   ↓
5. Client evaluates service quality
   ↓
6. Client submits feedback to ReputationRegistry
```

---

## Agentic Workflow

### Agent Roles & Responsibilities

#### 1. Rebalancer Agent (Server Agent)

**Purpose**: Generate zero-knowledge proofs for portfolio rebalancing.

**Key Methods**:

```typescript
class RebalancerAgent extends ERC8004BaseAgent {
  // Create a rebalancing plan
  async createRebalancingPlan(
    oldBalances: string[],
    newBalances: string[],
    prices: string[],
    minAllocationPct: string,
    maxAllocationPct: string
  ): Promise<RebalancingPlan>;

  // Generate ZK proof
  generateZkProof(plan: RebalancingPlan): ProofPackage;

  // Submit for validation
  async requestValidationFromValidator(
    proof: ProofPackage,
    validatorId: bigint
  ): Promise<Hash>;

  // Authorize client feedback
  async authorizeClientFeedback(clientId: bigint): Promise<Hash>;
}
```

**Trust Model**: `["inference-validation", "zero-knowledge"]`

**Workflow**:

1. Receive rebalancing request
2. Create plan with allocation constraints
3. Generate ZK proof hiding actual positions
4. Submit proof hash to ValidationRegistry
5. Authorize client to provide feedback
6. Maintain reputation score

#### 2. Validator Agent

**Purpose**: Validate zero-knowledge proofs cryptographically and logically.

**Key Methods**:

```typescript
class ValidatorAgent extends ERC8004BaseAgent {
  // Validate proof
  async validateProof(
    proofOrHash: ProofPackage | string
  ): Promise<ValidationResult>;

  // Submit validation response
  async submitValidationResponseWithPackage(
    validation: ValidationPackage
  ): Promise<Hash>;
}
```

**Validation Process**:

1. **Structure Verification** (20% weight)

   - Check Groth16 format
   - Verify proof points (pi_a, pi_b, pi_c)
   - Validate public inputs

2. **Cryptographic Verification** (50% weight)

   - Run `snarkjs groth16 verify`
   - Check pairing equations
   - Validate against verification key

3. **Logic Verification** (30% weight)
   - Verify value preservation
   - Check allocation bounds
   - Validate constraints

**Scoring**:

```typescript
overallScore = structureScore * 0.2 + cryptoScore * 0.5 + logicScore * 0.3;
```

#### 3. Client Agent

**Purpose**: Evaluate service quality and provide feedback.

**Key Methods**:

```typescript
class ClientAgent extends ERC8004BaseAgent {
  // Evaluate quality
  evaluateRebalancingQuality(proof: ProofPackage): number;

  // Submit feedback
  submitFeedback(
    serverId: bigint,
    score: number,
    comment: string
  ): FeedbackData;

  // Check reputation
  checkRebalancerReputation(serverId: bigint): ReputationInfo;
}
```

**Quality Evaluation Criteria**:

- Base score: 50
- +15 for ZK proof provided
- +10 for public inputs included
- +15 for rebalancing plan documented
- +10 for allocation analysis
- +10 for well-diversified portfolio (no asset > 50%)

---

## Zero-Knowledge Proof System

### ZK Proof Workflow

```
Input Data → Witness Generation → Proof Generation → Verification
    ↓              ↓                      ↓                ↓
input.json    witness.wtns           proof.json      On-chain
              (via .wasm)         (via .zkey)     (via Verifier.sol)
```

### Circuit Design (`rebalancing.circom`)

**Purpose**: Prove portfolio rebalancing satisfies constraints without revealing positions.

**Private Inputs** (hidden):

```circom
signal input oldBalances[4];  // Current token balances
signal input newBalances[4];  // Proposed balances after rebalancing
signal input prices[4];       // Current token prices
```

**Public Inputs** (visible on-chain):

```circom
signal input totalValueCommitment;  // Total portfolio value
signal input minAllocationPct;      // Minimum allocation per asset (%)
signal input maxAllocationPct;      // Maximum allocation per asset (%)
```

**Constraints Proven**:

1. **Value Preservation**:

   ```circom
   oldTotal === newTotal
   where:
     oldTotal = Σ(oldBalances[i] * prices[i])
     newTotal = Σ(newBalances[i] * prices[i])
   ```

2. **Allocation Bounds**:
   ```circom
   For each asset i:
     allocation[i] = (newBalances[i] * prices[i]) / newTotal * 100
     minAllocationPct ≤ allocation[i] ≤ maxAllocationPct
   ```

### Proof System (Groth16)

**Why Groth16?**

- Constant-size proofs (~200 bytes)
- Fast verification (~250k gas on Ethereum)
- Most efficient for on-chain verification
- Industry standard for ZK-SNARKs

**Trade-offs**:

- Requires trusted setup (Powers of Tau ceremony)
- Circuit-specific proving key
- Not quantum-resistant

**Alternatives** (not used):

- PLONK: Universal setup, larger proofs
- STARKs: No trusted setup, larger proofs, more gas

---

## File Explanations

### Source Files

#### `circuits/rebalancing.circom`

**What**: Zero-knowledge circuit definition  
**Language**: Circom  
**Purpose**: Defines constraints for valid rebalancing  
**Output**: Mathematical proof system

**Key sections**:

```circom
template Rebalancing(n) {
    // Private inputs
    signal input oldBalances[n];
    signal input newBalances[n];
    signal input prices[n];

    // Public inputs
    signal input totalValueCommitment;
    signal input minAllocationPct;
    signal input maxAllocationPct;

    // Constraints...
}
```

#### `agents/base-agent.ts`

**What**: ERC-8004 base functionality  
**Lines**: 373  
**Purpose**: Common agent operations

**Key features**:

- Web3 connection via viem
- Contract ABI loading
- Agent registration
- Validation requests
- Transaction management

#### `agents/rebalancer-agent.ts`

**What**: ZK proof generation service  
**Lines**: 427  
**Purpose**: Create and submit proofs

**Key features**:

- Rebalancing plan creation
- ZK proof generation (via snarkjs)
- Proof submission
- Client authorization

#### `agents/validator-agent.ts`

**What**: Proof validation service  
**Lines**: 459  
**Purpose**: Validate proofs cryptographically

**Key features**:

- Structure verification
- Cryptographic verification (snarkjs)
- Logic validation
- On-chain response submission

#### `agents/client-agent.ts`

**What**: Feedback and reputation  
**Lines**: 306  
**Purpose**: Service quality evaluation

**Key features**:

- Quality assessment
- Feedback submission
- Reputation tracking

### Build Artifacts

#### `build/rebalancing.r1cs`

**What**: Rank-1 Constraint System  
**Created by**: `circom` compiler  
**Format**: Binary constraint system  
**Purpose**: Mathematical representation of circuit

**Structure**:

```
A × B - C = 0
where A, B, C are matrices of constraints
```

#### `build/rebalancing.wasm`

**What**: WebAssembly witness calculator  
**Created by**: `circom` compiler  
**Purpose**: Compute witness from inputs  
**Usage**: `snarkjs wtns calculate`

#### `build/rebalancing_final.zkey`

**What**: Proving key (Groth16)  
**Created by**: `snarkjs` trusted setup  
**Size**: ~50 MB for 4-asset circuit  
**Purpose**: Generate proofs

**Contains**:

- Circuit-specific parameters
- Powers of tau contributions
- Encrypted proving parameters

#### `build/verification_key.json`

**What**: Verification key  
**Format**: JSON  
**Purpose**: Verify proofs (off-chain and on-chain)

**Structure**:

```json
{
  "protocol": "groth16",
  "curve": "bn128",
  "IC": [...],  // Public input commitments
  "vk_alpha_1": [...],
  "vk_beta_2": [...],
  "vk_gamma_2": [...],
  "vk_delta_2": [...]
}
```

#### `build/witness.wtns`

**What**: Witness file  
**Created by**: witness calculator (.wasm)  
**Purpose**: Intermediate values for proof

**Contains**:

- All signal values
- Intermediate computations
- Constraint satisfactions

#### `build/proof.json`

**What**: Generated zero-knowledge proof  
**Created by**: `snarkjs groth16 prove`  
**Size**: ~200 bytes

**Structure**:

```json
{
  "pi_a": ["...", "...", "1"],  // Proof point A
  "pi_b": [[...], [...], ["1", "0"]],  // Proof point B
  "pi_c": ["...", "...", "1"],  // Proof point C
  "protocol": "groth16",
  "curve": "bn128"
}
```

#### `build/public.json`

**What**: Public inputs  
**Format**: JSON array  
**Purpose**: Public signals visible on-chain

**Example**:

```json
["375000", "10", "40", ...]
```

---

## Smart Contracts

### IdentityRegistry.sol

**Purpose**: Agent registration and identity management  
**Standard**: ERC-8004 Identity Registry

**Key Functions**:

```solidity
function newAgent(
    string calldata agentDomain,
    address agentAddress
) external payable returns (uint256 agentId)

function getAgent(uint256 agentId)
    external view returns (AgentInfo memory)

function resolveByAddress(address agentAddress)
    external view returns (AgentInfo memory)
```

**Registration Fee**: 0.005 ETH (burned for spam prevention)

### ValidationRegistry.sol

**Purpose**: Validation workflow management

**Key Functions**:

```solidity
function validationRequest(
    uint256 validatorAgentId,
    uint256 serverAgentId,
    bytes32 dataHash
) external

function validationResponse(
    bytes32 dataHash,
    uint256 response
) external
```

**Events**:

```solidity
event ValidationRequested(
    uint256 indexed validatorAgentId,
    uint256 indexed serverAgentId,
    bytes32 indexed dataHash
);

event ValidationResponse(
    uint256 indexed validatorAgentId,
    bytes32 indexed dataHash,
    uint256 response
);
```

### ReputationRegistry.sol

**Purpose**: Feedback and reputation management

**Key Functions**:

```solidity
function acceptFeedback(
    uint256 clientAgentId,
    uint256 serverAgentId
) external

function submitFeedback(
    uint256 serverAgentId,
    uint256 score,
    string calldata comment
) external
```

### Verifier.sol

**Purpose**: On-chain ZK proof verification  
**Generated by**: `snarkjs zkey export solidityverifier`

**Key Function**:

```solidity
function verifyProof(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[] memory input
) public view returns (bool)
```

**Gas Cost**: ~250k-300k gas per verification

---

## TypeScript Implementation

### Using Viem

**Why Viem?**

- Type-safe web3 interactions
- Optimized bundle size
- Native TypeScript support
- Modern async/await patterns
- Native BigInt support

**Key Patterns**:

```typescript
// Address handling (auto-checksummed)
import { getAddress } from "viem";
const addr = getAddress("0x...");

// ETH parsing/formatting
import { parseEther, formatEther } from "viem";
const amount = parseEther("1.0"); // Returns bigint
const display = formatEther(balance); // Returns string

// Contract reads
const result = await publicClient.readContract({
  address,
  abi,
  functionName: "getAgent",
  args: [agentId],
});

// Contract writes
const hash = await walletClient.writeContract({
  address,
  abi,
  functionName: "newAgent",
  args: [domain, address],
} as any);

await publicClient.waitForTransactionReceipt({ hash });
```

### Type Safety

```typescript
// Strong typing throughout
interface RebalancingPlan {
  oldBalances: string[];
  newBalances: string[];
  prices: string[];
  oldTotalValue: number;
  newTotalValue: number;
  newAllocations: AllocationInfo[];
  minAllocationPct: string;
  maxAllocationPct: string;
  timestamp: number;
  agentId: bigint | null;
  agentDomain: string;
}

// Type-checked addresses
type Address = `0x${string}`;

// Type-checked hashes
type Hash = `0x${string}`;
```

---

## Circuit Design

### Circom Best Practices

**Signal Assignment**:

```circom
signal output c;
c <== a * b;  // Constrained assignment (creates constraint + assigns)
```

**Components**:

```circom
component lessThan = LessThan(32);
lessThan.in[0] <== value;
lessThan.in[1] <== maxValue;
lessThan.out === 1;
```

**Loops** (unrolled at compile time):

```circom
for (var i = 0; i < n; i++) {
    totalValue += balances[i] * prices[i];
}
```

### Constraint Optimization

**Minimize Constraints**:

- Each constraint costs gas on verification
- Use components from circomlib
- Avoid division when possible
- Reuse intermediate signals

**Example Optimization**:

```circom
// Bad: Multiple constraints
signal a;
signal b;
signal c;
a <== x * y;
b <== a + z;
c <== b * w;

// Good: Combined where possible
signal result;
result <== (x * y + z) * w;  // Fewer constraints
```

---

## Security Considerations

### Trusted Setup

**Powers of Tau Ceremony**:

- Used for Groth16 proving key generation
- Requires at least one honest participant
- Public participation increases trust
- Final beacon: randomness from Bitcoin/Ethereum blocks

**Our Setup**:

```bash
# Download Powers of Tau
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau

# Circuit-specific setup
snarkjs groth16 setup circuit.r1cs pot10.ptau circuit_0000.zkey

# Contribute randomness
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey
```

### Privacy Guarantees

**What's Hidden**:

- Old token balances
- New token balances
- Token prices

**What's Public**:

- Total portfolio value
- Min/max allocation percentages
- That rebalancing satisfies constraints

**Zero-Knowledge Property**:

- Verifier learns nothing beyond constraint satisfaction
- Cannot reverse-engineer positions from proof
- Computational soundness (assuming circuit correct)

### Smart Contract Security

**Access Control**:

- Only registered agents can interact
- Registration fee prevents spam
- Feedback requires authorization

**Validation**:

- Input validation on all functions
- Checks-Effects-Interactions pattern
- No reentrancy risks (no external calls)

**Gas Optimization**:

- Minimal storage writes
- Batch operations where possible
- Efficient data structures

---

## Performance Characteristics

### Proof Generation

**Time**: ~5-10 seconds (local machine)  
**Memory**: ~2-4 GB RAM  
**Bottleneck**: Polynomial computations

**Optimization Tips**:

- Use wasm for witness calculation (faster)
- Run proving on server with more RAM
- Consider GPU acceleration for large circuits

### Proof Verification

**On-chain**:

- Gas: ~250k-300k
- Time: 1 block confirmation
- Cost: Varies with gas price

**Off-chain**:

- Time: <100ms
- Memory: ~100 MB
- Free

### Circuit Complexity

**Current Circuit** (4 assets):

- Constraints: ~1000
- Wires: ~2000
- Proof size: ~200 bytes

**Scaling**:

- 10 assets: ~2500 constraints
- 20 assets: ~5000 constraints
- 100 assets: ~25000 constraints

---

## API Reference

### Rebalancer Agent

```typescript
// Initialize
const agent = new RebalancerAgent(domain, privateKey);

// Register
await agent.registerAgent(): Promise<bigint>

// Create plan
await agent.createRebalancingPlan(
  oldBalances, newBalances, prices, minPct, maxPct
): Promise<RebalancingPlan>

// Generate proof
agent.generateZkProof(plan): ProofPackage

// Submit for validation
await agent.requestValidationFromValidator(
  proof, validatorId
): Promise<Hash>

// Authorize feedback
await agent.authorizeClientFeedback(clientId): Promise<Hash>
```

### Validator Agent

```typescript
// Initialize
const agent = new ValidatorAgent(domain, privateKey);

// Validate proof
await agent.validateProof(proofOrHash): Promise<ValidationResult>

// Submit response
await agent.submitValidationResponseWithPackage(
  validation
): Promise<Hash>
```

### Client Agent

```typescript
// Initialize
const agent = new ClientAgent(domain, privateKey);

// Evaluate quality
agent.evaluateRebalancingQuality(proof): number

// Submit feedback
agent.submitFeedback(serverId, score, comment): FeedbackData

// Check reputation
agent.checkRebalancerReputation(serverId): ReputationInfo
```

---

**For setup instructions, see** `docs/GETTING_STARTED.md`
