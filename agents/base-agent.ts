/**
 * Base Agent for ERC-8004 Registry Interactions
 *
 * This module provides the foundational class for agents that interact with
 * the ERC-8004 registry contracts in the ZK rebalancing system.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  parseEther,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config();

// ============ Types ============

export interface DeployedContracts {
  network: string;
  chainId: number;
  contracts: {
    IdentityRegistry: Address;
    ValidationRegistry: Address;
    ReputationRegistry: Address;
  };
}

export interface AgentInfo {
  agentId: bigint;
  agentDomain: string;
  agentAddress: Address;
}

export interface ContractABI {
  abi: readonly unknown[];
}

// ============ Base Agent Class ============

export class ERC8004BaseAgent {
  protected agentDomain: string;
  protected privateKey: `0x${string}`;
  protected account: ReturnType<typeof privateKeyToAccount>;
  protected publicClient: PublicClient;
  protected walletClient: WalletClient;

  // Contract addresses
  protected identityRegistryAddress: Address;
  protected validationRegistryAddress: Address;
  protected reputationRegistryAddress: Address;

  // Contract ABIs
  protected identityRegistryAbi: readonly unknown[];
  protected validationRegistryAbi: readonly unknown[];
  protected reputationRegistryAbi: readonly unknown[];

  // Agent state
  public agentId: bigint | null = null;
  public address: Address;

  constructor(agentDomain: string, privateKey: `0x${string}`) {
    this.agentDomain = agentDomain;
    this.privateKey = privateKey;

    // Create account from private key
    this.account = privateKeyToAccount(privateKey);
    this.address = this.account.address;

    // Initialize clients
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";

    this.publicClient = createPublicClient({
      chain: foundry,
      transport: http(rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: foundry,
      transport: http(rpcUrl),
    });

    // Load contract addresses and ABIs
    const contracts = this.loadContractAddresses();
    this.identityRegistryAddress = contracts.contracts.IdentityRegistry;
    this.validationRegistryAddress = contracts.contracts.ValidationRegistry;
    this.reputationRegistryAddress = contracts.contracts.ReputationRegistry;

    // Load ABIs
    this.identityRegistryAbi = this.loadContractAbi("IdentityRegistry");
    this.validationRegistryAbi = this.loadContractAbi("ValidationRegistry");
    this.reputationRegistryAbi = this.loadContractAbi("ReputationRegistry");

    // Check if agent is already registered
    this.checkRegistration();
  }

  // ============ Private Helper Methods ============

  private loadContractAddresses(): DeployedContracts {
    try {
      const deploymentPath = join(process.cwd(), "deployed_contracts.json");
      const data = readFileSync(deploymentPath, "utf-8");
      return JSON.parse(data) as DeployedContracts;
    } catch {
      // Try alternate path
      try {
        const deploymentPath = join(__dirname, "..", "deployed_contracts.json");
        const data = readFileSync(deploymentPath, "utf-8");
        return JSON.parse(data) as DeployedContracts;
      } catch (error) {
        throw new Error(
          "deployed_contracts.json not found. Please deploy contracts first."
        );
      }
    }
  }

  private loadContractAbi(contractName: string): readonly unknown[] {
    const abiPath = join(
      process.cwd(),
      "contracts",
      "out",
      `${contractName}.sol`,
      `${contractName}.json`
    );

    try {
      const data = readFileSync(abiPath, "utf-8");
      const artifact = JSON.parse(data) as ContractABI;
      return artifact.abi;
    } catch (error) {
      throw new Error(
        `Failed to load ABI for ${contractName}. Please compile contracts first.`
      );
    }
  }

  private async checkRegistration(): Promise<void> {
    try {
      const result = (await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: "resolveByAddress",
        args: [this.address],
      })) as [bigint, string, Address];

      if (result[0] > 0n) {
        const storedDomain = result[1];
        if (storedDomain === this.agentDomain) {
          this.agentId = result[0];
          console.log(`✅ Agent already registered with ID: ${this.agentId}`);
        } else {
          console.log(
            `⚠️  Address registered with different domain: ${storedDomain}`
          );
          console.log("ℹ️  Agent not yet registered with current domain");
        }
      } else {
        console.log("ℹ️  Agent not yet registered");
      }
    } catch (error) {
      const errorStr = String(error);
      if (
        errorStr.includes("AgentNotFound") ||
        errorStr.includes("0xe93ba223")
      ) {
        console.log("ℹ️  Agent not yet registered");
      } else {
        console.log(`ℹ️  Error checking registration: ${error}`);
      }
    }
  }

  // ============ Public Methods ============

  /**
   * Register this agent with the IdentityRegistry
   * @returns Agent ID assigned by the registry
   */
  async registerAgent(): Promise<bigint> {
    if (this.agentId !== null) {
      console.log(`Agent already registered with ID: ${this.agentId}`);
      return this.agentId;
    }

    console.log(`📝 Registering agent with domain: ${this.agentDomain}`);

    // Check balance
    const balance = await this.publicClient.getBalance({
      address: this.address,
    });
    const required = parseEther("0.01");

    if (balance < required) {
      throw new Error(
        `Insufficient balance. Have ${formatEther(
          balance
        )} ETH, need at least ${formatEther(required)} ETH`
      );
    }

    // Send registration transaction
    const hash: Hash = await (this.walletClient as any).writeContract({
      address: this.identityRegistryAddress,
      abi: this.identityRegistryAbi,
      functionName: "newAgent",
      args: [this.agentDomain, this.address],
      value: parseEther("0.005"),
    });

    console.log(`   Transaction hash: ${hash}`);

    // Wait for confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      // Parse event logs to get agent ID
      const logs = receipt.logs;

      for (const log of logs) {
        try {
          const decoded = (await this.publicClient.readContract({
            address: this.identityRegistryAddress,
            abi: this.identityRegistryAbi,
            functionName: "resolveByAddress",
            args: [this.address],
          })) as [bigint, string, Address];

          if (decoded[0] > 0n) {
            this.agentId = decoded[0];
            console.log(
              `✅ Agent registered successfully with ID: ${this.agentId}`
            );
            return this.agentId;
          }
        } catch {
          continue;
        }
      }

      // Fallback: query by address after a short delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      const agentInfo = (await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: "resolveByAddress",
        args: [this.address],
      })) as [bigint, string, Address];

      if (agentInfo[0] > 0n) {
        this.agentId = agentInfo[0];
        console.log(
          `✅ Agent registered successfully with ID: ${this.agentId}`
        );
        return this.agentId;
      }

      throw new Error("Registration succeeded but couldn't determine agent ID");
    } else {
      throw new Error("Agent registration failed");
    }
  }

  /**
   * Request validation from a validator agent
   * @param validatorAgentId ID of the validator agent
   * @param dataHash Hash of the data to be validated
   * @returns Transaction hash
   */
  async requestValidation(
    validatorAgentId: bigint,
    dataHash: `0x${string}`
  ): Promise<Hash> {
    if (this.agentId === null) {
      throw new Error("Agent must be registered first");
    }

    console.log(`🔍 Requesting validation from agent ${validatorAgentId}`);

    const hash = await this.walletClient.writeContract({
      address: this.validationRegistryAddress,
      abi: this.validationRegistryAbi,
      functionName: "validationRequest",
      args: [validatorAgentId, this.agentId, dataHash],
    } as any);

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("✅ Validation request successful");
      return hash;
    } else {
      throw new Error("Validation request failed");
    }
  }

  /**
   * Submit a validation response (for validator agents)
   * @param dataHash Hash of the validated data
   * @param response Validation score (0-100)
   * @returns Transaction hash
   */
  async submitValidationResponse(
    dataHash: `0x${string}`,
    response: number
  ): Promise<Hash> {
    if (this.agentId === null) {
      throw new Error("Agent must be registered first");
    }

    console.log(`📊 Submitting validation response: ${response}/100`);

    const hash = await this.walletClient.writeContract({
      address: this.validationRegistryAddress,
      abi: this.validationRegistryAbi,
      functionName: "validationResponse",
      args: [dataHash, BigInt(response)],
    } as any);

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("✅ Validation response submitted successfully");
      return hash;
    } else {
      throw new Error("Validation response submission failed");
    }
  }

  /**
   * Get information about an agent from the registry
   * @param agentId Agent ID to query
   * @returns Agent information
   */
  async getAgentInfo(agentId: bigint): Promise<AgentInfo> {
    const result = (await this.publicClient.readContract({
      address: this.identityRegistryAddress,
      abi: this.identityRegistryAbi,
      functionName: "getAgent",
      args: [agentId],
    })) as [bigint, string, Address];

    return {
      agentId: result[0],
      agentDomain: result[1],
      agentAddress: result[2],
    };
  }

  /**
   * Get the current balance of this agent
   * @returns Balance in ETH
   */
  async getBalance(): Promise<string> {
    const balance = await this.publicClient.getBalance({
      address: this.address,
    });
    return formatEther(balance);
  }
}
