/**
 * Script to update agent tokenURI on Ethereum Sepolia
 * Use this after re-uploading your agent card to IPFS
 *
 * Usage:
 * PRIVATE_KEY=0x... npx ts-node scripts/update-agent-uri.ts --agentId 42 --newCid QmNewCid...
 */

import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const RPC_URL_MAINNET = "https://eth.drpc.org";
const IDENTITY_REGISTRY_ADDRESS =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

const IDENTITY_REGISTRY_ABI = parseAbi([
  "function setAgentURI(uint256 agentId, string calldata newURI) external",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "event UriUpdated(uint256 indexed agentId, string newUri, address indexed updatedBy)",
]);

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const agentIdArg = args.find((arg) => arg.startsWith("--agentId="));
  const newCidArg = args.find((arg) => arg.startsWith("--newCid="));

  if (!agentIdArg || !newCidArg) {
    console.error("❌ Missing required arguments");
    console.log("\n💡 Usage:");
    console.log(
      "   PRIVATE_KEY=0x... npx ts-node scripts/update-agent-uri.ts --agentId=42 --newCid=QmXxx..."
    );
    process.exit(1);
  }

  const agentId = BigInt(agentIdArg.split("=")[1]);
  const newCid = newCidArg.split("=")[1];
  const newTokenURI = `ipfs://${newCid}`;

  console.log("🔄 Updating Agent URI on Ethereum Mainnet\n");
  console.log(`🎫 Agent ID: ${agentId}`);
  console.log(`📝 New URI: ${newTokenURI}`);
  console.log(`🌐 Gateway: https://ipfs.io/ipfs/${newCid}\n`);

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ Error: PRIVATE_KEY environment variable not set");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`📍 Updating from address: ${account.address}\n`);

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(RPC_URL_MAINNET),
  });

  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(RPC_URL_MAINNET),
  });

  // Verify ownership
  try {
    const owner = await publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "ownerOf",
      args: [agentId],
    });

    if (owner.toLowerCase() !== account.address.toLowerCase()) {
      console.error(`❌ Error: You don't own this agent`);
      console.log(`   Owner: ${owner}`);
      console.log(`   Your address: ${account.address}`);
      process.exit(1);
    }

    console.log(`✅ Ownership verified\n`);

    // Get current URI
    const currentURI = await publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "tokenURI",
      args: [agentId],
    });

    console.log(`📋 Current URI: ${currentURI}`);
    console.log(`📝 New URI: ${newTokenURI}\n`);

    if (currentURI === newTokenURI) {
      console.log("ℹ️  URI is already up to date. No action needed.");
      process.exit(0);
    }

    // Update URI
    console.log("📤 Submitting update transaction...\n");

    const hash = await walletClient.writeContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "setAgentURI",
      args: [agentId, newTokenURI],
    });

    console.log(`✅ Transaction submitted!`);
    console.log(`🔗 Tx Hash: ${hash}`);
    console.log(`🔍 Explorer: https://etherscan.io/tx/${hash}\n`);

    console.log("⏳ Waiting for confirmation...\n");

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status === "success") {
      console.log("✅ URI updated successfully!\n");

      // Verify update
      const updatedURI = await publicClient.readContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "tokenURI",
        args: [agentId],
      });

      console.log(`✅ Verification:`);
      console.log(`   Updated URI: ${updatedURI}`);
      console.log(
        `   Matches expected: ${updatedURI === newTokenURI ? "✅" : "❌"}\n`
      );

      console.log("🎉 Update complete!");
      console.log("\n🔗 Quick Links:");
      console.log(
        `   Agent NFT: https://sepolia.etherscan.io/token/${IDENTITY_REGISTRY_ADDRESS}?a=${agentId}`
      );
      console.log(`   IPFS Card: https://ipfs.io/ipfs/${newCid}`);
      console.log(`   Transaction: https://sepolia.etherscan.io/tx/${hash}\n`);
    } else {
      console.error("❌ Transaction failed!");
      console.log(`Receipt:`, receipt);
    }
  } catch (error: any) {
    console.error("\n❌ Update failed:");
    console.error(error.message);

    if (error.message.includes("Not authorized")) {
      console.log("\n💡 Make sure you own the agent NFT or have approval");
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
