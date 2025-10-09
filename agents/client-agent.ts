/**
 * Client Agent - Feedback and Reputation Management
 *
 * This agent demonstrates a Client Agent role in the ERC-8004 ecosystem.
 * It can authorize feedback from rebalancer agents and manage reputation
 * interactions through the ERC-8004 registries.
 */

import { ERC8004BaseAgent } from "./base-agent";
import { type ProofPackage } from "./rebalancer-agent";

// ============ Types ============

export interface FeedbackData {
  clientId: bigint | null;
  serverId: bigint;
  score: number;
  comment: string;
  timestamp: number;
  clientDomain: string;
}

export interface ReputationInfo {
  serverId: bigint;
  feedbackCount: number;
  averageScore: number;
  lastFeedback: FeedbackData | null;
}

export interface ServiceRequest {
  clientId: bigint | null;
  serverId: bigint;
  timestamp: number;
  serviceType: string;
  params: {
    oldBalances: string[];
    newBalances: string[];
    prices: string[];
  };
  status: string;
}

// ============ Client Agent Class ============

export class ClientAgent extends ERC8004BaseAgent {
  private authorizedServers: bigint[] = [];
  private feedbackHistory: FeedbackData[] = [];

  constructor(agentDomain: string, privateKey: `0x${string}`) {
    super(agentDomain, privateKey);

    console.log("💼 Client Agent initialized");
    console.log(`   Domain: ${this.agentDomain}`);
    console.log(`   Address: ${this.address}`);
    console.log(`   Client: ${this.address}`);
  }

  /**
   * Submit feedback for a rebalancer agent's service
   */
  submitFeedback(
    serverId: bigint,
    score: number,
    comment: string = ""
  ): FeedbackData {
    if (this.agentId === null) {
      throw new Error("Client agent must be registered first");
    }

    if (score < 0 || score > 100) {
      throw new Error("Score must be between 0 and 100");
    }

    console.log(`📝 Submitting feedback for rebalancer agent ${serverId}`);
    console.log(`   Score: ${score}/100`);
    if (comment) {
      console.log(`   Comment: ${comment}`);
    }

    // Create feedback data
    const feedbackData: FeedbackData = {
      clientId: this.agentId,
      serverId,
      score,
      comment,
      timestamp: Math.floor(Date.now() / 1000),
      clientDomain: this.agentDomain,
    };

    // Store locally
    this.feedbackHistory.push(feedbackData);

    // In a full implementation, this would be submitted on-chain
    // For now, we simulate the transaction
    console.log("✅ Feedback submitted successfully");
    console.log(`   Feedback submitted: ${score}/100`);

    return feedbackData;
  }

  /**
   * Evaluate the quality of a rebalancing service
   */
  evaluateRebalancingQuality(proofPackage: ProofPackage): number {
    console.log("🎯 Evaluating rebalancing service quality...");

    let score = 50; // Base score

    // Check for required components
    if (proofPackage.proof) {
      score += 15;
      console.log("   ✅ ZK proof provided");
    }

    if (proofPackage.publicInputs) {
      score += 10;
      console.log("   ✅ Public inputs included");
    }

    if (proofPackage.rebalancingPlan) {
      score += 15;
      console.log("   ✅ Rebalancing plan documented");
    }

    // Check rebalancing plan quality
    const rebalancingPlan = proofPackage.rebalancingPlan;

    if (rebalancingPlan?.newAllocations) {
      score += 10;
      console.log("   ✅ Allocation analysis provided");
    }

    // Check if allocations are well-balanced
    const allocations = rebalancingPlan?.newAllocations || [];
    if (allocations.length > 0) {
      const allocationPcts = allocations.map((a) => a.allocationPct);
      // Check for diversity (not too concentrated)
      const maxAlloc = Math.max(...allocationPcts);
      if (maxAlloc < 50) {
        // No single asset > 50%
        score += 10;
        console.log("   ✅ Well-diversified portfolio");
      }
    }

    // Cap at 100
    score = Math.min(score, 100);

    console.log(`   Quality score: ${score}/100`);
    console.log(`   Quality evaluation: ${score}/100`);
    return score;
  }

  /**
   * Check the reputation score of a rebalancer agent
   */
  checkRebalancerReputation(serverId: bigint): ReputationInfo {
    console.log(`🔍 Checking reputation for rebalancer agent ${serverId}`);

    // Filter feedback for this server
    const serverFeedback = this.feedbackHistory.filter(
      (f) => f.serverId === serverId
    );

    let reputation: ReputationInfo;

    if (serverFeedback.length > 0) {
      const avgScore =
        serverFeedback.reduce((sum, f) => sum + f.score, 0) /
        serverFeedback.length;
      reputation = {
        serverId,
        feedbackCount: serverFeedback.length,
        averageScore: avgScore,
        lastFeedback: serverFeedback[serverFeedback.length - 1] || null,
      };
    } else {
      reputation = {
        serverId,
        feedbackCount: 0,
        averageScore: 0,
        lastFeedback: null,
      };
    }

    console.log(`   Feedback count: ${reputation.feedbackCount}`);
    console.log(`   Average score: ${reputation.averageScore.toFixed(1)}/100`);

    return reputation;
  }

  /**
   * Request a rebalancing service from a rebalancer agent
   */
  requestRebalancingService(
    serverId: bigint,
    oldBalances: string[],
    newBalances: string[],
    prices: string[]
  ): ServiceRequest {
    console.log(`📤 Requesting rebalancing service from agent ${serverId}`);

    const request: ServiceRequest = {
      clientId: this.agentId,
      serverId,
      timestamp: Math.floor(Date.now() / 1000),
      serviceType: "zk-rebalancing",
      params: {
        oldBalances,
        newBalances,
        prices,
      },
      status: "pending",
    };

    console.log("✅ Service request created");
    return request;
  }

  /**
   * Get the complete feedback history from this client
   */
  getFeedbackHistory(): FeedbackData[] {
    return this.feedbackHistory;
  }

  /**
   * Return supported trust models for this agent
   */
  getTrustModels(): string[] {
    return ["feedback", "reputation-based"];
  }

  /**
   * Generate AgentCard following A2A specification
   */
  async getAgentCard(): Promise<Record<string, unknown>> {
    const chainId = await this.publicClient.getChainId();

    return {
      agentId: this.agentId,
      name: "Rebalancing Client Agent",
      description:
        "Client agent for portfolio rebalancing service consumption and feedback provision",
      version: "1.0.0",
      skills: [
        {
          skillId: "feedback-provision",
          name: "Feedback Provision",
          description: "Provide feedback and ratings for rebalancing services",
          inputSchema: {
            type: "object",
            properties: {
              server_id: {
                type: "integer",
                description: "Rebalancer agent ID",
              },
              score: {
                type: "integer",
                minimum: 0,
                maximum: 100,
              },
              comment: { type: "string" },
            },
            required: ["server_id", "score"],
          },
          outputSchema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              feedback_id: { type: "string" },
            },
          },
        },
        {
          skillId: "quality-evaluation",
          name: "Service Quality Evaluation",
          description:
            "Evaluate the quality of rebalancing services and proofs",
          inputSchema: {
            type: "object",
            properties: {
              proof_package: { type: "object" },
            },
            required: ["proof_package"],
          },
          outputSchema: {
            type: "object",
            properties: {
              quality_score: { type: "integer" },
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
