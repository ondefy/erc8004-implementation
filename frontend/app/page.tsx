"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { StepCard } from "@/components/step-card";
import { StatusBadge } from "@/components/status-badge";
import { InputDataPanel } from "@/components/input-data-panel";
import { WalletConnect } from "@/components/wallet-connect";
import { AgentWalletManager } from "@/components/agent-wallet-manager";
import { baseSepolia } from "@/lib/wagmi-config";

type StepStatus = "pending" | "in_progress" | "completed" | "error";

interface Step {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  details?: string;
}

const initialSteps: Step[] = [
  {
    id: 0,
    title: "Deploy Contracts",
    description: "Contracts already deployed on Base Sepolia",
    status: "pending",
  },
  {
    id: 1,
    title: "Initialize Agents",
    description: "Create Rebalancer, Validator, and Client agents",
    status: "pending",
  },
  {
    id: 2,
    title: "Fund Agents",
    description: "Transfer ETH to agent wallets (requires testnet ETH)",
    status: "pending",
  },
  {
    id: 3,
    title: "Register Agents",
    description: "Register all agents on-chain",
    status: "pending",
  },
  {
    id: 4,
    title: "Load Input Data",
    description: "Load portfolio balances and constraints",
    status: "pending",
  },
  {
    id: 5,
    title: "Create Rebalancing Plan",
    description: "Generate new allocation strategy",
    status: "pending",
  },
  {
    id: 6,
    title: "Generate ZK Proof",
    description: "Create zero-knowledge proof of valid rebalancing",
    status: "pending",
  },
  {
    id: 7,
    title: "Submit for Validation",
    description: "Send proof to validator agent",
    status: "pending",
  },
  {
    id: 8,
    title: "Validate Proof",
    description: "Verify proof on-chain",
    status: "pending",
  },
  {
    id: 9,
    title: "Submit Validation",
    description: "Record validation result",
    status: "pending",
  },
  {
    id: 10,
    title: "Authorize Feedback",
    description: "Grant client permission to provide feedback",
    status: "pending",
  },
  {
    id: 11,
    title: "Client Feedback",
    description: "Client evaluates and rates the service",
    status: "pending",
  },
  {
    id: 12,
    title: "Check Reputation",
    description: "View rebalancer's updated reputation",
    status: "pending",
  },
];

interface AgentConfig {
  rebalancer: { address: string; privateKey: string };
  validator: { address: string; privateKey: string };
  client: { address: string; privateKey: string };
}

