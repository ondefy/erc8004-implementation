/**
 * Rebalancer Agent - ZK Portfolio Rebalancing Service
 *
 * This agent demonstrates a Server Agent role in the ERC-8004 ecosystem.
 * It generates zero-knowledge proofs for portfolio rebalancing and submits
 * them for validation through the ERC-8004 registries.
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
import { join } from "path";
import { execSync } from "child_process";

// ============ Types ============

export interface AllocationInfo {
  tokenIndex: number;
  balance: string;
  value: number;
  allocationPct: number;
}

export interface RebalancingPlan {
  oldBalances: string[];
  newBalances: string[];
  prices: string[];
  oldTotalValue: number;
  newTotalValue: number;
  newAllocations: AllocationInfo[];
  minAllocationPct: string;
  maxAllocationPct: string;
  timestamp: number;
  agentId: bigint | null;
  agentDomain: string;
}

export interface CircuitInput {
  oldBalances: string[];
  newBalances: string[];
  prices: string[];
  totalValueCommitment: string;
  minAllocationPct: string;
  maxAllocationPct: string;
}

export interface ProofMetadata {
  proofSystem: string;
  curve: string;
  circuit: string;
  agentId: bigint | null;
  timestamp: number;
}

export interface ProofPackage {
  proof: unknown;
  publicInputs: string[];
  rebalancingPlan: RebalancingPlan;
  circuitInput: CircuitInput;
  metadata: ProofMetadata;
}

export interface AgentCard {
  agentId: bigint | null;
  name: string;
  description: string;
  version: string;
  skills: Skill[];
  trustModels: string[];
  registrations: Registration[];
}

interface Skill {
  skillId: string;
  name: string;
  description: string;
  inputSchema: object;
  outputSchema: object;
}

interface Registration {
  agentId: bigint | null;
  agentAddress: string;
  signature: string;
}

// ============ Rebalancer Agent Class ============

export class RebalancerAgent extends ERC8004BaseAgent {
  constructor(agentDomain: string, privateKey: `0x${string}`) {
    super(agentDomain, privateKey);

    console.log("💼 Rebalancer Agent initialized");
    console.log(`   Domain: ${this.agentDomain}`);
    console.log(`   Address: ${this.address}`);
    console.log(`   Rebalancer: ${this.address}`);
  }

  /**
   * Create a portfolio rebalancing plan
   */
  async createRebalancingPlan(
    oldBalances: string[],
    newBalances: string[],
    prices: string[],
    minAllocationPct: string = "10",
    maxAllocationPct: string = "40"
  ): Promise<RebalancingPlan> {
    console.log("📊 Creating rebalancing plan...");

    // Calculate total values
    const oldTotal = oldBalances.reduce(
      (sum, bal, i) => sum + parseInt(bal) * parseInt(prices[i]),
      0
    );
    const newTotal = newBalances.reduce(
      (sum, bal, i) => sum + parseInt(bal) * parseInt(prices[i]),
      0
    );

    console.log(`   Old portfolio value: ${oldTotal.toLocaleString()}`);
    console.log(`   New portfolio value: ${newTotal.toLocaleString()}`);

    // Check if value is preserved
    if (oldTotal !== newTotal) {
      throw new Error(
        `Portfolio value not preserved! Old: ${oldTotal}, New: ${newTotal}`
      );
    }

    // Calculate allocations
    const newAllocations: AllocationInfo[] = [];
    for (let i = 0; i < newBalances.length; i++) {
      const value = parseInt(newBalances[i]) * parseInt(prices[i]);
      const allocationPct = newTotal > 0 ? (value / newTotal) * 100 : 0;

      newAllocations.push({
        tokenIndex: i,
        balance: newBalances[i],
        value,
        allocationPct: Math.round(allocationPct * 100) / 100,
      });

      console.log(`   Token ${i}: ${allocationPct.toFixed(2)}% allocation`);
    }

    // Check allocation bounds
    const minPct = parseInt(minAllocationPct);
    const maxPct = parseInt(maxAllocationPct);

    for (const alloc of newAllocations) {
      if (alloc.allocationPct < minPct) {
        console.log(
          `   ⚠️  Token ${
            alloc.tokenIndex
          } below minimum: ${alloc.allocationPct.toFixed(2)}% < ${minPct}%`
        );
      }
      if (alloc.allocationPct > maxPct) {
        console.log(
          `   ⚠️  Token ${
            alloc.tokenIndex
          } above maximum: ${alloc.allocationPct.toFixed(2)}% > ${maxPct}%`
        );
      }
    }

    // Get current block timestamp
    const block = await this.publicClient.getBlock();
    const timestamp = Number(block.timestamp);

    const rebalancingPlan: RebalancingPlan = {
      oldBalances,
      newBalances,
      prices,
      oldTotalValue: oldTotal,
      newTotalValue: newTotal,
      newAllocations,
      minAllocationPct,
      maxAllocationPct,
      timestamp,
      agentId: this.agentId,
      agentDomain: this.agentDomain,
    };

    console.log("✅ Rebalancing plan created");
    console.log(`   Portfolio value: ${newTotal.toLocaleString()}`);

    return rebalancingPlan;
  }

  /**
   * Generate a zero-knowledge proof for the rebalancing plan
   */
  generateZkProof(rebalancingPlan: RebalancingPlan): ProofPackage {
    console.log("🔐 Generating zero-knowledge proof...");

    // Prepare input for circuit
    const circuitInput: CircuitInput = {
      oldBalances: rebalancingPlan.oldBalances,
      newBalances: rebalancingPlan.newBalances,
      prices: rebalancingPlan.prices,
      totalValueCommitment: String(rebalancingPlan.newTotalValue),
      minAllocationPct: rebalancingPlan.minAllocationPct,
      maxAllocationPct: rebalancingPlan.maxAllocationPct,
    };

    // Create temporary input file
    const tempInputPath = "build/temp_input.json";
    writeFileSync(tempInputPath, JSON.stringify(circuitInput, null, 2));

    try {
      // Generate witness
      console.log("   1️⃣  Calculating witness...");
      execSync(
        "snarkjs wtns calculate build/rebalancing.wasm build/temp_input.json build/witness.wtns",
        { encoding: "utf-8" }
      );

      // Verify witness
      console.log("   2️⃣  Verifying witness...");
      execSync("snarkjs wtns check build/rebalancing.r1cs build/witness.wtns", {
        encoding: "utf-8",
      });

      // Generate proof
      console.log("   3️⃣  Generating proof...");
      execSync(
        "snarkjs groth16 prove build/rebalancing_final.zkey build/witness.wtns build/proof.json build/public.json",
        { encoding: "utf-8" }
      );

      // Load generated proof and public inputs
      const proof = JSON.parse(readFileSync("build/proof.json", "utf-8"));
      const publicInputs = JSON.parse(
        readFileSync("build/public.json", "utf-8")
      );

      console.log("✅ Zero-knowledge proof generated successfully");
      console.log(`   Proof generated using groth16`);
      console.log(`   Curve: bn128`);
      console.log(`   Public inputs: ${publicInputs.length} signals`);

      const proofPackage: ProofPackage = {
        proof,
        publicInputs,
        rebalancingPlan,
        circuitInput,
        metadata: {
          proofSystem: "groth16",
          curve: "bn128",
          circuit: "rebalancing",
          agentId: this.agentId,
          timestamp: rebalancingPlan.timestamp,
        },
      };

      return proofPackage;
    } catch (error) {
      console.error("❌ ZK proof generation failed:");
      console.error(error);
      throw new Error(`ZK proof generation failed: ${error}`);
    } finally {
      // Clean up temporary file
      if (existsSync(tempInputPath)) {
        unlinkSync(tempInputPath);
      }
    }
  }

  /**
   * Submit ZK proof for validation through ERC-8004
   */
  async submitProofForValidation(
    proofPackage: ProofPackage,
    validatorAgentId: bigint
  ): Promise<Hash> {
    // Create a hash of the proof package
    const proofJson = JSON.stringify(proofPackage, null, 0);
    const dataHashBuffer = createHash("sha256").update(proofJson).digest();
    const dataHash = `0x${dataHashBuffer.toString("hex")}` as `0x${string}`;

    console.log("📤 Submitting proof for validation");
    console.log(`   Data hash: ${dataHashBuffer.toString("hex")}`);
    console.log(`   Validator: Agent ${validatorAgentId}`);

    // Store the proof package for the validator to retrieve
    this.storeProofPackage(dataHashBuffer.toString("hex"), proofPackage);

    // Request validation through ERC-8004
    const txHash = await this.requestValidation(validatorAgentId, dataHash);

    console.log(`   Validation request transaction: ${txHash}`);

    return txHash;
  }

  /**
   * Store proof package for validator retrieval
   */
  private storeProofPackage(
    dataHash: string,
    proofPackage: ProofPackage
  ): void {
    if (!existsSync("data")) {
      mkdirSync("data", { recursive: true });
    }

    const filePath = join("data", `${dataHash}.json`);
    writeFileSync(filePath, JSON.stringify(proofPackage, null, 2));

    console.log(`💾 Proof package stored: ${filePath}`);
  }

  /**
   * Authorize a client agent to provide feedback
   */
  async authorizeClientFeedback(clientAgentId: bigint): Promise<Hash> {
    if (this.agentId === null) {
      throw new Error("Rebalancer agent must be registered first");
    }

    console.log(`🔐 Authorizing client ${clientAgentId} to provide feedback`);

    const hash = await this.walletClient.writeContract({
      address: this.reputationRegistryAddress,
      abi: this.reputationRegistryAbi,
      functionName: "acceptFeedback",
      args: [clientAgentId, this.agentId],
    } as any);

    console.log(`   Transaction hash: ${hash}`);

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("✅ Client feedback authorization successful");
      console.log(`   Authorization transaction: ${hash}`);
      return hash;
    } else {
      throw new Error("Client feedback authorization transaction failed");
    }
  }

  /**
   * Return supported trust models for this agent
   */
  getTrustModels(): string[] {
    return ["inference-validation", "zero-knowledge"];
  }

  /**
   * Generate AgentCard following A2A specification
   */
  async getAgentCard(): Promise<AgentCard> {
    const chainId = await this.publicClient.getChainId();

    return {
      agentId: this.agentId,
      name: "ZK Rebalancer Agent",
      description:
        "Provides zero-knowledge proof based portfolio rebalancing validation",
      version: "1.0.0",
      skills: [
        {
          skillId: "zk-rebalancing",
          name: "ZK Portfolio Rebalancing",
          description:
            "Generate zero-knowledge proofs for portfolio rebalancing that prove compliance with allocation constraints without revealing positions",
          inputSchema: {
            type: "object",
            properties: {
              old_balances: {
                type: "array",
                items: { type: "string" },
                description: "Current token balances",
              },
              new_balances: {
                type: "array",
                items: { type: "string" },
                description: "Proposed token balances",
              },
              prices: {
                type: "array",
                items: { type: "string" },
                description: "Token prices",
              },
              min_allocation_pct: {
                type: "string",
                description: "Minimum allocation percentage",
              },
              max_allocation_pct: {
                type: "string",
                description: "Maximum allocation percentage",
              },
            },
            required: ["old_balances", "new_balances", "prices"],
          },
          outputSchema: {
            type: "object",
            properties: {
              proof: { type: "object" },
              public_inputs: { type: "array" },
              data_hash: { type: "string" },
            },
          },
        },
      ],
      trustModels: this.getTrustModels(),
      registrations: [
        {
          agentId: this.agentId,
          agentAddress: `eip155:${chainId}:${this.address}`,
          signature: "0x...", // Would be actual signature in production
        },
      ],
    };
  }
}
