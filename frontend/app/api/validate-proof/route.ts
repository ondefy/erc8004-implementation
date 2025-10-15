import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { foundry } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { proof, publicInputs, chainId } = body;

    if (!proof || !publicInputs) {
      return NextResponse.json(
        { error: "Missing proof or publicInputs" },
        { status: 400 }
      );
    }

    // Load deployed contracts config
    const projectRoot = join(process.cwd(), "..");
    const deployedContractsPath = join(projectRoot, "deployed_contracts.json");
    const deployed = JSON.parse(readFileSync(deployedContractsPath, "utf-8"));

    const verifierAddress = deployed.contracts?.Groth16Verifier;
    if (!verifierAddress) {
      return NextResponse.json(
        {
          error: "Groth16Verifier address not found in deployed_contracts.json",
        },
        { status: 500 }
      );
    }

    // Load Verifier ABI
    const verifierArtifactPath = join(
      projectRoot,
      "contracts/out/Verifier.sol/Groth16Verifier.json"
    );
    const verifierArtifact = JSON.parse(
      readFileSync(verifierArtifactPath, "utf-8")
    );
    const verifierAbi = verifierArtifact.abi;

    // Parse proof components for Solidity (matching validator-agent.ts)
    type SnarkProof = {
      pi_a: [string, string, string];
      pi_b: [[string, string], [string, string], [string, string]];
      pi_c: [string, string, string];
    };

    const pr = proof as SnarkProof;

    const pA: [bigint, bigint] = [BigInt(pr.pi_a[0]), BigInt(pr.pi_a[1])];

    // Correct pi_b coordinate ordering for Solidity FQ2 representation
    const pB: [[bigint, bigint], [bigint, bigint]] = [
      [BigInt(pr.pi_b[0][1]), BigInt(pr.pi_b[0][0])],
      [BigInt(pr.pi_b[1][1]), BigInt(pr.pi_b[1][0])],
    ];

    const pC: [bigint, bigint] = [BigInt(pr.pi_c[0]), BigInt(pr.pi_c[1])];

    // Convert public signals to bigint[]
    const pubSignals = (publicInputs as (string | number)[]).map((v) =>
      BigInt(v)
    );

    console.log("🔐 Verifying on-chain using Groth16Verifier (eth_call)...");
    console.log("pubSignals", pubSignals);

    // Create public client for reading contract
    const publicClient = createPublicClient({
      chain: foundry,
      transport: http(process.env.RPC_URL || "http://127.0.0.1:8545"),
    });

    // Perform eth_call to verifyProof
    const isValid = (await publicClient.readContract({
      address: verifierAddress as `0x${string}`,
      abi: verifierAbi,
      functionName: "verifyProof",
      args: [pA, pB, pC, pubSignals],
    })) as boolean;

    console.log(`Result: ${isValid ? "✅ VALID" : "❌ INVALID"}`);

    return NextResponse.json({
      isValid,
      pubSignals: pubSignals.map((s) => s.toString()),
      success: true,
    });
  } catch (error) {
    console.error("Error validating proof:", error);
    return NextResponse.json(
      {
        error: "Failed to validate ZK proof",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
