# Valid Test Cases for ZK Rebalancing Proof

All test cases maintain total value of **375,000** with prices at 100 per token.

**Constraints**:

- Total Value Preservation: Sum of (newBalances × prices) = 375,000
- Min Allocation: Each asset ≥ 10% of total (≥ 37,500 value = ≥ 375 tokens)
- Max Allocation: Each asset ≤ 40% of total (≤ 150,000 value = ≤ 1,500 tokens)

**Public Inputs** (visible on-chain during verification):

- `totalValueCommitment`: Expected total portfolio value (375,000)
- `minAllocationPct`: Minimum allocation percentage (10)
- `maxAllocationPct`: Maximum allocation percentage (40)

**Private Inputs** (hidden via ZK proof):

- `oldBalances`: Previous token balances
- `newBalances`: New token balances after rebalancing
- `prices`: Token prices

**Note**: The circuit computes an internal `dataHash` output signal for integrity verification, but it is NOT a public input and remains private within the proof.

---

## Test Case 1: Equal Distribution (Default)

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

**Verification**:

- New values: 80k, 80k, 120k, 95k = 375,000 ✓
- Allocations: 21.3%, 21.3%, 32%, 25.3% (all within 10-40%) ✓

---

## Test Case 2: Balanced Portfolio

```json
{
  "oldBalances": ["1000", "1000", "1000", "750"],
  "newBalances": ["937", "938", "938", "937"],
  "prices": ["100", "100", "100", "100"],
  "totalValueCommitment": "375000",
  "minAllocationPct": "10",
  "maxAllocationPct": "40"
}
```

**Verification**:

- New values: 93.7k, 93.8k, 93.8k, 93.7k = 375,000 ✓
- Allocations: ~25% each (all within 10-40%) ✓

---

## Test Case 3: Conservative Shift

```json
{
  "oldBalances": ["1000", "1000", "1000", "750"],
  "newBalances": ["950", "900", "1000", "900"],
  "prices": ["100", "100", "100", "100"],
  "totalValueCommitment": "375000",
  "minAllocationPct": "10",
  "maxAllocationPct": "40"
}
```

**Verification**:

- New values: 95k, 90k, 100k, 90k = 375,000 ✓
- Allocations: 25.3%, 24%, 26.7%, 24% (all within 10-40%) ✓

---

## Test Case 4: Max Allocation Boundary

```json
{
  "oldBalances": ["1000", "1000", "1000", "750"],
  "newBalances": ["1500", "750", "750", "750"],
  "prices": ["100", "100", "100", "100"],
  "totalValueCommitment": "375000",
  "minAllocationPct": "10",
  "maxAllocationPct": "40"
}
```

**Verification**:

- New values: 150k, 75k, 75k, 75k = 375,000 ✓
- Allocations: 40%, 20%, 20%, 20% (all within 10-40%) ✓
- **Tests max boundary**: Asset 0 at exactly 40%

---

## Test Case 5: Min Allocation Boundary (CURRENT)

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

- New values: 135k, 130k, 72.5k, 37.5k = 375,000 ✓
- Allocations: 36%, 34.7%, 19.3%, 10% (all within 10-40%) ✓
- **Tests min boundary**: Asset 3 at exactly 10%

---

## Test Case 6: Aggressive Rebalancing

```json
{
  "oldBalances": ["1000", "1000", "1000", "750"],
  "newBalances": ["1450", "450", "1450", "400"],
  "prices": ["100", "100", "100", "100"],
  "totalValueCommitment": "375000",
  "minAllocationPct": "10",
  "maxAllocationPct": "40"
}
```

**Verification**:

- New values: 145k, 45k, 145k, 40k = 375,000 ✓
- Allocations: 38.7%, 12%, 38.7%, 10.7% (all within 10-40%) ✓

---

## Test Case 7: Concentrated Portfolio

```json
{
  "oldBalances": ["1000", "1000", "1000", "750"],
  "newBalances": ["1400", "1200", "775", "375"],
  "prices": ["100", "100", "100", "100"],
  "totalValueCommitment": "375000",
  "minAllocationPct": "10",
  "maxAllocationPct": "40"
}
```

**Verification**:

- New values: 140k, 120k, 77.5k, 37.5k = 375,000 ✓
- Allocations: 37.3%, 32%, 20.7%, 10% (all within 10-40%) ✓

---

## How to Test Each Case

1. **Copy one of the test cases above into input/input.json**:

   ```bash
   nano input/input.json
   ```

2. **Regenerate ZK artifacts** (only needed once after circuit changes):

   ```bash
   npm run setup:zkp
   ```

3. **Run E2E test**:

   ```bash
   npm run test:e2e
   ```

4. **Expected output**:
   - ✅ Proof generated successfully
   - ✅ On-chain verification: VALID
   - ✅ Validation score: 100/100

---

## Important Notes

### Privacy Guarantee

With the updated circuit:

- **Private**: `oldBalances`, `newBalances`, `prices` (never revealed on-chain)
- **Public**: Only `totalValueCommitment`, `minAllocationPct`, `maxAllocationPct`
- **Internal**: `dataHash` is computed but not exposed as a public input

This ensures true zero-knowledge privacy - validators can verify the proof without seeing actual balances or prices.

### When Using the E2E Test

The `RebalancerAgent.generateZkProof()` automatically creates the correct input format. When called from the E2E test, the private inputs remain hidden from the blockchain.

### After Circuit Changes

If you modify `circuits/rebalancing.circom`, you MUST regenerate the ZK artifacts:

```bash
npm run setup:zkp
```

This will:

1. Recompile the circuit
2. Generate new proving/verification keys
3. Regenerate `Verifier.sol` with updated public signal count

Then redeploy contracts:

```bash
npm run forge:deploy:local
```

---

## Invalid Test Case (Should Fail)

### Violates Max Allocation

```json
{
  "oldBalances": ["1000", "1000", "1000", "750"],
  "newBalances": ["1600", "700", "700", "750"],
  "prices": ["100", "100", "100", "100"],
  "totalValueCommitment": "375000",
  "minAllocationPct": "10",
  "maxAllocationPct": "40"
}
```

- Asset 0: 160k = 42.7% > 40% ❌
- **Expected**: Proof verification should fail (or witness generation should fail if range checks were implemented)

**Note**: Current circuit calculates bounds but doesn't enforce them with range checks. For production, add LessThan/GreaterThan circuits from circomlib to enforce the constraints during witness generation.
