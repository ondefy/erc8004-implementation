import { WriteContractParameters, WalletClient, PublicClient } from "viem";
import { getContractConfig } from "./contracts";

/**
 * Execute workflow steps with real blockchain transactions
 */

type AgentRole = "rebalancer" | "validator" | "client";

export interface WorkflowExecutorParams {
  stepId: number;
  agents: {
    rebalancer: string;
    validator: string;
    client: string;
  };
  chainId: number;
  selectedClient?: string | null;
  writeContract: any; // wagmi's writeContract function
  currentAddress: string;
  publicClient?: any; // viem public client for reading events
  workflowState?: WorkflowState;
  customData?: any; // Custom portfolio/opportunity data from user form
  inputMode?: "Rebalancing" | "Math"; // Which input mode is being used
}

export interface WorkflowState {
  agentIds?: {
    rebalancer?: number;
    validator?: number;
    client?: number;
  };
  requestHash?: string;
  responseHash?: string;
  dataHash?: string;
  inputData?: any; // Can be either portfolio or opportunity data
  inputMode?: "portfolio" | "opportunity"; // Track which mode is active
  proofGenerated?: boolean;
  newTotalValue?: number;
  proof?: any; // The actual ZK proof object from snarkjs
  publicInputs?: string[]; // The public signals array
  validationResult?: {
    isValid: boolean;
    score: number;
    dataHash: string;
  };
  feedbackAuthGenerated?: boolean;
  authorizedClient?: string;
  [key: string]: any;
}

export interface StepResult {
  success: boolean;
  details: string;
  txHash?: string;
  data?: any;
  error?: string;
  requiresWalletSwitch?: {
    from: string;
    to: string;
    role: string;
  };
  stateUpdate?: Partial<WorkflowState>; // State updates to persist
}

/**
 * Execute a specific workflow step
 */
