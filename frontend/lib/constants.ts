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
      "0x19fad4adD9f8C4A129A078464B22E1506275FbDd" as `0x${string}`,
    reputationRegistry:
      "0xA13497975fd3f6cA74081B074471C753b622C903" as `0x${string}`,
    validationRegistry:
      "0x6e24aA15e134AF710C330B767018d739CAeCE293" as `0x${string}`,
    chainId: 84532,
    explorer: "https://sepolia.basescan.org",
    name: "Base Sepolia",
  },
  ETHEREUM_SEPOLIA: {
    identityRegistry:
      "0x127C86a24F46033E77C347258354ee4C739b139C" as `0x${string}`,
    reputationRegistry:
      "0x57396214E6E65E9B3788DE7705D5ABf3647764e0" as `0x${string}`,
    validationRegistry:
      "0x5d332cE798e491feF2de260bddC7f24978eefD85" as `0x${string}`,
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

