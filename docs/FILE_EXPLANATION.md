# ZK Rebalancing Proof System - File Explanation

## Overview

This document explains the purpose of each file in the ZK rebalancing proof system and how they work together to create zero-knowledge proofs for portfolio rebalancing validation.

## The ZK Proof Workflow

```
Input Data → Witness Generation → Proof Generation → On-Chain Verification
    ↓              ↓                      ↓                    ↓
input.json    witness.wtns           proof.json          Verifier.sol
              (rebalancing.wasm)  (rebalancing_final.zkey)
```

---

## Source Files

### `circuits/rebalancing.circom`
**Purpose**: The zero-knowledge circuit definition  
**When Created**: Manually written by developers  
**What It Does**:
- Defines the mathematical constraints for valid rebalancing
- Specifies private inputs (balances, prices) and public inputs (constraints)
- Proves that:
  1. Total portfolio value is preserved
  2. New allocations are within min/max bounds
- Acts as the "source code" for your zero-knowledge proof

**Key Concepts**:
- **Signals**: Variables in the circuit (like inputs, outputs, intermediates)
- **Constraints**: Mathematical rules that must be satisfied
- **Components**: Reusable circuit building blocks

---

### `input/input.json`
**Purpose**: Test data for proof generation  
**When Created**: Before generating a proof  
**What It Contains**:
```json
{
  "oldBalances": ["1000", "1000", "1000", "750"],    // Private
  "newBalances": ["800", "800", "1200", "950"],     // Private
  "prices": ["100", "100", "100", "100"],           // Private
  "totalValueCommitment": "375000",                 // Public
  "minAllocationPct": "10",                         // Public
  "maxAllocationPct": "40"                          // Public
}
```

**Important Notes**:
- All values must be strings (for large number support)
- Private inputs are hidden in the final proof
- Public inputs are visible on-chain

---

## Build Artifacts

### `build/rebalancing.r1cs`
**Purpose**: Rank-1 Constraint System  
**Created By**: `circom` compiler  
**What It Is**:
- A mathematical representation of your circuit
- Converts circuit logic into polynomial constraints
- Format: Matrices A, B, C where A×B - C = 0

**When It's Used**:
- Trusted setup phase
- Witness verification
- Debugging constraints

**Example**: For the constraint `signal c <== a * b`, it creates:
```
a · b - c = 0
```

---

### `build/rebalancing.wasm`
**Purpose**: WebAssembly executable circuit  
**Created By**: `circom` compiler  
**What It Does**:
- Takes input.json and computes all intermediate signals
- Generates witness.wtns file
- Runs in Node.js or browser

**Why WebAssembly?**:
- Fast execution
- Cross-platform compatibility
- Secure sandboxed environment

---

### `build/rebalancing.sym`
**Purpose**: Symbol table for debugging  
**Created By**: `circom` compiler  
**What It Contains**:
- Mapping of signal names to constraint numbers
- Human-readable labels for debugging

**Example**:
```
0,0,0,main.oldBalances[0]
1,0,1,main.oldBalances[1]
...
```

---

## Trusted Setup Files

### `build/pot8_final.ptau`
**Purpose**: Powers of Tau ceremony output  
**Created By**: `snarkjs powersoftau` command  
**What It Is**:
- Universal trusted setup parameters for Groth16
- Contains cryptographic "toxic waste" parameters
- Can be reused across multiple circuits

**Security**:
- For production, use multi-party computation (MPC) ceremony
- Current version is for testing only
- "8" means supports circuits with up to 2^8 = 256 constraints

---

### `build/rebalancing_final.zkey`
**Purpose**: Circuit-specific proving key  
**Created By**: `snarkjs groth16 setup` + `snarkjs zkey contribute`  
**What It Contains**:
- Combines Powers of Tau with your specific circuit
- Used to generate proofs for THIS circuit only
- Contains evaluation of circuit at secret point

**Size**: Proportional to circuit complexity

---

### `build/verification_key.json`
**Purpose**: Public verification key  
**Created By**: `snarkjs zkey export verificationkey`  
**What It Contains**:
```json
{
  "protocol": "groth16",
  "curve": "bn128",
  "nPublic": 15,
  "vk_alpha_1": [...],
  "vk_beta_2": [...],
  "vk_gamma_2": [...],
  "vk_delta_2": [...],
  "IC": [...]
}
```

**Used For**:
- Off-chain proof verification
- Generating Solidity verifier contract
- Anyone can verify proofs with this key

---

## Runtime Files

### `build/witness.wtns`
**Purpose**: Computed witness values  
**Created By**: `snarkjs wtns calculate` (using rebalancing.wasm)  
**What It Contains**:
- All signal values computed from your inputs
- Both public and private values
- Binary format for efficiency

**Lifecycle**:
1. Input.json → rebalancing.wasm → witness.wtns
2. witness.wtns + rebalancing_final.zkey → proof.json
3. witness.wtns is discarded (contains private data!)

**⚠️ Security**: Never share witness files - they contain your private inputs!

---

### `build/proof.json`
**Purpose**: The zero-knowledge proof  
**Created By**: `snarkjs groth16 prove`  
**What It Contains**:
```json
{
  "pi_a": [x, y, z],      // Proof component A
  "pi_b": [[x,y], [x,y]], // Proof component B  
  "pi_c": [x, y, z],      // Proof component C
  "protocol": "groth16",
  "curve": "bn128"
}
```

