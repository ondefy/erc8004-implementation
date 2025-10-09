/**
 * Agent Exports
 *
 * Central export file for all ERC-8004 agents
 */

export { ERC8004BaseAgent } from "./base-agent";
export { RebalancerAgent } from "./rebalancer-agent";
export { ValidatorAgent } from "./validator-agent";
export { ClientAgent } from "./client-agent";

export type { DeployedContracts, AgentInfo } from "./base-agent";
export type {
  AllocationInfo,
  RebalancingPlan,
  CircuitInput,
  ProofMetadata,
  ProofPackage,
  AgentCard,
} from "./rebalancer-agent";
export type {
  ValidationReport,
  ValidationPackage,
  ValidationResult,
} from "./validator-agent";
export type {
  FeedbackData,
  ReputationInfo,
  ServiceRequest,
} from "./client-agent";
