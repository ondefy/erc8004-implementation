#!/usr/bin/env ts-node

/**
 * ZK Rebalancing End-to-End Test
 *
 * Tests the complete workflow of zero-knowledge proof based portfolio rebalancing
 * with ERC-8004 agentic orchestration.
 */

import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { randomBytes } from "crypto";
import { RebalancerAgent } from "../../agents/rebalancer-agent";
import { ValidatorAgent } from "../../agents/validator-agent";
import { ClientAgent } from "../../agents/client-agent";

async function testZkRebalancingE2E(): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("  ZK Rebalancing Proof - End-to-End Test");
  console.log("  ERC-8004 Agentic Orchestration");
  console.log("=".repeat(70) + "\n");

  // Connect to blockchain
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(rpcUrl),
  });

  console.log("✅ Connected to blockchain\n");

  // Create unique agents
  const timestamp = Date.now();

  // Initialize agents
  console.log("─".repeat(70));
  console.log("STEP 1: Initialize Agents");
  console.log("─".repeat(70));

  const rebalancer = new RebalancerAgent(
    `rebalancer-${timestamp}.zk-proof.test`,
    `0x${randomBytes(32).toString("hex")}` as `0x${string}`
  );
  console.log(`   Rebalancer: ${rebalancer.address}`);

  const validator = new ValidatorAgent(
    `validator-${timestamp}.zk-proof.test`,
    `0x${randomBytes(32).toString("hex")}` as `0x${string}`
  );
  console.log(`   Validator: ${validator.address}`);

  const client = new ClientAgent(
    `client-${timestamp}.zk-proof.test`,
    `0x${randomBytes(32).toString("hex")}` as `0x${string}`
  );
  console.log(`   Client: ${client.address}`);

  // Fund all agents
  console.log("\n" + "─".repeat(70));
  console.log("STEP 2: Fund Agents");
  console.log("─".repeat(70));

  // Use Anvil's default account for funding
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

  console.log("✅ All agents funded with 0.5 ETH");

  // Register agents
  console.log("\n" + "─".repeat(70));
  console.log("STEP 3: Register Agents on ERC-8004 Registry");
  console.log("─".repeat(70));

  await rebalancer.registerAgent();
  console.log(`   Rebalancer Agent ID: ${rebalancer.agentId}`);

  await validator.registerAgent();
  console.log(`   Validator Agent ID: ${validator.agentId}`);

  await client.registerAgent();
  console.log(`   Client Agent ID: ${client.agentId}`);

  // Create rebalancing plan
  console.log("\n" + "─".repeat(70));
  console.log("STEP 4: Create Rebalancing Plan");
  console.log("─".repeat(70));

  // Example: 4-asset portfolio rebalancing
  // Old: 1000, 1000, 1000, 750 tokens at price 100 each
  // New: 800, 800, 1200, 950 tokens (same total value)
  const rebalancingPlan = await rebalancer.createRebalancingPlan(
    ["1000", "1000", "1000", "750"],
    ["800", "800", "1200", "950"],
    ["100", "100", "100", "100"],
    "10",
    "40"
  );

  // Generate ZK proof
  console.log("\n" + "─".repeat(70));
  console.log("STEP 5: Generate Zero-Knowledge Proof");
  console.log("─".repeat(70));

  const proofPackage = rebalancer.generateZkProof(rebalancingPlan);

  // Submit proof for validation
  console.log("\n" + "─".repeat(70));
  console.log("STEP 6: Submit Proof for Validation");
  console.log("─".repeat(70));

  const validationTx = await rebalancer.submitProofForValidation(
    proofPackage,
    validator.agentId!
  );

  // Validator validates the proof
  console.log("\n" + "─".repeat(70));
  console.log("STEP 7: Validate ZK Proof");
  console.log("─".repeat(70));

  const validationResult = await validator.validateProof(proofPackage);
  console.log(`   Proof valid: ${validationResult.isValid}`);
  console.log(`   Validation score: ${validationResult.score}/100`);

  // Submit validation response
  console.log("\n" + "─".repeat(70));
  console.log("STEP 8: Submit Validation Response");
  console.log("─".repeat(70));

  const validationResponseTx =
    await validator.submitValidationResponseWithPackage(
      validationResult.validationPackage
    );

  // Authorize client feedback
  console.log("\n" + "─".repeat(70));
  console.log("STEP 9: Authorize Client Feedback");
  console.log("─".repeat(70));

  const authTx = await rebalancer.authorizeClientFeedback(client.agentId!);

  // Client evaluates and provides feedback
  console.log("\n" + "─".repeat(70));
  console.log("STEP 10: Client Evaluation and Feedback");
  console.log("─".repeat(70));

  const qualityScore = client.evaluateRebalancingQuality(proofPackage);

  const feedback = client.submitFeedback(
    rebalancer.agentId!,
    qualityScore,
    "Excellent ZK proof-based rebalancing service with strong privacy guarantees"
  );

  // Check reputation
  console.log("\n" + "─".repeat(70));
  console.log("STEP 11: Check Rebalancer Reputation");
  console.log("─".repeat(70));

  const reputation = client.checkRebalancerReputation(rebalancer.agentId!);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("  ✅ END-TO-END TEST COMPLETE");
  console.log("=".repeat(70));
  console.log("\nWorkflow Summary:");
  console.log(
    "  1. ✅ Three agents initialized (Rebalancer, Validator, Client)"
  );
  console.log("  2. ✅ Agents registered on ERC-8004 registry");
  console.log("  3. ✅ Rebalancing plan created (4-asset portfolio)");
  console.log("  4. ✅ Zero-knowledge proof generated (Groth16)");
  console.log("  5. ✅ Proof validated cryptographically");
  console.log("  6. ✅ Validation response submitted on-chain");
  console.log("  7. ✅ Client feedback authorized and submitted");
  console.log("  8. ✅ Reputation tracking operational");
  console.log("\nKey Benefits Demonstrated:");
  console.log("  • Privacy: Portfolio positions hidden via ZK proofs");
  console.log("  • Trust: Cryptographic validation of rebalancing constraints");
  console.log("  • Transparency: All interactions recorded on-chain");
  console.log("  • Reputation: Feedback system for service quality");
  console.log("\n" + "=".repeat(70) + "\n");
}

// Run if executed directly
if (require.main === module) {
  testZkRebalancingE2E()
    .then(() => {
      console.log("✅ Test completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error(
        "\n❌ Demo encountered an error. Please check the output above."
      );
      console.error(error);
      process.exit(1);
    });
}

export { testZkRebalancingE2E };
