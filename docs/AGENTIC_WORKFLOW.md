# Agentic Workflow - ZK Rebalancing Proof System

## Overview

This document explains the agentic orchestration integrated into the ZK Rebalancing Proof system, following the **ERC-8004 Trustless Agents** standard. The system demonstrates how AI agents can interact trustlessly using blockchain registries and zero-knowledge proofs for privacy-preserving portfolio rebalancing.

---

## Architecture

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

---

## Agent Roles

### 1. Rebalancer Agent (Server Agent)

**Purpose**: Generates zero-knowledge proofs for portfolio rebalancing operations.

**Responsibilities**:

- Create rebalancing plans with allocation constraints
- Generate ZK proofs that prove compliance without revealing positions
- Submit proofs for validation through ERC-8004 registry
- Authorize client agents to provide feedback
- Maintain service quality and reputation

**Key Methods**:

```python
# Create a rebalancing plan
plan = rebalancer.create_rebalancing_plan(
    old_balances=["1000", "1000", "1000", "750"],
    new_balances=["800", "800", "1200", "950"],
    prices=["100", "100", "100", "100"],
    min_allocation_pct="10",
    max_allocation_pct="40"
)

# Generate zero-knowledge proof
proof_package = rebalancer.generate_zk_proof(plan)

# Submit for validation
tx_hash = rebalancer.submit_proof_for_validation(
    proof_package,
    validator_agent_id
)

# Authorize client feedback
rebalancer.authorize_client_feedback(client_agent_id)
```

**Trust Model**: `["inference-validation", "zero-knowledge"]`

---

### 2. Validator Agent

**Purpose**: Validates zero-knowledge proofs cryptographically and logically.

**Responsibilities**:

- Verify proof structure (Groth16 format)
- Perform cryptographic verification using snarkjs
- Validate rebalancing logic and constraints
- Submit validation responses on-chain
- Store validation records for audit trail

**Validation Criteria**:

1. **Structure Verification (20%)**: Proof format and components
2. **Cryptographic Verification (50%)**: ZK proof validity using elliptic curve pairings
3. **Logic Verification (30%)**: Rebalancing constraints satisfaction

**Key Methods**:

```python
# Validate a proof
result = validator.validate_proof(proof_package)

# Access validation details
is_valid = result['is_valid']
score = result['score']  # 0-100
report = result['validation_package']['validation_report']

# Submit validation response
tx_hash = validator.submit_validation_response(
    result['validation_package']
)
```

**Trust Model**: `["inference-validation", "zero-knowledge", "crypto-economic"]`

---

### 3. Client Agent

**Purpose**: Consumes rebalancing services and provides quality feedback.

**Responsibilities**:

- Evaluate rebalancing service quality
- Provide feedback and ratings
- Check rebalancer reputation
- Request rebalancing services
- Maintain service history

**Key Methods**:

```python
# Evaluate service quality
quality_score = client.evaluate_rebalancing_quality(proof_package)

# Submit feedback
feedback = client.submit_feedback(
    server_agent_id=rebalancer.agent_id,
    score=quality_score,
    comment="Excellent privacy-preserving service"
)

# Check reputation
reputation = client.check_rebalancer_reputation(rebalancer.agent_id)
```

**Trust Model**: `["feedback", "reputation-based"]`

---

## Complete Workflow

### Phase 1: Initialization and Registration

```
1. Initialize Agents
   ├── Rebalancer Agent created with unique domain
   ├── Validator Agent created with unique domain
   └── Client Agent created with unique domain

2. Fund Agents (from Anvil test accounts)
   ├── Rebalancer funded with 0.5 ETH
   ├── Validator funded with 0.5 ETH
   └── Client funded with 0.5 ETH

3. Register Agents on ERC-8004 Identity Registry
   ├── Rebalancer → Agent ID: 1
   ├── Validator → Agent ID: 2
   └── Client → Agent ID: 3
```

### Phase 2: Rebalancing and Proof Generation

```
4. Create Rebalancing Plan
   ├── Define old portfolio: [1000, 1000, 1000, 750] tokens
   ├── Define new portfolio: [800, 800, 1200, 950] tokens
   ├── Set prices: [100, 100, 100, 100]
   ├── Set constraints: min 10%, max 40% allocation
   └── Verify total value preservation: 375,000

5. Generate Zero-Knowledge Proof
   ├── Create circuit input JSON
   ├── Calculate witness using rebalancing.wasm
   ├── Verify witness satisfies constraints
   ├── Generate Groth16 proof using rebalancing_final.zkey
   └── Extract public inputs and proof components
```

### Phase 3: Validation

```
6. Submit Proof for Validation
   ├── Hash proof package (SHA-256)
   ├── Store proof package in data/ directory
   ├── Request validation from Validator Agent
   └── Transaction recorded on ValidationRegistry

7. Validate Zero-Knowledge Proof
   ├── Load proof package from data hash
   ├── Verify proof structure (Groth16 format)
   ├── Cryptographic verification (snarkjs groth16 verify)
   ├── Logic verification (value preservation, allocations)
   └── Calculate overall score: structure(20%) + crypto(50%) + logic(30%)

8. Submit Validation Response
   ├── Store validation package in validations/ directory
   ├── Submit validation score (0-100) on-chain
   └── Transaction recorded on ValidationRegistry
```

