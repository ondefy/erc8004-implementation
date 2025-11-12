import { baseSepolia, sepolia } from "viem/chains";

/**
 * Network configuration and deployed contract addresses
 */

export const SUPPORTED_NETWORKS = {
  BASE_SEPOLIA: baseSepolia,
  ETHEREUM_SEPOLIA: sepolia,
} as const;

export type SupportedNetwork = keyof typeof SUPPORTED_NETWORKS;

/**
 * Deployed contract addresses per network
 * These are pre-deployed contracts from the deployment
 */
export const DEPLOYED_CONTRACTS = {
  BASE_SEPOLIA: {
    identityRegistry:
      "0x8004AA63c570c570eBF15376c0dB199918BFe9Fb" as `0x${string}`,
    reputationRegistry:
      "0x8004bd8daB57f14Ed299135749a5CB5c42d341BF" as `0x${string}`,
    validationRegistry:
      "0x8004C269D0A5647E51E121FeB226200ECE932d55" as `0x${string}`,
    groth16Verifier:
      "0x7D339bb4B9a05C2Bd114D8A39A40Fd1783343D5f" as `0x${string}`, // FIXED: All circuit bugs resolved (2,091 constraints)
    rebalancerVerifier:
      "0x4baf957830423f36978039e32d95ee958aa0560c" as `0x${string}`, // REDEPLOYED: Synced with latest zkey (Nov 6, 2025)
    deploymentBlock: 33602716, // Latest RebalancerVerifier deployment
    chainId: 84532,
    explorer: "https://sepolia.basescan.org",
    name: "Base Sepolia",
  },
  ETHEREUM_SEPOLIA: {
    identityRegistry:
      "0x8004a6090Cd10A7288092483047B097295Fb8847" as `0x${string}`,
    reputationRegistry:
      "0x8004B8FD1A363aa02fDC07635C0c5F94f6Af5B7E" as `0x${string}`,
    validationRegistry:
      "0x8004CB39f29c09145F24Ad9dDe2A108C1A2cdfC5" as `0x${string}`,
    groth16Verifier:
      "0xC10A3A32Ee429Eea2d5b80CF82357a093d919A44" as `0x${string}`,
    rebalancerVerifier:
      "0xFA4199310e49aBD31f5D0c3Aed1267Ca4F9A2828" as `0x${string}`, // REDEPLOYED: Synced with latest zkey (Nov 6, 2025)
    deploymentBlock: 9616067, // Latest RebalancerVerifier deployment
    chainId: 11155111,
    explorer: "https://sepolia.etherscan.io",
    name: "Ethereum Sepolia",
  },
} as const;

/**
 * Get contract addresses for a specific network
 */
export function getContractsForNetwork(chainId: number) {
  switch (chainId) {
    case DEPLOYED_CONTRACTS.BASE_SEPOLIA.chainId:
      return DEPLOYED_CONTRACTS.BASE_SEPOLIA;
    case DEPLOYED_CONTRACTS.ETHEREUM_SEPOLIA.chainId:
      return DEPLOYED_CONTRACTS.ETHEREUM_SEPOLIA;
    default:
      return null;
  }
}

/**
 * Get network info by chain ID
 */
export function getNetworkInfo(chainId: number) {
  const contracts = getContractsForNetwork(chainId);
  if (!contracts) return null;

  return {
    name: contracts.name,
    explorer: contracts.explorer,
    chainId: contracts.chainId,
  };
}

/**
 * Check if a chain ID is supported
 */
export function isSupportedNetwork(chainId: number): boolean {
  return (
    chainId === DEPLOYED_CONTRACTS.BASE_SEPOLIA.chainId ||
    chainId === DEPLOYED_CONTRACTS.ETHEREUM_SEPOLIA.chainId
  );
}

/**
 * Faucet links for testnet ETH
 */
export const FAUCET_LINKS = {
  BASE_SEPOLIA: [
    {
      name: "Coinbase Base Faucet",
      url: "https://www.coinbase.com/faucets/base-ethereum-goerli-faucet",
    },
    {
      name: "Alchemy Faucet",
      url: "https://www.alchemy.com/faucets/base-sepolia",
    },
  ],
  ETHEREUM_SEPOLIA: [
    {
      name: "Alchemy Sepolia Faucet",
      url: "https://www.alchemy.com/faucets/ethereum-sepolia",
    },
    {
      name: "Infura Sepolia Faucet",
      url: "https://www.infura.io/faucet/sepolia",
    },
  ],
};

/**
 * Get faucet links for current network
 */
export function getFaucetLinks(chainId: number) {
  switch (chainId) {
    case DEPLOYED_CONTRACTS.BASE_SEPOLIA.chainId:
      return FAUCET_LINKS.BASE_SEPOLIA;
    case DEPLOYED_CONTRACTS.ETHEREUM_SEPOLIA.chainId:
      return FAUCET_LINKS.ETHEREUM_SEPOLIA;
    default:
      return [];
  }
}

/**
 * Get all deployed contracts with their explorer links
 */
export function getAllContracts(chainId: number) {
  const contracts = getContractsForNetwork(chainId);
  if (!contracts) return null;

  return [
    {
      name: "IdentityRegistry",
      address: contracts.identityRegistry,
      explorerUrl: `${contracts.explorer}/address/${contracts.identityRegistry}`,
      description: "ERC-721 NFT for agent identity",
    },
    {
      name: "ValidationRegistry",
      address: contracts.validationRegistry,
      explorerUrl: `${contracts.explorer}/address/${contracts.validationRegistry}`,
      description: "Validation request/response registry",
    },
    {
      name: "ReputationRegistry",
      address: contracts.reputationRegistry,
      explorerUrl: `${contracts.explorer}/address/${contracts.reputationRegistry}`,
      description: "Agent reputation & feedback system",
    },
    // {
    //   name: "Groth16Verifier",
    //   address: contracts.groth16Verifier,
    //   explorerUrl: `${contracts.explorer}/address/${contracts.groth16Verifier}`,
    //   description: "ZK proof verifier for Math mode (portfolio allocation)",
    // },
    {
      name: "RebalancerVerifier",
      address: contracts.rebalancerVerifier,
      explorerUrl: `${contracts.explorer}/address/${contracts.rebalancerVerifier}`,
      description:
        "ZK proof verifier for Rebalancing mode (DeFi opportunity validation)",
    },
  ];
}
