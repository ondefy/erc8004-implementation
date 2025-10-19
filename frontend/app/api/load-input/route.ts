import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    // Load input data from frontend/data/input.json
    const inputPath = join(process.cwd(), "data", "input.json");
    const inputData = JSON.parse(readFileSync(inputPath, "utf-8"));

    return NextResponse.json(inputData);
  } catch (error) {
    console.error("Error loading input data:", error);
    return NextResponse.json(
      { error: "Failed to load input data" },
      { status: 500 }
    );
  }
}
