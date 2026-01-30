/**
 * Script to register Zyfai Rebalancer Agent on Ethereum Mainnet
 * and/or update the agent URI via setAgentURI.
 *
 * Usage:
 *   Register new agent:
 *     PRIVATE_KEY=0x... IPFS_CID=Qm... npx ts-node scripts/register-agent-mainnet.ts
 *
 *   Update URI on existing agent:
 *     PRIVATE_KEY=0x... IPFS_CID=Qm... AGENT_ID=123 npx ts-node scripts/register-agent-mainnet.ts --set-uri
 *
 *   Both register and update URI are supported. Pass --set-uri with AGENT_ID
 *   to update an existing agent's URI instead of registering a new one.
 */

import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL_MAINNET =
  process.env.RPC_URL_MAINNET || "https://eth.drpc.org";
const IDENTITY_REGISTRY_ADDRESS =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

const CHAIN_ID = 1;

const getIPFSCID = (): string => {
  if (process.env.IPFS_CID) {
    return process.env.IPFS_CID;
  }

  const cidFilePath = path.join(__dirname, "..", "latest-ipfs-cid.txt");
  if (fs.existsSync(cidFilePath)) {
    const cid = fs.readFileSync(cidFilePath, "utf-8").trim();
    if (cid && cid !== "YOUR_IPFS_CID_HERE") {
      console.log(`Using IPFS CID from latest-ipfs-cid.txt: ${cid}\n`);
      return cid;
    }
  }

  return "YOUR_IPFS_CID_HERE";
};

const IPFS_CID = getIPFSCID();

const IDENTITY_REGISTRY_ABI = parseAbi([
  "function register() external returns (uint256 agentId)",
  "function register(string memory tokenUri) external returns (uint256 agentId)",
  "function register(string tokenUri, (string metadataKey, bytes metadataValue)[] metadata) external returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId, string newURI) external",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
  "event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

function parseArgs(): { setUri: boolean; agentId: number | null } {
  const setUri = process.argv.includes("--set-uri");
  const agentIdEnv = process.env.AGENT_ID;
  const agentId = agentIdEnv ? parseInt(agentIdEnv, 10) : null;
  return { setUri, agentId };
}

async function registerAgent(
  walletClient: any,
  publicClient: any,
  tokenURI: string
) {
  const metadata = [
    {
      metadataKey: "agentName",
      metadataValue: `0x${Buffer.from("Zyfai Rebalancer Agent", "utf-8").toString("hex")}` as `0x${string}`,
    },
    {
      metadataKey: "agentType",
      metadataValue: `0x${Buffer.from("DeFi Rebalancer", "utf-8").toString("hex")}` as `0x${string}`,
    },
  ];

  console.log("Submitting registration transaction...\n");

  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [tokenURI, metadata],
  });

  console.log(`Transaction submitted: ${hash}`);
  console.log(`Explorer: https://etherscan.io/tx/${hash}\n`);
  console.log("Waiting for confirmation...\n");

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 2,
  });

  if (receipt.status !== "success") {
    console.error("Transaction failed!");
    console.log("Receipt:", receipt);
    process.exit(1);
  }

  console.log("Registration successful!\n");

  // Extract agentId from Transfer event (minting from address(0))
  const transferLog = receipt.logs.find(
    (log: any) =>
      log.address.toLowerCase() === IDENTITY_REGISTRY_ADDRESS.toLowerCase() &&
      log.topics[0] ===
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" &&
      log.topics[1] ===
        "0x0000000000000000000000000000000000000000000000000000000000000000"
  );

  if (!transferLog || !transferLog.topics[3]) {
    console.log(
      "Could not extract agentId from logs. Check transaction manually."
    );
    return null;
  }

  const agentId = parseInt(transferLog.topics[3], 16);
  console.log(`Agent ID: ${agentId}`);
  console.log(
    `Full Agent Reference: eip155:${CHAIN_ID}:${IDENTITY_REGISTRY_ADDRESS}:${agentId}\n`
  );

  // Verify on-chain
  const registeredTokenURI = await publicClient.readContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "tokenURI",
    args: [BigInt(agentId)],
  });

  const owner = await publicClient.readContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "ownerOf",
    args: [BigInt(agentId)],
  });

  console.log("Verification:");
  console.log(`  Token URI: ${registeredTokenURI}`);
  console.log(`  Owner: ${owner}\n`);

  // Update agent card
  const agentCardPath = path.join(__dirname, "..", "agent-card-zyfai.json");
  const agentCard = JSON.parse(fs.readFileSync(agentCardPath, "utf-8"));

  const mainnetRegistration = {
    agentId: agentId,
    agentRegistry: `eip155:${CHAIN_ID}:${IDENTITY_REGISTRY_ADDRESS}`,
  };

  // Add or update mainnet registration entry
  const existingIdx = agentCard.registrations.findIndex(
    (r: any) => r.agentRegistry && r.agentRegistry.startsWith(`eip155:${CHAIN_ID}:`)
  );
  if (existingIdx >= 0) {
    agentCard.registrations[existingIdx] = mainnetRegistration;
  } else {
    agentCard.registrations.push(mainnetRegistration);
  }

  fs.writeFileSync(agentCardPath, JSON.stringify(agentCard, null, 2));
  console.log(`Updated agent-card-zyfai.json with mainnet agentId: ${agentId}\n`);

  // Save agent ID
  const agentIdFilePath = path.join(__dirname, "..", "latest-agent-id-mainnet.txt");
  fs.writeFileSync(agentIdFilePath, agentId.toString());
  console.log(`Agent ID saved to: latest-agent-id-mainnet.txt\n`);

  console.log("Registration complete!\n");
  console.log("Next Steps:");
  console.log("  1. Re-upload updated agent-card-zyfai.json to IPFS if needed");
  console.log("  2. If the CID changed, update it with:");
  console.log(
    `     AGENT_ID=${agentId} IPFS_CID=NEW_CID npx ts-node scripts/register-agent-mainnet.ts --set-uri`
  );
  console.log("");
  console.log("Links:");
  console.log(
    `  Agent NFT: https://etherscan.io/token/${IDENTITY_REGISTRY_ADDRESS}?a=${agentId}`
  );
  console.log(`  Owner: https://etherscan.io/address/${owner}`);
  console.log(`  IPFS Card: https://ipfs.io/ipfs/${IPFS_CID}\n`);

  return agentId;
}

