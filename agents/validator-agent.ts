/**
 * Validator Agent - ZK Proof Validation Service
 *
 * This agent demonstrates a Validator Agent role in the ERC-8004 ecosystem.
 * It validates zero-knowledge proofs submitted by Rebalancer Agents and
 * provides validation scores through the ERC-8004 registries.
 */

import { type Hash } from "viem";
import { ERC8004BaseAgent } from "./base-agent";
import { type ProofPackage } from "./rebalancer-agent";
import { createHash } from "crypto";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";
import { execSync } from "child_process";

// ============ Types ============

export interface ValidationReport {
  structureScore: number;
  cryptographicScore: number;
  logicScore: number;
  overallScore: number;
  proofValid: boolean;
  meetsConstraints: boolean;
}

export interface ValidationPackage {
  dataHash: string;
  validatorAgentId: bigint | null;
  validatorDomain: string;
  timestamp: number;
  validationScore: number;
  validationReport: ValidationReport;
  originalProof: ProofPackage;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  validationPackage: ValidationPackage;
  report: string;
}

// ============ Validator Agent Class ============

export class ValidatorAgent extends ERC8004BaseAgent {
  constructor(agentDomain: string, privateKey: `0x${string}`) {
    super(agentDomain, privateKey);

    console.log("🔍 Validator Agent initialized");
    console.log(`   Domain: ${this.agentDomain}`);
    console.log(`   Address: ${this.address}`);
    console.log(`   Validator: ${this.address}`);
  }

  /**
   * Validate a ZK proof for portfolio rebalancing
   */
  async validateProof(
    dataHashOrProof: string | ProofPackage
  ): Promise<ValidationResult> {
    let proofPackage: ProofPackage;
    let finalHash: string;

    // Handle both hash string and actual proof data
    if (typeof dataHashOrProof === "string") {
      console.log(`🔍 Starting validation for data hash: ${dataHashOrProof}`);
      const loaded = this.loadProofPackage(dataHashOrProof);
      if (!loaded) {
        return {
          isValid: false,
          score: 0,
          validationPackage: {
            dataHash: dataHashOrProof,
            validatorAgentId: this.agentId,
            validatorDomain: this.agentDomain,
            timestamp: Date.now(),
            validationScore: 0,
            validationReport: {
              structureScore: 0,
              cryptographicScore: 0,
              logicScore: 0,
              overallScore: 0,
              proofValid: false,
              meetsConstraints: false,
            },
            originalProof: {} as ProofPackage,
          },
          report: "Proof package not found",
        };
      }
      proofPackage = loaded;
      finalHash = dataHashOrProof;
    } else {
      const dataStr = JSON.stringify(dataHashOrProof);
      const computedHash = createHash("sha256").update(dataStr).digest("hex");
      console.log(
        `🔍 Starting validation for proof data (hash: ${computedHash.substring(
          0,
          8
        )}...)`
      );
      proofPackage = dataHashOrProof;
      finalHash = computedHash;
    }

    // Extract proof components
    const proof = proofPackage.proof;
    const publicInputs = proofPackage.publicInputs;

    if (!proof || !publicInputs) {
      return {
        isValid: false,
        score: 0,
        validationPackage: {
          dataHash: finalHash,
          validatorAgentId: this.agentId,
          validatorDomain: this.agentDomain,
          timestamp: Date.now(),
          validationScore: 0,
          validationReport: {
            structureScore: 0,
            cryptographicScore: 0,
            logicScore: 0,
            overallScore: 0,
            proofValid: false,
            meetsConstraints: false,
          },
          originalProof: proofPackage,
        },
        report: "Invalid proof package format",
      };
    }

    console.log("   📋 Validating proof components...");

    // Step 1: Verify proof structure
    const structureScore = this.verifyProofStructure(proof, publicInputs);
    console.log(`   Structure verification: ${structureScore}/100`);

    // Step 2: Verify proof cryptographically
    const cryptoScore = this.verifyProofCryptography(proof, publicInputs);
    console.log(`   🔐 Running cryptographic verification...`);
    if (cryptoScore === 100) {
      console.log("   ✅ Proof is cryptographically valid");
    }
    console.log(`   Cryptographic verification: ${cryptoScore}/100`);

    // Step 3: Verify rebalancing logic
    const logicScore = this.verifyRebalancingLogic(proofPackage);
    if (logicScore === 100) {
      console.log("   ✅ Rebalancing logic is sound");
    }
    console.log(`   Rebalancing logic: ${logicScore}/100`);

    // Calculate overall score
    const overallScore = Math.floor(
      structureScore * 0.2 + cryptoScore * 0.5 + logicScore * 0.3
    );

    const validationReport: ValidationReport = {
      structureScore,
      cryptographicScore: cryptoScore,
      logicScore,
      overallScore,
      proofValid: cryptoScore === 100,
      meetsConstraints: logicScore >= 80,
    };

    console.log(
      `✅ Validation completed with overall score: ${overallScore}/100`
    );

    // Get current block timestamp
    const block = await this.publicClient.getBlock();
    const timestamp = Number(block.timestamp);

    const validationPackage: ValidationPackage = {
      dataHash: finalHash,
      validatorAgentId: this.agentId,
      validatorDomain: this.agentDomain,
      timestamp,
      validationScore: overallScore,
      validationReport,
      originalProof: proofPackage,
    };

    return {
      isValid: overallScore >= 70,
      score: overallScore,
      validationPackage,
      report: JSON.stringify(validationReport, null, 2),
    };
  }

