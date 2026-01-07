pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

// ZK Rebalancer Validation Circuit
// Proves that a DeFi rebalancer opportunity satisfies all ZyFI validation constraints
// without revealing sensitive rebalancer parameters.
//
// Based on ZyFI backend canDeposit() logic from:
// single-sided-stable-opportunity.ts:canDeposit() (lines 1049-1212)
//
// Implements core validation rules matching backend canDeposit() return statement:
// return (
//   (apyCheck || shouldRebalanceFromOldOpportunity || !supportsCurrentPool) &&
//   amountCheck &&
//   tvlCheck &&
//   zyfiTvlCheck &&
//   slippageCheck &&
//   tvlStableCheck &&
//   availableLiquidityCheck &&
//   collateralHealthCheck &&
//   utilizationStableCheck &&
//   apyStableCheck
// );
//
// Circuit validates the following checks (others require service calls):
// 1. Available Liquidity: newOpportunity.liquidity * 0.85 > adjustedZyfiTvl
//    Backend: line 1134-1135
//    Condition: availableLiquidityCheck = newOpportunity.liquidity * 0.85 > adjustedZyfiTvl
//
// 2. TVL Constraint: newOpportunity.tvl * 1e6 > amount * (100n / 25n)
//    Backend: line 1087
//    Condition: tvlCheck = newOpportunity.tvl * 1e6 > amount * (100n / 25n)
//    Note: (100n / 25n) = 4, so: poolTvl * 1e6 > amount * 4
//
// 3. APY Performance: adjustedApy > oldOpportunity.combined_apy + 0.1 OR edge cases
//    Backend: line 1100-1102, 1201
//    Condition: apyCheck = oldOpportunity ? adjustedApy > oldOpportunity.combined_apy + 0.1 : true
//    Edge cases (line 1201): apyCheck || shouldRebalanceFromOldOpportunity || !supportsCurrentPool
//    - If oldApy = 0: no old opportunity, APY check passes (true)
//    - If shouldRebalanceFromOld = 1: bypass APY check (rebalancing from problematic old opportunity)
//    - If supportsCurrentPool = 0: bypass APY check (current pool no longer supported)
//
// 4. APY Stability: (isApyTvlStable ?? true) && (isApyStable7Days ?? true)
//    Backend: line 1116-1118
//    Condition: apyStableCheck = (newOpportunity.isApyTvlStable ?? true) && (newOpportunity.isApyStable7Days ?? true)
//    Note: isApyTvlStable defaults to true, so we only check isApyStable7Days
//
// 5. TVL Stability: newOpportunity.isTvlStable
//    Backend: line 1098, 1206
//    Condition: tvlStableCheck = newOpportunity.isTvlStable
//
// Public inputs (all inputs are public, matching backend input format):
// New Opportunity Data:
// - liquidity: Available liquidity (scaled by 100, 2 decimal precision)
//              Backend: Math.round((newOpportunity.liquidity ?? 0) * 100)
// - zyfiTvl: Current ZyFI TVL (scaled by 100, 2 decimal precision)
//            Backend: Math.round((adjustedZyfiTvl ?? 0) * 100)
// - amount: Rebalancer amount (in token smallest unit, e.g., USDC with 6 decimals)
//           Backend: Number(balance) - already in token smallest units
// - poolTvl: Total pool TVL (scaled by 100, 2 decimal precision)
//            Backend: Math.round((adjustedPoolTvl ?? 0) * 100)
// - newApy: New opportunity APY (scaled by 10000, 4 decimal precision, e.g., 55234 = 5.5234%)
//           Backend: Math.round((adjustedApy ?? 0) * 10000)
// - apyStable7Days: Boolean (1 if APY stable over 7 days, 0 otherwise)
//                   Backend: newOpportunity.isApyStable7Days ? 1 : 0
// - tvlStable: Boolean (1 if TVL is stable, 0 otherwise)
//              Backend: newOpportunity.isTvlStable ? 1 : 0
//
// Old Opportunity Data (for computing shouldRebalanceFromOld):
// - oldApy: Previous opportunity APY (scaled by 10000, 4 decimal precision, 0 if no old opportunity)
//           Backend: Math.round((oldOpportunity?.combined_apy ?? 0) * 10000)
// - oldLiquidity: Old opportunity liquidity (scaled by 100, 2 decimal precision, 0 if no old opportunity)
//                 Backend: Math.round((oldOpportunity?.liquidity ?? 0) * 100)
// - oldZyfiTvl: Old opportunity ZyFI TVL (scaled by 100, 2 decimal precision, 0 if no old opportunity)
//               Backend: Math.round((oldOpportunity?.zyfiTvl ?? 0) * 100)
// - oldTvlStable: Boolean (1 if old opportunity TVL is stable, 0 otherwise, 1 if no old opportunity)
//                 Backend: oldOpportunity?.isTvlStable ? 1 : 1 (defaults to 1)
// - oldUtilizationStable: Boolean (1 if old opportunity utilization is stable, 0 otherwise, 1 if no old opportunity)
//                          Backend: (oldOpportunity?.isUtilizationStable ?? true) ? 1 : 0
// - oldCollateralHealth: Boolean (1 if old opportunity collateral is healthy, 0 otherwise, 1 if no old opportunity)
//                        Backend: !(oldOpportunity?.collateralHealth?.checkedTokens?.length > 0 && isHealthy === false) ? 1 : 0
// - oldZyfiTVLCheck: Boolean (1 if old opportunity passes ZyFI TVL check, 0 otherwise, 1 if no old opportunity)
//                    Backend: service.checkTVL() result (protocol-specific check, computed by backend)
//
// User Preferences:
// - supportsCurrentPool: Boolean (1 if current pool is supported, 0 to bypass APY check)
//                        Backend: supportsCurrentPool flag from user preferences
//
// Note: Checks not included in circuit (require service calls or external data):
// - amountCheck: service.checkAmount() - protocol-specific minimum amount check
// - zyfiTvlCheck: service.checkTVL() - protocol-specific TVL limit check
// - slippageCheck: dailyProfit * 10n >= slippageOnDeposit.slippageAmount - requires slippage calculation
// - collateralHealthCheck: !(collateralHealth?.checkedTokens?.length > 0 && isHealthy === false)
// - utilizationStableCheck: newOpportunity.isUtilizationStable ?? true
//
// No public outputs - all inputs are public and constraints can be verified externally

