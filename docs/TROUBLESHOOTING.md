# Troubleshooting Guide

Common issues and their solutions for the ZK Rebalancing Proof system.

---

## Installation Issues

### ❌ Error: "forge-std/Script.sol" not found

**Symptom**:

```
Error (6275): Source "forge-std/Script.sol" not found
ParserError: Source "forge-std/Script.sol" not found
```

**Cause**: The `forge-std` library is not installed in `contracts/lib/`

**Solution**:

```bash
# Option 1: Use npm script (recommended)
npm run setup:forge

# Option 2: Manual installation
cd contracts
mkdir -p lib
cd lib
git clone https://github.com/foundry-rs/forge-std.git
cd ../..

# Option 3: If you have forge command working
cd contracts
forge install foundry-rs/forge-std --no-commit
```

**Prevention**: The `run_demo.sh` script now automatically checks and installs this.

---

### ❌ Error: "forge: command not found"

**Symptom**:

```bash
bash: forge: command not found
```

**Cause**: Foundry is not installed or not in PATH

**Solution**:

```bash
# Step 1: Install Foundry (if not installed)
curl -L https://foundry.paradigm.xyz | bash

# Step 2: Add to PATH (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.foundry/bin:$PATH"

# Step 3: Source your shell config
source ~/.zshrc  # or source ~/.bashrc

# Step 4: Install Foundry tools
foundryup
```

**Note**: If Anvil is running, you'll need to stop it first before running `foundryup`.

**Alternative**: All npm scripts now automatically add Foundry to PATH:

```bash
npm run forge:build
npm run forge:test
npm run forge:deploy:local
```

---

### ❌ Error: "foundryup: Error: 'anvil' is currently running"

**Symptom**:

```
foundryup: Error: 'anvil' is currently running. Please stop the process and try again.
```

**Cause**: Trying to install/update Foundry while Anvil is running

**Solution**:

```bash
# Option 1: Stop Anvil in the other terminal (Ctrl+C)

# Option 2: Kill Anvil process
pkill anvil

# Then run foundryup again
foundryup
```

**Note**: You can skip `foundryup` if forge/anvil are already working.

---

## ZK Proof Issues

### ❌ Error: "snarkjs: command not found"

**Symptom**:

```bash
bash: snarkjs: command not found
```

**Cause**: SnarkJS is not installed globally

**Solution**:

```bash
npm install -g snarkjs
```

**Verification**:

```bash
snarkjs --version
# Should show: snarkjs@0.7.5 or similar
```

---

### ❌ Error: "Witness check failed"

**Symptom**:

```
❌ Witness check failed - inputs don't satisfy constraints
```

**Cause**: Input values don't satisfy the circuit constraints

**Solution**:

1. **Check total value preservation**:

   ```python
   old_total = sum(old_balances[i] * prices[i])
   new_total = sum(new_balances[i] * prices[i])
   # These MUST be equal!
   ```

2. **Check allocation bounds**:

   ```python
   for each asset:
       allocation_pct = (balance * price) / total_value * 100
       # Must be: min_pct <= allocation_pct <= max_pct
   ```

3. **Example valid input**:
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

---

### ❌ Error: "build/rebalancing_final.zkey not found"

**Symptom**:

```
Error: ENOENT: no such file or directory, open 'build/rebalancing_final.zkey'
```

**Cause**: ZK setup (trusted setup) hasn't been run

**Solution**:

```bash
npm run setup:zkp
```

This will:

1. Compile the circuit
2. Run Powers of Tau ceremony
3. Generate proving and verification keys

**Time**: Takes about 2-3 minutes on first run.

---

## Python/Agent Issues

### ❌ Error: "No module named 'web3'"

**Symptom**:

```python
ModuleNotFoundError: No module named 'web3'
```

**Cause**: Python dependencies not installed

**Solution**:

```bash
pip install -r requirements.txt

# Or install manually:
pip install web3>=6.0.0 python-dotenv>=1.0.0
```

---

### ❌ Error: "Failed to connect to blockchain"

**Symptom**:

```python
ConnectionError: Failed to connect to http://127.0.0.1:8545
```

**Cause**: Anvil (local blockchain) is not running

**Solution**:

```bash
# In a separate terminal:
npm run anvil

# Or:
export PATH="$HOME/.foundry/bin:$PATH"
anvil
```

**Verification**:

```bash
curl http://localhost:8545
# Should return: {"jsonrpc":"2.0","id":null,"result":"Anvil/v0.2.0"}
```

---

### ❌ Error: "deployed_contracts.json not found"

**Symptom**:

```
FileNotFoundError: deployed_contracts.json not found
```

**Cause**: Contracts haven't been deployed

**Solution**:

```bash
# Make sure Anvil is running first!
npm run forge:deploy:local
```

This creates `deployed_contracts.json` with contract addresses.

---

### ❌ Error: "Insufficient balance"

**Symptom**:

```python
ValueError: Insufficient balance. Have 0 ETH, need at least 0.01 ETH
```

**Cause**: Agent account has no ETH (usually in tests)

**Solution**:
In tests, agents are funded automatically. If running manually:

```python
# Fund agent from Anvil's default accounts
from web3 import Web3
w3 = Web3(Web3.HTTPProvider('http://localhost:8545'))

# Send ETH to agent
tx = {
    'from': w3.eth.accounts[0],  # Anvil account
    'to': agent.address,
    'value': w3.to_wei(0.5, 'ether'),
    'gas': 21000,
    'gasPrice': w3.eth.gas_price
}
w3.eth.send_transaction(tx)
```

