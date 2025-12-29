import { encodeAbiParameters, parseAbiParameters, keccak256 } from "viem";
import { getContractConfig } from "./contracts";
import { getContractsForNetwork } from "./constants";

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
  walletClient?: any; // viem wallet client for signing messages
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
  requestCid?: string; // IPFS CID for stored proof
  responseCid?: string; // IPFS CID for stored validation
  dataHash?: string;
  inputData?: any; // Can be either portfolio or opportunity data
  inputMode?: "Math" | "Rebalancing"; // Track which mode is active
  feedbackAuth?: `0x${string}`; // The signed authorization for feedback
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
  requiresManualAgentId?: {
    role: "rebalancer" | "validator" | "client";
    message: string;
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
    walletClient,
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
          publicClient,
          chainId
        );

      case 1: // Load Input Data
        return await loadInputData(customData, inputMode);

      case 2: // Generate ZK Proof
        return await generateZKProof(workflowState);

      case 3: // Submit Proof for Validation
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
          currentAddress,
          walletClient,
          workflowState
        );

      case 8: // Client Feedback
        return await submitFeedback(
          agents,
          contractConfig,
          writeContract,
          currentAddress,
          workflowState,
          publicClient
        );

      case 9: // Check Reputation
        return await checkReputation(
          agents.rebalancer,
          contractConfig,
          workflowState,
          publicClient
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
  publicClient: any,
  chainId: number
): Promise<StepResult> {
  let role: AgentRole;
  if (currentAddress.toLowerCase() === agents.rebalancer.toLowerCase())
    role = "rebalancer";
  else if (currentAddress.toLowerCase() === agents.validator.toLowerCase())
    role = "validator";
  else if (currentAddress.toLowerCase() === agents.client.toLowerCase())
    role = "client";
  else
    return {
      success: false,
      details: "",
      error: "Current wallet doesn't match any agent address",
    };

  if (publicClient) {
    try {
      const balance = await publicClient.readContract({
        address: contractConfig.identityRegistry.address,
        abi: contractConfig.identityRegistry.abi,
        functionName: "balanceOf",
        args: [currentAddress as `0x${string}`],
      });

      if (balance > BigInt(0)) {
        let agentId: number | undefined;
        try {
          // Get deployment block for optimized event querying
          // This reduces the block range we need to search through
          // TODO: Consider caching agentId in localStorage/database for even better performance
          const networkConfig = getContractsForNetwork(chainId);
          const fromBlock = networkConfig?.deploymentBlock ?? "earliest";

          const events = await publicClient.getLogs({
            address: contractConfig.identityRegistry.address,
            event: {
              type: "event",
              name: "Registered",
              inputs: [
                { name: "agentId", type: "uint256", indexed: true },
                { name: "tokenURI", type: "string", indexed: false },
                { name: "owner", type: "address", indexed: true },
              ],
            },
            args: { owner: currentAddress as `0x${string}` },
            fromBlock,
            toBlock: "latest",
          });
          if (events.length > 0) {
            agentId = parseInt(
              events[events.length - 1].topics[1] as string,
              16
            );
          }
        } catch (eventError) {
          console.error("Error retrieving agentId:", eventError);
        }

        return {
          success: true,
          details:
            `${
              role.charAt(0).toUpperCase() + role.slice(1)
            } Already Registered\n\n` +
            `Address: ${currentAddress}\n` +
            (agentId !== undefined ? `Agent ID: ${agentId}\n` : "") +
            `Active agent`,
          stateUpdate:
            agentId !== undefined
              ? { agentIds: { [role]: agentId } }
              : undefined,
        };
      }
    } catch (error) {
      console.error("Error checking registration:", error);
    }
  }

  try {
    const hash = await writeContract({
      address: contractConfig.identityRegistry.address,
      abi: contractConfig.identityRegistry.abi,
      functionName: "register",
      args: [""],
    });

    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
    let details = `${roleCapitalized} Registration Submitted\n\nTx: ${hash}\n`;
    let agentId: number | undefined;

    if (publicClient) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 30000,
        });

        // Check if transaction reverted
        if (receipt.status === "reverted" || receipt.status === 0) {
          return {
            success: false,
            details: "",
            error:
              "Transaction reverted on-chain. Please check the transaction for details.",
            txHash: hash,
          };
        }

        const transferLog = receipt.logs.find(
          (log: any) =>
            log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        );
        if (transferLog && transferLog.topics[3]) {
          agentId = parseInt(transferLog.topics[3], 16);
          details = `${roleCapitalized} Registered\n\nTx: ${hash}\nAgent ID: ${agentId}`;
        }
      } catch (e) {
        console.warn("Could not extract agentId:", e);
      }
    }

    return {
      success: true,
      details,
      txHash: hash,
      stateUpdate:
        agentId !== undefined ? { agentIds: { [role]: agentId } } : undefined,
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
  try {
    let data;
    let isOpportunity = false;

    if (customData) {
      isOpportunity = inputMode === "Rebalancing" && "liquidity" in customData;
      if (isOpportunity) {
        data = {
          // New opportunity data
          liquidity: customData.liquidity,
          zyfiTvl: customData.zyfiTvl,
          amount: customData.amount,
          poolTvl: customData.poolTvl,
          newApy: Math.round(customData.newApy * 10000), // 4 decimal precision
          apyStable7Days: customData.apyStable7Days ? 1 : 0,
          tvlStable: customData.tvlStable ? 1 : 0,
          // Old opportunity data (for circuit to compute shouldRebalanceFromOld)
          oldApy: Math.round((customData.oldApy ?? 0) * 10000), // 4 decimal precision
          oldLiquidity: customData.oldLiquidity ?? 0,
          oldZyfiTvl: customData.oldZyfiTvl ?? 0,
          oldTvlStable:
            customData.oldTvlStable !== undefined
              ? customData.oldTvlStable
                ? 1
                : 0
              : 1, // Default to 1 if not provided
          oldUtilizationStable:
            customData.oldUtilizationStable !== undefined
              ? customData.oldUtilizationStable
                ? 1
                : 0
              : 1, // Default to 1 if not provided
          oldCollateralHealth:
            customData.oldCollateralHealth !== undefined
              ? customData.oldCollateralHealth
                ? 1
                : 0
              : 1, // Default to 1 if not provided
          oldZyfiTVLCheck:
            customData.oldZyfiTVLCheck !== undefined
              ? customData.oldZyfiTVLCheck
                ? 1
                : 0
              : 1, // Default to 1 if not provided
          // User preferences
          supportsCurrentPool:
            customData.supportsCurrentPool !== undefined
              ? customData.supportsCurrentPool
                ? 1
                : 0
              : 1, // Default to 1 if not provided
        };
      } else {
        const newTotalValue = customData.newBalances.reduce(
          (sum: number, bal: string, i: number) =>
            sum + parseInt(bal) * parseInt(customData.prices[i]),
          0
        );
        data = { ...customData, totalValueCommitment: String(newTotalValue) };
      }
    } else {
      const endpoint =
        inputMode === "Rebalancing"
          ? "/api/load-input?type=Rebalancing"
          : "/api/load-input?type=Math";
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to load ${inputMode} data`);
      data = await response.json();
      isOpportunity = inputMode === "Rebalancing";
    }

    let details;
    if (isOpportunity) {
      // Add null/undefined checks before accessing properties
      const liquidity = data.liquidity ?? 0;
      const zyfiTvl = data.zyfiTvl ?? 0;
      const amount = data.amount ?? 0;
      const poolTvl = data.poolTvl ?? 1; // Prevent division by zero
      const newApy = data.newApy ?? 0;
      const oldApy = data.oldApy ?? 0;

      const util = ((amount / poolTvl) * 100).toFixed(2);
      const apyDiff = ((newApy - oldApy) / 100).toFixed(2);
      details =
        `DeFi Opportunity Data\n\n` +
        `Liquidity: $${liquidity.toLocaleString()}\n` +
        `ZyFI TVL: $${zyfiTvl.toLocaleString()}\n` +
        `Amount: ${amount.toLocaleString()}\n` +
        `Pool TVL: ${poolTvl.toLocaleString()}\n` +
        `Utilization: ${util}%\n\n` +
        `Old APY: ${(oldApy / 10000).toFixed(4)}%\n` +
        `New APY: ${(newApy / 10000).toFixed(4)}%\n` +
        `Improvement: +${((newApy - oldApy) / 10000).toFixed(4)}%\n\n` +
        `7d: ${data.apyStable7Days ? "YES" : "NO"} | ` +
        `TVL: ${data.tvlStable ? "YES" : "NO"}\n` +
        `Supports Current Pool: ${
          data.supportsCurrentPool ? "YES" : "NO"
        }\n\n` +
        `Old Opportunity:\n` +
        `  APY: ${(data.oldApy / 10000).toFixed(4)}%\n` +
        `  Liquidity: $${(data.oldLiquidity ?? 0).toLocaleString()}\n` +
        `  ZyFI TVL: $${(data.oldZyfiTvl ?? 0).toLocaleString()}\n` +
        `  TVL Stable: ${data.oldTvlStable ? "YES" : "NO"} | ` +
        `Util Stable: ${data.oldUtilizationStable ? "YES" : "NO"} | ` +
        `Collateral: ${data.oldCollateralHealth ? "YES" : "NO"} | ` +
        `TVL Check: ${data.oldZyfiTVLCheck ? "YES" : "NO"}`;
    } else {
      details =
        `Portfolio Data (${data.oldBalances?.length ?? 0} assets)\n\n` +
        `Value: ${parseInt(
          data.totalValueCommitment ?? 0
        ).toLocaleString()}\n` +
        `Range: ${data.minAllocationPct ?? 0}% - ${
          data.maxAllocationPct ?? 0
        }%`;
    }

    return {
      success: true,
      details,
      data,
      stateUpdate: {
        inputData: data,
        inputMode: isOpportunity ? "Rebalancing" : "Math",
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
  const inputData = workflowState.inputData;
  const inputMode = workflowState.inputMode || "Rebalancing";

  if (!inputData) {
    return {
      success: false,
      error: "Input data not found. Please provide input data first.",
      details: "",
    };
  }

  const isRebalancingMode =
    inputMode === "Rebalancing" || "liquidity" in inputData;

  if (isRebalancingMode) {
    try {
      const response = await fetch("/api/generate-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputData, mode: "rebalancing" }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate proof");
      }
      const result = await response.json();

      // Store proof to Pinata
      let pinataGatewayUrl: string | undefined;
      let dataHash: string | undefined;
      let ipfsCid: string | undefined;
      try {
        const storeResponse = await fetch("/api/store-proof", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proof: result.proof,
            publicInputs: result.publicInputs,
          }),
        });
        if (storeResponse.ok) {
          const storeResult = await storeResponse.json();
          pinataGatewayUrl = storeResult.pinataGatewayUrl;
          dataHash = storeResult.dataHash;
          ipfsCid = storeResult.ipfsCid;
        }
      } catch (error) {
        console.warn("Failed to store proof to Pinata:", error);
      }

      return {
        success: true,
        details:
          `ZK Proof Generated (Groth16)\n\n` +
          `Circuit: rebalancer-validation.circom\n` +
          `Mode: Rebalancing (DeFi Validation)\n` +
          `Public Inputs: liquidity, zyfiTvl, amount, poolTvl, APYs, stability flags\n` +
          `\nRules:\n` +
          `1. Liquidity × 1.05 > zyfiTvl + (amount/1M)\n` +
          `2. poolTvl × 1M > amount × 4 (max 25%)\n` +
          `3. newApy > oldApy + 10 (0.1% min)\n` +
          `4. 7d OR 10d stability\n` +
          `5. TVL stable` +
          (pinataGatewayUrl && dataHash
            ? `\n\nData Hash: ${dataHash}\nView proof on Pinata: ${pinataGatewayUrl}`
            : ""),
        stateUpdate: {
          proofGenerated: true,
          proof: result.proof,
          publicInputs: result.publicInputs,
          dataHash,
          requestCid: ipfsCid, // Store CID for Step 3 to reuse
        },
      };
    } catch (error) {
      return {
        success: false,
        details: "",
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate ZK proof",
      };
    }
  } else {
    const newTotalValue = inputData.newBalances.reduce(
      (sum: number, bal: string, i: number) =>
        sum + parseInt(bal) * parseInt(inputData.prices[i]),
      0
    );

    try {
      const { generateProofInBrowser } = await import("@/lib/proof-generator");
      const result = await generateProofInBrowser({
        oldBalances: inputData.oldBalances,
        newBalances: inputData.newBalances,
        prices: inputData.prices,
        minAllocationPct: inputData.minAllocationPct,
        maxAllocationPct: inputData.maxAllocationPct,
      });
      if (!result.success)
        throw new Error(result.error || "Failed to generate proof");

      // Store proof to Pinata
      let pinataGatewayUrl: string | undefined;
      let dataHash: string | undefined;
      let ipfsCid: string | undefined;
      try {
        const storeResponse = await fetch("/api/store-proof", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proof: result.proof,
            publicInputs: result.publicInputs,
          }),
        });
        if (storeResponse.ok) {
          const storeResult = await storeResponse.json();
          pinataGatewayUrl = storeResult.pinataGatewayUrl;
          dataHash = storeResult.dataHash;
          ipfsCid = storeResult.ipfsCid;
        }
      } catch (error) {
        console.warn("Failed to store proof to Pinata:", error);
      }

      return {
        success: true,
        details:
          `ZK Proof Generated (Groth16 - Browser)\n\n` +
          `Circuit: rebalancing.circom\n` +
          `Mode: Math (Portfolio)\n` +
          `Assets: ${inputData.oldBalances.length}\n` +
          `Range: ${inputData.minAllocationPct}%-${inputData.maxAllocationPct}%\n` +
          // `Public: [${result.publicInputs.join(", ")}]` +
          (pinataGatewayUrl && dataHash
            ? `\nData Hash: ${dataHash}\nView proof on Pinata: ${pinataGatewayUrl}`
            : ""),
        stateUpdate: {
          proofGenerated: true,
          newTotalValue,
          proof: result.proof,
          publicInputs: result.publicInputs,
          dataHash,
          requestCid: ipfsCid, // Store CID for Step 3 to reuse
        },
      };
    } catch (error) {
      return {
        success: false,
        details: "",
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate ZK proof",
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

  const rebalancerAgentId = workflowState.agentIds?.rebalancer;
  if (!rebalancerAgentId) {
    return {
      success: false,
      details: "",
      error:
        "Rebalancer agent ID not found. Please complete agent registration first.",
      requiresManualAgentId: {
        role: "rebalancer",
        message: "Enter your Rebalancer Agent ID to continue",
      },
    };
  }

  const proof = workflowState.proof;
  if (!proof) {
    return {
      success: false,
      details: "",
      error: "Proof not found. Please generate ZK proof first.",
    };
  }

  // Reuse data hash and Pinata URL from Step 2 if available (no need to re-upload)
  let dataHash: string;
  let ipfsCid: string | undefined;
  let pinataGatewayUrl: string | undefined;

  if (workflowState.dataHash) {
    // Proof already stored in Step 2, reuse the hash and URL
    dataHash = workflowState.dataHash;
    ipfsCid = workflowState.requestCid; // May be undefined if Pinata failed in Step 2
    // Try to reconstruct Pinata URL if we have the CID
    if (ipfsCid) {
      pinataGatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;
    }
  } else {
    // Fallback: Store proof if not already done (shouldn't happen normally)
    try {
      const response = await fetch("/api/store-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof,
          publicInputs: workflowState.publicInputs,
        }),
      });
      if (!response.ok) throw new Error("Failed to store proof");
      const result = await response.json();
      dataHash = result.dataHash;
      ipfsCid = result.ipfsCid;
      pinataGatewayUrl = result.pinataGatewayUrl;
    } catch (error) {
      console.error("Failed to store proof:", error);
      return {
        success: false,
        details: "",
        error: "Failed to prepare proof for validation",
      };
    }
  }

  try {
    const requestUri = ((): string => {
      const cid =
        typeof ipfsCid !== "undefined" && ipfsCid ? ipfsCid : undefined;
      return cid ? `ipfs://${cid}` : `file://data/${dataHash.slice(2)}.json`;
    })();

    const hash = await writeContract({
      address: contractConfig.validationRegistry.address,
      abi: contractConfig.validationRegistry.abi,
      functionName: "validationRequest",
      args: [
        agents.validator,
        rebalancerAgentId,
        requestUri,
        dataHash as `0x${string}`,
      ],
    });

    let requestHash: string | undefined;
    if (publicClient) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 30000,
        });

        // Check if transaction reverted
        if (receipt.status === "reverted" || receipt.status === 0) {
          return {
            success: false,
            details: "",
            error:
              "Transaction reverted on-chain. Please check the transaction for details.",
            txHash: hash,
          };
        }

        const validationRequestLog = receipt.logs.find(
          (log: any) =>
            log.address.toLowerCase() ===
              contractConfig.validationRegistry.address.toLowerCase() &&
            log.topics.length >= 4
        );
        if (validationRequestLog && validationRequestLog.topics[3]) {
          requestHash = validationRequestLog.topics[3];
        }
      } catch (e) {
        console.warn("Could not extract requestHash from receipt:", e);
      }
    }

    return {
      success: true,
      details:
        `Proof Submitted to Validator\n\n` +
        `Validator: ${agents.validator.slice(0, 10)}...${agents.validator.slice(
          -4
        )}\n` +
        `Agent ID: ${rebalancerAgentId}\n` +
        `Transaction: ${hash}\n` +
        // `Data Hash: ${dataHash}` +
        (pinataGatewayUrl
          ? `Data Hash: ${dataHash} \nView proof on Pinata: ${pinataGatewayUrl}`
          : `Data Hash: ${dataHash}`) +
        "\n" +
        (requestHash ? `Request Hash: ${requestHash}` : ""),
      txHash: hash,
      stateUpdate: { requestHash, dataHash, requestCid: ipfsCid },
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
  _writeContract: any,
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

  try {
    const response = await fetch("/api/validate-proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proof,
        publicInputs,
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

    // Determine which verifier was used based on input mode
    const isRebalancingMode =
      workflowState.inputMode === "Rebalancing" ||
      (publicInputs && publicInputs.length === 15);
    const verifierAddress = isRebalancingMode
      ? contractConfig.rebalancerVerifier
      : contractConfig.groth16Verifier;
    const verifierName = isRebalancingMode
      ? "RebalancerVerifier"
      : "Groth16Verifier";

    return {
      success: true,
      details:
        `ZK Proof Validation\n\n` +
        `Groth16 Verifier (on-chain)\n` +
        `Contract: ${verifierName}\n` +
        // `Address: ${verifierAddress}\n` +
        // `Public: [${publicInputs.join(", ")}]\n` +
        `Result: ${isValid ? "VALID" : "INVALID"}\n` +
        `Score: ${score}/100\n` +
        `DataHash: ${dataHash}`,
      stateUpdate: { validationResult: { isValid, score, dataHash } },
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

  const requestHash = workflowState.requestHash || workflowState.dataHash;
  if (!requestHash) {
    return {
      success: false,
      details: "",
      error:
        "Request hash not found. Please complete 'Submit Proof for Validation' step first.",
    };
  }

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

  try {
    const response = await fetch("/api/store-validation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validationResult, dataHash }),
    });
    if (!response.ok) throw new Error("Failed to store validation result");
    var validationIpfsCid: string | undefined;
    var validationPinataGatewayUrl: string | undefined;
    try {
      const storeRes = await response.json();
      validationIpfsCid = storeRes.ipfsCid;
      validationPinataGatewayUrl = storeRes.pinataGatewayUrl;
    } catch {}
  } catch (error) {
    console.error("Failed to store validation:", error);
  }

  const responseUri = validationIpfsCid
    ? `ipfs://${validationIpfsCid}`
    : `file://validations/${dataHash.slice(2)}.json`;

  try {
    const hash = await writeContract({
      address: contractConfig.validationRegistry.address,
      abi: contractConfig.validationRegistry.abi,
      functionName: "validationResponse",
      args: [
        requestHash as `0x${string}`,
        score,
        responseUri,
        dataHash as `0x${string}`,
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      ],
    });

    // Wait for transaction confirmation
    if (publicClient) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 30000,
        });

        // Check if transaction reverted
        if (receipt.status === "reverted" || receipt.status === 0) {
          return {
            success: false,
            details: "",
            error:
              "Transaction reverted on-chain. Please check the transaction for details.",
            txHash: hash,
          };
        }
      } catch (e) {
        console.warn("Could not confirm transaction receipt:", e);
      }
    }

    return {
      success: true,
      details:
        `Validation Response Submitted\n\n` +
        `Transaction: ${hash}\n` +
        `Score: ${score}/100\n` +
        `Request Hash (Event): ${requestHash}\n` +
        // `Response Data Hash: ${dataHash}` +
        (validationPinataGatewayUrl
          ? `Response Data Hash: ${dataHash} \nView validation on Pinata: ${validationPinataGatewayUrl}`
          : `Response Data Hash: ${dataHash}`),
      txHash: hash,
      stateUpdate: { responseHash: dataHash, responseCid: validationIpfsCid },
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
  _writeContract: any,
  currentAddress: string,
  walletClient: any,
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

  const rebalancerAgentId = workflowState.agentIds?.rebalancer;
  if (!rebalancerAgentId) {
    return {
      success: false,
      details: "",
      error:
        "Rebalancer agent ID not found. Please complete agent registration first.",
      requiresManualAgentId: {
        role: "rebalancer",
        message: "Enter your Rebalancer Agent ID to continue",
      },
    };
  }

  if (!walletClient) {
    return {
      success: false,
      details: "",
      error: "Wallet client not available. Cannot sign authorization.",
    };
  }

  try {
    const indexLimit = BigInt(10);
    const expiryDays = 30;
    const expiry = BigInt(
      Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60
    );
    const chainId = BigInt(contractConfig.chainId);

    const authData = {
      agentId: BigInt(rebalancerAgentId),
      clientAddress: clientAddress,
      indexLimit: indexLimit,
      expiry: expiry,
      chainId: chainId,
      identityRegistry: contractConfig.identityRegistry.address,
      signerAddress: currentAddress,
    };

    const structEncoded = encodeAbiParameters(
      parseAbiParameters(
        "uint256, address, uint64, uint256, uint256, address, address"
      ),
      [
        authData.agentId,
        authData.clientAddress as `0x${string}`,
        authData.indexLimit,
        authData.expiry,
        authData.chainId,
        authData.identityRegistry as `0x${string}`,
        authData.signerAddress as `0x${string}`,
      ]
    );

    const structHash = keccak256(structEncoded);
    const signature = await walletClient.signMessage({
      account: currentAddress as `0x${string}`,
      message: { raw: structHash },
    });

    const feedbackAuth = `${structEncoded}${signature.slice(
      2
    )}` as `0x${string}`;
    const expiryDate = new Date(Number(expiry) * 1000);

    return {
      success: true,
      details:
        `Feedback Authorization Generated\n\n` +
        `Client: ${clientAddress.slice(0, 10)}...${clientAddress.slice(-4)}\n` +
        `Agent ID: ${rebalancerAgentId}\n` +
        `Limit: ${indexLimit} feedbacks\n` +
        `Expiry: ${expiryDate.toLocaleDateString()}\n` +
        `Chain: ${chainId}\n\n` +
        `Off-chain authorization signed\n` +
        `This signature will be submitted on-chain in the next step`,
      stateUpdate: {
        feedbackAuthGenerated: true,
        feedbackAuth: feedbackAuth,
        authorizedClient: clientAddress,
        authSignature: signature,
      },
    };
  } catch (error: any) {
    if (error.message?.includes("user rejected")) {
      return {
        success: false,
        details: "",
        error: "Signature rejected by user",
      };
    }
    console.error("Error generating feedback authorization:", error);
    return {
      success: false,
      details: "",
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate authorization",
    };
  }
}

