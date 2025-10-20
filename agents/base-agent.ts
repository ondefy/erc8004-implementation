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
      // Check if this address owns any agent NFTs
      const totalAgents = (await this.publicClient.readContract({
        address: this.identityRegistryAddress,
        abi: this.identityRegistryAbi,
        functionName: "totalAgents",
      })) as bigint;

      // Try to find an agent owned by this address
      // Note: This is a simple check. In production, you'd want to index ownership
      for (let i = 1n; i <= totalAgents && i <= 100n; i++) {
        try {
          const owner = (await this.publicClient.readContract({
            address: this.identityRegistryAddress,
            abi: this.identityRegistryAbi,
            functionName: "ownerOf",
            args: [i],
          })) as Address;

          if (owner.toLowerCase() === this.address.toLowerCase()) {
            this.agentId = i;
            console.log(`✅ Agent already registered with ID: ${this.agentId}`);
            return;
          }
        } catch {
          // Agent ID doesn't exist or no owner
          continue;
        }
      }

      console.log("ℹ️  Agent not yet registered");
    } catch {
      console.log("ℹ️  Agent not yet registered");
    }
  }

  // ============ Public Methods ============

  async registerAgent(): Promise<bigint> {
    // First, check if already registered
    await this.checkRegistration();
    if (this.agentId !== null) return this.agentId;

    console.log(`📝 Registering agent: ${this.agentDomain}`);

    // Register with tokenURI (using agentDomain as simple identifier)
    // In production, tokenURI would point to actual metadata JSON
    const tokenURI = `ipfs://agent/${this.agentDomain}`;

    const hash: Hash = await (this.walletClient as any).writeContract({
      address: this.identityRegistryAddress,
      abi: this.identityRegistryAbi,
      functionName: "register",
      args: [tokenURI],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Parse the Registered event to get the agentId
    // Event signature: Registered(uint256 indexed agentId, string tokenURI, address indexed owner)
    // This creates a keccak256 hash of: keccak256("Registered(uint256,string,address)")
    const registeredEventSig =
      "0x4fdc8ad5e7b44eac5c54d8b9c1e7a890f8f3c9e5a2d3f3e2d1c0b0a09fef1234"; // Placeholder - will search for actual event

    // Find the Registered event (not the Transfer event from ERC-721)
    // The Transfer event signature is 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
    const transferEventSig =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    // The Transfer event for ERC-721 minting has: [eventSig, from (0x0), to, tokenId]
    // We can extract the tokenId from topics[3] of the Transfer event
    const transferEvent = receipt.logs.find((log) => {
      try {
        return (
          log.address.toLowerCase() ===
            this.identityRegistryAddress.toLowerCase() &&
          log.topics[0] === transferEventSig &&
          log.topics[1] ===
            "0x0000000000000000000000000000000000000000000000000000000000000000" // from address is 0x0 (minting)
        );
      } catch {
        return false;
      }
    });

    if (!transferEvent || !transferEvent.topics[3]) {
      console.error(
        "All logs:",
        JSON.stringify(
          receipt.logs.map((l) => ({
            address: l.address,
            topics: l.topics,
          })),
          null,
          2
        )
      );
      throw new Error(
        "Failed to find Transfer (minting) event in transaction receipt"
      );
    }

    // The tokenId (agentId) is in topics[3] of the Transfer event
    this.agentId = BigInt(transferEvent.topics[3]);

    console.log(`✅ Registered with ID: ${this.agentId}`);
    return this.agentId;
  }

  async requestValidation(
    validatorAddress: Address,
    requestUri: string,
    requestHash: `0x${string}`
  ): Promise<Hash> {
    const hash = await (this.walletClient as any).writeContract({
      address: this.validationRegistryAddress,
      abi: this.validationRegistryAbi,
      functionName: "validationRequest",
      args: [validatorAddress, this.agentId, requestUri, requestHash],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Validation request successful");
    return hash;
  }

  async submitValidationResponse(
    requestHash: `0x${string}`,
    response: number,
    responseUri: string = "",
    responseHash: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000",
    tag: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000"
  ): Promise<Hash> {
    const hash = await (this.walletClient as any).writeContract({
      address: this.validationRegistryAddress,
      abi: this.validationRegistryAbi,
      functionName: "validationResponse",
      args: [requestHash, response, responseUri, responseHash, tag],
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
