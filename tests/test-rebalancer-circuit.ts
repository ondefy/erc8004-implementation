/**
 * Test script for rebalancer validation circuit
 * Tests all edge cases, especially rebalancing to lower APY scenarios
 *
 * Usage:
 *   npm run test:rebalancer-circuit
 *   or
 *   ts-node tests/test-rebalancer-circuit.ts
 */

import * as fs from "fs";
import * as path from "path";
import { groth16 } from "snarkjs";
import { createPublicClient, http, formatUnits } from "viem";
import { foundry } from "viem/chains";

interface TestCase {
  name: string;
  description: string;
  expectedResult: "PASS" | "FAIL";
  input: {
    liquidity: number;
    zyfiTvl: number;
    amount: number;
    poolTvl: number;
    newApy: number;
    apyStable7Days: number;
    tvlStable: number;
    oldApy: number;
    oldLiquidity: number;
    oldZyfiTvl: number;
    oldTvlStable: number;
    oldUtilizationStable: number;
    oldCollateralHealth: number;
    oldZyfiTVLCheck: number;
    supportsCurrentPool: number;
  };
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  results: Array<{
    testCase: string;
    expected: "PASS" | "FAIL";
    actual: "PASS" | "FAIL" | "ERROR";
    error?: string;
    proofGenerated: boolean;
  }>;
}

async function generateProof(input: TestCase["input"]): Promise<{
  proof: any;
  publicSignals: string[];
} | null> {
  try {
    const buildDir = path.join(process.cwd(), "build", "rebalancer-validation");
    const wasmPath = path.join(
      buildDir,
      "rebalancer-validation_js",
      "rebalancer-validation.wasm"
    );
    const zkeyPath = path.join(buildDir, "rebalancer_validation_final.zkey");

    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      throw new Error(
        `ZK artifacts not found. Run: npm run setup:zkp:rebalancer`
      );
    }

    const { proof, publicSignals } = await groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );

    return { proof, publicSignals };
  } catch (error: any) {
    return null;
  }
}