async function submitFeedback(
  agents: any,
  contractConfig: any,
  writeContract: any,
  currentAddress: string,
  workflowState: WorkflowState,
  publicClient: any
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

  // SECURITY: Prevent self-feedback - client cannot be the same as rebalancer
  if (agents.client.toLowerCase() === agents.rebalancer.toLowerCase()) {
    return {
      success: false,
      details: "",
      error:
        "Self-feedback not allowed!\n\n" +
        "The client wallet cannot be the same as the rebalancer wallet.\n" +
        "Please use a different wallet address for the client role.\n\n" +
        `Rebalancer: ${agents.rebalancer}\n` +
        `Client: ${agents.client}\n\n` +
        "Tip: Click 'Change Agents' to reassign wallet addresses.",
    };
  }

  const rebalancerAgentId = workflowState.agentIds?.rebalancer;
  if (!rebalancerAgentId) {
    return {
      success: false,
      details: "",
      error:
        "Rebalancer agent ID not found. Please complete agent registration first.",
      requiresManualAgentId: {
        role: "rebalancer",
        message: "Enter your Rebalancer Agent ID to continue",
      },
    };
  }

  const feedbackAuth = workflowState.feedbackAuth;
  if (!feedbackAuth) {
    return {
      success: false,
      details: "",
      error:
        "Feedback authorization not found. Please complete 'Authorize Feedback' step first.",
    };
  }

  const score = 100;
  const comment = "Great rebalancing service!";

  try {
    const hash = await writeContract({
      address: contractConfig.reputationRegistry.address,
      abi: contractConfig.reputationRegistry.abi,
      functionName: "giveFeedback",
      args: [
        rebalancerAgentId,
        score,
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        comment ? comment : "",
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        feedbackAuth,
      ],
    });

    // Wait for transaction confirmation
    if (publicClient) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 30000,
        });

        // Check if transaction reverted
        if (receipt.status === "reverted" || receipt.status === 0) {
          return {
            success: false,
            details: "",
            error:
              "Transaction reverted on-chain. Please check the transaction for details.",
            txHash: hash,
          };
        }
      } catch (e) {
        console.warn("Could not confirm transaction receipt:", e);
      }
    }

    return {
      success: true,
      details:
        `Client Feedback Submitted\n\n` +
        `Transaction: ${hash}\n` +
        `Agent ID: ${rebalancerAgentId}\n` +
        `Score: ${score}/100\n` +
        `Comment: "${comment}"\n\n` +
        `Authorized and recorded on ReputationRegistry`,
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
  workflowState?: WorkflowState,
  publicClient?: any
): Promise<StepResult> {
  const rebalancerAgentId = workflowState?.agentIds?.rebalancer;

  let details =
    `Reputation Summary\n\n` +
    `Address: ${rebalancer.slice(0, 10)}...${rebalancer.slice(-4)}\n`;

  if (rebalancerAgentId) {
    details += `Agent ID: ${rebalancerAgentId}\n`;
  }

  // Add a delay to ensure blockchain has indexed the feedback transaction
  // This is especially important when checking reputation immediately after submitting feedback
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Read actual reputation data from blockchain
  if (publicClient && rebalancerAgentId) {
    try {
      // Read from ReputationRegistry
      // getSummary(uint256 agentId, address[] clientAddresses, bytes32 tag1, bytes32 tag2)
      // Returns: (uint64 count, uint8 averageScore)
      const reputationSummary = await publicClient.readContract({
        address: contractConfig.reputationRegistry.address,
        abi: contractConfig.reputationRegistry.abi,
        functionName: "getSummary",
        args: [
          BigInt(rebalancerAgentId),
          [], // empty array means all clients
          "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, // tag1 (any)
          "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, // tag2 (any)
        ],
      });

      const totalFeedback = Number(reputationSummary[0]); // count
      const averageScore = Number(reputationSummary[1]); // averageScore

      // Read from ValidationRegistry
      // getSummary(uint256 agentId, address[] validatorAddresses, bytes32 tag)
      // Returns: (uint64 count, uint8 avgResponse)
      const validationSummary = await publicClient.readContract({
        address: contractConfig.validationRegistry.address,
        abi: contractConfig.validationRegistry.abi,
        functionName: "getSummary",
        args: [
          BigInt(rebalancerAgentId),
          [], // empty array means all validators
          "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, // tag (any)
        ],
      });

      const totalValidations = Number(validationSummary[0]); // count

      // Check if agent is active by checking if it has any activity
      const isActive = totalFeedback > 0 || totalValidations > 0;

      details +=
        `\nValidations: ${totalValidations}\n` +
        `Feedback: ${totalFeedback}\n` +
        `Score: ${averageScore}/100\n` +
        `Status: ${isActive ? "Active" : "Inactive"}\n`;
    } catch (error) {
      console.error("Failed to read reputation from blockchain:", error);
      details +=
        `\nCould not read reputation data from blockchain\n` +
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  } else {
    details += `\nPublic client or agent ID not available for on-chain lookup`;
  }

  // if (workflowState) {
  //   if (workflowState.requestHash || workflowState.dataHash) {
  //     details += `\nRequest Hash:\n${
  //       workflowState.requestHash || workflowState.dataHash
  //     }`;
  //   }
  //   if (workflowState.responseHash) {
  //     details += `\nResponse Hash:\n${workflowState.responseHash}`;
  //   }
  // }

  return {
    success: true,
    details,
  };
}
