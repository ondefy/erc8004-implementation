/**
 * Generic script to set agent URI on IdentityRegistry
 * Updates the agent card IPFS URI for an existing agent
 *
 * Required environment variables:
 *   PRIVATE_KEY - Private key of the agent owner
 *   IPFS_CID - IPFS CID of the agent card JSON
 *   AGENT_ID - Agent ID (tokenId) to update
 *   IDENTITY_REGISTRY_ADDRESS - Address of the IdentityRegistry contract
 *   CHAIN_ID - Chain ID (e.g., 11155111 for Ethereum Sepolia, 84532 for Base Sepolia)
 *
 * Optional environment variables:
 *   RPC_URL - Custom RPC URL (defaults based on chain)
 *   EXPLORER_URL - Custom explorer URL (defaults based on chain)
 *
 * Usage:
 *   PRIVATE_KEY=0x... IPFS_CID=bafk... AGENT_ID=323 IDENTITY_REGISTRY_ADDRESS=0x... CHAIN_ID=11155111 npx ts-node scripts/set-agent-uri.ts
 *
 * Or set variables in .env file
 */

import { createWalletClient, createPublicClient, http, parseAbi, Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, baseSepolia, mainnet, base } from "viem/chains";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Chain configurations
const CHAIN_CONFIGS: Record<number, { chain: Chain; defaultRpc: string; defaultExplorer: string; name: string }> = {
  1: {
    chain: mainnet,
    defaultRpc: "https://eth.llamarpc.com",
    defaultExplorer: "https://etherscan.io",
    name: "Ethereum Mainnet",
  },
  11155111: {
    chain: sepolia,
    defaultRpc: "https://rpc.sepolia.org",
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

// Identity Registry ABI (minimal - just what we need)
const IDENTITY_REGISTRY_ABI = parseAbi([
  "function setAgentURI(uint256 agentId, string calldata newURI) external",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
]);

async function main() {
  console.log("🚀 Set Agent URI\n");

  // Validate required environment variables
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ Error: PRIVATE_KEY environment variable not set");
    process.exit(1);
  }

  const ipfsCid = process.env.IPFS_CID;
  if (!ipfsCid) {
    console.error("❌ Error: IPFS_CID environment variable not set");
    process.exit(1);
  }

  const agentIdStr = process.env.AGENT_ID;
  if (!agentIdStr) {
    console.error("❌ Error: AGENT_ID environment variable not set");
    process.exit(1);
  }
  const agentId = BigInt(agentIdStr);

  const identityRegistryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
  if (!identityRegistryAddress) {
    console.error("❌ Error: IDENTITY_REGISTRY_ADDRESS environment variable not set");
    process.exit(1);
  }

  const chainIdStr = process.env.CHAIN_ID;
  if (!chainIdStr) {
    console.error("❌ Error: CHAIN_ID environment variable not set");
    console.log("\n💡 Supported chain IDs:");
    Object.entries(CHAIN_CONFIGS).forEach(([id, config]) => {
      console.log(`   ${id}: ${config.name}`);
    });
    process.exit(1);
  }
  const chainId = parseInt(chainIdStr, 10);

  const chainConfig = CHAIN_CONFIGS[chainId];
  if (!chainConfig) {
    console.error(`❌ Error: Unsupported CHAIN_ID: ${chainId}`);
    console.log("\n💡 Supported chain IDs:");
    Object.entries(CHAIN_CONFIGS).forEach(([id, config]) => {
      console.log(`   ${id}: ${config.name}`);
    });
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL || chainConfig.defaultRpc;
  const explorerUrl = process.env.EXPLORER_URL || chainConfig.defaultExplorer;

  console.log(`📍 Network: ${chainConfig.name} (Chain ID: ${chainId})`);
  console.log(`📍 Contract: ${identityRegistryAddress}`);
  console.log(`🎫 Agent ID: ${agentId}\n`);

  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`👤 Updating from address: ${account.address}\n`);

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
  console.log(`💰 Balance: ${(Number(balance) / 10n ** BigInt(chainConfig.chain.nativeCurrency.decimals)).toFixed(4)} ${symbol}`);

  if (balance === 0n) {
    console.error(`\n❌ Error: Insufficient balance. Get ${symbol} for ${chainConfig.name}`);
    process.exit(1);
  }

  // Construct IPFS URI
  const newURI = `ipfs://${ipfsCid}`;
  console.log(`\n📝 New URI: ${newURI}`);
  console.log(`🌐 IPFS Gateway: https://ipfs.io/ipfs/${ipfsCid}\n`);

  // Verify ownership before proceeding
  console.log("🔍 Verifying ownership...");
  try {
    const owner = await publicClient.readContract({
      address: identityRegistryAddress as `0x${string}`,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "ownerOf",
      args: [agentId],
    });

    console.log(`   Owner: ${owner}`);

    if (owner.toLowerCase() !== account.address.toLowerCase()) {
      console.error(
        `\n❌ Error: You are not the owner of agent ID ${agentId}`
      );
      console.log(`   Expected: ${account.address}`);
      console.log(`   Actual: ${owner}`);
      console.log(
        "\n💡 You must be the owner or an approved operator to update the URI"
      );
      process.exit(1);
    }

    console.log("✅ Ownership verified\n");

    // Check current URI
    const currentURI = await publicClient.readContract({
      address: identityRegistryAddress as `0x${string}`,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "tokenURI",
      args: [agentId],
    });

    console.log(`📄 Current URI: ${currentURI}`);
    if (currentURI === newURI) {
      console.log("\n⚠️  Warning: URI is already set to this value");
      console.log("   Skipping transaction...\n");
      process.exit(0);
    }
    console.log("");
  } catch (error: any) {
    console.error("\n❌ Error verifying ownership:");
    console.error(error.message);
    process.exit(1);
  }

  console.log("📤 Submitting setAgentURI transaction...\n");

  try {
    // Set agent URI
    const hash = await walletClient.writeContract({
      address: identityRegistryAddress as `0x${string}`,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "setAgentURI",
      args: [agentId, newURI],
    });

    console.log(`✅ Transaction submitted!`);
    console.log(`🔗 Tx Hash: ${hash}`);
    console.log(`🔍 Explorer: ${explorerUrl}/tx/${hash}\n`);

    console.log("⏳ Waiting for confirmation...\n");

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status === "success") {
      console.log("✅ URI update successful!\n");

      // Verify the new URI
      const updatedURI = await publicClient.readContract({
        address: identityRegistryAddress as `0x${string}`,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "tokenURI",
        args: [agentId],
      });

      console.log(`✅ Verification:`);
      console.log(`   New URI: ${updatedURI}`);
      console.log(`   Matches expected: ${updatedURI === newURI}\n`);

      console.log("🎉 URI update complete!\n");

      console.log("🔗 Quick Links:");
      console.log(
        `   Agent NFT: ${explorerUrl}/token/${identityRegistryAddress}?a=${agentId}`
      );
      console.log(`   IPFS Card: https://ipfs.io/ipfs/${ipfsCid}`);
      console.log(
        `   Owner Address: ${explorerUrl}/address/${account.address}\n`
      );
    } else {
      console.error("❌ Transaction failed!");
      console.log(`Receipt:`, receipt);
    }
  } catch (error: any) {
    console.error("\n❌ URI update failed:");
    console.error(error.message);

    if (error.message.includes("insufficient funds")) {
      console.log(`\n💡 Get ${chainConfig.chain.nativeCurrency.symbol} for ${chainConfig.name}`);
    } else if (error.message.includes("Not authorized")) {
      console.log(
        "\n💡 You must be the owner or an approved operator to update the URI"
      );
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
