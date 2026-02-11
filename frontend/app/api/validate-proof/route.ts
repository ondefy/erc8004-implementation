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

    // Get chain configuration
    let chain: Chain;
    let rpcUrl: string;
    let verifierAddress: `0x${string}`;

    if (chainId === 84532) {
      // Base Sepolia
      chain = baseSepolia;
      // Support both NEXT_PUBLIC and server-side env var naming
      rpcUrl =
        process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
        process.env.RPC_URL_BASE_SEPOLIA ||
        baseSepolia.rpcUrls.default.http[0];
      const contracts = getContractsForNetwork(84532);
      if (!contracts) {
        return NextResponse.json(
          { error: "Base Sepolia contracts not configured" },
          { status: 500 }
        );
      }
      verifierAddress = contracts.rebalancerVerifier;
    } else if (chainId === 11155111) {
      // Ethereum Sepolia
      chain = sepolia;
      // Support both NEXT_PUBLIC and server-side env var naming
      rpcUrl =
        process.env.ETHEREUM_SEPOLIA_RPC ||
        process.env.RPC_URL_SEPOLIA ||
        sepolia.rpcUrls.default.http[0];
      const contracts = getContractsForNetwork(11155111);
      if (!contracts) {
        return NextResponse.json(
          { error: "Ethereum Sepolia contracts not configured" },
          { status: 500 }
        );
      }
      verifierAddress = contracts.rebalancerVerifier;
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
      verifierAddress = deployed.contracts?.RebalancerVerifier as `0x${string}`;

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

    // Load RebalancerVerifier ABI from frontend/lib/abis
    const verifierAbiPath = join(
      process.cwd(),
      "lib/abis",
      "RebalancerVerifier.json"
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

    // Create public client for reading contract with retry configuration
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl, {
        retryCount: 3,
        retryDelay: 1000,
      }),
    });

    console.log("🔐 Verifying on-chain using RebalancerVerifier (eth_call)...");
    console.log("chainId", chainId);
    console.log("chain", chain.name);
    console.log("verifierAddress", verifierAddress);
    console.log("rpcUrl", rpcUrl);

    // RebalancerVerifier expects exactly 15 public signals as uint256[15]
    if ((publicInputs as any[]).length !== 15) {
      throw new Error(
        `RebalancerVerifier expects exactly 15 public inputs, got ${
          (publicInputs as any[]).length
        }`
      );
    }
    const pubSignals: bigint[] = [
      BigInt(publicInputs[0]), // liquidity
      BigInt(publicInputs[1]), // zyfiTvl
      BigInt(publicInputs[2]), // amount
      BigInt(publicInputs[3]), // poolTvl
      BigInt(publicInputs[4]), // newApy
      BigInt(publicInputs[5]), // apyStable7Days
      BigInt(publicInputs[6]), // tvlStable
      // Old opportunity data
      BigInt(publicInputs[7]), // oldApy
      BigInt(publicInputs[8]), // oldLiquidity
      BigInt(publicInputs[9]), // oldZyfiTvl
      BigInt(publicInputs[10]), // oldTvlStable
      BigInt(publicInputs[11]), // oldUtilizationStable
      BigInt(publicInputs[12]), // oldCollateralHealth
      BigInt(publicInputs[13]), // oldZyfiTVLCheck
      // User preferences
      BigInt(publicInputs[14]), // supportsCurrentPool
    ];
    console.log("pubSignals", pubSignals);

    const isValid = (await publicClient.readContract({
      address: verifierAddress as `0x${string}`,
      abi: verifierAbi,
      functionName: "verifyProof",
      args: [pA, pB, pC, pubSignals],
    })) as boolean;

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

    // Provide helpful error messages for common issues
    let errorMessage = "Failed to validate ZK proof";
    let details = error instanceof Error ? error.message : "Unknown error";

    if (details.includes("Unexpected token") || details.includes("Maximum")) {
      errorMessage = "RPC rate limit exceeded";
      details =
        "Your RPC provider (Alchemy/Infura) rate limit has been exceeded. " +
        "Solutions:\n" +
        "1. Upgrade your RPC provider plan\n" +
        "2. Wait a few minutes and try again\n" +
        "3. Use a different RPC endpoint\n\n" +
        "Original error: " +
        details;
    } else if (details.includes("HTTP request failed")) {
      errorMessage = "RPC connection error";
      details =
        "Failed to connect to the RPC endpoint. Check your network connection and RPC URL configuration.\n\n" +
        "Original error: " +
        details;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: details,
      },
      { status: 500 }
    );
  }
}
