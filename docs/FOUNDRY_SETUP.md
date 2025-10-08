# Foundry Integration Guide

This project combines ZK proofs (Circom) with ERC-8004 smart contracts (Foundry).

## Project Structure

```
rebalancing-zkp/
├── circuits/              # Circom ZK circuits
│   └── rebalancing.circom
├── build/                 # ZK proof build artifacts (gitignored)
├── contracts/             # Foundry project
│   ├── src/              # Solidity contracts
│   │   ├── ValidationRegistry.sol    # ERC-8004 validation registry
│   │   ├── ReputationRegistry.sol    # Reputation tracking
│   │   ├── IdentityRegistry.sol      # Identity management
│   │   ├── Verifier.sol              # ZK proof verifier (generated)
│   │   └── interfaces/               # Contract interfaces
│   ├── script/           # Deployment scripts
│   │   └── Deploy.s.sol
│   ├── test/             # Foundry tests
│   ├── foundry.toml      # Foundry config
│   ├── out/              # Compiled contracts (gitignored)
│   ├── cache/            # Build cache (gitignored)
│   └── lib/              # Dependencies (gitignored)
├── scripts/              # Helper scripts
│   ├── setup.sh          # ZK setup
│   └── generate-proof.sh # Proof generation
└── input/                # Test inputs
    └── input.json
```

## Prerequisites

### Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:

```bash
forge --version
cast --version
anvil --version
```

### Install Circom & SnarkJS

```bash
npm install -g circom snarkjs
```

## Quick Start

### 1. Setup ZK System (First Time)

```bash
npm run setup:zkp
```

This generates:

- Circuit compilation artifacts
- Powers of Tau ceremony
- Proving/verification keys
- Solidity verifier contract

### 2. Build Contracts

```bash
npm run forge:build
```

### 3. Run Tests

```bash
npm test
```

## Development Workflow

### Local Testing

```bash
# Terminal 1: Start local blockchain
npm run anvil

# Terminal 2: Deploy contracts
npm run forge:deploy:local

# Test proof generation
npm run proof:generate
```

### Testnet Deployment

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 2. Deploy to Sepolia
npm run forge:deploy:sepolia
```

## Smart Contract Architecture

### ValidationRegistry (ERC-8004)

Main registry contract for validation requests and responses.

**Key Functions:**

- `submitValidation()` - Submit validation request
- `validateAndRespond()` - Agent submits ZK proof
- `getValidation()` - Query validation status

### Verifier

Auto-generated Groth16 verifier from Circom circuit.

**Usage:**

```solidity
function verifyProof(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[16] memory input
) public view returns (bool)
```

### Integration Flow

1. **User** → Submits validation request to `ValidationRegistry`
2. **Agent** → Generates ZK proof off-chain (`npm run proof:generate`)
3. **Agent** → Submits proof to `ValidationRegistry.validateAndRespond()`
4. **Registry** → Calls `Verifier.verifyProof()` to validate
5. **Registry** → Emits `ValidationResponse` event
6. **ReputationRegistry** → Updates agent reputation

## Common Commands

### Building & Testing

```bash
# Build contracts
npm run forge:build

# Run tests
npm test

# Run specific test
cd contracts && forge test --match-test testValidation -vvv

# Gas report
cd contracts && forge test --gas-report
```

### Deployment

```bash
# Deploy to local Anvil
npm run forge:deploy:local

# Deploy to Sepolia
npm run forge:deploy:sepolia

# Deploy to mainnet (caution!)
npm run forge:deploy:mainnet
```

### Proof Generation

```bash
# Generate proof
npm run proof:generate

# Verify proof off-chain
npm run proof:verify

# Get Solidity calldata
npm run proof:calldata
```

### Cleanup

```bash
# Clean ZK artifacts
npm run clean:zkp

# Clean Foundry artifacts
npm run forge:clean

# Clean everything
npm run clean
```

## Environment Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

Required variables:

```bash
# RPC endpoint
RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Deployer private key
PRIVATE_KEY=0x...

# For contract verification
ETHERSCAN_API_KEY=YOUR_KEY
```

## Contract Verification

After deployment, verify on Etherscan:

```bash
cd contracts
forge verify-contract \
  --chain-id 11155111 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor()") \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --compiler-version v0.8.19 \
  $CONTRACT_ADDRESS \
  src/ValidationRegistry.sol:ValidationRegistry
```

## Testing Tips

### Unit Tests

```bash
# Run all tests
npm test

# Run with verbosity
cd contracts && forge test -vvv

# Run specific test file
cd contracts && forge test --match-path test/ValidationRegistry.t.sol

# Run specific test function
cd contracts && forge test --match-test testSubmitValidation
```

### Coverage

```bash
cd contracts
forge coverage
```

### Gas Snapshots

```bash
cd contracts
forge snapshot
```

## Updating Verifier Contract

When you update the Circom circuit:

```bash
# 1. Recompile circuit
npm run circuit:compile

# 2. Regenerate setup
npm run setup:zkp

# 3. Export new verifier
npm run verifier:export

# 4. Rebuild contracts
npm run forge:build

# 5. Test
npm test
```

## Debugging

### Failed Proof Verification

```bash
# Check proof is valid off-chain first
npm run proof:verify

# Generate calldata for testing
npm run proof:calldata
```

### Contract Issues

```bash
# Use verbose logging
cd contracts && forge test -vvvv

# Debug specific transaction
cd contracts && forge test --debug testValidation
```

### Gas Estimation

```bash
cd contracts
forge test --gas-report
```

## Production Checklist

Before mainnet deployment:

- [ ] Circuit audited by ZK security firm
- [ ] Smart contracts audited
- [ ] Proper MPC ceremony for trusted setup
- [ ] Test on testnet extensively
- [ ] Gas optimization reviewed
- [ ] Verify all contracts on Etherscan
- [ ] Setup monitoring and alerts
- [ ] Document deployment addresses
- [ ] Prepare upgrade path (if using proxies)

## Useful Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Repository](https://github.com/iden3/snarkjs)

## Troubleshooting

### "forge: command not found"

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### "lib not found"

```bash
cd contracts
forge install foundry-rs/forge-std
```

### Deployment fails

- Check `.env` has correct values
- Ensure wallet has testnet ETH
- Verify RPC URL is accessible

### Test failures

- Run `npm run forge:build` first
- Check gas limits
- Verify proof inputs match circuit

## Support

For issues:

1. Check `NPM_SCRIPTS.md` for command reference
2. Review `README.md` for setup instructions
3. See Foundry docs for contract development
4. Open GitHub issue with full error logs
