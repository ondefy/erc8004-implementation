/**
 * Browser-based ZK proof generation using snarkjs
 * This replaces the Node.js API route for Vercel compatibility
 */

import { groth16 } from 'snarkjs';

export interface PortfolioInput {
  oldBalances: string[];
  newBalances: string[];
  prices: string[];
  minAllocationPct: string;
  maxAllocationPct: string;
}

export interface ProofResult {
  proof: any;
  publicInputs: string[];
  success: boolean;
  error?: string;
}

/**
 * Generate ZK proof in the browser
 * @param input Portfolio rebalancing input data
 * @returns Proof and public inputs
 */
export async function generateProofInBrowser(
  input: PortfolioInput
): Promise<ProofResult> {
  try {
    console.log('🔐 Starting browser-based proof generation...');
    console.log('Input data:', input);

    // Calculate total value commitment
    const newTotalValue = input.newBalances.reduce(
      (sum, bal, i) => sum + parseInt(bal) * parseInt(input.prices[i]),
      0
    );

    // Create circuit input (matching rebalancer-agent.ts format)
    const circuitInput = {
      oldBalances: input.oldBalances,
      newBalances: input.newBalances,
      prices: input.prices,
      totalValueCommitment: String(newTotalValue),
      minAllocationPct: input.minAllocationPct,
      maxAllocationPct: input.maxAllocationPct,
    };

    console.log('Circuit input:', circuitInput);

    // Load WASM and zkey files from public directory
    console.log('Loading ZK artifacts...');
    const wasmPath = '/zk-artifacts/rebalancing.wasm';
    const zkeyPath = '/zk-artifacts/rebalancing_final.zkey';

    // Generate proof using snarkjs groth16.fullProve
    console.log('Generating proof...');
    const { proof, publicSignals } = await groth16.fullProve(
      circuitInput,
      wasmPath,
      zkeyPath
    );

    console.log('✅ Proof generated successfully!');
    console.log('Public signals:', publicSignals);

    return {
      proof,
      publicInputs: publicSignals,
      success: true,
    };
  } catch (error) {
    console.error('❌ Error generating proof:', error);
    return {
      proof: null,
      publicInputs: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate that input data is correct format
 */
export function validatePortfolioInput(input: PortfolioInput): {
  valid: boolean;
  error?: string;
} {
  // Check all arrays have same length
  if (
    input.oldBalances.length !== input.newBalances.length ||
    input.oldBalances.length !== input.prices.length
  ) {
    return {
      valid: false,
      error: 'All balance and price arrays must have the same length',
    };
  }

  // Check exactly 4 assets (circuit is compiled for n=4)
  if (input.oldBalances.length !== 4) {
    return {
      valid: false,
      error: 'Portfolio must have exactly 4 assets (circuit limitation)',
    };
  }

  // Validate all values are positive numbers
  const allValues = [
    ...input.oldBalances,
    ...input.newBalances,
    ...input.prices,
    input.minAllocationPct,
    input.maxAllocationPct,
  ];

  for (const val of allValues) {
    const num = parseInt(val);
    if (isNaN(num) || num < 0) {
      return {
        valid: false,
        error: `Invalid value: ${val}. All values must be non-negative numbers`,
      };
    }
  }

  // Validate percentage ranges
  const minPct = parseInt(input.minAllocationPct);
  const maxPct = parseInt(input.maxAllocationPct);

  if (minPct < 0 || minPct > 100) {
    return {
      valid: false,
      error: 'Min allocation percentage must be between 0 and 100',
    };
  }

  if (maxPct < 0 || maxPct > 100) {
    return {
      valid: false,
      error: 'Max allocation percentage must be between 0 and 100',
    };
  }

  if (minPct > maxPct) {
    return {
      valid: false,
      error: 'Min allocation percentage must be less than or equal to max',
    };
  }

  return { valid: true };
}
