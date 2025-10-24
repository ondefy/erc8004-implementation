import { NextResponse } from "next/server";
import {
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
  copyFileSync,
} from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inputData, mode } = body;

    const isRebalancingMode = mode === "rebalancing";

    if (isRebalancingMode) {
      // Rebalancing mode - use rebalancer-validation circuit
      const {
        liquidity,
        zyfiTvl,
        amount,
        poolTvl,
        newApy,
        oldApy,
        apyStable7Days,
        apyStable10Days,
        tvlStable,
      } = inputData;

      if (
        liquidity === undefined ||
        zyfiTvl === undefined ||
        amount === undefined ||
        poolTvl === undefined ||
        newApy === undefined ||
        oldApy === undefined ||
        apyStable7Days === undefined ||
        apyStable10Days === undefined ||
        tvlStable === undefined
      ) {
        return NextResponse.json(
          { error: "Missing required rebalancing input fields" },
          { status: 400 }
        );
      }

      // Create input for witness generation
      const input = {
        liquidity,
        zyfiTvl,
        amount,
        poolTvl,
        newApy,
        oldApy,
        apyStable7Days,
        apyStable10Days,
        tvlStable,
      };

      const projectRoot = join(process.cwd(), "..");
      const buildDir = join(projectRoot, "build", "rebalancer-validation");

      // Use system temp directory for writable files
      const tempDir = join(tmpdir(), "zkp-proof-gen");
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = join(
        tempDir,
        `temp_rebalancer_input_${Date.now()}.json`
      );
      const witnessPath = join(tempDir, `witness_${Date.now()}.wtns`);
      const proofPath = join(tempDir, `proof_${Date.now()}.json`);
      const publicPath = join(tempDir, `public_${Date.now()}.json`);

      // Check if build directory exists
      if (!existsSync(buildDir)) {
        return NextResponse.json(
          {
            error: "Rebalancer validation circuit not built",
            details: `Build directory not found: ${buildDir}`,
            solution: "Run: npm run setup:zkp:rebalancer",
          },
          { status: 500 }
        );
      }

      const wasmPath = join(
        buildDir,
        "rebalancer-validation_js/rebalancer-validation.wasm"
      );
      const zkeyPath = join(buildDir, "rebalancer_validation_final.zkey");

      if (!existsSync(wasmPath)) {
        return NextResponse.json(
          {
            error: "Circuit WASM not found",
            details: `Missing: ${wasmPath}`,
            solution: "Run: npm run setup:zkp:rebalancer",
          },
          { status: 500 }
        );
      }

      if (!existsSync(zkeyPath)) {
        return NextResponse.json(
          {
            error: "Proving key not found",
            details: `Missing: ${zkeyPath}`,
            solution: "Run: npm run setup:zkp:rebalancer",
          },
          { status: 500 }
        );
      }

      // Generate unique timestamp for this request's temp files
      const timestamp = Date.now();
      const tempZkeyPath = join(tempDir, `zkey_${timestamp}.zkey`);

      try {
        // Copy zkey to temp directory (snarkjs needs write access to zkey directory)
        copyFileSync(zkeyPath, tempZkeyPath);

        // Write input to temp file
        writeFileSync(tempPath, JSON.stringify(input, null, 2));

        // Generate witness using Circom 2.x witness generator
        execSync(
          `node ${join(
            buildDir,
            "rebalancer-validation_js/generate_witness.js"
          )} ${wasmPath} ${tempPath} ${witnessPath}`,
          { stdio: "inherit", cwd: projectRoot }
        );

        // Generate proof using snarkjs with temp zkey
        execSync(
          `npx snarkjs groth16 prove ${tempZkeyPath} ${witnessPath} ${proofPath} ${publicPath}`,
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
        // Clean up temp files (including temp zkey)
        [tempPath, witnessPath, proofPath, publicPath, tempZkeyPath].forEach(
          (file) => {
            if (existsSync(file)) {
              try {
                unlinkSync(file);
              } catch (e) {
                console.warn(`Failed to delete temp file ${file}:`, e);
              }
            }
          }
        );
      }
    } else {
      // Math mode - use original rebalancing circuit (portfolio allocation)
      const {
        oldBalances,
        newBalances,
        prices,
        minAllocationPct,
        maxAllocationPct,
      } = inputData;

      if (
        !oldBalances ||
        !newBalances ||
        !prices ||
        !minAllocationPct ||
        !maxAllocationPct
      ) {
        return NextResponse.json(
          { error: "Missing required portfolio input fields" },
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
      const buildDir = join(projectRoot, "build");

      // Use system temp directory for writable files
      const tempDir = join(tmpdir(), "zkp-proof-gen");
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = join(tempDir, `temp_input_${Date.now()}.json`);
      const witnessPath = join(tempDir, `witness_${Date.now()}.wtns`);
      const proofPath = join(tempDir, `proof_${Date.now()}.json`);
      const publicPath = join(tempDir, `public_${Date.now()}.json`);

      // Check if build directory exists
      if (!existsSync(buildDir)) {
        return NextResponse.json(
          {
            error: "Portfolio rebalancing circuit not built",
            details: `Build directory not found: ${buildDir}`,
            solution: "Run: npm run setup:zkp",
          },
          { status: 500 }
        );
      }

      const wasmPath = join(buildDir, "rebalancing_js/rebalancing.wasm");
      const zkeyPath = join(buildDir, "rebalancing_final.zkey");

      if (!existsSync(wasmPath)) {
        return NextResponse.json(
          {
            error: "Circuit WASM not found",
            details: `Missing: ${wasmPath}`,
            solution: "Run: npm run setup:zkp",
          },
          { status: 500 }
        );
      }

      if (!existsSync(zkeyPath)) {
        return NextResponse.json(
          {
            error: "Proving key not found",
            details: `Missing: ${zkeyPath}`,
            solution: "Run: npm run setup:zkp",
          },
          { status: 500 }
        );
      }

      // Generate unique timestamp for this request's temp files
      const timestamp = Date.now();
      const tempZkeyPath = join(tempDir, `zkey_${timestamp}.zkey`);

      try {
        // Copy zkey to temp directory (snarkjs needs write access to zkey directory)
        copyFileSync(zkeyPath, tempZkeyPath);

        // Write input to temp file
        writeFileSync(tempPath, JSON.stringify(input, null, 2));

        // Generate witness using Circom 2.x witness generator
        execSync(
          `node ${join(
            buildDir,
            "rebalancing_js/generate_witness.js"
          )} ${wasmPath} ${tempPath} ${witnessPath}`,
          { stdio: "inherit", cwd: projectRoot }
        );

        // Generate proof using snarkjs with temp zkey
        execSync(
          `npx snarkjs groth16 prove ${tempZkeyPath} ${witnessPath} ${proofPath} ${publicPath}`,
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
        // Clean up temp files (including temp zkey)
        [tempPath, witnessPath, proofPath, publicPath, tempZkeyPath].forEach(
          (file) => {
            if (existsSync(file)) {
              try {
                unlinkSync(file);
              } catch (e) {
                console.warn(`Failed to delete temp file ${file}:`, e);
              }
            }
          }
        );
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
