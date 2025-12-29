pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";


template RebalancerValidation() {
    // Public inputs - New Opportunity Data
    signal input public liquidity;
    signal input public zyfiTvl;
    signal input public amount;
    signal input public poolTvl;
    signal input public newApy;
    signal input public apyStable7Days;
    signal input public tvlStable;
    
    // Public inputs - Old Opportunity Data (for computing shouldRebalanceFromOld)
    signal input public oldApy;
    signal input public oldLiquidity;
    signal input public oldZyfiTvl;
    signal input public oldTvlStable;
    signal input public oldUtilizationStable;
    signal input public oldCollateralHealth;
    signal input public oldZyfiTVLCheck;
    
    // Public inputs - User Preferences
    signal input public supportsCurrentPool;

    signal liquidityLeft <== liquidity * 85;
    signal liquidityRight <== zyfiTvl * 100;

    component liquidityCheck = GreaterThan(252);
    liquidityCheck.in[0] <== liquidityLeft;
    liquidityCheck.in[1] <== liquidityRight;
    signal liquidityCheckValue <== liquidityCheck.out;

    signal tvlLeft <== poolTvl * 1000000;
    signal tvlRight <== amount * 400;
    component tvlCheck = GreaterThan(252);
    tvlCheck.in[0] <== tvlLeft;
    tvlCheck.in[1] <== tvlRight;
    signal tvlCheckValue <== tvlCheck.out;

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
    

    signal oldLiquidityScaled <== oldLiquidity * 1000000;
    signal amountScaled <== amount * 100;
    component enoughLiquidityCheck = GreaterThan(252);
    enoughLiquidityCheck.in[0] <== oldLiquidityScaled;
    enoughLiquidityCheck.in[1] <== amountScaled;
    signal enoughLiquidityValue <== enoughLiquidityCheck.out;
    
    // Check 2: liqudityIsLow = oldLiquidity * 1.05 < oldZyfiTvl
    // To avoid floating point: oldLiquidity * 105 < oldZyfiTvl * 100
    signal oldLiquidityLowLeft <== oldLiquidity * 105;
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
    
    signal apyCheckOrSkip <== apyCheckValue + oldApyIsZeroValue + shouldRebalanceFromOldValue + notSupportsCurrentPool;
    component apyCheckFinal = GreaterThan(252);
    apyCheckFinal.in[0] <== apyCheckOrSkip;
    apyCheckFinal.in[1] <== 0;
    signal apyCheckFinalValue <== apyCheckFinal.out;

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

    component apyStabilityCheck = IsEqual();
    apyStabilityCheck.in[0] <== apyStable7Days;
    apyStabilityCheck.in[1] <== 1;
    signal apyStabilityCheckValue <== apyStabilityCheck.out;

    component tvlStabilityCheck = IsEqual();
    tvlStabilityCheck.in[0] <== tvlStable;
    tvlStabilityCheck.in[1] <== 1;
    signal tvlStabilityCheckValue <== tvlStabilityCheck.out;

    signal check12 <== liquidityCheckValue * tvlCheckValue;
    signal check34 <== apyCheckFinalValue * apyStabilityCheckValue;
    signal check5 <== tvlStabilityCheckValue;
    signal check1234 <== check12 * check34;
    signal finalCheck <== check1234 * check5;

    finalCheck === 1;
}

// Instantiate main component
// All inputs are public, no outputs
component main = RebalancerValidation();
