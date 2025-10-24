"use client";

import { useAccount } from "wagmi";
import { getAllContracts, getNetworkInfo } from "@/lib/constants";
import { ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function DeployedContractsPanel() {
    const { chainId } = useAccount();
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    if (!chainId) {
        return (
            <div className="rounded-zyfi-lg border border-zyfi-border bg-zyfi-bg-secondary p-6 shadow-zyfi-glow">
                <div className="flex items-center gap-2 mb-4">
                    <svg
                        className="w-5 h-5 text-zyfi-accent-blue"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <h2 className="text-lg font-semibold gradient--primary">
                        Deployed Contracts
                    </h2>
                </div>
                <p className="text-sm text-slate-400">
                    Connect wallet to view deployed contracts
                </p>
            </div>
        );
    }

    const contracts = getAllContracts(chainId);
    const networkInfo = getNetworkInfo(chainId);

    // if (!contracts || !networkInfo) {
    //     return (
    //         <div className="rounded-zyfi-lg border border-red-500/50 bg-red-500/10 p-6 shadow-zyfi-glow">
    //             <div className="flex items-center gap-2 mb-2">
    //                 <svg
    //                     className="w-5 h-5 text-red-400"
    //                     fill="none"
    //                     stroke="currentColor"
    //                     viewBox="0 0 24 24"
    //                 >
    //                     <path
    //                         strokeLinecap="round"
    //                         strokeLinejoin="round"
    //                         strokeWidth={2}
    //                         d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    //                     />
    //                 </svg>
    //                 <h2 className="text-lg font-semibold text-red-300">
    //                     Unsupported Network
    //                 </h2>
    //             </div>
    //             <p className="text-sm text-red-400">
    //                 Please switch to Base Sepolia or Ethereum Sepolia
    //             </p>
    //         </div>
    //     );
    // }

    const copyToClipboard = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    return (
        <div className="rounded-zyfi-lg border border-zyfi-border bg-zyfi-bg-secondary p-6 shadow-zyfi-glow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <svg
                        className="w-5 h-5 text-zyfi-accent-blue"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <h2 className="text-lg font-semibold gradient--primary">
                        Deployed Contracts
                    </h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-zyfi-accent-blue/20 text-zyfi-accent-light border border-zyfi-accent-blue/50 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-zyfi-accent-bright rounded-full animate-pulse"></div>
                    {networkInfo.name}
                </div>
            </div>

            <p className="text-sm text-slate-300 mb-4">
                Pre-deployed ERC-8004 contracts on {networkInfo.name}
            </p>

            <div className="space-y-3">
                {contracts.map((contract) => (
                    <div
                        key={contract.address}
                        className="border border-zyfi-border rounded-zyfi p-4 hover:border-zyfi-accent-blue/50 transition-colors bg-zyfi-bg/50"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-mono text-sm font-semibold text-slate-100">
                                        {contract.name}
                                    </h3>
                                    {contract.name === "Groth16Verifier" && (
                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/50 text-xs font-medium rounded-full">
                                            ZK
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mb-2">
                                    {contract.description}
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs bg-zyfi-bg text-slate-300 px-2 py-1 rounded font-mono border border-zyfi-border">
                                        {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(contract.address)}
                                        className="p-1 hover:bg-zyfi-border rounded transition-colors"
                                        title="Copy address"
                                    >
                                        {copiedAddress === contract.address ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-slate-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <a
                                href={contract.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zyfi-accent-bright bg-zyfi-accent-blue/20 hover:bg-zyfi-accent-blue/30 border border-zyfi-accent-blue/50 rounded-zyfi transition-colors"
                            >
                                View
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        {/* <div className="text-xs text-slate-400 font-mono break-all bg-zyfi-bg p-2 rounded border border-zyfi-border">
                            {contract.address}
                        </div> */}
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-zyfi-border">
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Chain ID: {networkInfo.chainId}</span>
                    <a
                        href={networkInfo.explorer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-zyfi-accent-bright hover:text-zyfi-accent-light font-medium"
                    >
                        Open Explorer
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </div>
    );
}
