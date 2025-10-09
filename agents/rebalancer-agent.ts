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
        "snarkjs wtns calculate build/rebalancing.wasm build/temp_input.json build/witness.wtns"
      );
      execSync(
        "snarkjs groth16 prove build/rebalancing_final.zkey build/witness.wtns build/proof.json build/public.json"
      );

      const proof = JSON.parse(readFileSync("build/proof.json", "utf-8"));
      const publicInputs = JSON.parse(
        readFileSync("build/public.json", "utf-8")
      );

      console.log("✅ ZK proof generated");

      return { proof, publicInputs, rebalancingPlan: plan };
    } finally {
      if (existsSync(tempPath)) unlinkSync(tempPath);
    }
  }

  async submitProofForValidation(
    proof: ProofPackage,
    validatorId: bigint
  ): Promise<Hash> {
    const dataHash = createHash("sha256")
      .update(JSON.stringify(proof))
      .digest();

    // Store proof
    if (!existsSync("data")) mkdirSync("data", { recursive: true });
    writeFileSync(
      `data/${dataHash.toString("hex")}.json`,
      JSON.stringify(proof, null, 2)
    );

    console.log(
      `📤 Submitting proof: ${dataHash.toString("hex").slice(0, 8)}...`
    );

    return await this.requestValidation(
      validatorId,
      `0x${dataHash.toString("hex")}` as `0x${string}`
    );
  }

  async authorizeClientFeedback(clientId: bigint): Promise<Hash> {
    console.log(`🔐 Authorizing client ${clientId}`);

    const hash = await (this.walletClient as any).writeContract({
      address: this.reputationRegistryAddress,
      abi: this.reputationRegistryAbi,
      functionName: "acceptFeedback",
      args: [clientId, this.agentId],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Client authorized");
    return hash;
  }
}

export type { RebalancingPlan, ProofPackage };
