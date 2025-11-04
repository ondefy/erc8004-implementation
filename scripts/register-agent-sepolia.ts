/**
 * Script to register ZyFAI Rebalancer Agent on Ethereum Sepolia
 * Following ERC-8004 standard
 *
 * Usage:
 * 1. Upload agent-card-zyfai.json to IPFS
 * 2. Update IPFS_CID in this script
 * 3. Set PRIVATE_KEY environment variable
 * 4. Run: npx ts-node scripts/register-agent-sepolia.ts
 */

import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration
const ETHEREUM_SEPOLIA_RPC =
  process.env.ETHEREUM_SEPOLIA_RPC || "https://rpc.sepolia.org";
const IDENTITY_REGISTRY_ADDRESS =
  "0x8004a6090Cd10A7288092483047B097295Fb8847" as const;

// IPFS CID from environment or from latest-ipfs-cid.txt file
const getIPFSCID = (): string => {
  if (process.env.IPFS_CID) {
    return process.env.IPFS_CID;
  }

  // Try to read from latest-ipfs-cid.txt
  const cidFilePath = path.join(__dirname, "..", "latest-ipfs-cid.txt");
  if (fs.existsSync(cidFilePath)) {
    const cid = fs.readFileSync(cidFilePath, "utf-8").trim();
    if (cid && cid !== "YOUR_IPFS_CID_HERE") {
      console.log(`📌 Using IPFS CID from latest-ipfs-cid.txt: ${cid}\n`);
      return cid;
    }
  }

  return "YOUR_IPFS_CID_HERE";
};

const IPFS_CID = getIPFSCID();

