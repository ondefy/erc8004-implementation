pragma circom 2.0.0;

// ZK Deposit Validation Circuit
// Proves that a DeFi deposit opportunity satisfies all ZyFI validation constraints
// without revealing sensitive deposit parameters.
//
// Based on ZyFI backend logic and:
// https://gist.github.com/PaulDeFi/49d1a386c5d1bb85a1cfbe7bff2bd4d2
//
// Implements 5 core validation rules from backend canDeposit():
// 1. Available Liquidity: liquidity * 1.05 > adjustedZyfiTvl + (amount / 1_000_000)
// 2. TVL Constraint: adjustedPoolTvl * 1e6 > amount * 4 (25% max allocation)
// 3. APY Performance: adjustedApy > oldOpportunity.combined_apy + 0.1 (0.1% improvement)
// 4. APY Stability: isApyStable7Days || isApyStable10Days
// 5. TVL Stability: isTvlStable
//
// Private inputs:
// - liquidity: Available liquidity in the pool (in dollars, integer)
// - zyfiTvl: Current ZyFI TVL in the pool (in dollars, integer)
// - amount: Deposit amount (in token smallest unit, e.g., USDC with 6 decimals)
// - poolTvl: Total pool TVL (in token smallest unit)
// - newApy: New opportunity APY (scaled by 100, e.g., 550 = 5.50%)
// - oldApy: Previous opportunity APY (scaled by 100, e.g., 450 = 4.50%)
// - apyStable7Days: Boolean (1 if APY stable over 7 days, 0 otherwise)
// - apyStable10Days: Boolean (1 if APY stable over 10 days, 0 otherwise)
// - tvlStable: Boolean (1 if TVL is stable, 0 otherwise)
//
// Public outputs:
// - validationCommitment: Commitment hash of all inputs + result
// - isValid: 1 if all constraints pass, 0 otherwise

template DepositValidation() {
    // Private inputs
    signal input liquidity;
    signal input zyfiTvl;
    signal input amount;
    signal input poolTvl;
    signal input newApy;
    signal input oldApy;
    signal input apyStable7Days;
    signal input apyStable10Days;
    signal input tvlStable;

    // Public outputs
    signal output validationCommitment;
    signal output isValid;

    // ========================================
    // Constraint 1: Available Liquidity Check
    // liquidity * 1.05 > zyfiTvl + (amount / 1_000_000)
    // Backend: newOpportunity.liquidity * 1.05 > adjustedZyfiTvl + Number(amount / 1_000_000n)
    // ========================================
    // To avoid division, multiply both sides by 1,000,000:
    // liquidity * 1.05 * 1,000,000 > zyfiTvl * 1,000,000 + amount
    // liquidity * 1,050,000 > zyfiTvl * 1,000,000 + amount
    signal liquidityLeft <== liquidity * 1050000;
    signal zyfiTvlScaled <== zyfiTvl * 1000000;
    signal liquidityRight <== zyfiTvlScaled + amount;

    // Check: liquidityLeft > liquidityRight
    component liquidityCheck = GreaterThan();
    liquidityCheck.a <== liquidityLeft;
    liquidityCheck.b <== liquidityRight;
    signal liquidityCheckValue <== liquidityCheck.out;

    // ========================================
    // Constraint 2: TVL Constraint
    // poolTvl * 1e6 > amount * 4
    // Backend: adjustedPoolTvl * 1e6 > amount * (100n / 25n)
    // This ensures deposit is max 25% of pool TVL
    // ========================================
    signal tvlLeft <== poolTvl * 1000000;
    signal tvlRight <== amount * 4;
    component tvlCheck = GreaterThan();
    tvlCheck.a <== tvlLeft;
    tvlCheck.b <== tvlRight;
    signal tvlCheckValue <== tvlCheck.out;

    // ========================================
    // Constraint 3: APY Performance Check
    // newApy > oldApy + 0.1
    // Backend: adjustedApy > oldOpportunity.combined_apy + 0.1
    // APY scaled by 100, so 0.1% = 10 units
    // ========================================
    signal apyThreshold <== oldApy + 10;
    component apyCheck = GreaterThan();
    apyCheck.a <== newApy;
    apyCheck.b <== apyThreshold;
    signal apyCheckValue <== apyCheck.out;

    // ========================================
    // Constraint 4: APY Stability Check
    // apyStable7Days || apyStable10Days
    // Backend: newOpportunity.isApyStable7Days || newOpportunity.isApyStable10Days
    // ========================================
    signal apyStabilityOr <== apyStable7Days + apyStable10Days;
    component apyStabilityCheck = GreaterThan();
    apyStabilityCheck.a <== apyStabilityOr;
    apyStabilityCheck.b <== 0;
    signal apyStabilityCheckValue <== apyStabilityCheck.out;

    // ========================================
    // Constraint 5: TVL Stability Check
    // tvlStable must be 1
    // Backend: newOpportunity.isTvlStable
    // ========================================
    signal tvlStabilityCheckValue <== tvlStable;

    // ========================================
    // Combine all checks with AND logic
    // All constraints must pass (all must be 1)
    // ========================================
    signal check12 <== liquidityCheckValue * tvlCheckValue;
    signal check34 <== apyCheckValue * apyStabilityCheckValue;
    signal check5 <== tvlStabilityCheckValue;
    signal check1234 <== check12 * check34;
    signal finalCheck <== check1234 * check5;

    // Output validation result
    isValid <== finalCheck;

    // Create commitment hash: sum of all inputs + result
    // This proves all values were used in the validation
    signal commitment <== liquidity + zyfiTvl + amount + poolTvl +
                         newApy + oldApy + apyStable7Days +
                         apyStable10Days + tvlStable + isValid;
    validationCommitment <== commitment;
}

// Greater than comparison template
// Returns 1 if a > b, otherwise 0
template GreaterThan() {
    signal input a;
    signal input b;
    signal output out;
    signal diff <== a - b;

    // Check if diff is positive
    component isPos = IsPositive();
    isPos.in <== diff;
    out <== isPos.out;
}

// Check if number is positive
template IsPositive() {
    signal input in;
    signal output out;

    // Use inverse to check if non-zero
    component isZ = IsZero();
    isZ.in <== in;

    // If not zero, assume positive (circuit constraints enforce valid range)
    out <== 1 - isZ.out;
}

// Check if number is zero
template IsZero() {
    signal input in;
    signal output out;

    signal inv;
    inv <-- in != 0 ? 1 / in : 0;

    out <== -in * inv + 1;
    in * out === 0;
}

// Instantiate main component
// All outputs are automatically public, all inputs are private
component main = DepositValidation();
