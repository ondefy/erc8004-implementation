# Quick Start Guide - ZK Rebalancing with Agentic Orchestration

**Get up and running in 5 minutes!**

---

## What You'll Build

A privacy-preserving portfolio rebalancing system with:

- ✅ Zero-knowledge proofs hiding your positions
- ✅ Three AI agents working together trustlessly
- ✅ On-chain validation and reputation tracking
- ✅ Complete audit trail on blockchain

---

## Prerequisites

```bash
# Check you have these installed:
node --version    # Need v16+
python3 --version # Need v3.8+
npm --version     # Comes with Node.js
```

**Don't have them?**

- Node.js: https://nodejs.org/
- Python: https://python.org/downloads/

---

## 5-Minute Setup

### Step 1: Install Dependencies (2 minutes)

```bash
cd /path/to/rebalancing-poc-main

# Install Node.js packages
npm install

# Install Python packages
pip install -r requirements.txt

# Install global tools
npm install -g circom snarkjs
```

### Step 2: Run the Demo (3 minutes)

```bash
# Terminal 1: Start blockchain
npm run anvil
```

```bash
# Terminal 2: Run complete demo
./run_demo.sh
```

**That's it!** 🎉

You'll see:

1. Blockchain starting
2. ZK setup (if first time)
3. Contracts deploying
4. Three agents registering
5. Proof being generated
6. Validation happening
7. Feedback being submitted

---

## What Just Happened?

### Behind the Scenes

```
Step 1: ZK Proof System Setup
├─ Compiled circuit (rebalancing.circom)
├─ Generated trusted setup keys
└─ Created verification parameters

Step 2: Smart Contract Deployment
├─ IdentityRegistry (agent registration)
├─ ValidationRegistry (proof validation)
└─ ReputationRegistry (feedback system)

Step 3: Agent Orchestration
├─ Rebalancer Agent: Generated ZK proof
├─ Validator Agent: Verified proof cryptographically
└─ Client Agent: Provided quality feedback
```

---

## Understanding the Output

When you run the demo, you'll see 11 steps:

```
STEP 1: Initialize Agents
──────────────────────────────────────────────────────
💼 Rebalancer Agent initialized
   Domain: rebalancer-123456.zk-proof.test
   Address: 0x742d35...
🔍 Validator Agent initialized
   ...
💼 Client Agent initialized
   ...

STEP 2: Fund Agents
──────────────────────────────────────────────────────
✅ All agents funded with 0.5 ETH

STEP 3: Register Agents on ERC-8004 Registry
──────────────────────────────────────────────────────
   Rebalancer Agent ID: 1
   Validator Agent ID: 2
   Client Agent ID: 3

STEP 4: Create Rebalancing Plan
──────────────────────────────────────────────────────
   Old portfolio value: 375,000
   New portfolio value: 375,000
   Token 0: 21.33% allocation
   Token 1: 21.33% allocation
   Token 2: 32.00% allocation
   Token 3: 25.33% allocation

STEP 5: Generate Zero-Knowledge Proof
──────────────────────────────────────────────────────
   1️⃣  Calculating witness...
   2️⃣  Verifying witness...
   3️⃣  Generating proof...
   Proof generated using groth16
   Curve: bn128
   Public inputs: 15 signals

STEP 6: Submit Proof for Validation
──────────────────────────────────────────────────────
   Data hash: 5be9fdb...
   Validation request transaction: 0xabc123...

STEP 7: Validate ZK Proof
──────────────────────────────────────────────────────
   Structure verification: 100/100
   Cryptographic verification: 100/100
   Rebalancing logic: 100/100
   Proof valid: true
   Validation score: 100/100

STEP 8: Submit Validation Response
──────────────────────────────────────────────────────
   Validation response transaction: 0xdef456...

STEP 9: Authorize Client Feedback
──────────────────────────────────────────────────────
   Authorization transaction: 0xghi789...

STEP 10: Client Evaluation and Feedback
──────────────────────────────────────────────────────
   Quality evaluation: 90/100
   Feedback submitted: 90/100

STEP 11: Check Rebalancer Reputation
──────────────────────────────────────────────────────
   Feedback count: 1
   Average score: 90.0/100

═══════════════════════════════════════════════════
  ✅ END-TO-END TEST COMPLETE
═══════════════════════════════════════════════════
```