// Identity Registry ABI (minimal - just what we need)
const IDENTITY_REGISTRY_ABI = parseAbi([
  "function register(string memory tokenUri) external returns (uint256 agentId)",
  "function register(string tokenUri, (string key, bytes value)[] metadata) external returns (uint256 agentId)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "event Registered(uint256 indexed agentId, string tokenURI, address indexed owner)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

async function main() {
  console.log("🚀 ZyFAI Rebalancer Agent Registration on Ethereum Sepolia\n");
  console.log("📋 ERC-8004 Standard Compliance\n");

  // Check for private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ Error: PRIVATE_KEY environment variable not set");
    console.log("\n💡 Usage:");
    console.log(
      "   PRIVATE_KEY=0x... IPFS_CID=Qm... npx ts-node scripts/register-agent-sepolia.ts"
    );
    process.exit(1);
  }

  // Check for IPFS CID
  if (IPFS_CID === "YOUR_IPFS_CID_HERE") {
    console.error("❌ Error: IPFS_CID not set");
    console.log("\n💡 Steps:");
    console.log("   1. Upload agent-card-zyfai.json to IPFS");
    console.log("   2. Set IPFS_CID environment variable");
    console.log(
      "   3. Run: IPFS_CID=Qm... PRIVATE_KEY=0x... npx ts-node scripts/register-agent-sepolia.ts"
    );
    process.exit(1);
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`📍 Registering from address: ${account.address}\n`);

  // Create clients
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(ETHEREUM_SEPOLIA_RPC),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(ETHEREUM_SEPOLIA_RPC),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${(Number(balance) / 1e18).toFixed(4)} ETH`);

  if (balance === 0n) {
    console.error("\n❌ Error: Insufficient balance. Get testnet ETH from:");
    console.log("   - https://www.alchemy.com/faucets/ethereum-sepolia");
    console.log("   - https://www.infura.io/faucet/sepolia");
    process.exit(1);
  }

  // Construct token URI with IPFS
  const tokenURI = `ipfs://${IPFS_CID}`;
  console.log(`\n📝 Token URI: ${tokenURI}`);
  console.log(`🌐 IPFS Gateway: https://ipfs.io/ipfs/${IPFS_CID}\n`);

  // Optional: Add on-chain metadata
  const metadata = [
    {
      key: "agentName",
      value: `0x${Buffer.from("ZyFAI Rebalancer Agent", "utf-8").toString(
        "hex"
      )}` as `0x${string}`,
    },
    {
      key: "agentType",
      value: `0x${Buffer.from("DeFi Rebalancer", "utf-8").toString(
        "hex"
      )}` as `0x${string}`,
    },
  ];

  console.log("📤 Submitting registration transaction...\n");

  try {
    // Register agent with metadata
    const hash = await walletClient.writeContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "register",
      args: [tokenURI, metadata],
    });

    console.log(`✅ Transaction submitted!`);
    console.log(`🔗 Tx Hash: ${hash}`);
    console.log(`🔍 Explorer: https://sepolia.etherscan.io/tx/${hash}\n`);

    console.log("⏳ Waiting for confirmation...\n");

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status === "success") {
      console.log("✅ Registration successful!\n");

      // Extract agentId from Transfer event (minting from address(0))
      const transferLog = receipt.logs.find(
        (log: any) =>
          log.address.toLowerCase() ===
            IDENTITY_REGISTRY_ADDRESS.toLowerCase() &&
          log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" && // Transfer event signature
          log.topics[1] ===
            "0x0000000000000000000000000000000000000000000000000000000000000000" // from address(0)
      );

      if (transferLog && transferLog.topics[3]) {
        const agentId = parseInt(transferLog.topics[3], 16);
        console.log(`🎫 Agent ID: ${agentId}`);
        console.log(
          `🆔 Full Agent Reference: eip155:11155111:0x8004a6090Cd10A7288092483047B097295Fb8847:${agentId}\n`
        );

        // Verify registration
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

        console.log(`✅ Verification:`);
        console.log(`   Token URI: ${registeredTokenURI}`);
        console.log(`   Owner: ${owner}\n`);

        // Update agent card with agentId
        console.log("📝 Updating agent card with agentId...");
        const agentCardPath = path.join(
          __dirname,
          "..",
          "agent-card-zyfai.json"
        );
        const agentCard = JSON.parse(fs.readFileSync(agentCardPath, "utf-8"));
        agentCard.registrations[0].agentId = agentId;
        fs.writeFileSync(agentCardPath, JSON.stringify(agentCard, null, 2));
        console.log(
          `✅ Updated agent-card-zyfai.json with agentId: ${agentId}\n`
        );

        // Save agent ID to file for convenience
        const agentIdFilePath = path.join(
          __dirname,
          "..",
          "latest-agent-id.txt"
        );
        fs.writeFileSync(agentIdFilePath, agentId.toString());
        console.log(`💾 Agent ID saved to: latest-agent-id.txt\n`);

        console.log("🎉 Registration complete!");
        console.log("\n📋 Next Steps:");
        console.log(
          "   1. Re-upload the updated agent-card-zyfai.json to IPFS"
        );
        console.log("   2. Update the token URI if the CID changed:");
        console.log(`      Use setAgentUri(${agentId}, "ipfs://NEW_CID")`);
        console.log("   3. Your agent is now discoverable on-chain!\n");

        console.log("🔗 Quick Links:");
        console.log(
          `   Agent NFT: https://sepolia.etherscan.io/token/${IDENTITY_REGISTRY_ADDRESS}?a=${agentId}`
        );
        console.log(
          `   Owner Address: https://sepolia.etherscan.io/address/${owner}`
        );
        console.log(`   IPFS Card: https://ipfs.io/ipfs/${IPFS_CID}\n`);
      } else {
        console.log(
          "⚠️  Could not extract agentId from logs. Check transaction manually."
        );
      }
    } else {
      console.error("❌ Transaction failed!");
      console.log(`Receipt:`, receipt);
    }
  } catch (error: any) {
    console.error("\n❌ Registration failed:");
    console.error(error.message);

    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Get testnet ETH from:");
      console.log("   - https://www.alchemy.com/faucets/ethereum-sepolia");
      console.log("   - https://www.infura.io/faucet/sepolia");
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
