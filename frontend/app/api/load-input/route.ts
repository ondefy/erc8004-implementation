import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET(request: Request) {
  try {
    // Load rebalancer input data
    let inputPath: string = "";
    let inputData: any;

    const possiblePaths = [
      join(process.cwd(), "data", "rebalancer-input.json"), // frontend/data/
      join(process.cwd(), "..", "input", "rebalancer-input.json"), // root/input/
      join(process.cwd(), "..", "data", "rebalancer-input.json"), // root/data/
    ];

    let found = false;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        inputPath = path;
        inputData = JSON.parse(readFileSync(path, "utf-8"));
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(
        `rebalancer-input.json not found in any of: ${possiblePaths.join(
          ", "
        )}`
      );
    }

    console.log(`✅ Loaded rebalancer input data from ${inputPath}`);
    return NextResponse.json(inputData);
  } catch (error) {
    console.error("❌ Error loading input data:", error);
    return NextResponse.json(
      {
        error: "Failed to load input data",
        details: error instanceof Error ? error.message : "Unknown error",
        path:
          error instanceof Error && "path" in error
            ? (error as any).path
            : undefined,
      },
      { status: 500 }
    );
  }
}