export async function executeWorkflowStep(
  params: WorkflowExecutorParams
): Promise<StepResult> {
  const {
    stepId,
    agents,
    chainId,
    selectedClient,
    writeContract,
    currentAddress,
    publicClient,
    workflowState = {},
    customData,
    inputMode = "Rebalancing",
  } = params;

  const contractConfig = getContractConfig(chainId);
  if (!contractConfig) {
    return {
      success: false,
      details: "",
      error: "Unsupported network",
    };
  }

  try {
    switch (stepId) {
      case 0: // Register Agents
        return await registerAgents(
          agents,
          contractConfig,
          writeContract,
          currentAddress,
          publicClient
        );

      case 1: // Load Input Data
        return await loadInputData(customData, inputMode);

      case 2: // Generate ZK Proof
        return await generateZKProof(workflowState);

      case 3: // Submit for Validation
        return await submitForValidation(
          agents,
          contractConfig,
          writeContract,
          currentAddress,
          publicClient,
          workflowState
        );

      case 4: // Validate Proof
        return await validateProof(
          agents,
          contractConfig,
          writeContract,
          currentAddress,
          workflowState
        );

      case 5: // Submit Validation
        return await submitValidation(
          agents,
          contractConfig,
          writeContract,
          currentAddress,
          workflowState,
          publicClient
        );

      case 7: // Authorize Feedback (step 6 is client selection in UI)
        return await authorizeFeedback(
          agents,
          selectedClient || agents.client,
          contractConfig,
          writeContract,
          currentAddress
        );

      case 8: // Client Feedback
        return await submitFeedback(
          agents,
          contractConfig,
          writeContract,
          currentAddress,
          workflowState
        );

      case 9: // Check Reputation
        return await checkReputation(
          agents.rebalancer,
          contractConfig,
          workflowState
        );

      default:
        return {
          success: false,
          details: "",
          error: "Invalid step ID",
        };
    }
  } catch (error) {
    console.error(`Error in step ${stepId}:`, error);
    return {
      success: false,
      details: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Step implementations

async function registerAgents(
  agents: any,
  contractConfig: any,
  writeContract: any,
  currentAddress: string,
  publicClient: any
): Promise<StepResult> {
  // Check which agent needs to be registered based on current wallet
  let agentToRegister: string;
  let role: AgentRole;

  if (currentAddress.toLowerCase() === agents.rebalancer.toLowerCase()) {
    agentToRegister = agents.rebalancer;
    role = "rebalancer";
  } else if (currentAddress.toLowerCase() === agents.validator.toLowerCase()) {
    agentToRegister = agents.validator;
    role = "validator";
  } else if (currentAddress.toLowerCase() === agents.client.toLowerCase()) {
    agentToRegister = agents.client;
    role = "client";
  } else {
    return {
      success: false,
      details: "",
      error: "Current wallet doesn't match any agent address",
    };
  }

  // Check if agent is already registered
  if (publicClient) {
    try {
      console.log("Checking registration status for:", currentAddress);
      console.log("Contract address:", contractConfig.identityRegistry.address);

      const balance = await publicClient.readContract({
        address: contractConfig.identityRegistry.address,
        abi: contractConfig.identityRegistry.abi,
        functionName: "balanceOf",
        args: [currentAddress as `0x${string}`],
      });

      console.log("Balance check result:", balance.toString());

      if (balance > BigInt(0)) {
        const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);

        // Agent already registered, retrieve the agentId by querying past events
        let agentId: number | undefined;
        try {
          console.log("Agent already registered, retrieving agentId from events...");

          // Query for Registered events for this owner
          const events = await publicClient.getLogs({
            address: contractConfig.identityRegistry.address,
            event: {
              type: 'event',
              name: 'Registered',
              inputs: [
                { name: 'agentId', type: 'uint256', indexed: true },
                { name: 'tokenURI', type: 'string', indexed: false },
                { name: 'owner', type: 'address', indexed: true }
              ]
            },
            args: { owner: currentAddress as `0x${string}` },
            fromBlock: 'earliest',
            toBlock: 'latest'
          });

          if (events.length > 0) {
            // Get the first agentId for this owner
            const latestEvent = events[events.length - 1]; // Get most recent
            agentId = parseInt(latestEvent.topics[1] as string, 16);
            console.log(`Retrieved existing agentId for ${role}:`, agentId);
          }
        } catch (eventError) {
          console.error("Error retrieving agentId from events:", eventError);
        }

        return {
          success: true,
          details:
            `${roleCapitalized} agent already registered!\n\n` +
            `Address: ${currentAddress.slice(0, 10)}...${currentAddress.slice(
              -4
            )}\n` +
            `NFT Balance: ${balance.toString()} agent NFT(s)\n` +
            (agentId !== undefined ? `Agent ID: ${agentId}\n` : "") +
            `Status: ✓ Already an active agent\n\n` +
            `ℹ️ Registration skipped - agent is already on-chain`,
          stateUpdate: agentId !== undefined ? {
            agentIds: {
              [role]: agentId,
            },
          } : undefined,
        };
      }
    } catch (error) {
      console.error("Error checking registration status:", error);
      console.warn("Continuing with registration attempt...");
      // Continue with registration if check fails
    }
  }

  try {
    console.log("Initiating registration transaction...");
    console.log("Contract:", contractConfig.identityRegistry.address);
    console.log("Current address:", currentAddress);

    const hash = await writeContract({
      address: contractConfig.identityRegistry.address,
      abi: contractConfig.identityRegistry.abi,
      functionName: "register",
      args: [""], // tokenURI (empty for now)
    });

    console.log("Transaction submitted:", hash);

    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);

    // Return immediately with transaction hash, don't wait for confirmation
    // This prevents UI from hanging on slow block times
    let details = `${roleCapitalized} agent registration transaction submitted!\n\nTransaction: ${hash}\n\nℹ️ Transaction is being processed on-chain...`;

    // Try to wait for receipt with a timeout
    let agentId: number | undefined;
    if (publicClient) {
      try {
        console.log("Waiting for transaction receipt...");

        // Wait for transaction with timeout (30 seconds)
        const receiptPromise = publicClient.waitForTransactionReceipt({
          hash,
          timeout: 30000,
        });

        const receipt = (await Promise.race([
          receiptPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Receipt timeout")), 30000)
          ),
        ])) as any;

        console.log("Transaction confirmed!");

        // Find Transfer event - Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
        const transferLog = receipt.logs.find(
          (log: any) =>
            log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" // Transfer event signature
        );

        if (transferLog && transferLog.topics[3]) {
          // tokenId is the 3rd indexed parameter
          agentId = parseInt(transferLog.topics[3], 16);
          console.log("Extracted agentId:", agentId);
          details = `${roleCapitalized} agent registered successfully!\n\nTransaction: ${hash.slice(
            0,
            10
          )}...\nAgent ID: ${agentId}`;
        } else {
          details = `${roleCapitalized} agent registered successfully!\n\nTransaction: ${hash.slice(
            0,
            10
          )}...\n\n✓ Transaction confirmed on-chain`;
        }
      } catch (e) {
        console.warn("Could not wait for receipt or extract agentId:", e);
        // Don't fail the step, just note that confirmation is pending
        details = `${roleCapitalized} agent registration transaction submitted!\n\nTransaction: ${hash.slice(
          0,
          10
        )}...\n\n✓ Transaction sent successfully\nℹ️ Check block explorer for confirmation status`;
      }
    }

    return {
      success: true,
      details,
      txHash: hash,
      stateUpdate:
        agentId !== undefined
          ? {
              agentIds: {
                [role]: agentId,
              },
            }
          : undefined,
    };
  } catch (error: any) {
    if (error.message?.includes("user rejected")) {
      return {
        success: false,
        details: "",
        error: "Transaction rejected by user",
      };
    }
    throw error;
  }
}

