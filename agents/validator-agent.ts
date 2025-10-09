/**
 * Validator Agent - Minimal ZK Proof Validation
 */

import { type Hash } from "viem";
import { ERC8004BaseAgent } from "./base-agent";
import { type ProofPackage } from "./rebalancer-agent";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { execSync } from "child_process";

// ============ Types ============

interface ValidationResult {
  isValid: boolean;
  score: number;
  dataHash: string;
}

// ============ Validator Agent ============

export class ValidatorAgent extends ERC8004BaseAgent {
  constructor(agentDomain: string, privateKey: `0x${string}`) {
    super(agentDomain, privateKey);
    console.log("🔍 Validator Agent initialized");
  }

  async validateProof(
    proofOrHash: ProofPackage | string
  ): Promise<ValidationResult> {
    let proof: ProofPackage;
    let dataHash: string;

    // Load proof if hash provided
    if (typeof proofOrHash === "string") {
      const data = readFileSync(`data/${proofOrHash}.json`, "utf-8");
      proof = JSON.parse(data);
      dataHash = proofOrHash;
    } else {
      proof = proofOrHash;
      // Generate hash for inline proof
      const { createHash } = require("crypto");
      dataHash = createHash("sha256")
        .update(JSON.stringify(proof))
        .digest("hex");
    }

    console.log("🔍 Validating proof...");

    // Verify cryptographically
    const tempProof = "build/temp_proof.json";
    const tempPublic = "build/temp_public.json";

    writeFileSync(tempProof, JSON.stringify(proof.proof));
    writeFileSync(tempPublic, JSON.stringify(proof.publicInputs));

    try {
      const result = execSync(
        `snarkjs groth16 verify build/verification_key.json ${tempPublic} ${tempProof}`,
        { encoding: "utf-8" }
      );

      const isValid = result.includes("OK");
      const score = isValid ? 100 : 0;

      console.log(`✅ Validation complete: ${score}/100`);

      return { isValid, score, dataHash };
    } finally {
      if (existsSync(tempProof)) unlinkSync(tempProof);
      if (existsSync(tempPublic)) unlinkSync(tempPublic);
    }
  }

  async submitValidation(result: ValidationResult): Promise<Hash> {
    console.log(`📤 Submitting validation: ${result.score}/100`);

    // Store validation
    if (!existsSync("validations"))
      mkdirSync("validations", { recursive: true });
    writeFileSync(
      `validations/${result.dataHash}.json`,
      JSON.stringify(result, null, 2)
    );

    return await this.submitValidationResponse(
      `0x${result.dataHash}` as `0x${string}`,
      result.score
    );
  }
}

export type { ValidationResult };
