import { getContractsForNetwork } from "./constants";
import IdentityRegistryABI from "./abis/IdentityRegistry.json";
import ReputationRegistryABI from "./abis/ReputationRegistry.json";
import ValidationRegistryABI from "./abis/ValidationRegistry.json";

/**
 * Contract ABIs
 */
export const ABIS = {
  IdentityRegistry: IdentityRegistryABI as any,
  ReputationRegistry: ReputationRegistryABI as any,
  ValidationRegistry: ValidationRegistryABI as any,
};

/**
 * Get contract configuration for a specific network
 */
export function getContractConfig(chainId: number) {
  const contracts = getContractsForNetwork(chainId);
  if (!contracts) return null;

  return {
    identityRegistry: {
      address: contracts.identityRegistry,
      abi: ABIS.IdentityRegistry,
    },
    reputationRegistry: {
      address: contracts.reputationRegistry,
      abi: ABIS.ReputationRegistry,
    },
    validationRegistry: {
      address: contracts.validationRegistry,
      abi: ABIS.ValidationRegistry,
    },
  };
}

/**
 * Contract function signatures
 */
export const CONTRACT_FUNCTIONS = {
  // IdentityRegistry
  register: "register",

  // ValidationRegistry
  validationRequest: "validationRequest",
  validationResponse: "validationResponse",
  getValidationStatus: "getValidationStatus",

  // ReputationRegistry
  giveFeedback: "giveFeedback",
  revokeFeedback: "revokeFeedback",
  readFeedback: "readFeedback",
  getSummary: "getSummary",
} as const;