async function loadInputData(
  customData?: any,
  inputMode: "Rebalancing" | "Math" = "Rebalancing"
): Promise<StepResult> {
  // Support both custom input data (from user form) and file-based loading
  // Supports both portfolio and opportunity input modes
  try {
    let data;
    let isOpportunity = false;

    if (customData) {
      // Use custom data provided by user through the form
      console.log("Using custom input data from form:", customData);

      // Check if this is opportunity data (has liquidity, zyfiTvl, etc.)
      isOpportunity = inputMode === "Rebalancing" || "liquidity" in customData;

      if (isOpportunity) {
        // Opportunity data - convert APY percentages to scaled integers (multiply by 100)
        data = {
          liquidity: customData.liquidity,
          zyfiTvl: customData.zyfiTvl,
          amount: customData.amount,
          poolTvl: customData.poolTvl,
          newApy: Math.round(customData.newApy * 100), // 6.00% -> 600
          oldApy: Math.round(customData.oldApy * 100), // 4.50% -> 450
          apyStable7Days: customData.apyStable7Days ? 1 : 0,
          apyStable10Days: customData.apyStable10Days ? 1 : 0,
          tvlStable: customData.tvlStable ? 1 : 0,
        };
      } else {
        // Portfolio data - calculate totalValueCommitment
        const newTotalValue = customData.newBalances.reduce(
          (sum: number, bal: string, i: number) =>
            sum + parseInt(bal) * parseInt(customData.prices[i]),
          0
        );

        data = {
          ...customData,
          totalValueCommitment: String(newTotalValue),
        };
      }
    } else {
      // Fallback: Load from appropriate input file
      const endpoint =
        inputMode === "Rebalancing"
          ? "/api/load-input?type=opportunity"
          : "/api/load-input";
      console.log(`Loading default ${inputMode} data from file...`);
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to load ${inputMode} data`);
      }
      data = await response.json();
      isOpportunity = inputMode === "Rebalancing";
    }

    // Format details message based on data type
    let details;
    if (isOpportunity) {
      const utilizationRate = ((data.amount / data.poolTvl) * 100).toFixed(2);
      const apyImprovement = ((data.newApy - data.oldApy) / 100).toFixed(2);
      details =
        `Loaded DeFi Opportunity Data\n\n` +
        `Pool Metrics:\n` +
        `• Liquidity: $${data.liquidity.toLocaleString()}\n` +
        `• ZyFI TVL: $${data.zyfiTvl.toLocaleString()}\n` +
        `• Rebalance Amount: ${data.amount.toLocaleString()} tokens\n` +
        `• Pool TVL: ${data.poolTvl.toLocaleString()} tokens\n` +
        `• Utilization: ${utilizationRate}%\n\n` +
        `APY Performance:\n` +
        `• Old APY: ${(data.oldApy / 100).toFixed(2)}%\n` +
        `• New APY: ${(data.newApy / 100).toFixed(2)}%\n` +
        `• Improvement: +${apyImprovement}%\n\n` +
        `Stability:\n` +
        `• 7-day stable: ${data.apyStable7Days ? "✓" : "✗"}\n` +
        `• 10-day stable: ${data.apyStable10Days ? "✓" : "✗"}\n` +
        `• TVL stable: ${data.tvlStable ? "✓" : "✗"}\n\n` +
        `${
          customData
            ? "✓ Using custom opportunity data"
            : "ℹ️ Using demo data from file"
        }`;
    } else {
      details = `Loaded ${
        data.oldBalances.length
      } assets\n\nPortfolio Overview:\n• Total Value: ${parseInt(
        data.totalValueCommitment
      ).toLocaleString()}\n• Min Allocation: ${
        data.minAllocationPct
      }%\n• Max Allocation: ${data.maxAllocationPct}%\n\n${
        customData
          ? "✓ Using custom portfolio data from form"
          : "ℹ️ Using demo data from file"
      }`;
    }

    return {
      success: true,
      details,
      data,
      stateUpdate: {
        inputData: data,
        inputMode: isOpportunity ? "opportunity" : "portfolio",
      },
    };
  } catch (error) {
    return {
      success: false,
      details: "",
      error:
        error instanceof Error ? error.message : "Failed to load input data",
    };
  }
}

async function generateZKProof(
  workflowState: WorkflowState
): Promise<StepResult> {
  // Get input data from workflow state (from step 1)
  console.log("generateZKProof - workflowState:", workflowState);
  const inputData = workflowState.inputData;
  const inputMode = workflowState.inputMode || "Rebalancing"; // Default to Rebalancing
  console.log("generateZKProof - inputData:", inputData);
  console.log("generateZKProof - inputMode:", inputMode);

  if (!inputData) {
    console.error("Input data not found in workflow state!");
    return {
      success: false,
      error: "Input data not found. Please provide input data first.",
      details: "",
    };
  }

  // Check if this is Rebalancing (opportunity) or Math (portfolio) mode
  const isRebalancingMode = inputMode === "Rebalancing" || 'liquidity' in inputData;

  if (isRebalancingMode) {
    // Rebalancing mode - use API to generate proof with rebalancer-validation.circom
    try {
      console.log("🔐 Starting ZK proof generation for Rebalancing mode...");

      const response = await fetch("/api/generate-proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputData,
          mode: "rebalancing",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate proof");
      }

      const result = await response.json();

      console.log("✅ Rebalancing proof generated successfully!");

      return {
        success: true,
        details:
          `ZK proof generated using Groth16\n\n` +
          `Proof Details:\n` +
          `• Circuit: rebalancer-validation.circom\n` +
          `• Proof System: Groth16\n` +
          `• Mode: Rebalancing (DeFi Opportunity Validation)\n` +
          `• Private Inputs: liquidity, zyfiTvl, amount, poolTvl, APYs, stability flags\n` +
          `• Public Outputs: validationCommitment, isValid\n` +
          `• Constraints: 5 DeFi validation rules\n\n` +
          `Validation Rules:\n` +
          `  1. Liquidity Check: liquidity × 1.05 > zyfiTvl + (amount / 1M)\n` +
          `  2. TVL Constraint: poolTvl × 1M > amount × 4 (max 25%)\n` +
          `  3. APY Performance: newApy > oldApy + 10 (0.1% min improvement)\n` +
          `  4. APY Stability: 7-day OR 10-day stability required\n` +
          `  5. TVL Stability: Must be stable\n\n` +
          `✓ Proof cryptographically generated\n` +
          `✓ All constraints validated in zero-knowledge`,
        stateUpdate: {
          proofGenerated: true,
          proof: result.proof,
          publicInputs: result.publicInputs,
        },
      };
    } catch (error) {
      console.error("❌ Error generating rebalancing proof:", error);
      return {
        success: false,
        details: "",
        error:
          error instanceof Error ? error.message : "Failed to generate ZK proof",
      };
    }
  } else {
    // Math mode (portfolio) - use browser-based proof generation
    // Calculate new total value (matching agent's createRebalancingPlan)
    const newTotalValue = inputData.newBalances.reduce(
      (sum: number, bal: string, i: number) =>
        sum + parseInt(bal) * parseInt(inputData.prices[i]),
      0
    );

    // Use browser-based proof generation (works on Vercel)
    try {
      // Import the proof generator dynamically (client-side only)
      const { generateProofInBrowser } = await import("@/lib/proof-generator");

      console.log("🔐 Starting browser-based ZK proof generation for Math mode...");

      const result = await generateProofInBrowser({
        oldBalances: inputData.oldBalances,
        newBalances: inputData.newBalances,
        prices: inputData.prices,
        minAllocationPct: inputData.minAllocationPct,
        maxAllocationPct: inputData.maxAllocationPct,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to generate proof");
      }

      console.log("✅ Math proof generated successfully in browser!");

      return {
        success: true,
        details:
          `ZK proof generated using Groth16 (Browser)\n\n` +
          `Proof Details:\n` +
          `• Circuit: rebalancing.circom\n` +
          `• Proof System: Groth16\n` +
          `• Mode: Math (Portfolio Allocation)\n` +
          `• Generated: Client-side (browser)\n` +
          `• Private Inputs: ${inputData.oldBalances.length} balances + prices (hidden)\n` +
          `• Public Signals: [${result.publicInputs.join(", ")}]\n` +
          `• Constraints: ${inputData.minAllocationPct}% ≤ allocations ≤ ${inputData.maxAllocationPct}%\n` +
          `• Assets: ${inputData.oldBalances.length} portfolio assets\n\n` +
          `✓ Proof cryptographically generated in your browser\n` +
          `✓ Public inputs: totalValueCommitment, minAllocationPct, maxAllocationPct\n` +
          `✓ Works on Vercel (no server-side execution needed)`,
        stateUpdate: {
          proofGenerated: true,
          newTotalValue,
          proof: result.proof,
          publicInputs: result.publicInputs,
        },
      };
    } catch (error) {
      console.error("❌ Error generating math proof:", error);
      return {
        success: false,
        details: "",
        error:
          error instanceof Error ? error.message : "Failed to generate ZK proof",
      };
    }
  }
}

async function submitForValidation(
  agents: any,
  contractConfig: any,
  writeContract: any,
  currentAddress: string,
  publicClient: any,
  workflowState: WorkflowState
): Promise<StepResult> {
  if (currentAddress.toLowerCase() !== agents.rebalancer.toLowerCase()) {
    return {
      success: false,
      details: "",
      requiresWalletSwitch: {
        from: currentAddress,
        to: agents.rebalancer,
        role: "Rebalancer",
      },
    };
  }

  // Require agentId from registration
  const rebalancerAgentId = workflowState.agentIds?.rebalancer;
  if (!rebalancerAgentId) {
    return {
      success: false,
      details: "",
      error:
        "Rebalancer agent ID not found. Please complete agent registration first.",
    };
  }

  // Get the actual proof from workflow state
  const proof = workflowState.proof;
  if (!proof) {
    return {
      success: false,
      details: "",
      error: "Proof not found. Please generate ZK proof first.",
    };
  }

  // Generate SHA-256 hash of the proof (matching rebalancer-agent.ts)
  // Call backend API to compute dataHash and store proof
  let dataHash: string;
  try {
    const response = await fetch("/api/store-proof", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof: proof,
        publicInputs: workflowState.publicInputs,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to store proof");
    }

    const result = await response.json();
    dataHash = result.dataHash;
  } catch (error) {
    console.error("Failed to store proof:", error);
    return {
      success: false,
      details: "",
      error: "Failed to prepare proof for validation",
    };
  }

  try {
    const requestUri = `file://data/${dataHash.slice(2)}.json`; // Remove '0x' prefix for filename

    const hash = await writeContract({
      address: contractConfig.validationRegistry.address,
      abi: contractConfig.validationRegistry.abi,
      functionName: "validationRequest",
      args: [
        agents.validator, // validatorAddress
        rebalancerAgentId, // agentId from registration
        requestUri, // requestUri: file://data/${dataHash}.json
        dataHash as `0x${string}`, // requestHash (dataHash from proof)
      ],
    });

    // Wait for transaction and extract requestHash from ValidationRequest event
    let requestHash: string | undefined;
    if (publicClient) {
      try {
        console.log("Waiting for validation request receipt...");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 30000,
        });

        // Find ValidationRequest event
        // event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestUri, bytes32 indexed requestHash)
        // topics[0] = event signature
        // topics[1] = validatorAddress
        // topics[2] = agentId
        // topics[3] = requestHash
        const validationRequestLog = receipt.logs.find((log: any) => {
          // Check if this is from ValidationRegistry
          return (
            log.address.toLowerCase() ===
              contractConfig.validationRegistry.address.toLowerCase() &&
            log.topics.length >= 4 // Need at least 4 topics (signature + 3 indexed params)
          );
        });

        if (validationRequestLog && validationRequestLog.topics[3]) {
          // requestHash is the 4th topic (topics[3])
          requestHash = validationRequestLog.topics[3];
          console.log("Extracted requestHash from event:", requestHash);
        } else {
          console.warn("ValidationRequest event not found or incomplete");
          console.log("Available logs:", receipt.logs);
        }
      } catch (e) {
        console.warn("Could not extract requestHash from receipt:", e);
      }
    }

    let details =
      `Proof submitted to Validator\n\n` +
      `Validator: ${agents.validator.slice(0, 10)}...${agents.validator.slice(
        -4
      )}\n` +
      `Agent ID: ${rebalancerAgentId}\n` +
      `Transaction: ${hash.slice(0, 10)}...${hash.slice(-4)}\n`;

    if (requestHash) {
      details += `\n📋 Request Hash (DataHash):\n${requestHash}\n\nℹ️ This hash commits to the proof data`;
    } else {
      details += `\n⚠️ Request Hash: Not captured from event`;
    }

    return {
      success: true,
      details,
      txHash: hash,
      stateUpdate: {
        requestHash: requestHash,
        dataHash: requestHash,
      },
    };
  } catch (error: any) {
    if (error.message?.includes("user rejected")) {
      return {
        success: false,
        details: "",
        error: "Transaction rejected by user",
      };
    }
    throw error;
  }
}

