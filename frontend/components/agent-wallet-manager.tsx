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
                return "bg-zyfi-accent-blue hover:bg-zyfi-accent-light text-white border-zyfi-accent-blue/50";
            case "validator":
                return "bg-green-600 hover:bg-green-500 text-white border-green-500/50";
            case "client":
                return "bg-purple-600 hover:bg-purple-500 text-white border-purple-500/50";
        }
    };

    const isCurrentlyConnected = (role: AgentRole) => {
        return agents[role].address === connectedAddress;
    };

    const assignedCount = Object.values(agents).filter(a => a.address).length;

    return (
        <div className="bg-zyfi-bg-secondary rounded-zyfi-lg shadow-zyfi-glow border border-zyfi-border p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold gradient--primary mb-2">
                    Agent Wallet Configuration
                </h2>
                <p className="text-slate-300 mb-3">
                    Assign wallet addresses to each agent role. Switch wallets in MetaMask to set different agents.
                </p>
                <div className="bg-zyfi-accent-blue/20 border border-zyfi-accent-blue/50 rounded-zyfi p-3">
                    <p className="text-sm text-zyfi-accent-light font-medium">
                        💡 Currently connected: <span className="font-mono text-slate-100">{connectedAddress.slice(0, 10)}...{connectedAddress.slice(-8)}</span>
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
                            className={`p-4 rounded-zyfi-lg border-2 transition-all ${isSet
                                ? color === "blue" ? "border-zyfi-accent-blue bg-zyfi-accent-blue/10" :
                                    color === "green" ? "border-green-500 bg-green-500/10" :
                                        "border-purple-500 bg-purple-500/10"
                                : "border-zyfi-border bg-zyfi-bg"
                                } ${isCurrent ? "ring-2 ring-zyfi-accent-bright" : ""}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <span className="text-2xl">{getAgentIcon(role)}</span>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-100 capitalize">
                                            {role} Agent
                                        </h3>
                                        {agent.address ? (
                                            <p className="text-xs text-slate-300 font-mono">
                                                {agent.address.slice(0, 10)}...{agent.address.slice(-8)}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-slate-400">Not assigned</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSet && (
                                        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${color === "blue" ? "bg-zyfi-accent-blue/20 text-zyfi-accent-light border-zyfi-accent-blue/50" :
                                            color === "green" ? "bg-green-500/20 text-green-300 border-green-500/50" :
                                                "bg-purple-500/20 text-purple-300 border-purple-500/50"
                                            }`}>
                                            ✓ Set
                                        </div>
                                    )}
                                    {isSet ? (
                                        <button
                                            onClick={() => handleClearAgent(role)}
                                            className="px-3 py-1 bg-zyfi-bg hover:bg-zyfi-border border border-zyfi-border text-slate-300 text-xs font-medium rounded-zyfi transition-colors"
                                        >
                                            Clear
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleSetAgent(role)}
                                            className={`px-4 py-2 ${getButtonColors(role)} border text-sm font-semibold rounded-zyfi transition-all shadow-sm hover:shadow-zyfi-glow`}
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

            <div className="bg-amber-500/20 border border-amber-500/50 rounded-zyfi p-4 mb-6">
                <p className="text-sm text-amber-200">
                    <strong>💡 Tip:</strong> You can use the same wallet for multiple roles, or switch wallets in MetaMask to assign different addresses.
                </p>
            </div>

            <div className="pt-4 border-t border-zyfi-border">
                <button
                    onClick={handleContinue}
                    disabled={!allAgentsSet}
                    className="w-full px-6 py-3 bg-gradient-zyfi-quaternary text-white font-semibold rounded-zyfi shadow-zyfi-glow hover:shadow-zyfi-glow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-zyfi-accent-bright/30"
                >
                    {allAgentsSet ? "Continue to Workflow ➜" : `Assign All Agents to Continue (${assignedCount}/3)`}
                </button>
            </div>
        </div>
    );
}
