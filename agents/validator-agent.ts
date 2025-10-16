/**
 * Validator Agent - Minimal ZK Proof Validation
 */

import { type Hash, type Address } from "viem";
import { ERC8004BaseAgent } from "./base-agent";
import {
  type ProofPackage,
  type RebalancerProofPackage,
} from "./rebalancer-agent";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";

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
    proofOrHash: ProofPackage | RebalancerProofPackage | string
  ): Promise<ValidationResult> {
    let proof: ProofPackage | RebalancerProofPackage;
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

    console.log("\n🔍 Validating proof...");
    console.log("─".repeat(50));
    console.log("📋 DataHash:");
    console.log(`   0x${dataHash}`);
    console.log("─".repeat(50));

    // ===== Determine which verifier to use based on proof type =====
    const isRebalancerProof = "rebalancerInput" in proof;
    const verifierName = isRebalancerProof
      ? "RebalancerVerifier"
      : "Groth16Verifier";
    const verifierSolFile = isRebalancerProof
      ? "RebalancerVerifier.sol"
      : "Verifier.sol";

    console.log(`\n🔐 Verifying on-chain using ${verifierName} (eth_call)...`);
    console.log("─".repeat(50));

    // Resolve verifier address from deployed_contracts.json
    const deployedPath = join(process.cwd(), "deployed_contracts.json");
    const deployed = JSON.parse(readFileSync(deployedPath, "utf-8"));
    const verifierAddress: Address | undefined =
      deployed?.contracts?.[verifierName];
    if (!verifierAddress) {
      throw new Error(
        `${verifierName} address not found. Please redeploy with updated script to include the verifier.`
      );
    }

    // Load verifier ABI from contracts/out
    const verifierArtifactPath = join(
      process.cwd(),
      `contracts/out/${verifierSolFile}/${verifierName}.json`
    );
    const verifierArtifact = JSON.parse(
      readFileSync(verifierArtifactPath, "utf-8")
    );
    const verifierAbi = verifierArtifact.abi as readonly unknown[];

    // Parse proof components into BigInt arrays
    type SnarkProof = {
      pi_a: [string, string, string];
      pi_b: [[string, string], [string, string], [string, string]];
      pi_c: [string, string, string];
    };

    const pr = proof.proof as SnarkProof;

    const pA: [bigint, bigint] = [BigInt(pr.pi_a[0]), BigInt(pr.pi_a[1])];
    // Note: Solidity verifier expects FQ2 elements in swapped order vs snarkjs output
    // i.e., [[b00,b01],[b10,b11]] -> [[b01,b00],[b11,b10]]
    const pB: [[bigint, bigint], [bigint, bigint]] = [
      [BigInt(pr.pi_b[0][1]), BigInt(pr.pi_b[0][0])],
      [BigInt(pr.pi_b[1][1]), BigInt(pr.pi_b[1][0])],
    ];
    const pC: [bigint, bigint] = [BigInt(pr.pi_c[0]), BigInt(pr.pi_c[1])];

    // Convert public signals to bigint[]
    const pubSignals = (proof.publicInputs as (string | number)[]).map((v) =>
      BigInt(v)
    );
    console.log("pubSignals", pubSignals);

    // Check expected pubSignals length from verifier ABI
    let expectedLen: number | undefined;
    try {
      const verifyItem = (verifierAbi as any[]).find(
        (i) => i?.type === "function" && i?.name === "verifyProof"
      );
      const lastInput = verifyItem?.inputs?.[3];
      const typeStr: string | undefined = lastInput?.type;
      const match = typeStr ? /\[(\d+)\]$/.exec(typeStr) : null;
      expectedLen = match ? Number(match[1]) : undefined;
    } catch {}

    if (expectedLen !== undefined && pubSignals.length !== expectedLen) {
      throw new Error(
        `Verifier expects ${expectedLen} public signals, but proof contains ${pubSignals.length}.\n` +
          `Please regenerate zk artifacts and redeploy the verifier so they align:\n` +
          `  1) npm run setup:zkp\n` +
          `  2) npm run forge:build\n` +
          `  3) npm run forge:deploy:local`
      );
    }

    // Perform eth_call to verifyProof
    const isValid = (await this.publicClient.readContract({
      address: verifierAddress,
      abi: verifierAbi,
      functionName: "verifyProof",
      args: [pA, pB, pC, pubSignals],
    })) as boolean;

    const score = isValid ? 100 : 0;

    console.log(`   Result: ${isValid ? "✅ VALID" : "❌ INVALID"}`);
    console.log("─".repeat(50));
    console.log(`\n✅ Validation complete: ${score}/100`);
    console.log("─".repeat(50));
    console.log("📊 Validation Summary:");
    console.log(`   Status: ${isValid ? "✅ VALID" : "❌ INVALID"}`);
    console.log(`   Score: ${score}/100`);
    console.log(`   DataHash: 0x${dataHash.slice(0, 16)}...`);
    console.log("─".repeat(50));

    return { isValid, score, dataHash };
  }

  async submitValidation(result: ValidationResult): Promise<Hash> {
    console.log("\n📤 Submitting validation to registry...");
    console.log("─".repeat(50));
    console.log("📊 Validation Details:");
    console.log(`   Score: ${result.score}/100`);
    console.log(`   Valid: ${result.isValid ? "✅ Yes" : "❌ No"}`);
    console.log(`   DataHash: 0x${result.dataHash}`);

    // Store validation
    if (!existsSync("validations"))
      mkdirSync("validations", { recursive: true });

    const validationPath = `validations/${result.dataHash}.json`;
    writeFileSync(validationPath, JSON.stringify(result, null, 2));

    console.log(`   Stored: ${validationPath}`);
    console.log("─".repeat(50));

    // Create responseUri pointing to the validation result
    const responseUri = `file://validations/${result.dataHash}.json`;

    return await this.submitValidationResponse(
      `0x${result.dataHash}` as `0x${string}`,
      result.score,
      responseUri,
      `0x${result.dataHash}` as `0x${string}`,
      "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`
    );
  }
}

export type { ValidationResult };