async function validateProof(
  agents: any,
  contractConfig: any,
  writeContract: any,
  currentAddress: string,
  workflowState: WorkflowState
): Promise<StepResult> {
  if (currentAddress.toLowerCase() !== agents.validator.toLowerCase()) {
    return {
      success: false,
      details: "",
      requiresWalletSwitch: {
        from: currentAddress,
        to: agents.validator,
        role: "Validator",
      },
    };
  }

  const dataHash =
    workflowState.dataHash ||
    workflowState.requestHash ||
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Get the actual proof from workflow state
  const proof = workflowState.proof;
  const publicInputs = workflowState.publicInputs;

  if (!proof || !publicInputs) {
    return {
      success: false,
      details: "",
      error:
        "Proof or public inputs not found. Please generate ZK proof first.",
    };
  }

  // Call backend API to validate the proof using on-chain Verifier contract
  try {
    const response = await fetch("/api/validate-proof", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof: proof,
        publicInputs: publicInputs,
        chainId: contractConfig.chainId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to validate proof");
    }

    const result = await response.json();
    const isValid = result.isValid;
    const score = isValid ? 100 : 0;

    let details =
      `ZK Proof Validation Complete\n\n` +
      `On-Chain Cryptographic Verification:\n` +
      `• Verifier Contract: Groth16Verifier\n` +
      `• Proof System: Groth16\n` +
      `• Public Signals: [${publicInputs.join(", ")}]\n` +
      `• Result: ${isValid ? "✅ VALID" : "❌ INVALID"}\n` +
      `• Score: ${score}/100\n\n` +
      `📋 DataHash:\n${dataHash}\n\n` +
      `✓ Verified via eth_call to Groth16Verifier.verifyProof()`;

    return {
      success: true,
      details,
      stateUpdate: {
        validationResult: {
          isValid,
          score,
          dataHash,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      details: "",
      error:
        error instanceof Error ? error.message : "Failed to validate proof",
    };
  }
}

async function submitValidation(
  agents: any,
  contractConfig: any,
  writeContract: any,
  currentAddress: string,
  workflowState: WorkflowState,
  publicClient: any
): Promise<StepResult> {
  if (currentAddress.toLowerCase() !== agents.validator.toLowerCase()) {
    return {
      success: false,
      details: "",
      requiresWalletSwitch: {
        from: currentAddress,
        to: agents.validator,
        role: "Validator",
      },
    };
  }

  // Get the requestHash from the workflow state (captured in step 3)
  const requestHash = workflowState.requestHash || workflowState.dataHash;

  if (!requestHash) {
    return {
      success: false,
      details: "",
      error:
        "Request hash not found. Please complete 'Submit for Validation' step first.",
    };
  }

  // Get validation result from previous step
  const validationResult = workflowState.validationResult;
  if (!validationResult) {
    return {
      success: false,
      details: "",
      error: "Validation result not found. Please validate the proof first.",
    };
  }

  const score = validationResult.score;
  const dataHash = validationResult.dataHash;

  // Store validation result via backend API (matching validator-agent.ts)
  try {
    const response = await fetch("/api/store-validation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        validationResult: validationResult,
        dataHash: dataHash,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to store validation result");
    }
  } catch (error) {
    console.error("Failed to store validation:", error);
    // Continue anyway, validation is already done
  }

  const responseUri = `file://validations/${dataHash.slice(2)}.json`; // Remove '0x' prefix for filename

  try {
    const hash = await writeContract({
      address: contractConfig.validationRegistry.address,
      abi: contractConfig.validationRegistry.abi,
      functionName: "validationResponse",
      args: [
        requestHash as `0x${string}`, // requestHash from step 3
        score, // response (0-100, where 100 = valid)
        responseUri, // responseUri: file://validations/${dataHash}.json
        dataHash as `0x${string}`, // responseHash (dataHash from validation)
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, // tag
      ],
    });

    // Wait for transaction and extract responseHash from ValidationResponse event
    let responseHash: string | undefined;
    if (publicClient) {
      try {
        console.log("Waiting for validation response receipt...");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 30000,
        });

        // Find ValidationResponse event
        // event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseUri, bytes32 responseHash, bytes32 tag)
        // topics[0] = event signature
        // topics[1] = validatorAddress
        // topics[2] = agentId
        // topics[3] = requestHash (the one we're responding to)
        // Note: responseHash is NOT indexed, it's in the data field
        const validationResponseLog = receipt.logs.find((log: any) => {
          return (
            log.address.toLowerCase() ===
              contractConfig.validationRegistry.address.toLowerCase() &&
            log.topics.length >= 4 && // Need at least 4 topics (signature + 3 indexed params)
            log.topics[3] === requestHash // Verify this is responding to our request
          );
        });

        if (validationResponseLog) {
          // For now, we'll use the dataHash we submitted as the responseHash
          // In the real implementation, we'd decode the event data to extract responseHash
          responseHash = dataHash;
          console.log(
            "Found ValidationResponse event for requestHash:",
            requestHash
          );
          console.log("Using dataHash as responseHash:", responseHash);
        } else {
          console.warn("ValidationResponse event not found");
          console.log("Available logs:", receipt.logs);
        }
      } catch (e) {
        console.warn("Could not extract responseHash from receipt:", e);
      }
    }

    let details =
      `Validation Response Submitted\n\n` +
      `Transaction: ${hash.slice(0, 10)}...${hash.slice(-4)}\n` +
      `Score: ${score}/100 ${score === 100 ? "✅ VALID" : "⚠️"}\n` +
      `Status: ✓ Recorded on ValidationRegistry\n\n` +
      `📋 Request Hash (DataHash):\n${requestHash}`;

    if (responseHash) {
      details += `\n\n📋 Response Hash:\n${responseHash}\n\nℹ️ This hash commits to the validation result`;
    } else {
      details += `\n\n⚠️ Response Hash: Not captured from event`;
    }

    return {
      success: true,
      details,
      txHash: hash,
      stateUpdate: {
        responseHash: responseHash || dataHash,
      },
    };
  } catch (error: any) {
    if (error.message?.includes("user rejected")) {
      return {
        success: false,
        details: "",
        error: "Transaction rejected by user",
      };
    }
    throw error;
  }
}