### Phase 4: Feedback and Reputation

```
9. Authorize Client Feedback
   ├── Rebalancer authorizes Client to provide feedback
   └── Transaction recorded on ReputationRegistry

10. Client Evaluation
    ├── Evaluate proof quality (ZK proof, public inputs, plan)
    ├── Check allocation diversity
    ├── Assess documentation completeness
    └── Calculate quality score: 0-100

11. Submit Feedback
    ├── Client submits feedback with score and comment
    ├── Feedback stored locally and on-chain
    └── Reputation updated

12. Check Reputation
    ├── Query feedback history for Rebalancer
    ├── Calculate average score
    └── Display reputation metrics
```

---

## Privacy Guarantees

### What Remains Private (Hidden by ZK Proof)

✅ **Private Information**:

- Actual token balances (old and new)
- Token prices
- Individual portfolio positions
- Trading strategies
- Asset allocation percentages (until revealed)

### What Is Public (Visible On-Chain)

📊 **Public Information**:

- Total portfolio value commitment
- Min/max allocation constraints
- Proof validity (yes/no)
- Validation score
- Agent IDs and domains
- Transaction hashes

### Zero-Knowledge Property

The ZK proof proves:

> "I have rebalanced my portfolio such that:
>
> 1. Total value is preserved
> 2. All allocations are within [min%, max%] bounds"

**Without revealing**:

- Which tokens you hold
- How many tokens you have
- What prices you're using
- Your exact allocation percentages

---

## ERC-8004 Integration

### Identity Registry

**Purpose**: Register agents with unique IDs and domains

```solidity
function newAgent(
    string calldata agentDomain,
    address agentAddress
) external payable returns (uint256 agentId)
```

**Usage**:

```python
agent_id = rebalancer.register_agent()
# Returns: Agent ID assigned by registry
```

### Validation Registry

**Purpose**: Manage validation requests and responses

```solidity
function validationRequest(
    uint256 validatorId,
    uint256 serverId,
    bytes32 dataHash
) external

function validationResponse(
    bytes32 dataHash,
    uint256 response
) external
```

**Usage**:

```python
# Request validation
tx_hash = rebalancer.request_validation(validator_id, data_hash)

# Submit validation response
tx_hash = validator.submit_validation_response(data_hash, score)
```

### Reputation Registry

**Purpose**: Manage feedback authorization and submission

```solidity
function acceptFeedback(
    uint256 clientId,
    uint256 serverId
) external
```

**Usage**:

```python
# Authorize feedback
tx_hash = rebalancer.authorize_client_feedback(client_id)

# Client submits feedback (off-chain in this version)
feedback = client.submit_feedback(server_id, score, comment)
```

---

## Trust Models

### 1. Inference-Validation

**How It Works**:

- Rebalancer performs computation (rebalancing plan + ZK proof)
- Validator verifies the computation independently
- Validation results recorded on-chain

**Trust Assumption**: At least one honest validator

### 2. Zero-Knowledge

**How It Works**:

- Rebalancer generates ZK proof of constraint satisfaction
- Proof reveals nothing about private inputs
- Anyone can verify the proof

**Trust Assumption**: Soundness of Groth16 proof system

### 3. Reputation-Based

**How It Works**:

- Clients evaluate service quality
- Feedback accumulates over time
- Reputation influences future service requests

**Trust Assumption**: Honest majority of clients

---

## Security Considerations

### ZK Proof Security

✅ **Strong Guarantees**:

- Cryptographic soundness (Groth16)
- Completeness (valid proofs always verify)
- Zero-knowledge (no information leakage)

⚠️ **Current Limitations**:

- Trusted setup uses test entropy (not production-ready)
- No multi-party computation (MPC) ceremony
- Circuit needs formal security audit

### Smart Contract Security

✅ **Strong Guarantees**:

- Immutable audit trail
- Permission-based operations
- On-chain validation records

⚠️ **Current Limitations**:

- No formal verification of contracts
- Limited access control testing
- No circuit verification on-chain (yet)

### Agent Security

✅ **Strong Guarantees**:

- Private key management
- Transaction signing
- Domain-based identity

⚠️ **Current Limitations**:

- Private keys stored in memory (use HSM in production)
- No key rotation mechanism
- No multi-sig support

---

## Gas Costs

| Operation              | Estimated Gas | Cost (30 gwei) |
| ---------------------- | ------------- | -------------- |
| Agent Registration     | ~200,000      | $0.006         |
| Validation Request     | ~150,000      | $0.0045        |
| Validation Response    | ~120,000      | $0.0036        |
| Feedback Authorization | ~200,000      | $0.006         |
| **Total per Workflow** | **~670,000**  | **~$0.02**     |

_Note: Gas costs are approximate and vary by network conditions_

### On-Chain Proof Verification (Future)

If we add on-chain proof verification:

- Groth16 verification: ~250,000-300,000 gas
- Total cost would increase to ~$0.03 per workflow

