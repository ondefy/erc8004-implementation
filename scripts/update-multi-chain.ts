/**
 * Script to update agent tokenURI on multiple chains
 * Use this after re-uploading your agent card to IPFS
 *
 * Usage:
 * npx ts-node scripts/update-multi-chain.ts
 */

import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, baseSepolia } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Network configurations
const NETWORKS = {
  ETHEREUM_SEPOLIA: {
    name: "Ethereum Sepolia",
    chain: sepolia,
    rpc: process.env.RPC_URL_SEPOLIA || "https://sepolia.drpc.org",
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const,
    agentId: 323, // Your Ethereum Sepolia agent ID
    explorer: "https://sepolia.etherscan.io",
  },
  BASE_SEPOLIA: {
    name: "Base Sepolia",
    chain: baseSepolia,
    rpc: process.env.RPC_URL_BASE_SEPOLIA || "https://sepolia.base.org",
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const,
    agentId: -1, // Your Base Sepolia agent ID
    explorer: "https://sepolia.basescan.org",
  },
};

const IDENTITY_REGISTRY_ABI = parseAbi([
  "function setAgentUri(uint256 agentId, string calldata newUri) external",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "event UriUpdated(uint256 indexed agentId, string newUri, address indexed updatedBy)",
]);

async function updateURIOnChain(
  networkKey: keyof typeof NETWORKS,
  newCid: string
) {
  const network = NETWORKS[networkKey];
  const newTokenURI = `ipfs://${newCid}`;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔄 Updating ${network.name}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`🎫 Agent ID: ${network.agentId}`);
  console.log(`📝 New URI: ${newTokenURI}`);
  console.log(`🌐 Gateway: https://ipfs.io/ipfs/${newCid}\n`);

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ Error: PRIVATE_KEY environment variable not set");
    return false;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`📍 Updating from address: ${account.address}\n`);

  const publicClient = createPublicClient({
    chain: network.chain,
    transport: http(network.rpc),
  });

  const walletClient = createWalletClient({
    account,
    chain: network.chain,
    transport: http(network.rpc),
  });

  try {
    // Verify ownership
    const owner = await publicClient.readContract({
      address: network.identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "ownerOf",
      args: [BigInt(network.agentId)],
    });

    if (owner.toLowerCase() !== account.address.toLowerCase()) {
      console.error(`❌ Error: You don't own this agent`);
      console.log(`   Owner: ${owner}`);
      console.log(`   Your address: ${account.address}`);
      return false;
    }

    console.log(`✅ Ownership verified\n`);

    // Get current URI
    const currentURI = await publicClient.readContract({
      address: network.identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "tokenURI",
      args: [BigInt(network.agentId)],
    });

    console.log(`📋 Current URI: ${currentURI}`);
    console.log(`📝 New URI: ${newTokenURI}\n`);

    if (currentURI === newTokenURI) {
      console.log("ℹ️  URI is already up to date. Skipping.\n");
      return true;
    }

    // Update URI
    console.log("📤 Submitting update transaction...\n");

    const hash = await walletClient.writeContract({
      address: network.identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "setAgentUri",
      args: [BigInt(network.agentId), newTokenURI],
    });

    console.log(`✅ Transaction submitted!`);
    console.log(`🔗 Tx Hash: ${hash}`);
    console.log(`🔍 Explorer: ${network.explorer}/tx/${hash}\n`);

    console.log("⏳ Waiting for confirmation...\n");

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status === "success") {
      console.log("✅ URI updated successfully!\n");

      // Verify update
      const updatedURI = await publicClient.readContract({
        address: network.identityRegistry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "tokenURI",
        args: [BigInt(network.agentId)],
      });

      console.log(`✅ Verification:`);
      console.log(`   Updated URI: ${updatedURI}`);
      console.log(
        `   Matches expected: ${updatedURI === newTokenURI ? "✅" : "❌"}\n`
      );

      console.log("🔗 Quick Links:");
      console.log(
        `   Agent NFT: ${network.explorer}/token/${network.identityRegistry}?a=${network.agentId}`
      );
      console.log(`   IPFS Card: https://ipfs.io/ipfs/${newCid}`);
      console.log(`   Transaction: ${network.explorer}/tx/${hash}\n`);

      return true;
    } else {
      console.error("❌ Transaction failed!");
      console.log(`Receipt:`, receipt);
      return false;
    }
  } catch (error: any) {
    console.error("\n❌ Update failed:");
    console.error(error.message);

    if (error.message.includes("Not authorized")) {
      console.log("\n💡 Make sure you own the agent NFT or have approval");
    }

    return false;
  }
}

async function main() {
  console.log("🚀 Multi-Chain Agent URI Update\n");
  console.log("📋 ERC-8004 Standard Compliance\n");

  // Get IPFS CID
  const cidFilePath = path.join(__dirname, "..", "latest-ipfs-cid.txt");
  let newCid: string;

  if (process.env.IPFS_CID) {
    newCid = process.env.IPFS_CID;
    console.log(`📌 Using IPFS CID from environment: ${newCid}\n`);
  } else if (fs.existsSync(cidFilePath)) {
    newCid = fs.readFileSync(cidFilePath, "utf-8").trim();
    console.log(`📌 Using IPFS CID from latest-ipfs-cid.txt: ${newCid}\n`);
  } else {
    console.error("❌ Error: IPFS_CID not found");
    console.log("\n💡 Options:");
    console.log("   1. Set IPFS_CID environment variable");
    console.log("   2. Run npm run agent:upload-ipfs first");
    console.log("   3. Manually create latest-ipfs-cid.txt with your CID");
    process.exit(1);
  }

  if (!newCid || newCid === "YOUR_IPFS_CID_HERE") {
    console.error("❌ Error: Invalid IPFS CID");
    process.exit(1);
  }

  // Update on both chains
  const results = {
    ethereumSepolia: false,
    baseSepolia: false,
  };

  // Update Ethereum Sepolia
  results.ethereumSepolia = await updateURIOnChain("ETHEREUM_SEPOLIA", newCid);

  // Update Base Sepolia
  results.baseSepolia = await updateURIOnChain("BASE_SEPOLIA", newCid);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Update Summary");
  console.log("=".repeat(60));
  console.log(
    `Ethereum Sepolia (Agent ID: 961): ${
      results.ethereumSepolia ? "✅ Success" : "❌ Failed"
    }`
  );
  console.log(
    `Base Sepolia (Agent ID: 56): ${
      results.baseSepolia ? "✅ Success" : "❌ Failed"
    }`
  );
  console.log("=".repeat(60) + "\n");

  if (results.ethereumSepolia && results.baseSepolia) {
    console.log("🎉 All networks updated successfully!\n");
    console.log("🌐 Your agent is now accessible on both chains:");
    console.log(
      "   • Ethereum Sepolia: eip155:11155111:0x8004A818BFB912233c491871b3d84c89A494BD9e:961"
    );
    console.log(
      "   • Base Sepolia: eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e:56"
    );
    console.log(`\n📦 IPFS Card: ipfs://${newCid}`);
  } else {
    console.log("⚠️  Some updates failed. Check the errors above.\n");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