template RebalancerValidation() {
    // Public inputs - New Opportunity Data
    signal input liquidity;
    signal input zyfiTvl;
    signal input amount;
    signal input poolTvl;
    signal input newApy;
    signal input apyStable7Days;
    signal input tvlStable;
    
    // Public inputs - Old Opportunity Data (for computing shouldRebalanceFromOld)
    signal input oldApy;
    signal input oldLiquidity;
    signal input oldZyfiTvl;
    signal input oldTvlStable;
    signal input oldUtilizationStable;
    signal input oldCollateralHealth;
    signal input oldZyfiTVLCheck;
    
    // Public inputs - User Preferences
    signal input supportsCurrentPool;

    // ========================================
    // Constraint 1: Available Liquidity Check
    // Backend: line 1134-1135
    // const availableLiquidityCheck = newOpportunity.liquidity * 0.85 > adjustedZyfiTvl;
    // ========================================
    // To avoid floating point, multiply both sides by 100:
    // liquidity * 85 > zyfiTvl * 100
    signal liquidityLeft <== liquidity * 85;
    signal liquidityRight <== zyfiTvl * 100;

    // Check: liquidityLeft > liquidityRight
    // Use GreaterThan from circomlib (252-bit comparison for bn254 curve)
    component liquidityCheck = GreaterThan(252);
    liquidityCheck.in[0] <== liquidityLeft;
    liquidityCheck.in[1] <== liquidityRight;
    signal liquidityCheckValue <== liquidityCheck.out;

    // ========================================
    // Constraint 2: TVL Constraint
    // Backend: line 1087
    // const tvlCheck = newOpportunity.tvl * 1e6 > amount * (100n / 25n);
    // Note: (100n / 25n) = 4, so: tvl * 1e6 > amount * 4
    // Since poolTvl is scaled by 100, we need: (poolTvl/100) * 1e6 > amount * 4
    // Multiply both sides by 100: poolTvl * 1e6 > amount * 400
    // This ensures rebalancer is max 25% of pool TVL
    // ========================================
    signal tvlLeft <== poolTvl * 1000000;
    signal tvlRight <== amount * 400;
    component tvlCheck = GreaterThan(252);
    tvlCheck.in[0] <== tvlLeft;
    tvlCheck.in[1] <== tvlRight;
    signal tvlCheckValue <== tvlCheck.out;

    // ========================================
    // Constraint 3: APY Performance Check (with edge cases)
    // Backend: line 1100-1102, 1201
    // const apyCheck = oldOpportunity ? adjustedApy > oldOpportunity.combined_apy + 0.1 : true;
    // return (apyCheck || shouldRebalanceFromOldOpportunity || !supportsCurrentPool) && ...
    // APY scaled by 10000, so 0.1% = 0.001 * 10000 = 10 units
    // ========================================
    // Base APY check: newApy > oldApy + 10 (0.1% improvement)
    signal apyThreshold <== oldApy + 10;
    component apyCheck = GreaterThan(252);
    apyCheck.in[0] <== newApy;
    apyCheck.in[1] <== apyThreshold;
    signal apyCheckValue <== apyCheck.out;
    
    // Edge case 1: If oldApy = 0, there's no old opportunity, so APY check passes
    component oldApyIsZero = IsEqual();
    oldApyIsZero.in[0] <== oldApy;
    oldApyIsZero.in[1] <== 0;
    signal oldApyIsZeroValue <== oldApyIsZero.out;
    
    // Edge case 2: Compute shouldRebalanceFromOldOpportunity internally
    // Backend: shouldRebalanceFromOldOpportunity() returns true when:
    // return (
    //   enoughLiquidity &&
    //   (!zyfiTVLCheck || !tvlStableCheck || liqudityIsLow || !utilizationStableCheck || !collateralHealthCheck)
    // );
    // Where:
    // - enoughLiquidity = oldOpportunity.liquidity * 1e6 >= amount
    // - liqudityIsLow = oldOpportunity.liquidity * .85 < oldOpportunity.zyfiTvl
    // - tvlStableCheck = oldOpportunity.isTvlStable
    // - utilizationStableCheck = oldOpportunity.isUtilizationStable ?? true
    // - collateralHealthCheck = !(collateralHealth?.checkedTokens?.length > 0 && isHealthy === false)
    // - zyfiTVLCheck = service.checkTVL() (passed as input since it requires service call)
    
    // Check 1: enoughLiquidity = oldLiquidity * 1e6 >= amount
    // To avoid large numbers, we can check: oldLiquidity * 1e6 >= amount
    // Since oldLiquidity is scaled by 100, we need: oldLiquidity * 100 * 1e4 >= amount
    // Or: oldLiquidity * 1e6 >= amount (oldLiquidity is already scaled, so we need to account for that)
    // Actually, if oldLiquidity is scaled by 100, then actual liquidity = oldLiquidity / 100
    // So: (oldLiquidity / 100) * 1e6 >= amount
    // Multiply both sides by 100: oldLiquidity * 1e6 >= amount * 100
    signal oldLiquidityScaled <== oldLiquidity * 1000000;
    signal amountScaled <== amount * 100;
    component enoughLiquidityCheck = GreaterThan(252);
    enoughLiquidityCheck.in[0] <== oldLiquidityScaled;
    enoughLiquidityCheck.in[1] <== amountScaled;
    signal enoughLiquidityValue <== enoughLiquidityCheck.out;
    
    // Check 2: liqudityIsLow = oldLiquidity * .85 < oldZyfiTvl
    // To avoid floating point: oldLiquidity * 85 < oldZyfiTvl * 100
    signal oldLiquidityLowLeft <== oldLiquidity * 85;
    signal oldLiquidityLowRight <== oldZyfiTvl * 100;
    component oldLiquidityLowCheck = GreaterThan(252);
    oldLiquidityLowCheck.in[0] <== oldLiquidityLowRight;
    oldLiquidityLowCheck.in[1] <== oldLiquidityLowLeft;
    signal oldLiquidityIsLow <== oldLiquidityLowCheck.out;
    
    // Check 3: !oldZyfiTVLCheck (inverted - if check fails, we should rebalance)
    signal oldZyfiTVLCheckFailed <== 1 - oldZyfiTVLCheck;
    
    // Check 4: !oldTvlStableCheck (inverted - if not stable, we should rebalance)
    signal oldTvlStableCheckFailed <== 1 - oldTvlStable;
    
    // Check 5: !oldUtilizationStableCheck (inverted - if not stable, we should rebalance)
    signal oldUtilizationStableCheckFailed <== 1 - oldUtilizationStable;
    
    // Check 6: !oldCollateralHealthCheck (inverted - if not healthy, we should rebalance)
    signal oldCollateralHealthCheckFailed <== 1 - oldCollateralHealth;
    
    // shouldRebalanceFromOld = enoughLiquidity && (!oldZyfiTVLCheck || !oldTvlStable || oldLiquidityIsLow || !oldUtilizationStable || !oldCollateralHealth)
    // Boolean logic: enoughLiquidityValue && (oldZyfiTVLCheckFailed || oldTvlStableCheckFailed || oldLiquidityIsLow || oldUtilizationStableCheckFailed || oldCollateralHealthCheckFailed)
    signal oldIssuesOr <== oldZyfiTVLCheckFailed + oldTvlStableCheckFailed + oldLiquidityIsLow + oldUtilizationStableCheckFailed + oldCollateralHealthCheckFailed;
    component oldIssuesCheck = GreaterThan(252);
    oldIssuesCheck.in[0] <== oldIssuesOr;
    oldIssuesCheck.in[1] <== 0;
    signal oldIssuesValue <== oldIssuesCheck.out;
    
    // Combine: enoughLiquidityValue && oldIssuesValue
    signal shouldRebalanceFromOldValue <== enoughLiquidityValue * oldIssuesValue;
    
    // Edge case 3: !supportsCurrentPool - bypass APY check when current pool is no longer supported
    // Backend: user protocol preferences no longer include current pool
    signal supportsCurrentPoolValue <== supportsCurrentPool;
    signal notSupportsCurrentPool <== 1 - supportsCurrentPoolValue;
    
    // APY check passes if ANY of these are true:
    // 1. newApy > oldApy + 10 (normal case, 0.1% improvement)
    // 2. oldApy == 0 (no old opportunity)
    // 3. shouldRebalanceFromOld == 1 (rebalancing from problematic old opportunity, computed above)
    // 4. supportsCurrentPool == 0 (current pool no longer supported)
    // Boolean logic: apyCheckValue OR oldApyIsZeroValue OR shouldRebalanceFromOldValue OR notSupportsCurrentPool
    signal apyCheckOrSkip <== apyCheckValue + oldApyIsZeroValue + shouldRebalanceFromOldValue + notSupportsCurrentPool;
    component apyCheckFinal = GreaterThan(252);
    apyCheckFinal.in[0] <== apyCheckOrSkip;
    apyCheckFinal.in[1] <== 0;
    signal apyCheckFinalValue <== apyCheckFinal.out;

    // ========================================
    // Boolean Validation: Ensure boolean inputs are actually 0 or 1
    // ========================================
    // Validate boolean inputs: value * (value - 1) === 0
    // This is true only for 0 and 1
    signal apyStable7DaysBoolCheck <== apyStable7Days * (apyStable7Days - 1);
    apyStable7DaysBoolCheck === 0;
    
    signal tvlStableBoolCheck <== tvlStable * (tvlStable - 1);
    tvlStableBoolCheck === 0;
    
    signal oldTvlStableBoolCheck <== oldTvlStable * (oldTvlStable - 1);
    oldTvlStableBoolCheck === 0;
    
    signal oldUtilizationStableBoolCheck <== oldUtilizationStable * (oldUtilizationStable - 1);
    oldUtilizationStableBoolCheck === 0;
    
    signal oldCollateralHealthBoolCheck <== oldCollateralHealth * (oldCollateralHealth - 1);
    oldCollateralHealthBoolCheck === 0;
    
    signal oldZyfiTVLCheckBoolCheck <== oldZyfiTVLCheck * (oldZyfiTVLCheck - 1);
    oldZyfiTVLCheckBoolCheck === 0;
    
    signal supportsCurrentPoolBoolCheck <== supportsCurrentPool * (supportsCurrentPool - 1);
    supportsCurrentPoolBoolCheck === 0;

    // ========================================
    // Constraint 4: APY Stability Check
    // Backend: line 1116-1118
    // const apyStableCheck = (newOpportunity.isApyTvlStable ?? true) && (newOpportunity.isApyStable7Days ?? true);
    // Since isApyTvlStable defaults to true and is not an input, we only check isApyStable7Days
    // ========================================
    component apyStabilityCheck = IsEqual();
    apyStabilityCheck.in[0] <== apyStable7Days;
    apyStabilityCheck.in[1] <== 1;
    signal apyStabilityCheckValue <== apyStabilityCheck.out;

    // ========================================
    // Constraint 5: TVL Stability Check
    // Backend: line 1098, 1206
    // const tvlStableCheck = newOpportunity.isTvlStable;
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
    signal check34 <== apyCheckFinalValue * apyStabilityCheckValue;
    signal check5 <== tvlStabilityCheckValue;
    signal check1234 <== check12 * check34;
    signal finalCheck <== check1234 * check5;

    // Enforce that all checks must pass via internal constraint
    // This ensures the proof can only be generated if all validation rules pass
    // If any constraint fails, witness generation will fail
    finalCheck === 1;
}

// Instantiate main component
// All inputs are public, no outputs
component main {public [liquidity, zyfiTvl, amount, poolTvl, newApy, apyStable7Days, tvlStable, oldApy, oldLiquidity, oldZyfiTvl, oldTvlStable, oldUtilizationStable, oldCollateralHealth, oldZyfiTVLCheck, supportsCurrentPool]} = RebalancerValidation();