---

## Example Use Cases

### 1. Institutional Portfolio Management

**Scenario**: Hedge fund rebalances portfolio while maintaining compliance

**Benefits**:

- Prove compliance with allocation limits to auditors
- Keep actual positions private from competitors
- Maintain audit trail on blockchain
- Build reputation for compliance

### 2. DeFi Vault Rebalancing

**Scenario**: Automated vault rebalances assets across protocols

**Benefits**:

- Prove optimal rebalancing to depositors
- Keep strategy details private
- Trustless validation by third parties
- Transparent performance tracking

### 3. Robo-Advisor Services

**Scenario**: AI agent rebalances client portfolios

**Benefits**:

- Prove adherence to investment policy
- Maintain client privacy
- Demonstrate algorithm quality
- Build service reputation

---

## Running the Demo

### Prerequisites

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Install Circom and SnarkJS
npm install -g circom snarkjs
```

### Quick Start

```bash
# 1. Start local blockchain (in separate terminal)
npm run anvil

# 2. Run complete demo
./run_demo.sh
```

### Step-by-Step

```bash
# 1. Setup ZK proof system
npm run setup:zkp

# 2. Deploy ERC-8004 contracts
npm run forge:deploy:local

# 3. Run end-to-end test
python3 tests/e2e/test_zk_rebalancing_workflow.py
```

---

## File Structure

```
rebalancing-poc-main/
├── agents/                          # Agent implementations
│   ├── __init__.py
│   ├── base_agent.py               # ERC-8004 base functionality
│   ├── rebalancer_agent.py         # ZK proof generation
│   ├── validator_agent.py          # ZK proof validation
│   └── client_agent.py             # Feedback and reputation
│
├── circuits/
│   └── rebalancing.circom          # ZK circuit definition
│
├── contracts/                       # Solidity smart contracts
│   ├── src/
│   │   ├── IdentityRegistry.sol
│   │   ├── ValidationRegistry.sol
│   │   ├── ReputationRegistry.sol
│   │   └── Verifier.sol            # ZK proof verifier
│   └── script/
│       └── Deploy.s.sol
│
├── tests/
│   └── e2e/
│       └── test_zk_rebalancing_workflow.py
│
├── docs/
│   ├── FILE_EXPLANATION.md         # Detailed file documentation
│   └── AGENTIC_WORKFLOW.md         # This file
│
├── build/                           # ZK proof artifacts
│   ├── rebalancing.r1cs
│   ├── rebalancing.wasm
│   ├── rebalancing_final.zkey
│   ├── verification_key.json
│   └── ...
│
├── data/                            # Proof packages (temporary)
├── validations/                     # Validation results (temporary)
├── run_demo.sh                      # Demo runner
└── requirements.txt                 # Python dependencies
```

---

## API Reference

### RebalancerAgent

```python
class RebalancerAgent(ERC8004BaseAgent):
    def create_rebalancing_plan(
        old_balances: List[str],
        new_balances: List[str],
        prices: List[str],
        min_allocation_pct: str = "10",
        max_allocation_pct: str = "40"
    ) -> Dict[str, Any]

    def generate_zk_proof(
        rebalancing_plan: Dict[str, Any]
    ) -> Dict[str, Any]

    def submit_proof_for_validation(
        proof_package: Dict[str, Any],
        validator_agent_id: int
    ) -> str

    def authorize_client_feedback(
        client_agent_id: int
    ) -> str
```

### ValidatorAgent

```python
class ValidatorAgent(ERC8004BaseAgent):
    def validate_proof(
        data_hash: Union[str, Dict[str, Any]]
    ) -> Dict[str, Any]

    def submit_validation_response(
        validation_package: Dict[str, Any]
    ) -> str
```

### ClientAgent

```python
class ClientAgent(ERC8004BaseAgent):
    def evaluate_rebalancing_quality(
        proof_package: Dict[str, Any]
    ) -> int

    def submit_feedback(
        server_agent_id: int,
        score: int,
        comment: str = ""
    ) -> Dict[str, Any]

    def check_rebalancer_reputation(
        server_agent_id: int
    ) -> Dict[str, Any]
```

---

## Future Enhancements

### Short Term

- [ ] Add on-chain proof verification (deploy Verifier.sol)
- [ ] Implement TEE-based key management
- [ ] Add more complex rebalancing strategies
- [ ] Support variable portfolio sizes
- [ ] Add range check circuits for allocations

### Medium Term

- [ ] Integrate with actual DeFi protocols
- [ ] Build web UI for agent interaction
- [ ] Add multi-signature validation
- [ ] Implement agent reputation scoring on-chain
- [ ] Support multiple validator consensus

### Long Term

- [ ] Production-ready MPC ceremony for trusted setup
- [ ] Formal verification of circuits and contracts
- [ ] Cross-chain agent interoperability
- [ ] AI-powered rebalancing strategies
- [ ] Decentralized agent marketplace

---

## References

- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [Circom Documentation](https://docs.circom.io/)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Web3.py Documentation](https://web3py.readthedocs.io/)

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**License**: MIT
