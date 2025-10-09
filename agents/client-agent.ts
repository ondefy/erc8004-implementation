/**
 * Client Agent - Minimal Feedback & Reputation
 */

import { ERC8004BaseAgent } from "./base-agent";
import { type ProofPackage } from "./rebalancer-agent";

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

  evaluateRebalancingQuality(proof: ProofPackage): number {
    console.log("🎯 Evaluating quality...");

    let score = 50;
    if (proof.proof) score += 15;
    if (proof.publicInputs) score += 10;
    if (proof.rebalancingPlan) score += 25;

    console.log(`   Quality score: ${score}/100`);
    return score;
  }

  submitFeedback(
    serverId: bigint,
    score: number,
    comment: string = ""
  ): FeedbackData {
    if (score < 0 || score > 100) {
      throw new Error("Score must be 0-100");
    }

    const feedback: FeedbackData = {
      serverId,
      score,
      comment,
      timestamp: Math.floor(Date.now() / 1000),
    };

    this.feedbackHistory.push(feedback);
    console.log(`✅ Feedback submitted: ${score}/100`);

    return feedback;
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
