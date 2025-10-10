"use client";

import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { isSupportedNetwork, getNetworkInfo } from "@/lib/constants";

export function WalletConnect() {
    const { address, isConnected } = useAccount();
    const { connectors, connect } = useConnect();
    const { disconnect } = useDisconnect();
    const chainId = useChainId();

    const isCorrectNetwork = isSupportedNetwork(chainId);
    const networkInfo = getNetworkInfo(chainId);

    if (isConnected && address) {
        return (
            <div className="flex items-center gap-3">
                {!isCorrectNetwork && (
                    <div className="px-3 py-1 bg-red-100 border border-red-300 rounded-lg text-xs font-medium text-red-800">
                        ⚠️ Wrong Network - Switch to Base/ETH Sepolia
                    </div>
                )}
                {isCorrectNetwork && networkInfo && (
                    <div className="px-3 py-1 bg-blue-100 border border-blue-200 rounded-lg text-xs font-medium text-blue-800">
                        {networkInfo.name}
                    </div>
                )}
                <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium text-green-900">
                            {address.slice(0, 6)}...{address.slice(-4)}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => disconnect()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            {connectors
                .filter((connector) => connector.id === "injected")
                .map((connector) => (
                    <button
                        key={connector.id}
                        onClick={() => connect({ connector })}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
                    >
                        Connect Wallet
                    </button>
                ))}
        </div>
    );
}

