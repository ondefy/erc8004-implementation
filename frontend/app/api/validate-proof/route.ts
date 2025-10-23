import { NextResponse } from "next/server";
import { createPublicClient, http, Chain } from "viem";
import { baseSepolia, sepolia, foundry } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";
import { getContractsForNetwork } from "@/lib/constants";

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

    // Determine mode based on public inputs length
    // Rebalancing mode has 2 public outputs, Math mode has more
    const isRebalancingMode = (publicInputs as any[]).length === 2;

    // Get chain configuration
    let chain: Chain;
    let rpcUrl: string;
    let verifierAddress: `0x${string}`;

    if (chainId === 84532) {
      // Base Sepolia
      chain = baseSepolia;
      rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "";
      const contracts = getContractsForNetwork(84532);
      if (!contracts) {
        return NextResponse.json(
          { error: "Base Sepolia contracts not configured" },
          { status: 500 }
        );
      }
      verifierAddress = isRebalancingMode
        ? contracts.rebalancerVerifier
        : contracts.groth16Verifier;
    } else if (chainId === 11155111) {
      // Ethereum Sepolia
      chain = sepolia;
      rpcUrl = process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC_URL || "";
      const contracts = getContractsForNetwork(11155111);
      if (!contracts) {
        return NextResponse.json(
          { error: "Ethereum Sepolia contracts not configured" },
          { status: 500 }
        );
      }
      verifierAddress = isRebalancingMode
        ? contracts.rebalancerVerifier
        : contracts.groth16Verifier;
    } else if (chainId === 31337) {
      // Local Anvil
      chain = foundry;
      rpcUrl = "http://127.0.0.1:8545";

      // Load deployed contracts from local deployment
      const deployedContractsPath = join(
        process.cwd(),
        "..",
        "deployed_contracts.json"
      );
      const deployed = JSON.parse(readFileSync(deployedContractsPath, "utf-8"));
      verifierAddress = (
        isRebalancingMode
          ? deployed.contracts?.RebalancerVerifier
          : deployed.contracts?.Groth16Verifier
      ) as `0x${string}`;

      if (!verifierAddress) {
        return NextResponse.json(
          {
            error:
              "Local verifier address not found in deployed_contracts.json",
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported chainId: ${chainId}` },
        { status: 400 }
      );
    }

    if (!rpcUrl) {
      return NextResponse.json(
        { error: `RPC URL not configured for chainId ${chainId}` },
        { status: 500 }
      );
    }

    // Load appropriate Verifier ABI from frontend/lib/abis
    const verifierAbiPath = join(
      process.cwd(),
      "lib/abis",
      isRebalancingMode ? "RebalancerVerifier.json" : "Groth16Verifier.json"
    );
    const verifierArtifact = JSON.parse(readFileSync(verifierAbiPath, "utf-8"));
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

    // Create public client for reading contract
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    console.log(
      `🔐 Verifying on-chain using ${
        isRebalancingMode ? "RebalancerVerifier" : "Groth16Verifier"
      } (eth_call)...`
    );
    console.log("chainId", chainId);
    console.log("chain", chain.name);
    console.log("verifierAddress", verifierAddress);
    console.log("rpcUrl", rpcUrl);

    // Convert public signals based on mode
    let isValid: boolean;

    if (isRebalancingMode) {
      // RebalancerVerifier expects exactly 2 public signals as uint256[2]
      if ((publicInputs as any[]).length !== 2) {
        throw new Error(
          `RebalancerVerifier expects exactly 2 public inputs, got ${
            (publicInputs as any[]).length
          }`
        );
      }
      const pubSignals: [bigint, bigint] = [
        BigInt(publicInputs[0]),
        BigInt(publicInputs[1]),
      ];
      console.log("pubSignals (rebalancing)", pubSignals);

      isValid = (await publicClient.readContract({
        address: verifierAddress as `0x${string}`,
        abi: verifierAbi,
        functionName: "verifyProof",
        args: [pA, pB, pC, pubSignals],
      })) as boolean;
    } else {
      // Groth16Verifier uses dynamic array
      const pubSignals = (publicInputs as (string | number)[]).map((v) =>
        BigInt(v)
      );
      console.log("pubSignals (groth16)", pubSignals);

      isValid = (await publicClient.readContract({
        address: verifierAddress as `0x${string}`,
        abi: verifierAbi,
        functionName: "verifyProof",
        args: [pA, pB, pC, pubSignals],
      })) as boolean;
    }

    console.log(`Result: ${isValid ? "✅ VALID" : "❌ INVALID"}`);

    return NextResponse.json({
      isValid,
      pubSignals: (publicInputs as (string | number)[]).map((v) =>
        v.toString()
      ),
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
