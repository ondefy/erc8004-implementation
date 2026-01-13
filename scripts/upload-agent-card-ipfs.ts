/**
 * Script to upload agent-card-zyfai.json to IPFS using Pinata
 *
 * Usage:
 *   PINATA_JWT=your_jwt_token npx ts-node scripts/upload-agent-card-ipfs.ts
 *
 * Get your Pinata JWT token from: https://app.pinata.cloud/
 */

import axios from "axios";
import FormData from "form-data";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Pinata API configuration
const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_PIN_FILE_ENDPOINT = `${PINATA_API_URL}/pinning/pinFileToIPFS`;

// File to upload
const AGENT_CARD_PATH = path.join(__dirname, "..", "agent-card-zyfai.json");
const CID_OUTPUT_PATH = path.join(__dirname, "..", "latest-ipfs-cid.txt");

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

async function uploadToPinata(filePath: string): Promise<string> {
  const pinataJwtToken = process.env.PINATA_JWT;

  if (!pinataJwtToken) {
    throw new Error(
      "PINATA_JWT environment variable not set. Get your token from https://app.pinata.cloud/"
    );
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Read file
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Create form data
  const formData = new FormData();
  formData.append("file", fileContent, {
    filename: fileName,
    contentType: "application/json",
  });

  // Pinata metadata (optional but recommended)
  const metadata = JSON.stringify({
    name: "Zyfai Rebalancer Agent Card",
    keyvalues: {
      type: "erc8004-agent-card",
      version: "v1",
    },
  });
  formData.append("pinataMetadata", metadata);

  // Pinata options (optional)
  const options = JSON.stringify({
    cidVersion: 1, // Use IPFS CIDv1
  });
  formData.append("pinataOptions", options);

  console.log("📤 Uploading to Pinata...\n");

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

async function main() {
  console.log("🚀 Upload Agent Card to IPFS (Pinata)\n");
  console.log("📋 ERC-8004 Agent Registration File\n");

  try {
    // Upload file
    const cid = await uploadToPinata(AGENT_CARD_PATH);

    console.log("✅ Upload successful!\n");
    console.log(`🎫 IPFS CID: ${cid}`);
    console.log(`📝 IPFS URI: ipfs://${cid}`);
    console.log(`🌐 IPFS Gateway: https://ipfs.io/ipfs/${cid}`);
    console.log(
      `🔗 Pinata Gateway: https://gateway.pinata.cloud/ipfs/${cid}\n`
    );

    // Save CID to file
    fs.writeFileSync(CID_OUTPUT_PATH, cid);
    console.log(`💾 CID saved to: ${CID_OUTPUT_PATH}\n`);

    // Verify the uploaded file
    console.log("🔍 Verifying upload...");
    try {
      const verifyResponse = await axios.get(`https://ipfs.io/ipfs/${cid}`, {
        timeout: 10000,
      });
      console.log("✅ Verification successful - file is accessible on IPFS\n");
    } catch (verifyError) {
      console.log(
        "⚠️  Verification check failed (file may still be propagating)\n"
      );
    }

    console.log("📋 Next Steps:");
    console.log("   1. Use this CID to register/update your agent:");
    console.log(
      `      IPFS_CID=${cid} npx ts-node scripts/register-agent-eth-sepolia.ts`
    );
    console.log("   2. Or update existing agent URI:");
    console.log(
      `      IPFS_CID=${cid} npx ts-node scripts/update-agent-uri.ts`
    );
    console.log("   3. The CID has been saved to latest-ipfs-cid.txt\n");

    console.log("🎉 Upload complete!\n");
  } catch (error: any) {
    console.error("\n❌ Upload failed:");
    console.error(error.message);

    if (error.message.includes("PINATA_JWT")) {
      console.log("\n💡 How to get your Pinata JWT token:");
      console.log("   1. Go to https://app.pinata.cloud/");
      console.log("   2. Sign up or log in");
      console.log("   3. Go to API Keys section");
      console.log("   4. Create a new API key with 'pinFileToIPFS' permission");
      console.log("   5. Copy the JWT token");
      console.log(
        "   6. Run: PINATA_JWT=your_token npx ts-node scripts/upload-agent-card-ipfs.ts\n"
      );
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
