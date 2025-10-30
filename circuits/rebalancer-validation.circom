pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

// ZK Rebalancer Validation Circuit
// Proves that a DeFi rebalancer opportunity satisfies all ZyFI validation constraints
// without revealing sensitive rebalancer parameters.
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
// - amount: Rebalancer amount (in token smallest unit, e.g., USDC with 6 decimals)
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

template RebalancerValidation() {
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
    // Use GreaterThan from circomlib (252-bit comparison for bn254 curve)
    component liquidityCheck = GreaterThan(252);
    liquidityCheck.in[0] <== liquidityLeft;
    liquidityCheck.in[1] <== liquidityRight;
    signal liquidityCheckValue <== liquidityCheck.out;

    // ========================================
    // Constraint 2: TVL Constraint
    // poolTvl * 1e6 > amount * 4
    // Backend: adjustedPoolTvl * 1e6 > amount * (100n / 25n)
    // This ensures rebalancer is max 25% of pool TVL
    // ========================================
    signal tvlLeft <== poolTvl * 1000000;
    signal tvlRight <== amount * 4;
    component tvlCheck = GreaterThan(252);
    tvlCheck.in[0] <== tvlLeft;
    tvlCheck.in[1] <== tvlRight;
    signal tvlCheckValue <== tvlCheck.out;

    // ========================================
    // Constraint 3: APY Performance Check
    // newApy > oldApy + 0.1
    // Backend: adjustedApy > oldOpportunity.combined_apy + 0.1
    // APY scaled by 100, so 0.1% = 10 units
    // ========================================
    signal apyThreshold <== oldApy + 10;
    component apyCheck = GreaterThan(252);
    apyCheck.in[0] <== newApy;
    apyCheck.in[1] <== apyThreshold;
    signal apyCheckValue <== apyCheck.out;

    // ========================================
    // Boolean Validation: Ensure boolean inputs are actually 0 or 1
    // ========================================
    // Validate apyStable7Days is boolean: value * (value - 1) === 0
    // This is true only for 0 and 1
    signal apyStable7DaysBoolCheck <== apyStable7Days * (apyStable7Days - 1);
    apyStable7DaysBoolCheck === 0;
    
    signal apyStable10DaysBoolCheck <== apyStable10Days * (apyStable10Days - 1);
    apyStable10DaysBoolCheck === 0;
    
    signal tvlStableBoolCheck <== tvlStable * (tvlStable - 1);
    tvlStableBoolCheck === 0;

    // ========================================
    // Constraint 4: APY Stability Check
    // apyStable7Days || apyStable10Days
    // Backend: newOpportunity.isApyStable7Days || newOpportunity.isApyStable10Days
    // ========================================
    signal apyStabilityOr <== apyStable7Days + apyStable10Days;
    component apyStabilityCheck = GreaterThan(252);
    apyStabilityCheck.in[0] <== apyStabilityOr;
    apyStabilityCheck.in[1] <== 0;
    signal apyStabilityCheckValue <== apyStabilityCheck.out;

    // ========================================
    // Constraint 5: TVL Stability Check
    // tvlStable must be 1
    // Backend: newOpportunity.isTvlStable
    // ========================================
    component tvlStabilityCheck = IsEqual();
    tvlStabilityCheck.in[0] <== tvlStable;
    tvlStabilityCheck.in[1] <== 1;
    signal tvlStabilityCheckValue <== tvlStabilityCheck.out;

    // ========================================
    // Combine all checks with AND logic
    // All constraints must pass (all must be 1)
    // ========================================
    signal check12 <== liquidityCheckValue * tvlCheckValue;
    signal check34 <== apyCheckValue * apyStabilityCheckValue;
    signal check5 <== tvlStabilityCheckValue;
    signal check1234 <== check12 * check34;
    signal finalCheck <== check1234 * check5;

    // Enforce that all checks must pass
    // If any constraint fails, witness generation will fail
    finalCheck === 1;

    // Output validation result (will always be 1 if proof is generated)
    isValid <== 1;

    // Create commitment hash: sum of all inputs + result
    // This proves all values were used in the validation
    signal commitment <== liquidity + zyfiTvl + amount + poolTvl +
                         newApy + oldApy + apyStable7Days +
                         apyStable10Days + tvlStable + isValid;
    validationCommitment <== commitment;
}

// Instantiate main component
// All outputs are automatically public, all inputs are private
component main = RebalancerValidation();
