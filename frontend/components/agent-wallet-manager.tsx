"use client";

import { useState } from "react";

export type AgentRole = "rebalancer" | "validator" | "client";

interface AgentWallet {
    role: AgentRole;
    address: string | null;
}

interface AgentWalletManagerProps {
    onAgentsReady: (agents: {
        rebalancer: string;
        validator: string;
        client: string;
    }) => void;
    connectedAddress: string;
}

export function AgentWalletManager({ onAgentsReady, connectedAddress }: AgentWalletManagerProps) {
    const [agents, setAgents] = useState<Record<AgentRole, AgentWallet>>({
        rebalancer: { role: "rebalancer", address: null },
        validator: { role: "validator", address: null },
        client: { role: "client", address: null },
    });

    const handleSetAgent = (role: AgentRole) => {
        setAgents((prev) => ({
            ...prev,
            [role]: {
                ...prev[role],
                address: connectedAddress,
            },
        }));
    };

    const handleClearAgent = (role: AgentRole) => {
        setAgents((prev) => ({
            ...prev,
            [role]: {
                ...prev[role],
                address: null,
            },
        }));
    };

    const allAgentsSet = Object.values(agents).every((agent) => agent.address !== null);

    const handleContinue = () => {
        if (allAgentsSet) {
            onAgentsReady({
                rebalancer: agents.rebalancer.address!,
                validator: agents.validator.address!,
                client: agents.client.address!,
            });
        }
    };

    const getAgentIcon = (role: AgentRole) => {
        switch (role) {
            case "rebalancer":
                return "🔄";
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

    const getButtonColors = (role: AgentRole) => {
        switch (role) {
            case "rebalancer":
                return "bg-blue-600 hover:bg-blue-700";
            case "validator":
                return "bg-green-600 hover:bg-green-700";
            case "client":
                return "bg-purple-600 hover:bg-purple-700";
        }
    };

    const isCurrentlyConnected = (role: AgentRole) => {
        return agents[role].address === connectedAddress;
    };

    const assignedCount = Object.values(agents).filter(a => a.address).length;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Agent Wallet Configuration
                </h2>
                <p className="text-slate-600 mb-3">
                    Assign wallet addresses to each agent role. Switch wallets in MetaMask to set different agents.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900 font-medium">
                        💡 Currently connected: <span className="font-mono">{connectedAddress.slice(0, 10)}...{connectedAddress.slice(-8)}</span>
                    </p>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                {(Object.keys(agents) as AgentRole[]).map((role) => {
                    const agent = agents[role];
                    const color = getAgentColor(role);
                    const isSet = agent.address !== null;
                    const isCurrent = isCurrentlyConnected(role);

                    return (
                        <div
                            key={role}
                            className={`p-4 rounded-lg border-2 transition-all ${isSet
                                ? color === "blue" ? "border-blue-200 bg-blue-50" :
                                    color === "green" ? "border-green-200 bg-green-50" :
                                        "border-purple-200 bg-purple-50"
                                : "border-slate-200 bg-slate-50"
                                } ${isCurrent ? "ring-2 ring-blue-400" : ""}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <span className="text-2xl">{getAgentIcon(role)}</span>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900 capitalize">
                                            {role} Agent
                                        </h3>
                                        {agent.address ? (
                                            <p className="text-xs text-slate-600 font-mono">
                                                {agent.address.slice(0, 10)}...{agent.address.slice(-8)}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-slate-500">Not assigned</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSet && (
                                        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${color === "blue" ? "bg-blue-100 text-blue-800 border-blue-200" :
                                            color === "green" ? "bg-green-100 text-green-800 border-green-200" :
                                                "bg-purple-100 text-purple-800 border-purple-200"
                                            }`}>
                                            ✓ Set
                                        </div>
                                    )}
                                    {isSet ? (
                                        <button
                                            onClick={() => handleClearAgent(role)}
                                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                                        >
                                            Clear
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleSetAgent(role)}
                                            className={`px-4 py-2 ${getButtonColors(role)} text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md`}
                                        >
                                            Set as {role}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-900">
                    <strong>💡 Tip:</strong> You can use the same wallet for multiple roles, or switch wallets in MetaMask to assign different addresses.
                </p>
            </div>

            <div className="pt-4 border-t border-slate-200">
                <button
                    onClick={handleContinue}
                    disabled={!allAgentsSet}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                    {allAgentsSet ? "Continue to Workflow ➜" : `Assign All Agents to Continue (${assignedCount}/3)`}
                </button>
            </div>
        </div>
    );
}
