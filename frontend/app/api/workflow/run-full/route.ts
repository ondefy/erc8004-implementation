import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { join } from "path";

const projectRoot = join(process.cwd(), "..");

/**
 * Run the full E2E workflow
 * This actually executes the test-zk-rebalancing-workflow.ts script
 */
export async function POST(request: NextRequest) {
  try {
    console.log("Starting full workflow execution...");

    // Execute the E2E test script
    const output = execSync("npm run test:e2e", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: "pipe",
    });

    return NextResponse.json({
      success: true,
      output: output.toString(),
      message: "Workflow completed successfully",
    });
  } catch (error) {
    console.error("Workflow execution failed:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during workflow execution";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details:
          "stdout" in (error as any)
            ? (error as any).stdout?.toString()
            : undefined,
      },
      { status: 500 }
    );
  }
}
