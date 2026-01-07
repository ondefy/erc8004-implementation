pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

template RebalancerValidation() {
    signal input liquidity;
    signal input zyfiTvl;
    signal input amount;
    signal input poolTvl;
    signal input newApy;
    signal input apyStable7Days;
    signal input tvlStable;
    
    signal input oldApy;
    signal input oldLiquidity;
    signal input oldZyfiTvl;
    signal input oldTvlStable;
    signal input oldUtilizationStable;
    signal input oldCollateralHealth;
    signal input oldZyfiTVLCheck;
    
    signal input supportsCurrentPool;

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
    
    signal oldLiquidityLowLeft <== oldLiquidity * 85;
    signal oldLiquidityLowRight <== oldZyfiTvl * 100;
    component oldLiquidityLowCheck = GreaterThan(252);
    oldLiquidityLowCheck.in[0] <== oldLiquidityLowRight;
    oldLiquidityLowCheck.in[1] <== oldLiquidityLowLeft;
    signal oldLiquidityIsLow <== oldLiquidityLowCheck.out;
    
    signal oldZyfiTVLCheckFailed <== 1 - oldZyfiTVLCheck;
    
    signal oldTvlStableCheckFailed <== 1 - oldTvlStable;
    
    signal oldUtilizationStableCheckFailed <== 1 - oldUtilizationStable;
    
    signal oldCollateralHealthCheckFailed <== 1 - oldCollateralHealth;
    
    signal oldIssuesOr <== oldZyfiTVLCheckFailed + oldTvlStableCheckFailed + oldLiquidityIsLow + oldUtilizationStableCheckFailed + oldCollateralHealthCheckFailed;
    component oldIssuesCheck = GreaterThan(252);
    oldIssuesCheck.in[0] <== oldIssuesOr;
    oldIssuesCheck.in[1] <== 0;
    signal oldIssuesValue <== oldIssuesCheck.out;
    
    signal shouldRebalanceFromOldValue <== enoughLiquidityValue * oldIssuesValue;
    
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

component main {public [liquidity, zyfiTvl, amount, poolTvl, newApy, apyStable7Days, tvlStable, oldApy, oldLiquidity, oldZyfiTvl, oldTvlStable, oldUtilizationStable, oldCollateralHealth, oldZyfiTVLCheck, supportsCurrentPool]} = RebalancerValidation();
