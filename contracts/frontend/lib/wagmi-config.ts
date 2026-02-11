import { http, createConfig } from "wagmi";
import { baseSepolia, sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// WalletConnect Project ID (you can get one from https://cloud.walletconnect.com)
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id";

// RPC endpoints - use custom RPCs if provided in environment variables
const baseSepoliaRpc =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || undefined;
const sepoliaRpc =
  process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC_URL || undefined;

export const config = createConfig({
  chains: [baseSepolia, sepolia],
  connectors: [injected(), walletConnect({ projectId })],
  transports: {
    // Use custom RPC if provided, otherwise use default
    [baseSepolia.id]: http(baseSepoliaRpc, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [sepolia.id]: http(sepoliaRpc, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
});

export { baseSepolia, sepolia };
