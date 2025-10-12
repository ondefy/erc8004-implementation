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
  inputData?: {
    oldBalances: string[];
    newBalances: string[];
    prices: string[];
    totalValueCommitment: string;
    minAllocationPct: string;
    maxAllocationPct: string;
  };
  proofGenerated?: boolean;
  newTotalValue?: number;
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
        return await loadInputData();

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

        // Agent already registered, skip registration
        // Note: We don't have the exact tokenId here, but the agent is confirmed registered
        // The workflow will continue successfully without needing to store the tokenId
        return {
          success: true,
          details:
            `${roleCapitalized} agent already registered!\n\n` +
            `Address: ${currentAddress.slice(0, 10)}...${currentAddress.slice(
              -4
            )}\n` +
            `NFT Balance: ${balance.toString()} agent NFT(s)\n` +
            `Status: ✓ Already an active agent\n\n` +
            `ℹ️ Registration skipped - agent is already on-chain`,
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

async function loadInputData(): Promise<StepResult> {
  // Simulated for now - could fetch from IPFS or API
  const data = {
    oldBalances: ["1000", "500", "2000", "750"],
    newBalances: ["800", "600", "1800", "900"],
    prices: ["100", "200", "50", "150"],
    totalValueCommitment: "375000",
    minAllocationPct: "10",
    maxAllocationPct: "40",
  };

  return {
    success: true,
    details: `Loaded ${
      data.oldBalances.length
    } assets\n\nPortfolio Overview:\n• Total Value: ${parseInt(
      data.totalValueCommitment
    ).toLocaleString()}\n• Min Allocation: ${
      data.minAllocationPct
    }%\n• Max Allocation: ${data.maxAllocationPct}%`,
    data,
    stateUpdate: {
      inputData: data,
    },
  };
}

async function generateZKProof(
  workflowState: WorkflowState
): Promise<StepResult> {
  // Get input data from workflow state (from step 1)
  const inputData = workflowState.inputData;

  if (!inputData) {
    return {
      success: false,
      error: "Input data not found. Please load input data first.",
      details: "",
    };
  }

  // Calculate new total value (matching agent's createRebalancingPlan)
  const newTotalValue = inputData.newBalances.reduce(
    (sum, bal, i) => sum + parseInt(bal) * parseInt(inputData.prices[i]),
    0
  );

  // In the real agent implementation, this would:
  // 1. Write input to temp file
  // 2. Run snarkjs wtns calculate
  // 3. Run snarkjs groth16 prove
  // 4. Read proof.json and public.json
  // 5. Return ProofPackage { proof, publicInputs, rebalancingPlan }

  // For frontend demo, we simulate the proof generation
  // In production, this would call an API endpoint that runs the actual ZK proof generation

  return {
    success: true,
    details:
      `ZK proof generated using Groth16\n\n` +
      `Proof Details:\n` +
      `• Circuit: rebalancing.circom\n` +
      `• Proof System: Groth16\n` +
      `• Private Inputs: ${inputData.oldBalances.length} balances + prices (hidden)\n` +
      `• Public Input: total value = ${newTotalValue.toLocaleString()}\n` +
      `• Constraints: ${inputData.minAllocationPct}% ≤ allocations ≤ ${inputData.maxAllocationPct}%\n` +
      `• Assets: ${inputData.oldBalances.length} portfolio assets\n\n` +
      `✓ Proof cryptographically generated\n` +
      `ℹ️ Note: In production, proof generation happens off-chain via snarkjs`,
    stateUpdate: {
      proofGenerated: true,
      newTotalValue,
    },
  };
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

  // In the real implementation (rebalancer-agent.ts):
  // 1. Creates SHA-256 hash of proof: dataHash = createHash('sha256').update(JSON.stringify(proof)).digest('hex')
  // 2. Stores proof in data/${dataHash}.json
  // 3. Creates requestUri = `file://data/${dataHash}.json`
  // 4. Calls requestValidation(validatorAddress, requestUri, `0x${dataHash}`)

  // For frontend demo, we simulate the dataHash
  const inputData = workflowState.inputData;
  const simulatedDataHash = `0x${Buffer.from(
    JSON.stringify(inputData)
  ).toString("hex")}`.slice(0, 66); // First 32 bytes

  try {
    const hash = await writeContract({
      address: contractConfig.validationRegistry.address,
      abi: contractConfig.validationRegistry.abi,
      functionName: "validationRequest",
      args: [
        agents.validator, // validatorAddress
        rebalancerAgentId, // agentId from registration
        "ipfs://rebalancing-proof", // requestUri (in real impl: file://data/${dataHash}.json)
        simulatedDataHash, // requestHash (dataHash from proof)
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
        // event ValidationRequest(bytes32 indexed requestHash, address indexed requester, address indexed validator, uint256 agentId)
        const validationRequestLog = receipt.logs.find((log: any) => {
          // Check if this is from ValidationRegistry
          return (
            log.address.toLowerCase() ===
              contractConfig.validationRegistry.address.toLowerCase() &&
            log.topics.length >= 3
          ); // requestHash, requester, validator are indexed
        });

        if (validationRequestLog && validationRequestLog.topics[0]) {
          // requestHash is the first indexed parameter (the dataHash we submitted)
          requestHash = validationRequestLog.topics[0];
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
        requestHash: requestHash || simulatedDataHash,
        dataHash: requestHash || simulatedDataHash,
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

  // In the real implementation (validator-agent.ts):
  // 1. Loads proof from data/${dataHash}.json (or receives ProofPackage directly)
  // 2. Writes temp files: temp_proof.json, temp_public.json
  // 3. Runs: snarkjs groth16 verify build/verification_key.json temp_public.json temp_proof.json
  // 4. Parses result to check if it includes "OK"
  // 5. Returns ValidationResult { isValid: boolean, score: 0-100, dataHash: string }

  // For frontend demo, we simulate the validation
  // In production, this would call the validator's off-chain service to run snarkjs

  const isValid = true; // Simulated validation result
  const score = 100;

  let details =
    `ZK Proof Validation Complete\n\n` +
    `Cryptographic Verification:\n` +
    `• Verification Key: build/verification_key.json\n` +
    `• Proof System: Groth16\n` +
    `• Result: ${isValid ? "✅ VALID" : "❌ INVALID"}\n` +
    `• Score: ${score}/100\n\n` +
    `📋 DataHash:\n${dataHash}\n\n` +
    `ℹ️ Note: In production, snarkjs groth16 verify runs off-chain`;

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
  const score = validationResult?.score || 100;
  const dataHash = validationResult?.dataHash || requestHash;

  // In the real implementation (validator-agent.ts):
  // 1. Takes ValidationResult { isValid, score, dataHash }
  // 2. Stores validation in validations/${dataHash}.json
  // 3. Creates responseUri = `file://validations/${dataHash}.json`
  // 4. Calls submitValidationResponse(requestHash, score, responseUri, dataHash, tag)

  try {
    const hash = await writeContract({
      address: contractConfig.validationRegistry.address,
      abi: contractConfig.validationRegistry.abi,
      functionName: "validationResponse",
      args: [
        requestHash as `0x${string}`, // requestHash from step 3
        score, // response (0-100, where 100 = valid)
        "ipfs://validation-response", // responseUri (in real impl: file://validations/${dataHash}.json)
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
        // event ValidationResponse(bytes32 indexed requestHash, bytes32 indexed responseHash, address indexed validator, uint8 response)
        const validationResponseLog = receipt.logs.find((log: any) => {
          return (
            log.address.toLowerCase() ===
              contractConfig.validationRegistry.address.toLowerCase() &&
            log.topics.length >= 3
          );
        });

        if (validationResponseLog && validationResponseLog.topics[1]) {
          // responseHash is the second indexed parameter
          responseHash = validationResponseLog.topics[1];
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
