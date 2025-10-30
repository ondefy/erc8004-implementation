pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

// RebalancingProof Circuit
// 
// Proves that a portfolio rebalancing operation satisfies constraints
// without revealing actual positions or amounts.
// 
// Private inputs:
// - oldBalances[n]: Array of token balances before rebalancing
// - newBalances[n]: Array of token balances after rebalancing
// - prices[n]: Current prices of each token (in base units)
// 
// Public inputs:
// - totalValueCommitment: Hash commitment of total portfolio value
// - minAllocationPct: Minimum allocation percentage per asset (e.g., 5 = 5%)
// - maxAllocationPct: Maximum allocation percentage per asset (e.g., 40 = 40%)
//

template RebalancingProof(n) {
    // Private inputs
    signal input oldBalances[n];
    signal input newBalances[n];
    signal input prices[n];
    
    // Public inputs (constraints/commitments visible on-chain)
    signal input totalValueCommitment;
    signal input minAllocationPct;
    signal input maxAllocationPct;
    
    // Intermediate signals
    signal oldValues[n];
    signal newValues[n];
    
    // Calculate old portfolio values
    for (var i = 0; i < n; i++) {
        oldValues[i] <== oldBalances[i] * prices[i];
    }
    
    // Calculate new portfolio values
    for (var i = 0; i < n; i++) {
        newValues[i] <== newBalances[i] * prices[i];
    }
    
    // Constraint 1: Total value should be preserved
    // Sum old values
    signal oldSums[n];
    oldSums[0] <== oldValues[0];
    for (var i = 1; i < n; i++) {
        oldSums[i] <== oldSums[i-1] + oldValues[i];
    }
    
    // Sum new values
    signal newSums[n];
    newSums[0] <== newValues[0];
    for (var i = 1; i < n; i++) {
        newSums[i] <== newSums[i-1] + newValues[i];
    }
    
    // Check that total values are equal and match the commitment
    signal valueDiff;
    valueDiff <== oldSums[n-1] - newSums[n-1];
    valueDiff === 0;
    newSums[n-1] === totalValueCommitment;
    
    // Constraint 2: Check allocation limits for each asset
    // Verify: newValue[i] * 100 >= minAllocationPct * totalValue
    // and: newValue[i] * 100 <= maxAllocationPct * totalValue
    signal scaledValues[n];
    signal minBound[n];
    signal maxBound[n];
    
    // Enforce allocation constraints
    // For min: (scaledValues >= minBound) ≡ (scaledValues > minBound - 1)
    // For max: (scaledValues <= maxBound) ≡ (scaledValues < maxBound + 1)
    component minChecks[n];
    component maxChecks[n];
    signal minCheckResults[n];
    signal maxCheckResults[n];
    
    for (var i = 0; i < n; i++) {
        // Scale up by 100 for percentage
        scaledValues[i] <== newValues[i] * 100;
        
        // Calculate bounds: minAllocationPct * totalValue and maxAllocationPct * totalValue
        minBound[i] <== minAllocationPct * newSums[n-1];
        maxBound[i] <== maxAllocationPct * newSums[n-1];
        
        // Enforce minimum allocation: scaledValues[i] > minBound[i] - 1
        // This is equivalent to: scaledValues[i] >= minBound[i]
        minChecks[i] = GreaterThan(252);
        minChecks[i].in[0] <== scaledValues[i];
        minChecks[i].in[1] <== minBound[i] - 1;
        
        // Enforce the constraint
        minCheckResults[i] <== minChecks[i].out - 1;
        minCheckResults[i] === 0;
        
        // Enforce maximum allocation: scaledValues[i] < maxBound[i] + 1
        // This is equivalent to: scaledValues[i] <= maxBound[i]
        maxChecks[i] = LessThan(252);
        maxChecks[i].in[0] <== scaledValues[i];
        maxChecks[i].in[1] <== maxBound[i] + 1;
        
        // Enforce the constraint
        maxCheckResults[i] <== maxChecks[i].out - 1;
        maxCheckResults[i] === 0;
    }
    
}

// Instantiate for a 4-asset portfolio, exposing only commitments and parameters as public
component main {public [totalValueCommitment, minAllocationPct, maxAllocationPct]} = RebalancingProof(4);