/**
 * Script to give feedback/reputation to an agent on ReputationRegistry
 * Submits feedback with score, tags, and optional IPFS URI
 *
 * Required environment variables:
 *   PRIVATE_KEY - Private key of the client giving feedback (must NOT be agent owner)
 *   AGENT_ID - Agent ID (tokenId) to give feedback for
 *   SCORE - Feedback score (0-100)
 *   REPUTATION_REGISTRY_ADDRESS - Address of the ReputationRegistry contract
 *   CHAIN_ID - Chain ID (e.g., 11155111 for Ethereum Sepolia, 84532 for Base Sepolia)
 *
 * Optional environment variables:
 *   TAG1 - First tag/category for the feedback (default: "")
 *   TAG2 - Second tag/category for the feedback (default: "")
 *   ENDPOINT - Endpoint associated with the feedback (default: "")
 *   CONTEXT - Context for the feedback (default: same as tag1)
 *   CAPABILITY - Capability for the feedback (default: same as tag1)
 *   FEEDBACK_AUTH - Feedback authorization (default: "0x" for anonymous)
 *   PINATA_JWT - Pinata JWT token for IPFS upload (required for IPFS upload)
 *   RPC_URL - Custom RPC URL (defaults based on chain)
 *   EXPLORER_URL - Custom explorer URL (defaults based on chain)
 *
 * Usage:
 *   PRIVATE_KEY=0x... AGENT_ID=323 SCORE=95 REPUTATION_REGISTRY_ADDRESS=0x... CHAIN_ID=11155111 npx ts-node scripts/give-feedback.ts
 *
 * Or set variables in .env file
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, baseSepolia, mainnet, base } from "viem/chains";
import * as dotenv from "dotenv";
import axios from "axios";
import FormData from "form-data";
import * as crypto from "crypto";

// Load environment variables
dotenv.config();

// Chain configurations
const CHAIN_CONFIGS: Record<
  number,
  { chain: Chain; defaultRpc: string; defaultExplorer: string; name: string }
> = {
  1: {
    chain: mainnet,
    defaultRpc: "https://eth.llamarpc.com",
    defaultExplorer: "https://etherscan.io",
    name: "Ethereum Mainnet",
  },
  11155111: {
    chain: sepolia,
    defaultRpc: "https://sepolia.drpc.org",
    defaultExplorer: "https://sepolia.etherscan.io",
    name: "Ethereum Sepolia",
  },
  8453: {
    chain: base,
    defaultRpc: "https://mainnet.base.org",
    defaultExplorer: "https://basescan.org",
    name: "Base Mainnet",
  },
  84532: {
    chain: baseSepolia,
    defaultRpc: "https://sepolia.base.org",
    defaultExplorer: "https://sepolia.basescan.org",
    name: "Base Sepolia",
  },
};

// Reputation Registry ABI (minimal - just what we need)
const REPUTATION_REGISTRY_ABI = parseAbi([
  "function giveFeedback(uint256 agentId, uint8 score, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external",
  "function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)",
  "function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) external view returns (uint8 score, string memory tag1, string memory tag2, bool isRevoked)",
  "function getSummary(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2) external view returns (uint64 count, uint8 averageScore)",
  "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, uint8 score, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
]);

// Pinata API configuration
const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_PIN_FILE_ENDPOINT = `${PINATA_API_URL}/pinning/pinFileToIPFS`;

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface FeedbackData {
  agentRegistry: string;
  agentId: number;
  clientAddress: string;
  createdAt: string;
  feedbackAuth: string;
  score: number;
  tag1: string;
  tag2: string;
  context?: string;
  capability?: string;
}

/**
 * Upload JSON data to IPFS using Pinata
 */
