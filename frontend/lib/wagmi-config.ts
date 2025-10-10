import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// WalletConnect Project ID (you can get one from https://cloud.walletconnect.com)
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id";

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [injected(), walletConnect({ projectId })],
  transports: {
    [baseSepolia.id]: http(),
  },
});

export { baseSepolia };