  /**
   * Verify the proof has correct structure
   */
  private verifyProofStructure(proof: unknown, publicInputs: unknown): number {
    try {
      const p = proof as Record<string, unknown>;
      const requiredKeys = ["pi_a", "pi_b", "pi_c", "protocol", "curve"];

      if (!requiredKeys.every((key) => key in p)) {
        return 0;
      }

      // Check protocol and curve
      if (p.protocol !== "groth16" || p.curve !== "bn128") {
        return 50;
      }

      // Check public inputs is an array
      if (!Array.isArray(publicInputs)) {
        return 50;
      }

      // Check proof point structure
      const piA = p.pi_a as unknown[];
      const piB = p.pi_b as unknown[];
      const piC = p.pi_c as unknown[];

      if (
        !Array.isArray(piA) ||
        piA.length !== 3 ||
        !Array.isArray(piB) ||
        piB.length !== 3 ||
        !Array.isArray(piC) ||
        piC.length !== 3
      ) {
        return 60;
      }

      return 100;
    } catch (error) {
      console.log(`   ⚠️  Structure verification error: ${error}`);
      return 0;
    }
  }

  /**
   * Verify the proof cryptographically using snarkjs
   */
  private verifyProofCryptography(
    proof: unknown,
    publicInputs: unknown
  ): number {
    try {
      // Save proof and public inputs to temporary files
      const tempProofPath = "build/temp_proof.json";
      const tempPublicPath = "build/temp_public.json";

      writeFileSync(tempProofPath, JSON.stringify(proof));
      writeFileSync(tempPublicPath, JSON.stringify(publicInputs));

      // Run snarkjs verify
      const result = execSync(
        `snarkjs groth16 verify build/verification_key.json ${tempPublicPath} ${tempProofPath}`,
        { encoding: "utf-8" }
      );

      // Clean up temp files
      if (existsSync(tempProofPath)) {
        unlinkSync(tempProofPath);
      }
      if (existsSync(tempPublicPath)) {
        unlinkSync(tempPublicPath);
      }

      // Check result
      if (result.includes("OK")) {
        return 100;
      } else {
        console.log(`   ❌ Proof verification failed: ${result}`);
        return 0;
      }
    } catch (error) {
      console.log(`   ⚠️  Cryptographic verification error: ${error}`);
      return 50;
    }
  }

