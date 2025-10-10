"use client";

import { useState } from "react";

export type AgentRole = "rebalancer" | "validator" | "client";

interface AgentWallet {
    role: AgentRole;
    address: string | null;
    privateKey: string | null;
    isConnected: boolean;
}

interface AgentWalletManagerProps {
    onAgentsReady: (agents: {
        rebalancer: { address: string; privateKey: string };
        validator: { address: string; privateKey: string };
        client: { address: string; privateKey: string };
    }) => void;
}

export function AgentWalletManager({ onAgentsReady }: AgentWalletManagerProps) {
    const [agents, setAgents] = useState<Record<AgentRole, AgentWallet>>({
        rebalancer: { role: "rebalancer", address: null, privateKey: null, isConnected: false },
        validator: { role: "validator", address: null, privateKey: null, isConnected: false },
        client: { role: "client", address: null, privateKey: null, isConnected: false },
    });

    const [showPrivateKey, setShowPrivateKey] = useState<Record<AgentRole, boolean>>({
        rebalancer: false,
        validator: false,
        client: false,
    });

    const handlePrivateKeyInput = (role: AgentRole, privateKey: string) => {
        try {
            // Validate private key format
            if (!privateKey.startsWith("0x")) {
                privateKey = "0x" + privateKey;
            }

            if (privateKey.length !== 66) {
                return;
            }

            // In a real implementation, derive the address from the private key
            // For now, we'll use a placeholder
            const address = "0x" + privateKey.slice(2, 42);

            setAgents((prev) => ({
                ...prev,
                [role]: {
                    ...prev[role],
                    address,
                    privateKey,
                    isConnected: true,
                },
            }));
        } catch (error) {
            console.error("Invalid private key", error);
        }
    };

    const handleGenerateWallet = async (role: AgentRole) => {
        try {
            // Call API to generate a new wallet
            const response = await fetch("/api/wallet/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            const { address, privateKey } = await response.json();

            setAgents((prev) => ({
                ...prev,
                [role]: {
                    ...prev[role],
                    address,
                    privateKey,
                    isConnected: true,
                },
            }));
        } catch (error) {
            console.error("Failed to generate wallet", error);
        }
    };

    const allAgentsConnected = Object.values(agents).every((agent) => agent.isConnected);

    const handleContinue = () => {
        if (allAgentsConnected) {
            onAgentsReady({
                rebalancer: {
                    address: agents.rebalancer.address!,
                    privateKey: agents.rebalancer.privateKey!,
                },
                validator: {
                    address: agents.validator.address!,
                    privateKey: agents.validator.privateKey!,
                },
                client: {
                    address: agents.client.address!,
                    privateKey: agents.client.privateKey!,
                },
            });
        }
    };

    const getAgentIcon = (role: AgentRole) => {
        switch (role) {
            case "rebalancer":
                return "🤖";
            case "validator":
                return "✅";
            case "client":
                return "👤";
        }
    };

    const getAgentColor = (role: AgentRole) => {
        switch (role) {
            case "rebalancer":
                return "blue";
            case "validator":
                return "green";
            case "client":
                return "purple";
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Agent Wallet Configuration
                </h2>
                <p className="text-slate-600">
                    Set up wallets for the three agents. You can either import existing wallets
                    or generate new ones.
                </p>
            </div>

            <div className="space-y-4 mb-6">
                {(Object.keys(agents) as AgentRole[]).map((role) => {
                    const agent = agents[role];
                    const color = getAgentColor(role);

                    return (
                        <div
                            key={role}
                            className={`p-4 rounded-lg border-2 ${agent.isConnected
                                    ? `border-${color}-200 bg-${color}-50`
                                    : "border-slate-200 bg-slate-50"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{getAgentIcon(role)}</span>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 capitalize">
                                            {role} Agent
                                        </h3>
                                        {agent.address && (
                                            <p className="text-xs text-slate-600 font-mono">
                                                {agent.address.slice(0, 10)}...{agent.address.slice(-8)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {agent.isConnected && (
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-${color}-100 text-${color}-800`}>
                                        Connected
                                    </div>
                                )}
                            </div>

                            {!agent.isConnected && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Private Key
                                        </label>
                                        <input
                                            type={showPrivateKey[role] ? "text" : "password"}
                                            placeholder="0x..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            onChange={(e) => handlePrivateKeyInput(role, e.target.value)}
                                        />
                                        <button
                                            onClick={() =>
                                                setShowPrivateKey((prev) => ({ ...prev, [role]: !prev[role] }))
                                            }
                                            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                                        >
                                            {showPrivateKey[role] ? "Hide" : "Show"}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-px bg-slate-300" />
                                        <span className="text-xs text-slate-500">OR</span>
                                        <div className="flex-1 h-px bg-slate-300" />
                                    </div>

                                    <button
                                        onClick={() => handleGenerateWallet(role)}
                                        className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Generate New Wallet
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-4 border-t border-slate-200">
                <button
                    onClick={handleContinue}
                    disabled={!allAgentsConnected}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                    {allAgentsConnected ? "Continue to Workflow ➜" : "Connect All Agents to Continue"}
                </button>
            </div>
        </div>
    );
}