---

## Contract Deployment Issues

### ❌ Error: "Error (6275): Source not found"

**Symptom**:

```
Error (6275): Source "contracts/..." not found
```

**Cause**: Missing Solidity dependencies or incorrect remappings

**Solution**:

1. **Ensure forge-std is installed** (see above)
2. **Check foundry.toml**:

   ```toml
   [profile.default]
   src = "src"
   out = "out"
   libs = ["lib"]
   ```

3. **Rebuild**:
   ```bash
   npm run forge:clean
   npm run forge:build
   ```

---

### ❌ Error: "Transaction reverted"

**Symptom**:

```
Error: Transaction reverted without a reason string
```

**Possible Causes & Solutions**:

1. **Not enough ETH for registration fee**:

   ```python
   # Registration requires 0.005 ETH fee + gas
   # Make sure agent has at least 0.01 ETH
   ```

2. **Agent already registered**:

   ```python
   # Check if agent is already registered:
   if agent.agent_id:
       print(f"Already registered: {agent.agent_id}")
   ```

3. **Wrong validator ID**:
   ```python
   # Make sure validator_agent_id exists and is registered
   info = agent.get_agent_info(validator_agent_id)
   ```

---

## Demo Script Issues

### ❌ run_demo.sh Permission Denied

**Symptom**:

```bash
bash: ./run_demo.sh: Permission denied
```

**Solution**:

```bash
chmod +x run_demo.sh
./run_demo.sh
```

---

### ❌ Demo Hangs at "Checking Environment"

**Symptom**:
Script waits indefinitely at "Checking environment..."

**Cause**: Waiting for user to start Anvil

**Solution**:

1. Open a new terminal
2. Run: `npm run anvil`
3. Go back to demo terminal and press Enter

---

## Performance Issues

### ⚠️ Proof Generation is Slow

**Symptom**: `generate_zk_proof()` takes > 30 seconds

**Possible Causes**:

1. **First run**: Circuit compilation and witness generation are slower on first run
2. **Large circuit**: More constraints = slower proof generation
3. **System resources**: Low memory or CPU

**Optimization**:

```bash
# Pre-compile everything
npm run circuit:compile

# Use cached artifacts
# Subsequent proofs will be faster (5-10 seconds)
```

---

### ⚠️ Validation is Slow

**Symptom**: `validate_proof()` takes > 10 seconds

**Normal**: Cryptographic verification takes 5-10 seconds for Groth16 proofs.

**Speed it up**:

- Use on-chain verification (constant ~300k gas)
- Cache validation results for same proof

---

## Development Issues

### ❌ Git Issues with contracts/lib

**Symptom**:

```
fatal: not a git repository
```

**Cause**: forge-std is a git submodule

**Solution**:

```bash
# If you want to track in git:
cd contracts
git submodule add https://github.com/foundry-rs/forge-std lib/forge-std

# If you don't want git tracking:
# Just ignore it in .gitignore
echo "contracts/lib/" >> .gitignore
```

---

## Environment Issues

### ❌ Node Version Too Old

**Symptom**:

```
Error: This package requires Node.js >=14.0.0
```

**Solution**:

```bash
# Check version
node --version

# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 18
nvm install 18
nvm use 18
```

---

### ❌ Python Version Issues

**Symptom**:

```
SyntaxError: invalid syntax (type hints, match statements, etc.)
```

**Solution**:

```bash
# Check version
python3 --version
# Need Python 3.8+

# Install Python 3.10+ (recommended)
# macOS:
brew install python@3.10

# Update alternatives
python3.10 -m pip install -r requirements.txt
python3.10 tests/e2e/test_zk_rebalancing_workflow.py
```

---

## Getting Help

If you encounter an issue not listed here:

1. **Check the output carefully** - Error messages usually indicate the problem
2. **Read the docs**:

   - [FILE_EXPLANATION.md](FILE_EXPLANATION.md) - Understand what each file does
   - [QUICK_START.md](QUICK_START.md) - Step-by-step setup
   - [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md) - Agent system details

3. **Common debugging steps**:

   ```bash
   # Clean and rebuild everything
   npm run clean
   npm run setup:zkp
   npm run setup:forge
   npm run forge:build

   # Restart Anvil
   pkill anvil
   npm run anvil  # (in separate terminal)

   # Redeploy contracts
   npm run forge:deploy:local

   # Try demo again
   ./run_demo.sh
   ```

4. **Enable verbose output**:

   ```bash
   # For forge:
   npm run forge:build -- -vvv

   # For Python:
   python3 -v tests/e2e/test_zk_rebalancing_workflow.py
   ```

---

## Quick Fixes Checklist

Before asking for help, try this checklist:

- [ ] Anvil is running: `curl http://localhost:8545`
- [ ] Foundry in PATH: `forge --version`
- [ ] SnarkJS installed: `snarkjs --version`
- [ ] Python deps installed: `python3 -c "import web3"`
- [ ] forge-std exists: `ls contracts/lib/forge-std`
- [ ] ZK setup complete: `ls build/rebalancing_final.zkey`
- [ ] Contracts deployed: `ls deployed_contracts.json`
- [ ] Clean slate: `npm run clean && npm run setup:zkp`

---

**Last Updated**: October 2025  
**Version**: 1.0.0