export default function Home() {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [inputData, setInputData] = useState<any>(null);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [showAgentSetup, setShowAgentSetup] = useState(true);

  const isCorrectNetwork = chainId === baseSepolia.id;

  const updateStepStatus = (stepId: number, status: StepStatus, details?: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, details } : step
      )
    );
  };

  const runWorkflow = async () => {
    if (!agentConfig) {
      alert("Please configure agent wallets first");
      return;
    }

    setIsRunning(true);
    setSteps(initialSteps);

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        updateStepStatus(i, "in_progress");

        const response = await fetch("/api/workflow/execute-step-sepolia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId: i,
            agents: agentConfig,
          }),
        });

        const result = await response.json();

        if (result.success) {
          updateStepStatus(i, "completed", result.details);
          if (result.data) {
            setInputData(result.data);
          }
        } else {
          updateStepStatus(i, "error", result.error);
          break;
        }

        // Small delay for better UX
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Workflow error:", error);
      if (currentStep !== null) {
        updateStepStatus(currentStep, "error", "Failed to execute step");
      }
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  };

  const resetWorkflow = () => {
    setSteps(initialSteps);
    setCurrentStep(null);
    setInputData(null);
  };

  const handleAgentsReady = (agents: AgentConfig) => {
    setAgentConfig(agents);
    setShowAgentSetup(false);
  };

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progress = (completedSteps / steps.length) * 100;

  // Show network warning if not on Base Sepolia
  if (isConnected && !isCorrectNetwork) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-red-900 mb-2">
              Wrong Network Detected
            </h1>
            <p className="text-red-700 mb-4">
              Please switch to <strong>Base Sepolia</strong> network in your wallet
            </p>
            <div className="bg-white rounded-lg p-4 text-left text-sm">
              <p className="font-semibold text-slate-900 mb-2">Network Details:</p>
              <ul className="space-y-1 text-slate-700">
                <li>• <strong>Network Name:</strong> Base Sepolia</li>
                <li>• <strong>Chain ID:</strong> {baseSepolia.id}</li>
                <li>• <strong>RPC URL:</strong> {baseSepolia.rpcUrls.default.http[0]}</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show agent setup if not configured
  if (showAgentSetup && (!agentConfig || !isConnected)) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                ZK Rebalancing Workflow
              </h1>
              <p className="text-slate-600 text-lg">
                Base Sepolia • Zero-Knowledge Portfolio Rebalancing
              </p>
            </div>
            <WalletConnect />
          </div>

          {!isConnected ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">👛</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-slate-600 mb-4">
                Connect your wallet to get started with the ZK rebalancing workflow
              </p>
              <div className="flex justify-center">
                <WalletConnect />
              </div>
            </div>
          ) : (
            <AgentWalletManager onAgentsReady={handleAgentsReady} />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              ZK Rebalancing Workflow
            </h1>
            <p className="text-slate-600 text-lg">
              Base Sepolia • Zero-Knowledge Portfolio Rebalancing
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAgentSetup(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              Change Agents
            </button>
            <WalletConnect />
          </div>
        </div>

        {/* Agent Info Banner */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-700">
              <strong>Active Agents:</strong>
            </div>
            {agentConfig && (
              <>
                <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded text-xs font-mono">
                  🤖 {agentConfig.rebalancer.address.slice(0, 6)}...
                  {agentConfig.rebalancer.address.slice(-4)}
                </div>
                <div className="px-3 py-1 bg-green-50 border border-green-200 rounded text-xs font-mono">
                  ✅ {agentConfig.validator.address.slice(0, 6)}...
                  {agentConfig.validator.address.slice(-4)}
                </div>
                <div className="px-3 py-1 bg-purple-50 border border-purple-200 rounded text-xs font-mono">
                  👤 {agentConfig.client.address.slice(0, 6)}...
                  {agentConfig.client.address.slice(-4)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-slate-700">
              {completedSteps} / {steps.length}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
          >
            {isRunning ? "Running..." : "▶ Start Workflow"}
          </button>
          <button
            onClick={resetWorkflow}
            disabled={isRunning}
            className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-slate-200"
          >
            ↻ Reset
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Steps List */}
          <div className="lg:col-span-2 space-y-3">
            {steps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                isActive={currentStep === step.id}
              />
            ))}
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Status Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Status Summary
                </h3>
                <div className="space-y-3">
                  <StatusBadge
                    label="Completed"
                    count={steps.filter((s) => s.status === "completed").length}
                    color="green"
                  />
                  <StatusBadge
                    label="In Progress"
                    count={
                      steps.filter((s) => s.status === "in_progress").length
                    }
                    color="blue"
                  />
                  <StatusBadge
                    label="Pending"
                    count={steps.filter((s) => s.status === "pending").length}
                    color="slate"
                  />
                  <StatusBadge
                    label="Errors"
                    count={steps.filter((s) => s.status === "error").length}
                    color="red"
                  />
                </div>
              </div>

              {/* Input Data Panel */}
              {inputData && <InputDataPanel data={inputData} />}

              {/* Network Info Panel */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  🌐 Network
                </h3>
                <p className="text-sm text-blue-800 mb-2 font-medium">
                  Base Sepolia Testnet
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  All transactions are executed on Base Sepolia. You'll need
                  testnet ETH to fund the agents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
