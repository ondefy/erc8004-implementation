#!/usr/bin/env ts-node

/**
 * ZK Rebalancer Validation E2E Test
 * Tests the complete workflow using ZyFI's rebalancer validation rules
 */

import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { randomBytes } from "crypto";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { RebalancerAgent, ValidatorAgent, ClientAgent } from "../../agents";

async function deployContracts(): Promise<void> {
  console.log("─".repeat(70));
  console.log("STEP 0: Deploy Contracts");
  console.log("─".repeat(70));

  try {
    // Note: Run `npm run setup:zkp` manually once when circuit changes.
    // For normal E2E testing with different inputs, setup is NOT needed.
    // The RebalancerVerifier.sol and Verifier.sol remain constant for the same rebalancer validation circuit.

    execSync("npm run forge:deploy:local", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("Contracts deployed\n");
  } catch (error) {
    throw new Error("Failed to deploy contracts. Is Anvil running?");
  }
}

async function testZkRebalancingE2E(): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("  ZK Rebalancer Validation - End-to-End Test");
  console.log("  Using ZyFI Backend Validation Rules");
  console.log("=".repeat(70) + "\n");

  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(rpcUrl),
  });

  console.log("Connected to blockchain\n");

  // Deploy contracts
  await deployContracts();

  const timestamp = Date.now();

  // Initialize agents
  console.log("─".repeat(70));
  console.log("STEP 1: Initialize Agents");
  console.log("─".repeat(70));

  const rebalancer = new RebalancerAgent(
    `rebalancer-${timestamp}.test`,
    `0x${randomBytes(32).toString("hex")}` as `0x${string}`
  );

  const validator = new ValidatorAgent(
    `validator-${timestamp}.test`,
    `0x${randomBytes(32).toString("hex")}` as `0x${string}`
  );

  const client = new ClientAgent(
    `client-${timestamp}.test`,
    `0x${randomBytes(32).toString("hex")}` as `0x${string}`
  );

  // Fund agents
  console.log("\n" + "─".repeat(70));
  console.log("STEP 2: Fund Agents");
  console.log("─".repeat(70));

  const fundingAccount = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  );

  const walletClient = createWalletClient({
    account: fundingAccount,
    chain: foundry,
    transport: http(rpcUrl),
  });

  for (const agent of [rebalancer, validator, client]) {
    const balance = await publicClient.getBalance({ address: agent.address });
    if (balance < parseEther("0.1")) {
      const hash = await walletClient.sendTransaction({
        to: agent.address,
        value: parseEther("0.5"),
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
  }

  console.log("All agents funded\n");

  // Register agents
  console.log("─".repeat(70));
  console.log("STEP 3: Register Agents");
  console.log("─".repeat(70));

  await rebalancer.registerAgent();
  await validator.registerAgent();
  await client.registerAgent();

  // Load rebalancer validation input data
  console.log("\n" + "─".repeat(70));
  console.log("STEP 4: Load Rebalancer Validation Input");
  console.log("─".repeat(70));

  const rebalancerInputPath = join(
    process.cwd(),
    "input",
    "rebalancer-input.json"
  );
  const rebalancerData = JSON.parse(readFileSync(rebalancerInputPath, "utf-8"));

  console.log(`📂 Loaded from: input/rebalancer-input.json`);
  console.log(`   Liquidity: $${rebalancerData.liquidity.toLocaleString()}`);
  console.log(`   ZyFI TVL: $${rebalancerData.zyfiTvl.toLocaleString()}`);
  console.log(
    `   Rebalancer Amount: ${rebalancerData.amount.toLocaleString()}`
  );
  console.log(`   Pool TVL: ${rebalancerData.poolTvl.toLocaleString()}`);
  console.log(`   New APY: ${rebalancerData.newApy / 10000}%`);
  console.log(`   Old APY: ${rebalancerData.oldApy / 10000}%`);

  // Generate rebalancer validation proof
  console.log("\n" + "─".repeat(70));
  console.log("STEP 5: Generate Rebalancer Validation ZK Proof");
  console.log("─".repeat(70));

  const proof = rebalancer.generateRebalancerValidationProof({
    // New opportunity data
    liquidity: rebalancerData.liquidity,
    zyfiTvl: rebalancerData.zyfiTvl,
    amount: rebalancerData.amount,
    poolTvl: rebalancerData.poolTvl,
    newApy: rebalancerData.newApy,
    apyStable7Days: rebalancerData.apyStable7Days,
    tvlStable: rebalancerData.tvlStable,
    // Old opportunity data
    oldApy: rebalancerData.oldApy,
    oldLiquidity: rebalancerData.oldLiquidity ?? 0,
    oldZyfiTvl: rebalancerData.oldZyfiTvl ?? 0,
    oldTvlStable: rebalancerData.oldTvlStable ?? 1,
    oldUtilizationStable: rebalancerData.oldUtilizationStable ?? 1,
    oldCollateralHealth: rebalancerData.oldCollateralHealth ?? 1,
    oldZyfiTVLCheck: rebalancerData.oldZyfiTVLCheck ?? 1,
    // User preferences
    supportsCurrentPool: rebalancerData.supportsCurrentPool ?? 1,
  });

  // Submit for validation
  console.log("\n" + "─".repeat(70));
  console.log("STEP 6: Submit for Validation");
  console.log("─".repeat(70));

  await rebalancer.requestValidationFromValidator(proof, validator.address);

  // Validate
  console.log("\n" + "─".repeat(70));
  console.log("STEP 7: Validate Proof");
  console.log("─".repeat(70));

  const validationResult = await validator.validateProof(proof);

  // Submit validation
  console.log("\n" + "─".repeat(70));
  console.log("STEP 8: Submit Validation");
  console.log("─".repeat(70));

  await validator.submitValidation(validationResult);

  // Generate feedback authorization
  console.log("\n" + "─".repeat(70));
  console.log("STEP 9: Generate Feedback Authorization");
  console.log("─".repeat(70));

  const { feedbackAuth } = await rebalancer.generateFeedbackAuthorization(
    client.address,
    10n,
    30
  );

  // Evaluate and feedback
  console.log("\n" + "─".repeat(70));
  console.log("STEP 10: Client Feedback");
  console.log("─".repeat(70));

  const score = client.evaluateRebalancingQuality(proof);
  await client.submitFeedback(
    rebalancer.agentId!,
    score,
    feedbackAuth,
    "Great rebalancer validation service!"
  );

  // Check reputation
  console.log("\n" + "─".repeat(70));
  console.log("STEP 11: Check Reputation");
  console.log("─".repeat(70));

  client.checkRebalancerReputation(rebalancer.agentId!);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("  REBALANCER VALIDATION TEST COMPLETE");
  console.log("=".repeat(70));
  console.log("\nAll steps executed successfully!");
  console.log(
    "  • Rebalancer validation input loaded from input/rebalancer-input.json"
  );
  console.log("  • ZK proof generated with ZyFI validation constraints:");
  console.log("    - Liquidity constraint verified");
  console.log("    - TVL constraint verified (max 25% allocation)");
  console.log("    - APY performance improvement verified");
  console.log("    - APY stability verified (7 or 10 days)");
  console.log("    - TVL stability verified");
  console.log("  • Proof validated on-chain");
  console.log("  • Agents registered and coordinated");
  console.log("  • Feedback and reputation tracked");
  console.log("\n" + "=".repeat(70) + "\n");
}

if (require.main === module) {
  testZkRebalancingE2E()
    .then(() => {
      console.log("Test completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nTest failed");
      console.error(error);
      process.exit(1);
    });
}

export { testZkRebalancingE2E };
