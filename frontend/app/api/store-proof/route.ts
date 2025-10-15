import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";

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

    // Store proof in data/${dataHash}.json
    const projectRoot = join(process.cwd(), "..");
    const dataDir = join(projectRoot, "data");

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const proofFilePath = join(dataDir, `${dataHash.slice(2)}.json`);
    writeFileSync(proofFilePath, JSON.stringify(proofPackage, null, 2));

    console.log(`✅ Proof stored at: data/${dataHash.slice(2)}.json`);

    return NextResponse.json({
      dataHash,
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
