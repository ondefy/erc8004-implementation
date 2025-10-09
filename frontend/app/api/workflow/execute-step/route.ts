import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const projectRoot = join(process.cwd(), "..");

// Simulated step execution for demo purposes
// In production, this would call the actual workflow functions
export async function POST(request: NextRequest) {
  try {
    const { stepId } = await request.json();

    // Simulate processing time
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 1000)
    );

    let details = "";
    let data = null;

    switch (stepId) {
      case 0: // Deploy Contracts
        details = "Contracts deployed successfully";
        break;

      case 1: // Initialize Agents
        details = "Created 3 agents: Rebalancer, Validator, Client";
        break;

      case 2: // Fund Agents
        details = "Transferred 0.5 ETH to each agent";
        break;

      case 3: // Register Agents
        details = "All agents registered on-chain";
        break;

      case 4: // Load Input Data
        try {
          const inputPath = join(projectRoot, "input", "input.json");
          if (existsSync(inputPath)) {
            data = JSON.parse(readFileSync(inputPath, "utf-8"));
            details = `Loaded ${data.oldBalances.length} assets`;
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
        details = "Rebalancing plan created";
        break;

      case 6: // Generate ZK Proof
        details = "ZK proof generated using Groth16";
        break;

      case 7: // Submit for Validation
        details = "Proof submitted to validator";
        break;

      case 8: // Validate Proof
        details = "Proof validated on-chain";
        break;

      case 9: // Submit Validation
        details = "Validation result recorded";
        break;

      case 10: // Authorize Feedback
        details = "Client authorized for feedback";
        break;

      case 11: // Client Feedback
        details = "Feedback score: 95/100";
        break;

      case 12: // Check Reputation
        details = "Reputation updated successfully";
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