---

## What Makes This Special?

### 🔒 Privacy

Your actual balances are **never revealed**:

```python
# Private (hidden by ZK proof)
oldBalances = [1000, 1000, 1000, 750]  # Secret!
newBalances = [800, 800, 1200, 950]    # Secret!
prices = [100, 100, 100, 100]          # Secret!

# Public (visible on-chain)
totalValue = 375000                     # Only total
minAllocation = 10%                     # Only constraints
maxAllocation = 40%                     # Only constraints
```

The proof says: _"Trust me, I rebalanced correctly"_ without showing the numbers!

### 🤝 Trustless

No need to trust any single party:

- **Rebalancer** generates proof
- **Validator** verifies independently
- **Client** checks reputation
- All recorded on blockchain

### 📊 Transparent

Everything on-chain:

- Agent registrations
- Validation requests
- Validation results
- Feedback scores

---

## Project Structure

```
rebalancing-poc-main/
│
├── agents/                    # 🤖 The AI agents
│   ├── rebalancer_agent.py   # Generates ZK proofs
│   ├── validator_agent.py    # Verifies proofs
│   └── client_agent.py       # Provides feedback
│
├── circuits/                  # 🔐 ZK proof logic
│   └── rebalancing.circom    # Circuit definition
│
├── contracts/                 # 📜 Smart contracts
│   └── src/
│       ├── IdentityRegistry.sol    # Agent registration
│       ├── ValidationRegistry.sol  # Proof validation
│       ├── ReputationRegistry.sol  # Feedback system
│       └── Verifier.sol           # ZK proof verifier
│
├── tests/e2e/                 # 🧪 End-to-end tests
│   └── test_zk_rebalancing_workflow.py
│
└── docs/                      # 📖 Documentation
    ├── FILE_EXPLANATION.md    # What each file does
    ├── AGENTIC_WORKFLOW.md    # How agents work
    └── QUICK_START.md         # This file!
```

---

## Try Different Scenarios

### Scenario 1: Valid Rebalancing (Should Pass)

Edit `tests/e2e/test_zk_rebalancing_workflow.py`:

```python
# Line ~79
old_balances=["1000", "1000", "1000", "750"],
new_balances=["800", "800", "1200", "950"],
prices=["100", "100", "100", "100"],
```

Result: ✅ Proof validates successfully

### Scenario 2: Invalid Rebalancing (Should Fail)

```python
old_balances=["1000", "1000", "1000", "750"],
new_balances=["800", "800", "1200", "1000"],  # Changed!
prices=["100", "100", "100", "100"],
```

Result: ❌ Witness check fails (value not preserved)

### Scenario 3: Different Prices

```python
old_balances=["1000", "1000", "1000", "750"],
new_balances=["800", "800", "1200", "950"],
prices=["110", "90", "105", "100"],  # Different prices!
```

Adjust to preserve total value, then: ✅ Should work

---

## Common Commands

### Development

```bash
# Start blockchain (keep running)
npm run anvil

# Deploy contracts
npm run forge:deploy:local

# Run end-to-end test
python3 tests/e2e/test_zk_rebalancing_workflow.py

# Generate proof manually
npm run proof:generate
```

### Circuit Development

```bash
# Compile circuit
npm run circuit:compile

# Check circuit info
npm run circuit:info

# Export verifier contract
npm run verifier:export
```

### Cleanup

```bash
# Clean ZK artifacts
npm run clean:zkp

# Clean contracts
npm run forge:clean

# Clean everything
npm run clean
```

---

## Next Steps

### 🎓 Learn More

1. **Understand Files**
   → Read [FILE_EXPLANATION.md](FILE_EXPLANATION.md)

2. **Deep Dive on Agents**
   → Read [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md)

3. **Integration Details**
   → Read [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)

### 🛠 Build More

