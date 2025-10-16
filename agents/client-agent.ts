/**
 * Client Agent - Minimal Feedback & Reputation
 */

import { type Hash } from "viem";
import { ERC8004BaseAgent } from "./base-agent";
import {
  type ProofPackage,
  type RebalancerProofPackage,
} from "./rebalancer-agent";

// ============ Types ============

interface FeedbackData {
  serverId: bigint;
  score: number;
  comment: string;
  timestamp: number;
}

interface ReputationInfo {
  serverId: bigint;
  feedbackCount: number;
  averageScore: number;
}

// ============ Client Agent ============

export class ClientAgent extends ERC8004BaseAgent {
  private feedbackHistory: FeedbackData[] = [];

  constructor(agentDomain: string, privateKey: `0x${string}`) {
    super(agentDomain, privateKey);
    console.log("💼 Client Agent initialized");
  }

  evaluateRebalancingQuality(
    proof: ProofPackage | RebalancerProofPackage
  ): number {
    console.log("🎯 Evaluating quality...");

    let score = 50;
    if (proof.proof) score += 25;
    if (proof.publicInputs) score += 25;

    console.log(`   Quality score: ${score}/100`);
    return score;
  }

  async submitFeedback(
    agentId: bigint,
    score: number,
    feedbackAuth: `0x${string}`,
    comment: string = "",
    tag1: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000",
    tag2: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000"
  ): Promise<Hash> {
    if (score < 0 || score > 100) {
      throw new Error("Score must be 0-100");
    }

    console.log(`📝 Submitting on-chain feedback: ${score}/100`);

    // Submit feedback on-chain using the provided authorization
    const hash = await (this.walletClient as any).writeContract({
      address: this.reputationRegistryAddress,
      abi: this.reputationRegistryAbi,
      functionName: "giveFeedback",
      args: [
        agentId,
        score,
        tag1,
        tag2,
        comment ? `ipfs://feedback/${comment}` : "",
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        feedbackAuth,
      ],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    // Track locally
    const feedback: FeedbackData = {
      serverId: agentId,
      score,
      comment,
      timestamp: Math.floor(Date.now() / 1000),
    };

    this.feedbackHistory.push(feedback);
    console.log(`✅ Feedback submitted on-chain: ${score}/100`);

    return hash;
  }

  checkRebalancerReputation(serverId: bigint): ReputationInfo {
    const serverFeedback = this.feedbackHistory.filter(
      (f) => f.serverId === serverId
    );

    const avgScore =
      serverFeedback.length > 0
        ? serverFeedback.reduce((sum, f) => sum + f.score, 0) /
          serverFeedback.length
        : 0;

    console.log(
      `🔍 Reputation - Count: ${serverFeedback.length}, Avg: ${avgScore.toFixed(
        1
      )}/100`
    );

    return {
      serverId,
      feedbackCount: serverFeedback.length,
      averageScore: avgScore,
    };
  }
}

export type { FeedbackData, ReputationInfo };
