# NPM Scripts Reference

Streamlined commands for ZK proof generation and Foundry contract management.

## 🚀 Quick Start

```bash
# 1. Setup ZK proof system (first time only)
npm run setup:zkp

# 2. Build Foundry contracts
npm run forge:build

# 3. Run tests
npm test

# 4. Generate a proof
npm run proof:generate
```

---

## 📁 Project Structure

This project combines:

- **ZK Circuits** (Circom + Groth16) → `circuits/`, `build/`
- **ERC-8004 Contracts** (Foundry) → `contracts/`
- **Integration** → Verifier contract links both systems

---

## 🔐 ZK Proof Commands

### `npm run setup:zkp`

Complete ZK proof system setup (run once):

- Compiles circuit
- Runs Powers of Tau ceremony
- Generates proving/verification keys
- Exports Solidity verifier

```bash
npm run setup:zkp
```

**Output**: All files in `build/` directory

---

### `npm run circuit:compile`

Compile Circom circuit to R1CS and WASM.

```bash
npm run circuit:compile
```

**Output**: `build/rebalancing.{r1cs,wasm,sym}`

---

### `npm run circuit:info`

Display circuit statistics.

```bash
npm run circuit:info
```

**Shows**: Constraints, wires, inputs, outputs

---

### `npm run proof:generate`

Generate ZK proof with formatted output.

```bash
npm run proof:generate
```

**Requires**: Valid `input/input.json`
**Output**: `build/proof.json`, `build/public.json`

---

### `npm run proof:verify`

Verify a generated proof.

```bash
npm run proof:verify
```

**Result**: `OK!` or `Invalid proof`

---

### `npm run verifier:export`

Export Solidity verifier contract.

```bash
npm run verifier:export
```

**Output**: `contracts/src/Verifier.sol`

---

## 🔨 Foundry Commands

### `npm run forge:build`

Compile all Solidity contracts.

```bash
npm run forge:build
```

**Output**: `contracts/out/`

---

### `npm run forge:test` (or `npm test`)

Run all Foundry tests.

```bash
npm test
# or
npm run forge:test
```

**Shows**: Test results with -vvv verbosity

---

### `npm run forge:deploy:local`

Deploy contracts to local Anvil instance.

```bash
# Terminal 1: Start Anvil
npm run anvil

# Terminal 2: Deploy
npm run forge:deploy:local
```

**Output**: Deployed contract addresses

---

### `npm run forge:deploy:sepolia`

Deploy contracts to Sepolia testnet with verification.

```bash
npm run forge:deploy:sepolia
```

**Requires**: `.env` with `PRIVATE_KEY`, `RPC_URL_SEPOLIA`, `ETHERSCAN_API_KEY`

---

### `npm run anvil`

Start local Ethereum node (Foundry's Anvil).

```bash
npm run anvil
```

**URL**: http://127.0.0.1:8545

---

### `npm run forge:clean`

Remove Foundry build artifacts.

```bash
npm run forge:clean
```

**Removes**: `contracts/out/`, `contracts/cache/`

---

## 🧹 Cleanup Commands

### `npm run clean:zkp`

Remove ZK build artifacts only.

```bash
npm run clean:zkp
```

**Keeps**: Powers of Tau and zkey files (for reuse)

---

### `npm run clean`

Full cleanup: ZK + Foundry artifacts.

```bash
npm run clean
```

**Use case**: Fresh build from scratch

---

## 📊 Common Workflows

### 1. First Time Setup

```bash
# Install dependencies
npm install

# Setup ZK system
npm run setup:zkp

# Build contracts
npm run forge:build

# Run tests
npm test
```

---

### 2. Generate and Verify Proof

```bash
# Edit input/input.json with your data
# Then generate proof
npm run proof:generate

# Verify it
npm run proof:verify
```

---

### 3. Deploy to Testnet

```bash
# 1. Create .env from .env.example
cp .env.example .env

# 2. Add your private key and RPC URL to .env

# 3. Deploy
npm run forge:deploy:sepolia
```

---

### 4. Local Development & Testing

```bash
# Terminal 1: Start local chain
npm run anvil

# Terminal 2: Deploy contracts
npm run forge:deploy:local

# Run tests
npm test
```

---

### 5. Update Circuit

```bash
# 1. Edit circuits/rebalancing.circom

# 2. Recompile and regenerate verifier
npm run circuit:compile
npm run setup:zkp  # Regenerates keys
npm run verifier:export

# 3. Rebuild contracts with new verifier
npm run forge:build

# 4. Test
npm test
```

---

## 🔍 Environment Setup

### Create `.env` file

```bash
cp .env.example .env
```

### Required Variables

```bash
# For testnet deployment
PRIVATE_KEY=your_private_key_here
RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_key
```

---

## 💡 Pro Tips

1. **Run `npm run setup:zkp` only once** - Powers of Tau takes time
2. **Use `npm test`** - Runs Foundry tests (faster than ZK proof)
3. **Local development**: Use `npm run anvil` for instant feedback
4. **Always test proofs** before deploying verifier updates
5. **Keep `.env` secret** - Never commit it!

---

## 🆘 Troubleshooting

### "forge: command not found"

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### "circom: command not found"

```bash
npm install -g circom
```

### "Invalid proof"

1. Check `input/input.json` satisfies constraints
2. Regenerate proof: `npm run proof:generate`
3. If still failing: `npm run setup:zkp`

### "Insufficient funds" (deployment)

- Add testnet ETH to your wallet
- Sepolia faucet: https://sepoliafaucet.com/

### Anvil connection refused

- Make sure Anvil is running: `npm run anvil`
- Check URL: http://127.0.0.1:8545

---

## 📚 More Information

- **ZK Circuits**: See `circuits/rebalancing.circom`
- **ERC-8004 Contracts**: See `contracts/src/`
- **Deployment Scripts**: See `contracts/script/`
- **Main Documentation**: See `README.md`

---

## 🎯 Script Summary

| Command                      | Purpose          | Time    |
| ---------------------------- | ---------------- | ------- |
| `npm run setup:zkp`          | Setup ZK system  | ~2 min  |
| `npm run circuit:compile`    | Compile circuit  | ~5 sec  |
| `npm run proof:generate`     | Generate proof   | ~5 sec  |
| `npm run forge:build`        | Build contracts  | ~10 sec |
| `npm test`                   | Run tests        | ~5 sec  |
| `npm run forge:deploy:local` | Deploy locally   | ~5 sec  |
| `npm run anvil`              | Start local node | -       |

---

**Note**: This is a streamlined version. For the full list of available Forge commands, run `forge --help` or see [Foundry Book](https://book.getfoundry.sh/).