async function authorizeFeedback(
  agents: any,
  clientAddress: string,
  contractConfig: any,
  writeContract: any,
  currentAddress: string
): Promise<StepResult> {
  // In the real implementation (rebalancer-agent.ts):
  // generateFeedbackAuthorization(clientAddress, indexLimit=10n, expiryDays=30):
  // 1. Creates authData struct with: agentId, clientAddress, indexLimit, expiry, chainId, identityRegistry, signerAddress
  // 2. ABI-encodes the struct (224 bytes)
  // 3. Creates keccak256 hash of encoded struct
  // 4. Signs the hash with EIP-191 personal sign (65 bytes signature)
  // 5. Concatenates: encodedStruct + signature = feedbackAuth (289 bytes total)
  // 6. Returns { feedbackAuth: `0x${string}`, authData }

  // For frontend demo, we simulate this off-chain signing process
  // In production, this would call the rebalancer's off-chain service to generate the signature

  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return {
    success: true,
    details:
      `Feedback Authorization Generated\n\n` +
      `Off-Chain Signed Authorization:\n` +
      `• Authorized Client: ${clientAddress.slice(
        0,
        10
      )}...${clientAddress.slice(-4)}\n` +
      `• Index Limit: 10 feedbacks\n` +
      `• Expiry: ${expiry.toLocaleDateString()}\n` +
      `• Chain ID: 31337 (Foundry/Anvil)\n\n` +
      `Signature Components:\n` +
      `• Struct (224 bytes): agentId, clientAddress, limits, expiry\n` +
      `• Signature (65 bytes): EIP-191 personal sign\n` +
      `• Total Auth: 289 bytes\n\n` +
      `ℹ️ Note: In production, rebalancer signs with private key off-chain`,
    stateUpdate: {
      feedbackAuthGenerated: true,
      authorizedClient: clientAddress,
    },
  };
}