async function setAgentURI(
  walletClient: any,
  publicClient: any,
  agentId: number,
  newURI: string
) {
  // Verify the caller owns the agent
  const owner = await publicClient.readContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "ownerOf",
    args: [BigInt(agentId)],
  });

  const currentURI = await publicClient.readContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "tokenURI",
    args: [BigInt(agentId)],
  });

  console.log(`Agent ID: ${agentId}`);
  console.log(`Owner: ${owner}`);
  console.log(`Current URI: ${currentURI}`);
  console.log(`New URI: ${newURI}\n`);

  console.log("Submitting setAgentURI transaction...\n");

  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "setAgentURI",
    args: [BigInt(agentId), newURI],
  });

  console.log(`Transaction submitted: ${hash}`);
  console.log(`Explorer: https://etherscan.io/tx/${hash}\n`);
  console.log("Waiting for confirmation...\n");

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 2,
  });

  if (receipt.status !== "success") {
    console.error("Transaction failed!");
    console.log("Receipt:", receipt);
    process.exit(1);
  }

  // Verify the update
  const updatedURI = await publicClient.readContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "tokenURI",
    args: [BigInt(agentId)],
  });

  console.log("URI updated successfully!\n");
  console.log("Verification:");
  console.log(`  Previous URI: ${currentURI}`);
  console.log(`  Updated URI:  ${updatedURI}\n`);
}

async function main() {
  console.log("Zyfai Rebalancer Agent - Ethereum Mainnet\n");
  console.log(`Registry: ${IDENTITY_REGISTRY_ADDRESS}`);
  console.log(`Chain: Ethereum Mainnet (${CHAIN_ID})\n`);

  const { setUri, agentId } = parseArgs();

  // Validate private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable not set\n");
    console.log("Usage:");
    console.log(
      "  Register: PRIVATE_KEY=0x... IPFS_CID=Qm... npx ts-node scripts/register-agent-mainnet.ts"
    );
    console.log(
      "  Set URI:  PRIVATE_KEY=0x... IPFS_CID=Qm... AGENT_ID=123 npx ts-node scripts/register-agent-mainnet.ts --set-uri"
    );
    process.exit(1);
  }

  // Validate IPFS CID
  if (IPFS_CID === "YOUR_IPFS_CID_HERE") {
    console.error("Error: IPFS_CID not set\n");
    console.log("Steps:");
    console.log("  1. Upload agent-card-zyfai.json to IPFS");
    console.log("  2. Set IPFS_CID environment variable");
    process.exit(1);
  }

  // Validate --set-uri requires AGENT_ID
  if (setUri && agentId === null) {
    console.error("Error: --set-uri requires AGENT_ID environment variable\n");
    console.log("Usage:");
    console.log(
      "  PRIVATE_KEY=0x... IPFS_CID=Qm... AGENT_ID=123 npx ts-node scripts/register-agent-mainnet.ts --set-uri"
    );
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`Address: ${account.address}\n`);

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(RPC_URL_MAINNET),
  });

  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(RPC_URL_MAINNET),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${(Number(balance) / 1e18).toFixed(6)} ETH`);

  if (balance === 0n) {
    console.error("\nError: No ETH balance. Mainnet requires real ETH for gas.");
    process.exit(1);
  }

  const tokenURI = `ipfs://${IPFS_CID}`;

  try {
    if (setUri && agentId !== null) {
      console.log("\nMode: Update Agent URI\n");
      await setAgentURI(walletClient, publicClient, agentId, tokenURI);
    } else {
      console.log("\nMode: Register New Agent\n");
      await registerAgent(walletClient, publicClient, tokenURI);
    }
  } catch (error: any) {
    console.error("\nOperation failed:");
    console.error(error.message);

    if (error.message.includes("insufficient funds")) {
      console.log("\nInsufficient ETH for gas. Top up your wallet.");
    }
    if (error.message.includes("Not authorized")) {
      console.log("\nYou are not the owner of this agent. Check AGENT_ID and PRIVATE_KEY.");
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