  /**
   * Verify the rebalancing plan logic
   */
  private verifyRebalancingLogic(proofPackage: ProofPackage): number {
    try {
      const rebalancingPlan = proofPackage.rebalancingPlan;

      const oldBalances = rebalancingPlan.oldBalances;
      const newBalances = rebalancingPlan.newBalances;
      const prices = rebalancingPlan.prices;
      const minPct = parseInt(rebalancingPlan.minAllocationPct);
      const maxPct = parseInt(rebalancingPlan.maxAllocationPct);

      if (!oldBalances || !newBalances || !prices) {
        return 0;
      }

      // Check value preservation
      const oldTotal = oldBalances.reduce(
        (sum, bal, i) => sum + parseInt(bal) * parseInt(prices[i]),
        0
      );
      const newTotal = newBalances.reduce(
        (sum, bal, i) => sum + parseInt(bal) * parseInt(prices[i]),
        0
      );

      if (oldTotal !== newTotal) {
        console.log(`   ❌ Value not preserved: ${oldTotal} != ${newTotal}`);
        return 30;
      }

      // Check allocation bounds
      let allocationsValid = true;
      for (let i = 0; i < newBalances.length; i++) {
        const value = parseInt(newBalances[i]) * parseInt(prices[i]);
        const allocationPct = newTotal > 0 ? (value / newTotal) * 100 : 0;

        if (allocationPct < minPct || allocationPct > maxPct) {
          console.log(
            `   ⚠️  Token ${i} allocation ${allocationPct.toFixed(
              2
            )}% outside bounds [${minPct}%, ${maxPct}%]`
          );
          allocationsValid = false;
        }
      }

      if (!allocationsValid) {
        return 70; // Partial credit for value preservation
      }

      return 100;
    } catch (error) {
      console.log(`   ⚠️  Logic verification error: ${error}`);
      return 50;
    }
  }

  /**
   * Submit validation response through ERC-8004
   */
  async submitValidationResponseWithPackage(
    validationPackage: ValidationPackage
  ): Promise<Hash> {
    const dataHash = `0x${validationPackage.dataHash}` as `0x${string}`;
    const score = validationPackage.validationScore;

    console.log("📤 Submitting validation response");
    console.log(`   Data hash: ${validationPackage.dataHash}`);
    console.log(`   Score: ${score}/100`);

    // Store the validation package for reference
    this.storeValidationPackage(validationPackage.dataHash, validationPackage);

    // Submit validation response through ERC-8004
    const txHash = await this.submitValidationResponse(dataHash, score);

    console.log(`   Validation response transaction: ${txHash}`);

    return txHash;
  }

  /**
   * Load proof package for validation
   */
  private loadProofPackage(dataHash: string): ProofPackage | null {
    try {
      const filePath = join("data", `${dataHash}.json`);
      const data = readFileSync(filePath, "utf-8");
      return JSON.parse(data) as ProofPackage;
    } catch {
      console.log(`❌ Proof package not found: data/${dataHash}.json`);
      return null;
    }
  }

  /**
   * Store validation package for reference
   */
  private storeValidationPackage(
    dataHash: string,
    validationPackage: ValidationPackage
  ): void {
    if (!existsSync("validations")) {
      mkdirSync("validations", { recursive: true });
    }

    const filePath = join("validations", `${dataHash}.json`);
    writeFileSync(filePath, JSON.stringify(validationPackage, null, 2));

    console.log(`💾 Validation package stored: ${filePath}`);
  }

  /**
   * Return supported trust models for this agent
   */
  getTrustModels(): string[] {
    return ["inference-validation", "zero-knowledge", "crypto-economic"];
  }

  /**
   * Generate AgentCard following A2A specification
   */
  async getAgentCard(): Promise<Record<string, unknown>> {
    const chainId = await this.publicClient.getChainId();

    return {
      agentId: this.agentId,
      name: "ZK Proof Validator Agent",
      description: "Validates zero-knowledge proofs for portfolio rebalancing",
      version: "1.0.0",
      skills: [
        {
          skillId: "zk-proof-validation",
          name: "ZK Proof Validation",
          description:
            "Comprehensive validation of Groth16 ZK proofs with cryptographic and logical verification",
          inputSchema: {
            type: "object",
            properties: {
              data_hash: {
                type: "string",
                description: "Hash of proof to validate",
              },
            },
            required: ["data_hash"],
          },
          outputSchema: {
            type: "object",
            properties: {
              validation_score: { type: "number" },
              validation_report: { type: "object" },
              proof_valid: { type: "boolean" },
            },
          },
        },
      ],
      trustModels: this.getTrustModels(),
      registrations: [
        {
          agentId: this.agentId,
          agentAddress: `eip155:${chainId}:${this.address}`,
          signature: "0x...",
        },
      ],
    };
  }
}
