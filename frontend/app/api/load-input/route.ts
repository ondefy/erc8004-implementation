import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET(request: Request) {
  try {
    // Get query parameters to determine which input type to load
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "Math"; // Default to portfolio for backward compatibility

    let inputPath: string;
    let inputData: any;

    if (type === "Rebalancing") {
      // Try multiple locations for rebalancer input
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
        throw new Error(`rebalancer-input.json not found in any of: ${possiblePaths.join(", ")}`);
      }
    } else {
      // Try multiple locations for portfolio input
      const possiblePaths = [
        join(process.cwd(), "data", "input.json"), // frontend/data/
        join(process.cwd(), "..", "input", "input.json"), // root/input/
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
        throw new Error(`input.json not found in any of: ${possiblePaths.join(", ")}`);
      }
    }

    console.log(`✅ Loaded ${type} input data from ${inputPath}`);
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
