import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import { tmpdir } from "os";

async function pinJsonToPinata(content: unknown, name: string) {
  const jwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_API_KEY;

  if (!jwt && !apiKey) return null;

  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: jwt
        ? {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
          }
        : {
            // Legacy key auth fallback
            pinata_api_key: apiKey as string,
            pinata_secret_api_key: secretKey as string,
            "Content-Type": "application/json",
          },
      body: JSON.stringify({
        pinataContent: content,
        pinataMetadata: { name },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("Pinata pinJSONToIPFS failed:", res.status, text);
      return null;
    }

    const data = (await res.json()) as { IpfsHash?: string };
    const cid = data.IpfsHash;
    if (!cid) return null;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    return { cid, gatewayUrl };
  } catch (e) {
    console.warn("Pinata request error:", e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { proof, publicInputs } = body;

    if (!proof || !publicInputs) {
      return NextResponse.json(
        { error: "Missing proof or publicInputs" },
        { status: 400 }
      );
    }

    // Create SHA-256 hash of the proof (matching rebalancer-agent.ts)
    const proofPackage = { proof, publicInputs };
    const dataHashBuffer = createHash("sha256")
      .update(JSON.stringify(proofPackage))
      .digest();
    const dataHash = `0x${dataHashBuffer.toString("hex")}`;

    // Store proof in system temp directory (writable in serverless)
    const dataDir = join(tmpdir(), "zkp-proof-storage");

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const proofFilePath = join(dataDir, `${dataHash.slice(2)}.json`);
    writeFileSync(proofFilePath, JSON.stringify(proofPackage, null, 2));

    console.log(`✅ Proof stored at: ${proofFilePath}`);

    // Also pin to IPFS (Pinata) if credentials exist
    const pinResult = await pinJsonToPinata(
      proofPackage,
      `zk-proof-${dataHash.slice(2)}`
    );

    return NextResponse.json({
      dataHash,
      ipfsCid: pinResult?.cid,
      pinataGatewayUrl: pinResult?.gatewayUrl,
      success: true,
    });
  } catch (error) {
    console.error("Error storing proof:", error);
    return NextResponse.json(
      {
        error: "Failed to store proof",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