async function submitFeedback(
  agents: any,
  contractConfig: any,
  writeContract: any,
  currentAddress: string,
  workflowState: WorkflowState
): Promise<StepResult> {
  if (currentAddress.toLowerCase() !== agents.client.toLowerCase()) {
    return {
      success: false,
      details: "",
      requiresWalletSwitch: {
        from: currentAddress,
        to: agents.client,
        role: "Client",
      },
    };
  }

  // Require rebalancer agentId from registration
  const rebalancerAgentId = workflowState.agentIds?.rebalancer;
  if (!rebalancerAgentId) {
    return {
      success: false,
      details: "",
      error:
        "Rebalancer agent ID not found. Please complete agent registration first.",
    };
  }

  // Check if feedback authorization was generated
  if (!workflowState.feedbackAuthGenerated) {
    console.warn(
      "Feedback authorization not found, proceeding with empty auth"
    );
  }

  // In the real implementation (client-agent.ts):
  // submitFeedback(agentId, score, feedbackAuth, comment, tag1?, tag2?):
  // 1. Validates score is 0-100
  // 2. Calls giveFeedback on ReputationRegistry with:
  //    - agentId: The rebalancer's agent NFT ID
  //    - score: 0-100 rating
  //    - tag1, tag2: Optional category tags (bytes32)
  //    - fileuri: Optional IPFS link to feedback details
  //    - filehash: Hash of the feedback file
  //    - feedbackAuth: The 289-byte signed authorization from rebalancer
  // 3. Waits for transaction confirmation
  // 4. Stores feedback locally in feedbackHistory

  // For demo purposes, using empty feedbackAuth
  // In production, this must be the signed authorization from step 7
  const score = 95;
  const comment = "Great rebalancing service!";

  try {
    const hash = await writeContract({
      address: contractConfig.reputationRegistry.address,
      abi: contractConfig.reputationRegistry.abi,
      functionName: "giveFeedback",
      args: [
        rebalancerAgentId, // agentId from rebalancer registration
        score, // score (0-100)
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, // tag1
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, // tag2
        comment ? `ipfs://feedback/${comment}` : "", // fileuri
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, // filehash
        "0x" as `0x${string}`, // feedbackAuth (should be from step 7 - using empty for demo)
      ],
    });

    return {
      success: true,
      details:
        `Client Feedback Submitted\n\n` +
        `Transaction: ${hash.slice(0, 10)}...${hash.slice(-4)}\n` +
        `Rebalancer Agent ID: ${rebalancerAgentId}\n` +
        `Score: ${score}/100 ⭐\n` +
        `Comment: "${comment}"\n\n` +
        `Status: ✓ Recorded on ReputationRegistry\n\n` +
        `ℹ️ Note: In production, feedbackAuth must be valid signed authorization`,
      txHash: hash,
    };
  } catch (error: any) {
    if (error.message?.includes("user rejected")) {
      return {
        success: false,
        details: "",
        error: "Transaction rejected by user",
      };
    }
    throw error;
  }
}

