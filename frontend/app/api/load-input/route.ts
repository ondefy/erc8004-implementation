import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(request: Request) {
  try {
    // Get query parameters to determine which input type to load
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "Math"; // Default to portfolio for backward compatibility

    const projectRoot = join(process.cwd(), "..");
    let inputPath: string;
    let inputData: any;

    if (type === "Rebalancing") {
      // Load opportunity data from the root data directory
      inputPath = join(projectRoot, "data", "rebalancer-input.json");
      inputData = JSON.parse(readFileSync(inputPath, "utf-8"));
    } else {
      // Load portfolio data from root input directory
      inputPath = join(projectRoot, "data", "input.json");
      inputData = JSON.parse(readFileSync(inputPath, "utf-8"));
    }

    console.log(`Loaded ${type} input data from ${inputPath}`);
    return NextResponse.json(inputData);
  } catch (error) {
    console.error("Error loading input data:", error);
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
