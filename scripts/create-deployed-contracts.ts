#!/usr/bin/env ts-node

/**
 * Create deployed_contracts.json from Forge deployment output
 *
 * Reads the latest deployment from Forge's broadcast directory and creates
 * a deployed_contracts.json file for the TypeScript agents to use.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { getAddress } from "viem";

// ============ Types ============

interface Transaction {
  contractName?: string;
  contractAddress?: string;
  transactionType?: string;
}

interface DeploymentData {
  transactions: Transaction[];
  chain: number;
}

interface DeployedContracts {
  network: string;
  chainId: number;
  contracts: {
    IdentityRegistry?: string;
    ValidationRegistry?: string;
    ReputationRegistry?: string;
    Groth16Verifier?: string;
    RebalancerVerifier?: string;
  };
}

// ============ Helper Functions ============

function findLatestDeployment(): string | null {
  const broadcastDir = "contracts/broadcast/Deploy.s.sol/31337";

  try {
    const files = readdirSync(broadcastDir)
      .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
      .filter((f) => f !== "run-latest.json") // Exclude the symlink
      .map((f) => ({
        name: f,
        path: join(broadcastDir, f),
        mtime: statSync(join(broadcastDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (files.length === 0) {
      return null;
    }

    console.log(`\n   Using deployment: ${files[0].name}\n`);
    return files[0].path;
  } catch (error) {
    console.error(`❌ Broadcast directory not found: ${broadcastDir}`);
    console.error(
      "   Please deploy contracts first using: npm run forge:deploy:local"
    );
    return null;
  }
}

function extractContractAddresses(
  deploymentFile: string
): Record<string, string> {
  try {
    const data: DeploymentData = JSON.parse(
      readFileSync(deploymentFile, "utf-8")
    );
    const contracts: Record<string, string> = {};

    // Parse transactions to find contract deployments
    for (const tx of data.transactions || []) {
      const contractName = tx.contractName;
      const contractAddress = tx.contractAddress;

      if (contractName && contractAddress) {
        // Convert to checksummed address for web3/viem compatibility
        const checksummedAddress = getAddress(contractAddress);
        contracts[contractName] = checksummedAddress;
        console.log(`   Found ${contractName}: ${checksummedAddress}`);
      }
    }

    return contracts;
  } catch (error) {
    console.error(`❌ Error reading deployment file: ${error}`);
    throw error;
  }
}

function createDeployedContractsFile(
  contracts: Record<string, string>,
  chainId: number
): void {
  // Validate required contracts
  const requiredContracts = [
    "IdentityRegistry",
    "ValidationRegistry",
    "ReputationRegistry",
    "Groth16Verifier",
  ];
  const missingContracts = requiredContracts.filter((name) => !contracts[name]);

  if (missingContracts.length > 0) {
    throw new Error(
      `Missing required contracts: ${missingContracts.join(", ")}`
    );
  }

  // Create deployed contracts object
  const deployedContracts: DeployedContracts = {
    network:
      chainId === 31337 ? "anvil" : chainId === 1 ? "mainnet" : "unknown",
    chainId,
    contracts: {
      IdentityRegistry: contracts.IdentityRegistry,
      ValidationRegistry: contracts.ValidationRegistry,
      ReputationRegistry: contracts.ReputationRegistry,
      Groth16Verifier: contracts.Groth16Verifier,
      RebalancerVerifier: contracts.RebalancerVerifier,
    },
  };

  // Write to file
  const outputPath = "deployed_contracts.json";
  writeFileSync(outputPath, JSON.stringify(deployedContracts, null, 2));

  console.log(`\n✅ Created ${outputPath}`);
  console.log(
    `   Network: ${deployedContracts.network} (chainId: ${deployedContracts.chainId})`
  );
  console.log("   Contracts:");
  console.log(
    `   - IdentityRegistry: ${deployedContracts.contracts.IdentityRegistry}`
  );
  console.log(
    `   - ValidationRegistry: ${deployedContracts.contracts.ValidationRegistry}`
  );
  console.log(
    `   - ReputationRegistry: ${deployedContracts.contracts.ReputationRegistry}`
  );
  console.log(
    `   - Groth16Verifier: ${deployedContracts.contracts.Groth16Verifier}`
  );
  if (contracts.RebalancerVerifier) {
    console.log(
      `   - RebalancerVerifier: ${deployedContracts.contracts.RebalancerVerifier}`
    );
  }
}

// ============ Main Execution ============

function main(): void {
  console.log("📝 Creating deployed_contracts.json from Forge deployment...");

  // Find latest deployment
  const deploymentFile = findLatestDeployment();
  if (!deploymentFile) {
    process.exit(1);
  }

  // Extract contract addresses
  const contracts = extractContractAddresses(deploymentFile);

  // Get chain ID from deployment file
  const deploymentData: DeploymentData = JSON.parse(
    readFileSync(deploymentFile, "utf-8")
  );
  const chainId = deploymentData.chain || 31337;

  // Create deployed_contracts.json
  createDeployedContractsFile(contracts, chainId);
}

// Run if executed directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
    process.exit(1);
  }
}

export {
  findLatestDeployment,
  extractContractAddresses,
  createDeployedContractsFile,
};
