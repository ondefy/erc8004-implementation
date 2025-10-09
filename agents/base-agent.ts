/**
 * Base Agent - Minimal ERC-8004 Implementation
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";

// ============ Types ============

interface DeployedContracts {
  contracts: {
    IdentityRegistry: Address;
    ValidationRegistry: Address;
    ReputationRegistry: Address;
  };
}

// ============ Base Agent ============

export class ERC8004BaseAgent {
  protected account: ReturnType<typeof privateKeyToAccount>;
  protected publicClient: ReturnType<typeof createPublicClient>;
  protected walletClient: ReturnType<typeof createWalletClient>;

  protected identityRegistryAddress: Address;
  protected validationRegistryAddress: Address;
  protected reputationRegistryAddress: Address;

  protected identityRegistryAbi: readonly unknown[];
  protected validationRegistryAbi: readonly unknown[];
  protected reputationRegistryAbi: readonly unknown[];

  public agentId: bigint | null = null;
  public address: Address;

  constructor(public agentDomain: string, privateKey: `0x${string}`) {
    // Create account
    this.account = privateKeyToAccount(privateKey);
    this.address = this.account.address;

    // Create clients
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

    // Load contracts
    const deployed = this.loadContracts();
    this.identityRegistryAddress = deployed.contracts.IdentityRegistry;
    this.validationRegistryAddress = deployed.contracts.ValidationRegistry;
    this.reputationRegistryAddress = deployed.contracts.ReputationRegistry;

    // Load ABIs
    this.identityRegistryAbi = this.loadAbi("IdentityRegistry");
    this.validationRegistryAbi = this.loadAbi("ValidationRegistry");
    this.reputationRegistryAbi = this.loadAbi("ReputationRegistry");

    // Check registration
    this.checkRegistration();
  }

  // ============ Private Methods ============

  private loadContracts(): DeployedContracts {
    const path = join(process.cwd(), "deployed_contracts.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  private loadAbi(contractName: string): readonly unknown[] {
    const path = join(
      process.cwd(),
      "contracts/out",
      `${contractName}.sol`,
      `${contractName}.json`
    );
    const artifact = JSON.parse(readFileSync(path, "utf-8"));
    return artifact.abi;
  }

  private async checkRegistration(): Promise<void> {
    try {
      const result = (await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: "resolveByAddress",
        args: [this.address],
      })) as [bigint, string, Address];

      if (result[0] > 0n && result[1] === this.agentDomain) {
        this.agentId = result[0];
        console.log(`✅ Agent already registered with ID: ${this.agentId}`);
      }
    } catch {
      console.log("ℹ️  Agent not yet registered");
    }
  }

  // ============ Public Methods ============

  async registerAgent(): Promise<bigint> {
    if (this.agentId !== null) return this.agentId;

    console.log(`📝 Registering agent: ${this.agentDomain}`);

    const hash: Hash = await (this.walletClient as any).writeContract({
      address: this.identityRegistryAddress,
      abi: this.identityRegistryAbi,
      functionName: "newAgent",
      args: [this.agentDomain, this.address],
      value: parseEther("0.005"),
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Get agent ID from event logs
    if (receipt.logs && receipt.logs.length > 0) {
      const log = receipt.logs[0];
      // AgentID is the first topic (after event signature)
      if (log.topics && log.topics.length > 1 && log.topics[1]) {
        this.agentId = BigInt(log.topics[1]);
        console.log(`✅ Registered with ID: ${this.agentId}`);
        return this.agentId;
      }
    }

    // Fallback: query by address
    const result = (await this.publicClient.readContract({
      address: this.identityRegistryAddress,
      abi: this.identityRegistryAbi,
      functionName: "resolveByAddress",
      args: [this.address],
    })) as [bigint, string, Address];

    this.agentId = result[0];
    console.log(`✅ Registered with ID: ${this.agentId}`);
    return this.agentId;
  }

  async requestValidation(
    validatorId: bigint,
    dataHash: `0x${string}`
  ): Promise<Hash> {
    const hash = await (this.walletClient as any).writeContract({
      address: this.validationRegistryAddress,
      abi: this.validationRegistryAbi,
      functionName: "validationRequest",
      args: [validatorId, this.agentId, dataHash],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Validation request successful");
    return hash;
  }

  async submitValidationResponse(
    dataHash: `0x${string}`,
    score: number
  ): Promise<Hash> {
    const hash = await (this.walletClient as any).writeContract({
      address: this.validationRegistryAddress,
      abi: this.validationRegistryAbi,
      functionName: "validationResponse",
      args: [dataHash, BigInt(score)],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Validation response submitted");
    return hash;
  }

  async getBalance(): Promise<string> {
    const balance = await this.publicClient.getBalance({
      address: this.address,
    });
    return formatEther(balance);
  }
}
