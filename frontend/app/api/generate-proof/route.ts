import { NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      oldBalances,
      newBalances,
      prices,
      minAllocationPct,
      maxAllocationPct,
    } = body;

    if (
      !oldBalances ||
      !newBalances ||
      !prices ||
      !minAllocationPct ||
      !maxAllocationPct
    ) {
      return NextResponse.json(
        { error: "Missing required input fields" },
        { status: 400 }
      );
    }

    // Calculate total value commitment
    const newTotalValue = newBalances.reduce(
      (sum: number, bal: string, i: number) =>
        sum + parseInt(bal) * parseInt(prices[i]),
      0
    );

    // Create input for witness generation (matching rebalancer-agent.ts)
    const input = {
      oldBalances,
      newBalances,
      prices,
      totalValueCommitment: String(newTotalValue),
      minAllocationPct,
      maxAllocationPct,
    };

    const projectRoot = join(process.cwd(), "..");
    const tempPath = join(projectRoot, "build", "temp_input.json");
    const witnessPath = join(projectRoot, "build", "witness.wtns");
    const proofPath = join(projectRoot, "build", "proof.json");
    const publicPath = join(projectRoot, "build", "public.json");

    try {
      // Write input to temp file
      writeFileSync(tempPath, JSON.stringify(input, null, 2));

      // Generate witness using Circom 2.x witness generator
      execSync(
        `node ${join(
          projectRoot,
          "build/rebalancing_js/generate_witness.js"
        )} ${join(
          projectRoot,
          "build/rebalancing_js/rebalancing.wasm"
        )} ${tempPath} ${witnessPath}`,
        { stdio: "inherit", cwd: projectRoot }
      );

      // Generate proof using snarkjs
      execSync(
        `npx snarkjs groth16 prove ${join(
          projectRoot,
          "build/rebalancing_final.zkey"
        )} ${witnessPath} ${proofPath} ${publicPath}`,
        { stdio: "inherit", cwd: projectRoot }
      );

      // Read generated proof and public inputs
      const proof = JSON.parse(readFileSync(proofPath, "utf-8"));
      const publicInputs = JSON.parse(readFileSync(publicPath, "utf-8"));

      return NextResponse.json({
        proof,
        publicInputs,
        success: true,
      });
    } finally {
      // Clean up temp file
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    }
  } catch (error) {
    console.error("Error generating proof:", error);
    return NextResponse.json(
      {
        error: "Failed to generate ZK proof",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
