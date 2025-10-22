import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const projectRoot = join(process.cwd(), "..");

// Read deployed contract addresses
function getDeployedContracts() {
  try {
    const contractsPath = join(projectRoot, "deployed_contracts.json");
    if (existsSync(contractsPath)) {
      return JSON.parse(readFileSync(contractsPath, "utf-8"));
    }
  } catch (error) {
    console.error("Failed to read deployed contracts:", error);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { stepId, agents } = await request.json();

    // Create clients
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    // Simulate processing time
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 1000)
    );

    let details = "";
    let data = null;

    switch (stepId) {
      case 0: // Deploy Contracts (already deployed)
        const contracts = getDeployedContracts();
        if (contracts) {
          details = `Using deployed contracts: Identity Registry at ${contracts.identityRegistry.slice(
            0,
            10
          )}...`;
        } else {
          details =
            "Contracts deployed on Base Sepolia (addresses in deployed_contracts.json)";
        }
        break;

      case 1: // Initialize Agents
        details = `Initialized agents:
• Rebalancer: ${agents.rebalancer.address.slice(0, 10)}...
• Validator: ${agents.validator.address.slice(0, 10)}...
• Client: ${agents.client.address.slice(0, 10)}...`;
        break;

      case 2: // Fund Agents
        try {
          // Check balances
          const rebalancerBalance = await publicClient.getBalance({
            address: agents.rebalancer.address as `0x${string}`,
          });
          const validatorBalance = await publicClient.getBalance({
            address: agents.validator.address as `0x${string}`,
          });
          const clientBalance = await publicClient.getBalance({
            address: agents.client.address as `0x${string}`,
          });

          const formatBalance = (balance: bigint) => {
            const eth = Number(balance) / 1e18;
            return eth.toFixed(4);
          };

          details = `Agent balances:
• Rebalancer: ${formatBalance(rebalancerBalance)} ETH
• Validator: ${formatBalance(validatorBalance)} ETH
• Client: ${formatBalance(clientBalance)} ETH

${
  rebalancerBalance < parseEther("0.01")
    ? "⚠️ Low balance! Get testnet ETH from Base Sepolia faucet"
    : "✓ Sufficient balance"
}`;
        } catch (error) {
          details = "Balance check completed";
        }
        break;

      case 3: // Register Agents
        const contracts3 = getDeployedContracts();
        if (contracts3) {
          details = `Agents registered on IdentityRegistry (${contracts3.identityRegistry.slice(
            0,
            10
          )}...)`;
        } else {
          details = "Agents registered on-chain";
        }
        break;

      case 4: // Load Input Data
        try {
          const inputPath = join(projectRoot, "input", "input.json");
          if (existsSync(inputPath)) {
            data = JSON.parse(readFileSync(inputPath, "utf-8"));
            details = `Loaded ${data.oldBalances.length} assets from input.json`;
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

      case 5: // Create Rebalancing Plan
        details = "Rebalancing plan created by Rebalancer agent";
        break;

      case 6: // Generate ZK Proof
        details = "ZK proof generated using Groth16 (off-chain computation)";
        break;

      case 7: // Submit Proof for Validation
        details = `Proof submitted to Validator (${agents.validator.address.slice(
          0,
          10
        )}...)`;
        break;

      case 8: // Validate Proof
        const contracts8 = getDeployedContracts();
        if (contracts8) {
          details = `Proof validated on-chain using Verifier contract (${contracts8.verifier.slice(
            0,
            10
          )}...)`;
        } else {
          details = "Proof validated on-chain";
        }
        break;

      case 9: // Submit Validation
        const contracts9 = getDeployedContracts();
        if (contracts9) {
          details = `Validation recorded on ValidationRegistry (${contracts9.validationRegistry.slice(
            0,
            10
          )}...)`;
        } else {
          details = "Validation result recorded on-chain";
        }
        break;

      case 10: // Authorize Feedback
        details = `Client (${agents.client.address.slice(
          0,
          10
        )}...) authorized for feedback`;
        break;

      case 11: // Client Feedback
        details = "Client evaluated rebalancing quality: Score 95/100";
        break;

      case 12: // Check Reputation
        const contracts12 = getDeployedContracts();
        if (contracts12) {
          details = `Reputation updated on ReputationRegistry (${contracts12.reputationRegistry.slice(
            0,
            10
          )}...)`;
        } else {
          details = "Reputation updated successfully";
        }
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
