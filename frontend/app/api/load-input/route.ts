import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(request: Request) {
  try {
    // Get query parameters to determine which input type to load
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "portfolio"; // Default to portfolio for backward compatibility

    let inputPath: string;
    let inputData: any;

    if (type === "opportunity") {
      // Load opportunity data from the root input directory
      inputPath = join(process.cwd(), "..", "input", "rebalancer-input.json");
      inputData = JSON.parse(readFileSync(inputPath, "utf-8"));
    } else {
      // Load portfolio data from frontend/data/input.json
      inputPath = join(process.cwd(), "data", "input.json");
      inputData = JSON.parse(readFileSync(inputPath, "utf-8"));
    }

    console.log(`Loaded ${type} input data from ${inputPath}`);
    return NextResponse.json(inputData);
  } catch (error) {
    console.error("Error loading input data:", error);
    return NextResponse.json(
      { error: "Failed to load input data" },
      { status: 500 }
    );
  }
}
