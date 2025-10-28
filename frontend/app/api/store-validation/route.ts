import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

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

    return NextResponse.json({
      success: true,
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