async function uploadToPinata(jsonData: object): Promise<string> {
  const pinataJwtToken = process.env.PINATA_JWT;

  if (!pinataJwtToken) {
    throw new Error(
      "PINATA_JWT environment variable not set. Get your token from https://app.pinata.cloud/"
    );
  }

  // Convert JSON to buffer
  const jsonString = JSON.stringify(jsonData, null, 2);
  const jsonBuffer = Buffer.from(jsonString, "utf-8");

  // Create form data
  const formData = new FormData();
  formData.append("file", jsonBuffer, {
    filename: "feedback.json",
    contentType: "application/json",
  });

  // Pinata metadata
  const metadata = JSON.stringify({
    name: "ERC-8004 Feedback",
    keyvalues: {
      type: "erc8004-feedback",
      version: "v1",
    },
  });
  formData.append("pinataMetadata", metadata);

  // Pinata options
  const options = JSON.stringify({
    cidVersion: 1, // Use IPFS CIDv1
  });
  formData.append("pinataOptions", options);

  console.log("Uploading feedback to IPFS (Pinata)...\n");

  try {
    const response = await axios.post<PinataResponse>(
      PINATA_PIN_FILE_ENDPOINT,
      formData,
      {
        headers: {
          Authorization: `Bearer ${pinataJwtToken}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return response.data.IpfsHash;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Pinata API error: ${error.response.status} - ${JSON.stringify(
          error.response.data
        )}`
      );
    } else if (error.request) {
      throw new Error("No response from Pinata API");
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
}

/**
 * Calculate SHA-256 hash of the feedback JSON
 */
function calculateFeedbackHash(jsonData: object): `0x${string}` {
  const jsonString = JSON.stringify(jsonData, null, 2);
  const hash = crypto.createHash("sha256").update(jsonString).digest("hex");
  return `0x${hash}` as `0x${string}`;
}

/**
 * Format address as CAIP-10 (eip155:chainId:address)
 */
function formatCAIP10(chainId: number, address: string): string {
  return `eip155:${chainId}:${address.toLowerCase()}`;
}

async function main() {
  console.log("Give Feedback to Agent on ReputationRegistry\n");

  // Validate required environment variables
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable not set");
    console.log(
      "\nNote: This should be the private key of the CLIENT giving feedback (not the agent owner)"
    );
    process.exit(1);
  }

  const agentIdStr = process.env.AGENT_ID;
  if (!agentIdStr) {
    console.error("Error: AGENT_ID environment variable not set");
    process.exit(1);
  }
  const agentId = BigInt(agentIdStr);

  const scoreStr = process.env.SCORE;
  if (!scoreStr) {
    console.error("Error: SCORE environment variable not set");
    console.log("\nNote: Score must be between 0 and 100");
    process.exit(1);
  }
  const score = parseInt(scoreStr, 10);
  if (isNaN(score) || score < 0 || score > 100) {
    console.error("Error: SCORE must be a number between 0 and 100");
    process.exit(1);
  }

  const reputationRegistryAddress = process.env.REPUTATION_REGISTRY_ADDRESS;
  if (!reputationRegistryAddress) {
    console.error(
      "Error: REPUTATION_REGISTRY_ADDRESS environment variable not set"
    );
    process.exit(1);
  }

  const chainIdStr = process.env.CHAIN_ID;
  if (!chainIdStr) {
    console.error("Error: CHAIN_ID environment variable not set");
    console.log("\nNote: Supported chain IDs:");
    Object.entries(CHAIN_CONFIGS).forEach(([id, config]) => {
      console.log(`   ${id}: ${config.name}`);
    });
    process.exit(1);
  }
  const chainId = parseInt(chainIdStr, 10);

  const chainConfig = CHAIN_CONFIGS[chainId];
  if (!chainConfig) {
    console.error(`Error: Unsupported CHAIN_ID: ${chainId}`);
    console.log("\nNote: Supported chain IDs:");
    Object.entries(CHAIN_CONFIGS).forEach(([id, config]) => {
      console.log(`   ${id}: ${config.name}`);
    });
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL || chainConfig.defaultRpc;
  const explorerUrl = process.env.EXPLORER_URL || chainConfig.defaultExplorer;

  // Optional parameters
  const tag1 = process.env.TAG1 || "";
  const tag2 = process.env.TAG2 || "";
  const endpoint = process.env.ENDPOINT || "";
  const context = process.env.CONTEXT || tag1 || "";
  const capability = process.env.CAPABILITY || tag1 || "";
  const feedbackAuth = process.env.FEEDBACK_AUTH || "0x";

  console.log(`Network: ${chainConfig.name} (Chain ID: ${chainId})`);
  console.log(`ReputationRegistry: ${reputationRegistryAddress}`);
  console.log(`Agent ID: ${agentId}`);
  console.log(`Score: ${score}/100`);
  if (tag1) console.log(`Tag 1: ${tag1}`);
  if (tag2) console.log(`Tag 2: ${tag2}`);
  if (endpoint) console.log(`Endpoint: ${endpoint}`);
  console.log("");

  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`Giving feedback from address: ${account.address}\n`);

  // Create clients
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: chainConfig.chain,
    transport: http(rpcUrl),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  const symbol = chainConfig.chain.nativeCurrency.symbol;
  const decimals = chainConfig.chain.nativeCurrency.decimals;
  console.log(
    `Balance: ${(Number(balance) / Number(10n ** BigInt(decimals))).toFixed(
      4
    )} ${symbol}`
  );

  if (balance === 0n) {
    console.error(
      `\nError: Insufficient balance. Get ${symbol} for ${chainConfig.name}`
    );
    process.exit(1);
  }

  // Verify agent exists and check if we're the owner (self-feedback not allowed)
  console.log("\nVerifying agent and checking permissions...");
  let identityRegistryAddress: `0x${string}`;
  try {
    // Get IdentityRegistry from ReputationRegistry
    identityRegistryAddress = (await publicClient.readContract({
      address: reputationRegistryAddress as `0x${string}`,
      abi: parseAbi([
        "function getIdentityRegistry() external view returns (address)",
      ]),
      functionName: "getIdentityRegistry",
    })) as `0x${string}`;

    // Check agent owner
    const agentOwner = await publicClient.readContract({
      address: identityRegistryAddress,
      abi: parseAbi([
        "function ownerOf(uint256 tokenId) external view returns (address)",
      ]),
      functionName: "ownerOf",
      args: [agentId],
    });

    console.log(`   Agent Owner: ${agentOwner}`);
    console.log(`   IdentityRegistry: ${identityRegistryAddress}`);

    if (agentOwner.toLowerCase() === account.address.toLowerCase()) {
      console.error(
        "\nError: Self-feedback not allowed. You cannot give feedback to your own agent."
      );
      console.log(
        "\nNote: Use a different address (not the agent owner) to give feedback"
      );
      process.exit(1);
    }

    console.log("Agent exists and permissions verified\n");
  } catch (error: any) {
    console.error("\nError verifying agent:");
    console.error(error.message);
    if (error.message.includes("owner query for nonexistent token")) {
      console.log("\nNote: The agent ID does not exist on this network");
    }
    process.exit(1);
  }

  // Create feedback JSON object
  console.log("Creating feedback JSON...\n");
  const feedbackData: FeedbackData = {
    agentRegistry: formatCAIP10(chainId, identityRegistryAddress),
    agentId: Number(agentId),
    clientAddress: formatCAIP10(chainId, account.address),
    createdAt: new Date().toISOString(),
    feedbackAuth: feedbackAuth,
    score: score,
    tag1: tag1,
    tag2: tag2,
  };

  // Add optional fields if provided
  if (context) {
    feedbackData.context = context;
  }
  if (capability) {
    feedbackData.capability = capability;
  }

  console.log("Feedback Data:");
  console.log(JSON.stringify(feedbackData, null, 2));
  console.log("");

  // Calculate feedbackHash (SHA-256 of JSON)
  const feedbackHash = calculateFeedbackHash(feedbackData);
  console.log(`Feedback Hash (SHA-256): ${feedbackHash}\n`);

  // Upload to IPFS
  console.log("Uploading feedback to IPFS...\n");
  let ipfsCid: string;
  let feedbackURI: string;
  try {
    ipfsCid = await uploadToPinata(feedbackData);
    feedbackURI = `ipfs://${ipfsCid}`;
    console.log(`Upload successful!\n`);
    console.log(`IPFS CID: ${ipfsCid}`);
    console.log(`IPFS URI: ${feedbackURI}`);
    console.log(`IPFS Gateway: https://ipfs.io/ipfs/${ipfsCid}`);
    console.log(
      `Pinata Gateway: https://gateway.pinata.cloud/ipfs/${ipfsCid}\n`
    );
  } catch (error: any) {
    console.error("\nIPFS upload failed:");
    console.error(error.message);
    if (error.message.includes("PINATA_JWT")) {
      console.log("\nNote: How to get your Pinata JWT token:");
      console.log("   1. Go to https://app.pinata.cloud/");
      console.log("   2. Sign up or log in");
      console.log("   3. Go to API Keys section");
      console.log("   4. Create a new API key with 'pinFileToIPFS' permission");
      console.log("   5. Copy the JWT token");
      console.log(
        "   6. Run: PINATA_JWT=your_token npx ts-node scripts/give-feedback.ts\n"
      );
    }
    process.exit(1);
  }

  // Check current feedback index for this client
  try {
    const lastIndex = await publicClient.readContract({
      address: reputationRegistryAddress as `0x${string}`,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getLastIndex",
      args: [agentId, account.address],
    });
    console.log(
      `Current feedback index for this client: ${lastIndex.toString()}`
    );
    console.log(
      `   New feedback will be at index: ${(lastIndex + 1n).toString()}\n`
    );
  } catch (error: any) {
    // This is okay, might be first feedback
    console.log("   This will be your first feedback for this agent\n");
  }

  console.log("Submitting feedback...\n");

  try {
    // Give feedback
    const hash = await walletClient.writeContract({
      address: reputationRegistryAddress as `0x${string}`,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "giveFeedback",
      args: [
        agentId,
        score as number,
        tag1,
        tag2,
        endpoint,
        feedbackURI,
        feedbackHash,
      ],
    });

    console.log(`Transaction submitted!`);
    console.log(`Tx Hash: ${hash}`);
    console.log(`Explorer: ${explorerUrl}/tx/${hash}\n`);

    console.log("Waiting for confirmation...\n");

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status === "success") {
      console.log("Feedback submitted successfully!\n");

      // Get the new feedback index
      const newIndex = await publicClient.readContract({
        address: reputationRegistryAddress as `0x${string}`,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getLastIndex",
        args: [agentId, account.address],
      });

      // Verify the feedback was recorded
      const feedback = await publicClient.readContract({
        address: reputationRegistryAddress as `0x${string}`,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "readFeedback",
        args: [agentId, account.address, newIndex],
      });

      console.log(`Verification:`);
      console.log(`   Feedback Index: ${newIndex.toString()}`);
      console.log(`   Score: ${feedback[0]}/100`);
      console.log(`   Tag 1: ${feedback[1] || "(empty)"}`);
      console.log(`   Tag 2: ${feedback[2] || "(empty)"}`);
      console.log(`   Revoked: ${feedback[3] ? "Yes" : "No"}\n`);

      // Get summary for the agent
      const summary = await publicClient.readContract({
        address: reputationRegistryAddress as `0x${string}`,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getSummary",
        args: [agentId, [], "", ""],
      });

      console.log(`Agent Reputation Summary:`);
      console.log(`   Total Feedback Count: ${summary[0].toString()}`);
      console.log(`   Average Score: ${summary[1]}/100\n`);

      console.log("Feedback submission complete!\n");

      console.log("Quick Links:");
      console.log(`   Transaction: ${explorerUrl}/tx/${hash}`);
      console.log(
        `   ReputationRegistry: ${explorerUrl}/address/${reputationRegistryAddress}`
      );
      console.log(
        `   Client Address: ${explorerUrl}/address/${account.address}`
      );
      console.log(`   Feedback Details: ${feedbackURI}`);
      console.log(`   IPFS Gateway: https://ipfs.io/ipfs/${ipfsCid}`);
      console.log(
        `   Pinata Gateway: https://gateway.pinata.cloud/ipfs/${ipfsCid}\n`
      );
    } else {
      console.error("Transaction failed!");
      console.log(`Receipt:`, receipt);
    }
  } catch (error: any) {
    console.error("\nFeedback submission failed:");
    console.error(error.message);

    if (error.message.includes("insufficient funds")) {
      console.log(
        `\nNote: Get ${chainConfig.chain.nativeCurrency.symbol} for ${chainConfig.name}`
      );
    } else if (error.message.includes("Self-feedback not allowed")) {
      console.log(
        "\nNote: You cannot give feedback to your own agent. Use a different address."
      );
    } else if (error.message.includes("Agent does not exist")) {
      console.log("\nNote: The agent ID does not exist on this network");
    } else if (error.message.includes("score>100")) {
      console.log("\nNote: Score must be between 0 and 100");
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
