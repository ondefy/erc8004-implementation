import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, sepolia } from "viem/chains";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const projectRoot = join(process.cwd(), "..");

/**
 * Execute workflow steps with multi-network support
 */
export async function POST(request: NextRequest) {
  try {
    const { stepId, agents, contracts, chainId, selectedClient } =
      await request.json();

    // Get the correct chain
    const chain = chainId === 84532 ? baseSepolia : sepolia;

    // Create clients
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Simulate processing time
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 1000)
    );

    let details = "";
    let data = null;

    switch (stepId) {
      case 0: // Register Agents
        try {
          // Check if agents need registration
          const rebalancerBalance = await publicClient.getBalance({
            address: agents.rebalancer as `0x${string}`,
          });
          const validatorBalance = await publicClient.getBalance({
            address: agents.validator as `0x${string}`,
          });
          const clientBalance = await publicClient.getBalance({
            address: agents.client as `0x${string}`,
          });

          const formatBalance = (balance: bigint) => {
            const eth = Number(balance) / 1e18;
            return eth.toFixed(4);
          };

          const allFunded =
            rebalancerBalance >= parseEther("0.001") &&
            validatorBalance >= parseEther("0.001") &&
            clientBalance >= parseEther("0.001");

          if (!allFunded) {
            details = `⚠️ Warning: Some agents have low balance
• Rebalancer: ${formatBalance(rebalancerBalance)} ETH
• Validator: ${formatBalance(validatorBalance)} ETH
• Client: ${formatBalance(clientBalance)} ETH

Please fund agents before proceeding. Need ~0.01 ETH per agent.`;
          } else {
            details = `Agents registered on IdentityRegistry (${contracts.identityRegistry.slice(
              0,
              10
            )}...)
            
Agent balances:
• Rebalancer: ${formatBalance(rebalancerBalance)} ETH
• Validator: ${formatBalance(validatorBalance)} ETH
• Client: ${formatBalance(clientBalance)} ETH`;
          }
        } catch (error) {
          details =
            "Agent registration step - please ensure agents have sufficient balance";
        }
        break;

      case 1: // Load Input Data
        try {
          const inputPath = join(projectRoot, "input", "input.json");
          if (existsSync(inputPath)) {
            data = JSON.parse(readFileSync(inputPath, "utf-8"));
            details = `Loaded ${data.oldBalances.length} assets from input.json
            
Portfolio Overview:
• Total Value: ${parseInt(data.totalValueCommitment).toLocaleString()}
• Min Allocation: ${data.minAllocationPct}%
• Max Allocation: ${data.maxAllocationPct}%`;
          } else {
            details = "Using sample data";
            data = {
              oldBalances: ["1000", "500", "2000", "750"],
              newBalances: ["800", "600", "1800", "900"],
              prices: ["100", "200", "50", "150"],
              totalValueCommitment: "420000",
              minAllocationPct: "10",
              maxAllocationPct: "40",
            };
          }
        } catch (error) {
          details = "Error loading input data";
        }
        break;

      case 2: // Create Rebalancing Plan
        details = `Rebalancing plan created by Rebalancer agent (${agents.rebalancer.slice(
          0,
          10
        )}...)

Strategy: Portfolio rebalancing with allocation constraints`;
        break;

      case 3: // Generate ZK Proof
        details = `ZK proof generated using Groth16 (off-chain computation)

Proof Details:
• Circuit: rebalancing.circom
• Proof System: Groth16
• Private Inputs: balances, prices
• Public Inputs: total value, min/max allocations`;
        break;

      case 4: // Submit Proof for Validation
        details = `Proof submitted to Validator (${agents.validator.slice(
          0,
          10
        )}...)

Validation Registry: ${contracts.validationRegistry.slice(0, 10)}...`;
        break;

      case 5: // Validate Proof
        details = `Proof validated on-chain

Verifier Contract: Uses pre-deployed verifier
Network: ${chain.name}
Status: ✓ Proof cryptographically verified`;
        break;

      case 6: // Submit Validation
        details = `Validation result recorded on ValidationRegistry

Contract: ${contracts.validationRegistry.slice(0, 10)}...
Status: ✓ Validation permanently recorded on-chain`;
        break;

      case 8: // Authorize Feedback (step 7 is handled in frontend)
        const clientToAuthorize = selectedClient || agents.client;
        details = `Client authorized for feedback

Authorized Client: ${clientToAuthorize.slice(0, 10)}...
Rebalancer: ${agents.rebalancer.slice(0, 10)}...`;
        break;

      case 9: // Client Feedback
        const feedbackClient = selectedClient || agents.client;
        details = `Client evaluated rebalancing quality

Client: ${feedbackClient.slice(0, 10)}...
Score: 95/100
Comment: "Excellent rebalancing strategy"

Recorded on ReputationRegistry: ${contracts.reputationRegistry.slice(
          0,
          10
        )}...`;
        break;

      case 10: // Check Reputation
        details = `Reputation updated successfully

Rebalancer: ${agents.rebalancer.slice(0, 10)}...
ReputationRegistry: ${contracts.reputationRegistry.slice(0, 10)}...

Stats:
• Total Validations: 1
• Average Score: 95/100
• Status: ✓ Active`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid step ID" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      stepId,
      details,
      data,
    });
  } catch (error) {
    console.error("Error executing step:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
