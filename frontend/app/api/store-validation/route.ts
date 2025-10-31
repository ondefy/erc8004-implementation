import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
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
    const { validationResult, dataHash } = body;

    if (!validationResult || !dataHash) {
      return NextResponse.json(
        { error: "Missing validationResult or dataHash" },
        { status: 400 }
      );
    }

    // Store validation result in system temp directory (writable in serverless)
    const validationsDir = join(tmpdir(), "zkp-validation-storage");

    if (!existsSync(validationsDir)) {
      mkdirSync(validationsDir, { recursive: true });
    }

    const validationFilePath = join(
      validationsDir,
      `${dataHash.slice(2)}.json`
    );
    writeFileSync(
      validationFilePath,
      JSON.stringify(validationResult, null, 2)
    );

    console.log(`✅ Validation result stored at: ${validationFilePath}`);

    // Also pin to IPFS (Pinata) if credentials exist
    const pinResult = await pinJsonToPinata(
      validationResult,
      `zk-validation-${dataHash.slice(2)}`
    );

    return NextResponse.json({
      success: true,
      ipfsCid: pinResult?.cid,
      pinataGatewayUrl: pinResult?.gatewayUrl,
    });
  } catch (error) {
    console.error("Error storing validation result:", error);
    return NextResponse.json(
      {
        error: "Failed to store validation result",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
