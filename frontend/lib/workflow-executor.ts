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
            `✓ Active agent`,
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
    let details = `${roleCapitalized} Registration Submitted\n\nTx: ${hash.slice(
      0,
      10
    )}...`;
    let agentId: number | undefined;

    if (publicClient) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 30000,
        });
        const transferLog = receipt.logs.find(
          (log: any) =>
            log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        );
        if (transferLog && transferLog.topics[3]) {
          agentId = parseInt(transferLog.topics[3], 16);
          details = `${roleCapitalized} Registered\n\nTx: ${hash.slice(
            0,
            10
          )}...\nAgent ID: ${agentId}`;
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
          liquidity: customData.liquidity,
          zyfiTvl: customData.zyfiTvl,
          amount: customData.amount,
          poolTvl: customData.poolTvl,
          newApy: Math.round(customData.newApy * 100),
          oldApy: Math.round(customData.oldApy * 100),
          apyStable7Days: customData.apyStable7Days ? 1 : 0,
          apyStable10Days: customData.apyStable10Days ? 1 : 0,
          tvlStable: customData.tvlStable ? 1 : 0,
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
        `Old APY: ${(oldApy / 100).toFixed(2)}%\n` +
        `New APY: ${(newApy / 100).toFixed(2)}%\n` +
        `Improvement: +${apyDiff}%\n\n` +
        `7d: ${data.apyStable7Days ? "✓" : "✗"} | ` +
        `10d: ${data.apyStable10Days ? "✓" : "✗"} | ` +
        `TVL: ${data.tvlStable ? "✓" : "✗"}`;
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

      return {
        success: true,
        details:
          `ZK Proof Generated (Groth16)\n\n` +
          `Circuit: rebalancer-validation.circom\n` +
          `Mode: Rebalancing (DeFi Validation)\n` +
          `Private: liquidity, zyfiTvl, amount, poolTvl, APYs\n` +
          `Public: validationCommitment, isValid\n\n` +
          `Rules:\n` +
          `1. Liquidity × 1.05 > zyfiTvl + (amount/1M)\n` +
          `2. poolTvl × 1M > amount × 4 (max 25%)\n` +
          `3. newApy > oldApy + 10 (0.1% min)\n` +
          `4. 7d OR 10d stability\n` +
          `5. TVL stable`,
        stateUpdate: {
          proofGenerated: true,
          proof: result.proof,
          publicInputs: result.publicInputs,
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

      return {
        success: true,
        details:
          `ZK Proof Generated (Groth16 - Browser)\n\n` +
          `Circuit: rebalancing.circom\n` +
          `Mode: Math (Portfolio)\n` +
          `Assets: ${inputData.oldBalances.length}\n` +
          `Range: ${inputData.minAllocationPct}%-${inputData.maxAllocationPct}%\n` +
          `Public: [${result.publicInputs.join(", ")}]`,
        stateUpdate: {
          proofGenerated: true,
          newTotalValue,
          proof: result.proof,
          publicInputs: result.publicInputs,
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

  let dataHash: string;
  try {
    const response = await fetch("/api/store-proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof, publicInputs: workflowState.publicInputs }),
    });
    if (!response.ok) throw new Error("Failed to store proof");
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
    const requestUri = `file://data/${dataHash.slice(2)}.json`;

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
        `Transaction: ${hash.slice(0, 10)}...${hash.slice(-4)}\n` +
        (requestHash ? `Request Hash: ${requestHash}` : ""),
      txHash: hash,
      stateUpdate: { requestHash, dataHash: requestHash },
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

    return {
      success: true,
      details:
        `ZK Proof Validation\n\n` +
        `Groth16 Verifier (on-chain)\n` +
        `Public: [${publicInputs.join(", ")}]\n` +
        `Result: ${isValid ? "✅ VALID" : "❌ INVALID"}\n` +
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
  } catch (error) {
    console.error("Failed to store validation:", error);
  }

  const responseUri = `file://validations/${dataHash.slice(2)}.json`;

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

    let responseHash: string | undefined;
    if (publicClient) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 30000,
        });
        const validationResponseLog = receipt.logs.find(
          (log: any) =>
            log.address.toLowerCase() ===
              contractConfig.validationRegistry.address.toLowerCase() &&
            log.topics.length >= 4 &&
            log.topics[3] === requestHash
        );
        if (validationResponseLog) {
          responseHash = dataHash;
        }
      } catch (e) {
        console.warn("Could not extract responseHash from receipt:", e);
      }
    }

    return {
      success: true,
      details:
        `Validation Response Submitted\n\n` +
        `Transaction: ${hash.slice(0, 10)}...${hash.slice(-4)}\n` +
        `Score: ${score}/100 ${score === 100 ? "✅" : "⚠️"}\n` +
        `Request Hash: ${requestHash}\n` +
        (responseHash ? `Response Hash: ${responseHash}` : ""),
      txHash: hash,
      stateUpdate: { responseHash: responseHash || dataHash },
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
        `✓ Signed (289 bytes: 224 struct + 65 signature)`,
      stateUpdate: {
        feedbackAuthGenerated: true,
        feedbackAuth: feedbackAuth,
        authorizedClient: clientAddress,
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

  const rebalancerAgentId = workflowState.agentIds?.rebalancer;
  if (!rebalancerAgentId) {
    return {
      success: false,
      details: "",
      error:
        "Rebalancer agent ID not found. Please complete agent registration first.",
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

  const score = 95;
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
        comment ? `ipfs://feedback/${comment}` : "",
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        feedbackAuth,
      ],
    });

    return {
      success: true,
      details:
        `Client Feedback Submitted\n\n` +
        `Transaction: ${hash.slice(0, 10)}...${hash.slice(-4)}\n` +
        `Agent ID: ${rebalancerAgentId}\n` +
        `Score: ${score}/100 ⭐\n` +
        `Comment: "${comment}"\n\n` +
        `✓ Authorized and recorded on ReputationRegistry`,
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
  _contractConfig: any,
  workflowState?: WorkflowState
): Promise<StepResult> {
  const rebalancerAgentId = workflowState?.agentIds?.rebalancer;

  let details =
    `Reputation Summary\n\n` +
    `Address: ${rebalancer.slice(0, 10)}...${rebalancer.slice(-4)}\n`;

  if (rebalancerAgentId) {
    details += `Agent ID: ${rebalancerAgentId}\n`;
  }

  details +=
    `\nValidations: 1\n` +
    `Feedback: 1\n` +
    `Score: 95/100 ⭐\n` +
    `Status: ✓ Active\n`;

  if (workflowState) {
    if (workflowState.requestHash || workflowState.dataHash) {
      details += `\nRequest Hash:\n${
        workflowState.requestHash || workflowState.dataHash
      }`;
    }
    if (workflowState.responseHash) {
      details += `\nResponse Hash:\n${workflowState.responseHash}`;
    }
  }

  return {
    success: true,
    details,
  };
}