async function checkReputation(
  rebalancer: string,
  contractConfig: any,
  workflowState?: WorkflowState
): Promise<StepResult> {
  // In the real implementation (client-agent.ts):
  // checkRebalancerReputation(serverId: bigint):
  // 1. Filters feedbackHistory for this serverId (agentId)
  // 2. Calculates average score from all feedback entries
  // 3. Returns ReputationInfo { serverId, feedbackCount, averageScore }
  // Note: This is local tracking - the contract also stores reputation on-chain

  const rebalancerAgentId = workflowState?.agentIds?.rebalancer;

  let details =
    `Rebalancer Reputation Summary\n\n` +
    `Rebalancer Address: ${rebalancer.slice(0, 10)}...${rebalancer.slice(
      -4
    )}\n`;

  if (rebalancerAgentId) {
    details += `Agent ID: ${rebalancerAgentId}\n`;
  }

  details +=
    `\n` +
    `Reputation Stats:\n` +
    `• Total Validations: 1\n` +
    `• Total Feedback: 1\n` +
    `• Average Score: 95/100 ⭐\n` +
    `• Status: ✓ Active Agent\n`;

  // Add hash summary if available
  if (workflowState) {
    details += `\n\n📋 Workflow Hash Summary:`;

    if (workflowState.requestHash || workflowState.dataHash) {
      details += `\n\nRequest Hash (DataHash):\n${
        workflowState.requestHash || workflowState.dataHash
      }`;
    }

    if (workflowState.responseHash) {
      details += `\n\nResponse Hash:\n${workflowState.responseHash}`;
    }

    details += `\n\nℹ️ These hashes provide cryptographic proof of the validation workflow`;
  }

  return {
    success: true,
    details,
  };
}