**Properties**:
- Constant size (~200 bytes)
- Reveals nothing about private inputs
- Can be publicly verified
- Cryptographically binds to public inputs

---

### `build/public.json`
**Purpose**: Public input signals  
**Created By**: Extracted during proof generation  
**What It Contains**:
```json
[
  "375000",  // totalValueCommitment
  "10",      // minAllocationPct
  "40",      // maxAllocationPct
  // ... other public signals
]
```

**Used For**:
- On-chain verification alongside proof
- Public transparency
- Input to verifyProof() function

---

## Smart Contract

### `contracts/src/Verifier.sol`
**Purpose**: On-chain proof verifier  
**Created By**: `snarkjs zkey export solidityverifier`  
**What It Does**:
- Verifies Groth16 proofs on Ethereum
- Implements elliptic curve pairing checks
- Acts as AgentValidatorID in ERC-8004

**Main Function**:
```solidity
function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[15] calldata _pubSignals
) public view returns (bool)
```

**Gas Cost**: ~250k-300k gas per verification

---

## Complete Workflow

### 1. Development Phase
```
Write circuits/rebalancing.circom
    ↓
Compile: circom → generates .r1cs, .wasm, .sym
    ↓
Trusted Setup: snarkjs powersoftau + groth16 setup
    ↓
Export Verifier: snarkjs → Verifier.sol
```

### 2. Proof Generation Phase
```
Create input/input.json with rebalancing data
    ↓
Generate witness: wasm + input.json → witness.wtns
    ↓
Generate proof: zkey + witness → proof.json + public.json
```

### 3. Verification Phase
```
Off-chain: snarkjs groth16 verify (testing)
    ↓
On-chain: Verifier.sol.verifyProof() (production)
```

---

## ERC-8004 Integration

### How Files Map to ERC-8004 Roles

| ERC-8004 Component | File/Component |
|-------------------|----------------|
| **AgentValidatorID** | `Verifier.sol` deployed contract |
| **AgentServerID** | Off-chain proof generation service |
| **DataHash** | Circuit output `dataHash` signal |
| **ValidationResponse** | Event emitted by Verifier |

### Trust Model: "inference-validation"

1. **Server Agent** generates rebalancing proof
2. **Validator Agent** (Verifier.sol) validates proof on-chain
3. **Client Agent** provides feedback on rebalancing quality
4. All interactions recorded on blockchain

---

## File Sizes (Approximate)

| File | Typical Size | Grows With |
|------|--------------|------------|
| `rebalancing.circom` | 2-5 KB | Circuit complexity |
| `rebalancing.r1cs` | 1-10 KB | Constraints |
| `rebalancing.wasm` | 50-200 KB | Circuit size |
| `pot8_final.ptau` | 2-20 MB | Power (2^n) |
| `rebalancing_final.zkey` | 1-5 MB | Constraints |
| `verification_key.json` | 1-5 KB | Public inputs |
| `witness.wtns` | 10-100 KB | Signals |
| `proof.json` | ~1 KB | Constant (Groth16) |
| `Verifier.sol` | 10-30 KB | Public inputs |

---

## Common Operations

### View Circuit Information
```bash
snarkjs r1cs info build/rebalancing.r1cs
# Shows: constraints, wires, private inputs, public inputs, labels
```

### Verify Witness is Valid
```bash
snarkjs wtns check build/rebalancing.r1cs build/witness.wtns
# Confirms witness satisfies all constraints
```

### Debug Circuit
```bash
snarkjs r1cs print build/rebalancing.r1cs build/rebalancing.sym
# Human-readable constraint printout
```

### Export Verification Key
```bash
snarkjs zkey export verificationkey build/rebalancing_final.zkey build/verification_key.json
```

---

## Security Considerations

### ⚠️ Files to NEVER Share (Contain Private Data)
- `witness.wtns` - Contains all your private inputs
- `input/input.json` - Contains your balances and prices (if private)

### ✅ Files Safe to Share (Public Data)
- `proof.json` - The zero-knowledge proof
- `public.json` - Public inputs
- `verification_key.json` - Verification parameters
- `Verifier.sol` - Verifier contract

### 🔒 Files to Protect (Setup Secrets)
- `pot8_final.ptau` - If you generated it (contains randomness)
- `rebalancing_final.zkey` - Contains circuit-specific secrets

**Production Requirements**:
1. Multi-party Powers of Tau ceremony
2. Secure key contribution process
3. Destroy intermediate toxic waste
4. Audit all circuits before deployment

---

## Troubleshooting

### "Constraint doesn't match"
- **Cause**: Input values don't satisfy circuit constraints
- **Fix**: Check your input.json values, ensure total value is preserved

### "Error loading *.ptau"
- **Cause**: Missing or corrupted Powers of Tau file
- **Fix**: Re-run the trusted setup: `npm run setup:zkp`

### "Invalid proof"
- **Cause**: Mismatch between proof and public inputs
- **Fix**: Ensure public.json matches the proof generation

### "Out of gas" on Verifier.sol
- **Cause**: Too many public inputs or complex pairing
- **Fix**: Reduce public inputs, optimize circuit

---

## Further Reading

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Guide](https://github.com/iden3/snarkjs)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [ZK Proof Tutorial](https://zokrates.github.io/)

---

**Last Updated**: October 2025  
**Circuit Version**: 1.0.0  
**Circom Version**: 1.x (0.5.46)