async function verifyProofOnChain(
  proof: any,
  publicSignals: string[],
  verifierAddress: string,
  rpcUrl: string
): Promise<boolean> {
  try {
    // Create public client
    const publicClient = createPublicClient({
      chain: foundry,
      transport: http(rpcUrl),
    });

    // RebalancerVerifier ABI
    const verifierAbi = [
      {
        inputs: [
          {
            internalType: "uint256[2]",
            name: "_pA",
            type: "uint256[2]",
          },
          {
            internalType: "uint256[2][2]",
            name: "_pB",
            type: "uint256[2][2]",
          },
          {
            internalType: "uint256[2]",
            name: "_pC",
            type: "uint256[2]",
          },
          {
            internalType: "uint256[15]",
            name: "_pubSignals",
            type: "uint256[15]",
          },
        ],
        name: "verifyProof",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    // Format proof for Solidity
    const pA: [bigint, bigint] = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
    const pB: [[bigint, bigint], [bigint, bigint]] = [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ];
    const pC: [bigint, bigint] = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];

    // Convert public signals to BigInt array (15 signals)
    const pubSignals: [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint
    ] = publicSignals.map((s) => BigInt(s)) as any;

    // Verify proof
    const isValid = await publicClient.readContract({
      address: verifierAddress as `0x${string}`,
      abi: verifierAbi,
      functionName: "verifyProof",
      args: [pA, pB, pC, pubSignals],
    });

    return isValid;
  } catch (error: any) {
    console.error("Verification error:", error.message);
    return false;
  }
}

async function runTestCases(): Promise<void> {
  console.log("🧪 Rebalancer Circuit Test Suite\n");
  console.log("=".repeat(80));

  // Load test cases
  const testCasesPath = path.join(
    process.cwd(),
    "tests",
    "rebalancer-circuit-test-cases.json"
  );
  const testCasesData = JSON.parse(fs.readFileSync(testCasesPath, "utf-8"));
  const testCases: TestCase[] = testCasesData.testCases;

  const results: TestResults = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    results: [],
  };

  // Check if verifier address is provided
  const verifierAddress = process.env.REBALANCER_VERIFIER_ADDRESS;
  const rpcUrl = process.env.RPC_URL || "http://localhost:8545";
  let useOnChainVerification = false;

  if (verifierAddress) {
    try {
      // Test connection
      const testClient = createPublicClient({
        chain: foundry,
        transport: http(rpcUrl),
      });
      await testClient.getBlockNumber();
      useOnChainVerification = true;
      console.log(`📡 Using on-chain verification at: ${verifierAddress}`);
      console.log(`🔗 RPC URL: ${rpcUrl}\n`);
    } catch (error) {
      console.warn(
        "⚠️  Could not connect to RPC, skipping on-chain verification\n"
      );
    }
  } else {
    console.log(
      "ℹ️  REBALANCER_VERIFIER_ADDRESS not set, skipping on-chain verification\n"
    );
  }

  // Run each test case
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] ${testCase.name}`);
    console.log(`   ${testCase.description}`);
    console.log(`   Expected: ${testCase.expectedResult}`);

    try {
      // Generate proof
      const proofResult = await generateProof(testCase.input);

      if (!proofResult) {
        // Proof generation failed
        if (testCase.expectedResult === "FAIL") {
          // Expected to fail, so this is correct
          results.passed++;
          results.results.push({
            testCase: testCase.name,
            expected: testCase.expectedResult,
            actual: "FAIL",
            proofGenerated: false,
          });
          console.log(`   ✅ PASS - Proof generation failed as expected`);
        } else {
          // Expected to pass but failed
          results.failed++;
          results.results.push({
            testCase: testCase.name,
            expected: testCase.expectedResult,
            actual: "ERROR",
            error: "Proof generation failed unexpectedly",
            proofGenerated: false,
          });
          console.log(`   ❌ FAIL - Proof generation failed unexpectedly`);
        }
        continue;
      }

      const { proof, publicSignals } = proofResult;

      // Verify on-chain if enabled
      if (useOnChainVerification && verifierAddress) {
        const isValid = await verifyProofOnChain(
          proof,
          publicSignals,
          verifierAddress,
          rpcUrl
        );

        if (isValid && testCase.expectedResult === "PASS") {
          results.passed++;
          results.results.push({
            testCase: testCase.name,
            expected: testCase.expectedResult,
            actual: "PASS",
            proofGenerated: true,
          });
          console.log(`   ✅ PASS - Proof generated and verified on-chain`);
        } else if (!isValid && testCase.expectedResult === "FAIL") {
          results.passed++;
          results.results.push({
            testCase: testCase.name,
            expected: testCase.expectedResult,
            actual: "FAIL",
            proofGenerated: true,
          });
          console.log(
            `   ✅ PASS - Proof generated but verification failed as expected`
          );
        } else {
          results.failed++;
          results.results.push({
            testCase: testCase.name,
            expected: testCase.expectedResult,
            actual: isValid ? "PASS" : "FAIL",
            error: isValid
              ? "Proof verified but expected to fail"
              : "Proof failed verification but expected to pass",
            proofGenerated: true,
          });
          console.log(
            `   ❌ FAIL - Verification mismatch: ${
              isValid ? "verified" : "failed"
            } but expected ${testCase.expectedResult}`
          );
        }
      } else {
        // Off-chain verification only (proof generation success = pass)
        if (testCase.expectedResult === "PASS") {
          results.passed++;
          results.results.push({
            testCase: testCase.name,
            expected: testCase.expectedResult,
            actual: "PASS",
            proofGenerated: true,
          });
          console.log(`   ✅ PASS - Proof generated successfully`);
        } else {
          results.failed++;
          results.results.push({
            testCase: testCase.name,
            expected: testCase.expectedResult,
            actual: "PASS",
            error: "Proof generated but expected to fail",
            proofGenerated: true,
          });
          console.log(`   ❌ FAIL - Proof generated but expected to fail`);
        }
      }
    } catch (error: any) {
      results.failed++;
      results.results.push({
        testCase: testCase.name,
        expected: testCase.expectedResult,
        actual: "ERROR",
        error: error.message,
        proofGenerated: false,
      });
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 Test Summary");
  console.log("=".repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(
    `Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`
  );

  if (results.failed > 0) {
    console.log("\n❌ Failed Tests:");
    results.results
      .filter((r) => r.expected !== r.actual)
      .forEach((r) => {
        console.log(
          `   - ${r.testCase}: Expected ${r.expected}, got ${r.actual}`
        );
        if (r.error) {
          console.log(`     Error: ${r.error}`);
        }
      });
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTestCases().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
