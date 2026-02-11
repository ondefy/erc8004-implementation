#!/usr/bin/env ts-node

/**
 * Create deployed_contracts.json from Forge deployment output
 *
 * Reads the latest deployment from Forge's broadcast directory and creates
 * a deployed_contracts.json file for the TypeScript agents to use.
 *
 * The deploy script creates proxies (ERC1967Proxy) for each registry.
 * Each proxy CREATE follows its implementation CREATE in transaction order:
 *   CREATE IdentityRegistryUpgradeable → CREATE ERC1967Proxy (identity proxy)
 *   CREATE ValidationRegistryUpgradeable → CREATE ERC1967Proxy (validation proxy)
 *   CREATE ReputationRegistryUpgradeable → CREATE ERC1967Proxy (reputation proxy)
 *   CREATE RebalancerVerifier
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { getAddress } from "viem";

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
    IdentityRegistry: string;
    ValidationRegistry: string;
    ReputationRegistry: string;
    RebalancerVerifier: string;
  };
}

// Map from implementation contract name to the friendly name used in deployed_contracts.json
const IMPL_TO_REGISTRY: Record<string, keyof DeployedContracts["contracts"]> = {
  IdentityRegistryUpgradeable: "IdentityRegistry",
  ValidationRegistryUpgradeable: "ValidationRegistry",
  ReputationRegistryUpgradeable: "ReputationRegistry",
};

function findLatestDeployment(chainId: string): string | null {
  const broadcastDir = `contracts/broadcast/Deploy.s.sol/${chainId}`;

  try {
    const files = readdirSync(broadcastDir)
      .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
      .filter((f) => f !== "run-latest.json")
      .map((f) => ({
        name: f,
        path: join(broadcastDir, f),
        mtime: statSync(join(broadcastDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (files.length === 0) {
      return null;
    }

    console.log(`   Using deployment: ${files[0].name}\n`);
    return files[0].path;
  } catch (error) {
    console.error(`Broadcast directory not found: ${broadcastDir}`);
    console.error(
      "   Deploy contracts first: npm run forge:deploy:local"
    );
    return null;
  }
}

function extractContractAddresses(
  deploymentFile: string
): Record<string, string> {
  const data: DeploymentData = JSON.parse(
    readFileSync(deploymentFile, "utf-8")
  );
  const contracts: Record<string, string> = {};

  // Walk through CREATE transactions in order.
  // When we see an implementation deploy (e.g. IdentityRegistryUpgradeable),
  // the next ERC1967Proxy CREATE is its proxy — that's the address we want.
  let pendingRegistry: string | null = null;

  for (const tx of data.transactions || []) {
    if (tx.transactionType !== "CREATE" || !tx.contractName || !tx.contractAddress) {
      continue;
    }

    const addr = getAddress(tx.contractAddress);

    if (tx.contractName in IMPL_TO_REGISTRY) {
      // Remember which registry we're about to deploy a proxy for
      pendingRegistry = IMPL_TO_REGISTRY[tx.contractName];
      console.log(`   ${tx.contractName} impl: ${addr}`);
    } else if (tx.contractName === "ERC1967Proxy" && pendingRegistry) {
      // This proxy belongs to the registry we just saw
      contracts[pendingRegistry] = addr;
      console.log(`   ${pendingRegistry} proxy: ${addr}`);
      pendingRegistry = null;
    } else if (tx.contractName === "RebalancerVerifier") {
      contracts["RebalancerVerifier"] = addr;
      console.log(`   RebalancerVerifier: ${addr}`);
    }
    // Skip BootstrapUUPS and other helper contracts
  }

  return contracts;
}

function main(): void {
  console.log("Creating deployed_contracts.json from Forge deployment...\n");

  // Determine chain ID from args or default to 31337
  const chainId = process.argv[2] || "31337";

  const deploymentFile = findLatestDeployment(chainId);
  if (!deploymentFile) {
    process.exit(1);
  }

  const contracts = extractContractAddresses(deploymentFile);

  // Validate
  const required = [
    "IdentityRegistry",
    "ValidationRegistry",
    "ReputationRegistry",
    "RebalancerVerifier",
  ];
  const missing = required.filter((name) => !contracts[name]);
  if (missing.length > 0) {
    console.error(`\nMissing contracts: ${missing.join(", ")}`);
    console.error("Check the deployment broadcast for errors.");
    process.exit(1);
  }

  const deploymentData: DeploymentData = JSON.parse(
    readFileSync(deploymentFile, "utf-8")
  );
  const chain = deploymentData.chain || parseInt(chainId);
  const networkName =
    chain === 31337
      ? "anvil"
      : chain === 84532
      ? "base-sepolia"
      : chain === 1
      ? "mainnet"
      : `chain-${chain}`;

  const deployed: DeployedContracts = {
    network: networkName,
    chainId: chain,
    contracts: {
      IdentityRegistry: contracts.IdentityRegistry,
      ValidationRegistry: contracts.ValidationRegistry,
      ReputationRegistry: contracts.ReputationRegistry,
      RebalancerVerifier: contracts.RebalancerVerifier,
    },
  };

  writeFileSync("deployed_contracts.json", JSON.stringify(deployed, null, 2));

  console.log(`\nCreated deployed_contracts.json`);
  console.log(`   Network: ${deployed.network} (chainId: ${deployed.chainId})`);
  for (const [name, addr] of Object.entries(deployed.contracts)) {
    console.log(`   ${name}: ${addr}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

export {
  findLatestDeployment,
  extractContractAddresses,
};
