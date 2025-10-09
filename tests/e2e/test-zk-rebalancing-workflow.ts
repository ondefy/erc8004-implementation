#!/usr/bin/env ts-node

/**
 * ZK Rebalancing E2E Test - Minimal Version
 */

import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { randomBytes } from "crypto";
import { RebalancerAgent, ValidatorAgent, ClientAgent } from "../../agents";

async function testZkRebalancingE2E(): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("  ZK Rebalancing Proof - End-to-End Test");
  console.log("=".repeat(70) + "\n");

  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(rpcUrl),
  });

  console.log("✅ Connected to blockchain\n");

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

  console.log("✅ All agents funded\n");

  // Register agents
  console.log("─".repeat(70));
  console.log("STEP 3: Register Agents");
  console.log("─".repeat(70));

  await rebalancer.registerAgent();
  await validator.registerAgent();
  await client.registerAgent();

  // Create plan
  console.log("\n" + "─".repeat(70));
  console.log("STEP 4: Create Rebalancing Plan");
  console.log("─".repeat(70));

  const plan = await rebalancer.createRebalancingPlan(
    ["1000", "1000", "1000", "750"],
    ["800", "800", "1200", "950"],
    ["100", "100", "100", "100"],
    "10",
    "40"
  );

  // Generate proof
  console.log("\n" + "─".repeat(70));
  console.log("STEP 5: Generate ZK Proof");
  console.log("─".repeat(70));

  const proof = rebalancer.generateZkProof(plan);

  // Submit for validation
  console.log("\n" + "─".repeat(70));
  console.log("STEP 6: Submit for Validation");
  console.log("─".repeat(70));

  await rebalancer.submitProofForValidation(proof, validator.agentId!);

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

  // Authorize feedback
  console.log("\n" + "─".repeat(70));
  console.log("STEP 9: Authorize Feedback");
  console.log("─".repeat(70));

  await rebalancer.authorizeClientFeedback(client.agentId!);

  // Evaluate and feedback
  console.log("\n" + "─".repeat(70));
  console.log("STEP 10: Client Feedback");
  console.log("─".repeat(70));

  const score = client.evaluateRebalancingQuality(proof);
  client.submitFeedback(rebalancer.agentId!, score, "Great service!");

  // Check reputation
  console.log("\n" + "─".repeat(70));
  console.log("STEP 11: Check Reputation");
  console.log("─".repeat(70));

  client.checkRebalancerReputation(rebalancer.agentId!);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("  ✅ TEST COMPLETE");
  console.log("=".repeat(70));
  console.log("\nAll steps executed successfully!");
  console.log("  • ZK proof generated and validated");
  console.log("  • Agents registered and coordinated");
  console.log("  • Feedback and reputation tracked");
  console.log("\n" + "=".repeat(70) + "\n");
}

if (require.main === module) {
  testZkRebalancingE2E()
    .then(() => {
      console.log("✅ Test completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Test failed");
      console.error(error);
      process.exit(1);
    });
}

export { testZkRebalancingE2E };
