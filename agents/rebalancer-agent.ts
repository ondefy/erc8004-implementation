/**
 * Rebalancer Agent - Minimal ZK Proof Generation
 */

import { type Hash } from "viem";
import { ERC8004BaseAgent } from "./base-agent";
import { createHash } from "crypto";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from "fs";
import { execSync } from "child_process";

// ============ Types ============

interface RebalancingPlan {
  oldBalances: string[];
  newBalances: string[];
  prices: string[];
  newTotalValue: number;
  minAllocationPct: string;
  maxAllocationPct: string;
}

interface ProofPackage {
  proof: unknown;
  publicInputs: string[];
  rebalancingPlan: RebalancingPlan;
}

// ============ Rebalancer Agent ============

export class RebalancerAgent extends ERC8004BaseAgent {
  constructor(agentDomain: string, privateKey: `0x${string}`) {
    super(agentDomain, privateKey);
    console.log("💼 Rebalancer Agent initialized");
  }

  async createRebalancingPlan(
    oldBalances: string[],
    newBalances: string[],
    prices: string[],
    minAllocationPct: string = "10",
    maxAllocationPct: string = "40"
  ): Promise<RebalancingPlan> {
    const newTotal = newBalances.reduce(
      (sum, bal, i) => sum + parseInt(bal) * parseInt(prices[i]),
      0
    );

    console.log(`📊 Plan created - Value: ${newTotal.toLocaleString()}`);

    return {
      oldBalances,
      newBalances,
      prices,
      newTotalValue: newTotal,
      minAllocationPct,
      maxAllocationPct,
    };
  }

  generateZkProof(plan: RebalancingPlan): ProofPackage {
    console.log("🔐 Generating ZK proof...");

    const input = {
      oldBalances: plan.oldBalances,
      newBalances: plan.newBalances,
      prices: plan.prices,
      totalValueCommitment: String(plan.newTotalValue),
      minAllocationPct: plan.minAllocationPct,
      maxAllocationPct: plan.maxAllocationPct,
    };

    const tempPath = "build/temp_input.json";
    writeFileSync(tempPath, JSON.stringify(input, null, 2));

    try {
      execSync(
        "snarkjs wtns calculate build/rebalancing.wasm build/temp_input.json build/witness.wtns",
        { stdio: "inherit" }
      );
      execSync(
        "snarkjs groth16 prove build/rebalancing_final.zkey build/witness.wtns build/proof.json build/public.json",
        { stdio: "inherit" }
      );

      const proof = JSON.parse(readFileSync("build/proof.json", "utf-8"));
      const publicInputs = JSON.parse(
        readFileSync("build/public.json", "utf-8")
      );

      console.log("\n✅ ZK proof generated successfully");

      return { proof, publicInputs, rebalancingPlan: plan };
    } finally {
      if (existsSync(tempPath)) unlinkSync(tempPath);
    }
  }

  async submitProofForValidation(
    proof: ProofPackage,
    validatorAddress: string
  ): Promise<Hash> {
    const dataHash = createHash("sha256")
      .update(JSON.stringify(proof))
      .digest();

    const dataHashHex = dataHash.toString("hex");

    // Store proof
    if (!existsSync("data")) mkdirSync("data", { recursive: true });
    writeFileSync(`data/${dataHashHex}.json`, JSON.stringify(proof, null, 2));

    console.log("\n📤 Submitting proof for validation");
    console.log("─".repeat(50));
    console.log("📋 DataHash (SHA-256):");
    console.log(`   Full: 0x${dataHashHex}`);
    console.log("─".repeat(50));

    // Create a requestUri pointing to the stored proof
    const requestUri = `file://data/${dataHashHex}.json`;

    return await this.requestValidation(
      validatorAddress as `0x${string}`,
      requestUri,
      `0x${dataHashHex}` as `0x${string}`
    );
  }

  async generateFeedbackAuthorization(
    clientAddress: string,
    indexLimit: bigint = 10n,
    expiryDays: number = 30
  ): Promise<{
    feedbackAuth: `0x${string}`;
    authData: {
      agentId: bigint;
      clientAddress: string;
      indexLimit: bigint;
      expiry: bigint;
      chainId: bigint;
      identityRegistry: string;
      signerAddress: string;
    };
  }> {
    console.log(`🔐 Generating feedback authorization for ${clientAddress}`);

    if (!this.agentId) {
      throw new Error("Agent must be registered first");
    }

    const expiry = BigInt(
      Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60
    );
    const chainId = BigInt(31337); // Foundry/Anvil chain ID

    const authData = {
      agentId: this.agentId,
      clientAddress: clientAddress,
      indexLimit: indexLimit,
      expiry: expiry,
      chainId: chainId,
      identityRegistry: this.identityRegistryAddress,
      signerAddress: this.address,
    };

    // Use ABI encoding for the struct as per contract's abi.decode
    const { encodeAbiParameters, parseAbiParameters, keccak256 } = await import(
      "viem"
    );

    const structEncoded = encodeAbiParameters(
      parseAbiParameters(
        "uint256, address, uint64, uint256, uint256, address, address"
      ),
      [
        authData.agentId,
        authData.clientAddress as `0x${string}`,
        authData.indexLimit,
        authData.expiry,
        authData.chainId,
        authData.identityRegistry as `0x${string}`,
        authData.signerAddress as `0x${string}`,
      ]
    );

    // Hash the struct
    const structHash = keccak256(structEncoded);

    // Sign with EIP-191 personal sign (the contract expects this)
    const signature = await this.account.signMessage({
      message: { raw: structHash },
    });

    // Encode the authorization data as the contract expects:
    // First 224 bytes: ABI-encoded struct fields
    // Last 65 bytes: signature (r, s, v)
    const feedbackAuth = `${structEncoded}${signature.slice(
      2
    )}` as `0x${string}`;

    console.log(
      `✅ Authorization generated (expires: ${new Date(
        Number(expiry) * 1000
      ).toISOString()})`
    );

    return { feedbackAuth, authData };
  }
}

export type { RebalancingPlan, ProofPackage };