1. **Add More Assets**

   - Modify circuit for 8 or 16 assets
   - Update input arrays in test

2. **Custom Constraints**

   - Add sector allocation limits
   - Add risk-based constraints

3. **Web Interface**

   - Build React/Next.js frontend
   - Connect to agents via API

4. **Deploy to Testnet**
   - Use Sepolia or Base Sepolia
   - Get test ETH from faucet
   - Run: `npm run forge:deploy:sepolia`

---

## Troubleshooting

### ❌ "Anvil is not running"

**Solution**: Start Anvil in a separate terminal: `npm run anvil`

### ❌ "snarkjs: command not found"

**Solution**: Install globally: `npm install -g snarkjs`

### ❌ "No module named 'web3'"

**Solution**: Install Python deps: `pip install -r requirements.txt`

### ❌ "deployed_contracts.json not found"

**Solution**: Deploy contracts: `npm run forge:deploy:local`

### ❌ "Proof verification failed"

**Solution**: Check that:

- Witness calculation succeeded
- Input values satisfy constraints
- Total value is preserved

### ❌ "Transaction reverted"

**Solution**:

- Check agent has sufficient balance
- Ensure agent is registered
- Verify contract deployment

---

## Understanding the Math

### The Rebalancing Constraint

**Must Preserve Total Value:**

```
Old Total = Σ (oldBalance[i] × price[i])
New Total = Σ (newBalance[i] × price[i])

Old Total === New Total  ← This is proven by ZK!
```

**Example:**

```
Old: 1000×$100 + 1000×$100 + 1000×$100 + 750×$100
   = 100,000 + 100,000 + 100,000 + 75,000
   = 375,000 ✓

New: 800×$100 + 800×$100 + 1200×$100 + 950×$100
   = 80,000 + 80,000 + 120,000 + 95,000
   = 375,000 ✓

Preserved! ✅
```

### The Allocation Constraint

**Each Asset Must Be Within Bounds:**

```
For each asset i:
  allocation[i] = (balance[i] × price[i]) / totalValue × 100

  minPct ≤ allocation[i] ≤ maxPct
```

**Example:**

```
Token 2: (1200 × 100) / 375000 × 100 = 32%
  10% ≤ 32% ≤ 40% ✓
```

---

## Key Concepts Explained

### What is a Zero-Knowledge Proof?

**Traditional Way:**

```
"Here are my balances: [1000, 1000, 1000, 750]"
Problem: Everyone sees your positions! 😱
```

**Zero-Knowledge Way:**

```
"I have balances that total $375k and are within 10-40% each"
+ A cryptographic proof
= Privacy preserved! 🎉
```

### What is ERC-8004?

A standard for agents to work together on blockchain:

- **Identity Registry**: Who are you?
- **Validation Registry**: Can you prove it?
- **Reputation Registry**: How good are you?

### What are Groth16 Proofs?

- **Constant size**: ~200 bytes (no matter how complex)
- **Fast to verify**: ~300k gas on Ethereum
- **Cryptographically sound**: Impossible to fake

---

## Success Checklist

After running the demo, you should have:

- [ ] Agents registered on blockchain
- [ ] ZK proof generated successfully
- [ ] Proof validated cryptographically
- [ ] Validation response on-chain
- [ ] Feedback submitted
- [ ] Reputation score calculated

**All checked?** Congratulations! 🎊 You're ready to build more!

---

## Get Help

1. **Check Documentation**: [docs/](docs/)
2. **Review Test Output**: Look for specific error messages
3. **Common Issues**: See Troubleshooting section above
4. **File an Issue**: Include error logs and steps

---

## What You Learned

✅ How to generate zero-knowledge proofs  
✅ How agents coordinate on blockchain  
✅ How to validate proofs cryptographically  
✅ How reputation systems work  
✅ Privacy-preserving computation basics

---

**Ready to dive deeper?**

→ Read [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md) for complete technical details  
→ Read [FILE_EXPLANATION.md](FILE_EXPLANATION.md) to understand every file  
→ Modify the test to experiment with different scenarios

**Happy Building! 🚀**
