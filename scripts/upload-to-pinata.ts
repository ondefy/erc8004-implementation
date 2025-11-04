/**
 * Helper script to upload agent card to Pinata IPFS
 *
 * Setup:
 * 1. Create free account at https://pinata.cloud
 * 2. Get API keys from https://app.pinata.cloud/keys
 * 3. Set environment variables:
 *    - PINATA_API_KEY
 *    - PINATA_SECRET_API_KEY
 *
 * Usage:
 * PINATA_API_KEY=xxx PINATA_SECRET_API_KEY=yyy npx ts-node scripts/upload-to-pinata.ts
 */

import * as fs from "fs";
import * as path from "path";
import FormData from "form-data";
import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PINATA_API_URL = "https://api.pinata.cloud";
const AGENT_CARD_PATH = path.join(__dirname, "..", "agent-card-zyfai.json");

async function uploadToPinata() {
  console.log("📤 Uploading ZyFAI Agent Card to Pinata IPFS\n");

  // Check for API keys
  const apiKey = process.env.PINATA_API_KEY;
  const secretApiKey = process.env.PINATA_SECRET_API_KEY;

  if (!apiKey || !secretApiKey) {
    console.error("❌ Missing Pinata credentials");
    console.log("\n💡 Setup:");
    console.log("   1. Create free account at https://pinata.cloud");
    console.log("   2. Get API keys from https://app.pinata.cloud/keys");
    console.log("   3. Run with:");
    console.log(
      "      PINATA_API_KEY=xxx PINATA_SECRET_API_KEY=yyy npx ts-node scripts/upload-to-pinata.ts"
    );
    process.exit(1);
  }

  // Check if agent card exists
  if (!fs.existsSync(AGENT_CARD_PATH)) {
    console.error(`❌ Agent card not found at: ${AGENT_CARD_PATH}`);
    process.exit(1);
  }

  try {
    // Read agent card
    const agentCard = JSON.parse(fs.readFileSync(AGENT_CARD_PATH, "utf-8"));
    console.log(`📄 Agent: ${agentCard.name}`);
    console.log(
      `📝 Description: ${agentCard.description.substring(0, 100)}...\n`
    );

    // Test authentication
    console.log("🔐 Testing Pinata authentication...");
    const authTest = await axios.get(
      `${PINATA_API_URL}/data/testAuthentication`,
      {
        headers: {
          pinata_api_key: apiKey,
          pinata_secret_api_key: secretApiKey,
        },
      }
    );

    if (
      authTest.data.message ===
      "Congratulations! You are communicating with the Pinata API!"
    ) {
      console.log("✅ Authentication successful\n");
    }

    // Prepare form data
    console.log("📦 Preparing upload...");
    const formData = new FormData();
    formData.append("file", fs.createReadStream(AGENT_CARD_PATH));

    // Set metadata
    const metadata = JSON.stringify({
      name: "zyfai-rebalancer-agent-card.json",
      keyvalues: {
        agent: "ZyFAI Rebalancer",
        standard: "ERC-8004",
        version: "v1",
        network: "ethereum-sepolia",
      },
    });
    formData.append("pinataMetadata", metadata);

    // Set pinning options
    const options = JSON.stringify({
      cidVersion: 0, // Use v0 for compatibility
    });
    formData.append("pinataOptions", options);

    // Upload to Pinata
    console.log("⬆️  Uploading to Pinata IPFS...\n");
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
          pinata_api_key: apiKey,
          pinata_secret_api_key: secretApiKey,
        },
      }
    );

    const ipfsHash = response.data.IpfsHash;
    const timestamp = response.data.Timestamp;

    console.log("✅ Upload successful!\n");
    console.log(`📦 IPFS CID: ${ipfsHash}`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    console.log(`📏 Size: ${response.data.PinSize} bytes\n`);

    console.log("🌐 Access URLs:");
    console.log(
      `   Pinata Gateway: https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    );
    console.log(`   IPFS.io Gateway: https://ipfs.io/ipfs/${ipfsHash}`);
    console.log(
      `   Cloudflare Gateway: https://cloudflare-ipfs.com/ipfs/${ipfsHash}\n`
    );

    console.log("🔗 URI for registration:");
    console.log(`   ipfs://${ipfsHash}\n`);

    // Test retrieval
    console.log("🧪 Testing retrieval...");
    const testUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const testResponse = await axios.get(testUrl, { timeout: 10000 });

    if (testResponse.data.name === agentCard.name) {
      console.log("✅ Content verified successfully!\n");
    } else {
      console.warn("⚠️  Retrieved content differs from uploaded file\n");
    }

    console.log("📋 Next Steps:");
    console.log(`   1. Copy this CID: ${ipfsHash}`);
    console.log(`   2. Run registration:`);
    console.log(
      `      PRIVATE_KEY=0x... IPFS_CID=${ipfsHash} npx ts-node scripts/register-agent-sepolia.ts\n`
    );

    // Save CID to file for convenience
    const cidFilePath = path.join(__dirname, "..", "latest-ipfs-cid.txt");
    fs.writeFileSync(cidFilePath, ipfsHash);
    console.log(`💾 CID saved to: ${cidFilePath}\n`);

    return ipfsHash;
  } catch (error: any) {
    console.error("\n❌ Upload failed:");

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(
        `Message: ${error.response.data.error || error.response.data.message}`
      );

      if (error.response.status === 401) {
        console.log("\n💡 Authentication failed. Check your API keys:");
        console.log("   - PINATA_API_KEY");
        console.log("   - PINATA_SECRET_API_KEY");
      }
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }
}

uploadToPinata().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
