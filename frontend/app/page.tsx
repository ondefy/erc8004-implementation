"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useWriteContract, usePublicClient } from "wagmi";
import { StepCard } from "@/components/step-card";
import { StatusBadge } from "@/components/status-badge";
import { InputDataPanel } from "@/components/input-data-panel";
import { WalletConnect } from "@/components/wallet-connect";
import { AgentWalletManager } from "@/components/agent-wallet-manager";
import { isSupportedNetwork, getNetworkInfo, getContractsForNetwork } from "@/lib/constants";
import { executeWorkflowStep, WorkflowState } from "@/lib/workflow-executor";

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
    title: "Register Agents",
    description: "Register Rebalancer, Validator, and Client agents on-chain",
    status: "pending",
  },
  {
    id: 1,
    title: "Load Input Data",
    description: "Load portfolio balances and constraints",
    status: "pending",
  },
  {
    id: 2,
    title: "Create Rebalancing Plan",
    description: "Generate new allocation strategy",
    status: "pending",
  },
  {
    id: 3,
    title: "Generate ZK Proof",
    description: "Create zero-knowledge proof of valid rebalancing",
    status: "pending",
  },
  {
    id: 4,
    title: "Submit for Validation",
    description: "Send proof to validator agent",
    status: "pending",
  },
  {
    id: 5,
    title: "Validate Proof",
    description: "Verify proof on-chain",
    status: "pending",
  },
  {
    id: 6,
    title: "Submit Validation",
    description: "Record validation result",
    status: "pending",
  },
  {
    id: 7,
    title: "Select Client for Feedback",
    description: "Rebalancer selects which client to authorize",
    status: "pending",
  },
  {
    id: 8,
    title: "Authorize Feedback",
    description: "Grant selected client permission to provide feedback",
    status: "pending",
  },
  {
    id: 9,
    title: "Client Feedback",
    description: "Client evaluates and rates the service",
    status: "pending",
  },
  {
    id: 10,
    title: "Check Reputation",
    description: "View rebalancer's updated reputation",
    status: "pending",
  },
];

interface AgentConfig {
  rebalancer: string;
  validator: string;
  client: string;
}

export default function Home() {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [inputData, setInputData] = useState<any>(null);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [showAgentSetup, setShowAgentSetup] = useState(true);
  const [selectedClientAddress, setSelectedClientAddress] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowState>({});
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const isCorrectNetwork = isSupportedNetwork(chainId);
  const networkInfo = getNetworkInfo(chainId);
  const contracts = getContractsForNetwork(chainId);

  // Prevent hydration mismatch - show loading until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </main>
    );
  }

  const updateStepStatus = (stepId: number, status: StepStatus, details?: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, details } : step
      )
    );
  };

  // Helper function to get required wallet for each step
  const getRequiredWallet = (stepId: number): { address: string; role: string } | null => {
    if (!agentConfig) return null;

    switch (stepId) {
      case 0: // Register Agents - can be any of the three agents
        return null; // Will check dynamically
      case 2: // Create Rebalancing Plan
      case 4: // Submit for Validation
      case 8: // Authorize Feedback
        return { address: agentConfig.rebalancer, role: "Rebalancer" };
      case 5: // Validate Proof
      case 6: // Submit Validation
        return { address: agentConfig.validator, role: "Validator" };
      case 9: // Client Feedback
        return { address: agentConfig.client, role: "Client" };
      default:
        return null; // No wallet required (simulated steps)
    }
  };

  const runWorkflow = async () => {
    if (!agentConfig) {
      alert("Please configure agent wallets first");
      return;
    }

    if (!contracts || !connectedAddress) {
      alert("Unsupported network or wallet not connected");
      return;
    }

    // Check if the user is connected with the Rebalancer wallet to start
    if (connectedAddress.toLowerCase() !== agentConfig.rebalancer.toLowerCase()) {
      alert(
        `⚠️ Please connect with the Rebalancer wallet to start the workflow\n\n` +
        `Expected: ${agentConfig.rebalancer}\n` +
        `Current: ${connectedAddress}\n\n` +
        `Switch wallets in MetaMask and try again.`
      );
      return;
    }

    setIsRunning(true);
    setSteps(initialSteps);

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        updateStepStatus(i, "in_progress");

        // Handle client selection step (step 7)
        if (i === 7) {
          const clientChoice = await new Promise<string | null>((resolve) => {
            const choice = confirm(
              `Select client for feedback authorization:\n\n` +
              `Click OK to use the default Client Agent\n` +
              `Click Cancel to enter a different address`
            );

            if (choice) {
              resolve(agentConfig.client);
            } else {
              const customAddress = prompt("Enter client address to authorize:");
              resolve(customAddress);
            }
          });

          if (!clientChoice) {
            updateStepStatus(i, "error", "Client selection cancelled");
            break;
          }

          setSelectedClientAddress(clientChoice);
          updateStepStatus(i, "completed", `Selected client: ${clientChoice.slice(0, 10)}...`);
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        // Check if correct wallet is connected for this step
        const requiredWallet = getRequiredWallet(i);
        if (requiredWallet && connectedAddress.toLowerCase() !== requiredWallet.address.toLowerCase()) {
          updateStepStatus(
            i,
            "error",
            `⚠️ Wrong wallet connected!\n\n` +
            `This step requires: ${requiredWallet.role} wallet\n` +
            `Expected: ${requiredWallet.address}\n` +
            `Current: ${connectedAddress}\n\n` +
            `Please switch to the ${requiredWallet.role} wallet in MetaMask and click "Start Workflow" again to continue from this step.`
          );
          break;
        }

        // Execute step with real blockchain transactions
        const result = await executeWorkflowStep({
          stepId: i,
          agents: agentConfig,
          chainId,
          selectedClient: selectedClientAddress,
          writeContract: writeContractAsync,
          currentAddress: connectedAddress,
          publicClient,
          workflowState,
        });

        if (result.requiresWalletSwitch) {
          updateStepStatus(
            i,
            "error",
            `⚠️ Please switch to ${result.requiresWalletSwitch.role} wallet\n\nCurrent: ${result.requiresWalletSwitch.from.slice(0, 10)}...\nRequired: ${result.requiresWalletSwitch.to.slice(0, 10)}...\n\nSwitch wallets in MetaMask and click "Start Workflow" again`
          );
          break;
        }

        if (result.success) {
          updateStepStatus(i, "completed", result.details);
          if (result.data) {
            setInputData(result.data);
          }
          // Update workflow state if there are state changes
          if (result.stateUpdate) {
            setWorkflowState((prev) => {
              const update = result.stateUpdate!;
              return {
                ...prev,
                ...update,
                // Deep merge for nested objects like agentIds
                ...(update.agentIds && {
                  agentIds: {
                    ...prev.agentIds,
                    ...update.agentIds,
                  },
                }),
              };
            });
          }
          // Small delay for better UX
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          updateStepStatus(i, "error", result.error || "Step failed");
          break;
        }
      }
    } catch (error) {
      console.error("Workflow error:", error);
      if (currentStep !== null) {
        updateStepStatus(
          currentStep,
          "error",
          error instanceof Error ? error.message : "Failed to execute step"
        );
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

  // Show network warning if not on a supported network
  if (isConnected && !isCorrectNetwork) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-red-900 mb-2">
              Unsupported Network
            </h1>
            <p className="text-red-700 mb-4">
              Please switch to one of the supported networks in your wallet
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-white rounded-lg p-4 text-left text-sm">
                <p className="font-semibold text-slate-900 mb-2">Base Sepolia</p>
                <ul className="space-y-1 text-slate-700 text-xs">
                  <li>• <strong>Chain ID:</strong> 84532</li>
                  <li>• <strong>RPC:</strong> sepolia.base.org</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-4 text-left text-sm">
                <p className="font-semibold text-slate-900 mb-2">Ethereum Sepolia</p>
                <ul className="space-y-1 text-slate-700 text-xs">
                  <li>• <strong>Chain ID:</strong> 11155111</li>
                  <li>• <strong>RPC:</strong> sepolia.infura.io</li>
                </ul>
              </div>
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
              {/* <div className="text-6xl mb-4">👛</div> */}
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
            <AgentWalletManager
              onAgentsReady={handleAgentsReady}
              connectedAddress={connectedAddress as string}
            />
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
              {networkInfo?.name || "Testnet"} • Zero-Knowledge Portfolio Rebalancing
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
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm text-slate-700">
              <strong>Active Agents:</strong>
            </div>
            {agentConfig && connectedAddress && (
              <>
                <div className={`px-3 py-1 rounded text-xs font-mono ${connectedAddress.toLowerCase() === agentConfig.rebalancer.toLowerCase()
                  ? 'bg-blue-100 border-2 border-blue-500 text-blue-900 font-semibold'
                  : 'bg-blue-50 border border-blue-200'
                  }`}>
                  🔄 Rebalancer: {agentConfig.rebalancer.slice(0, 6)}...
                  {agentConfig.rebalancer.slice(-4)}
                  {connectedAddress.toLowerCase() === agentConfig.rebalancer.toLowerCase() && (
                    <span className="ml-2 text-blue-600">✓ Connected</span>
                  )}
                </div>
                <div className={`px-3 py-1 rounded text-xs font-mono ${connectedAddress.toLowerCase() === agentConfig.validator.toLowerCase()
                  ? 'bg-green-100 border-2 border-green-500 text-green-900 font-semibold'
                  : 'bg-green-50 border border-green-200'
                  }`}>
                  ✅ Validator: {agentConfig.validator.slice(0, 6)}...
                  {agentConfig.validator.slice(-4)}
                  {connectedAddress.toLowerCase() === agentConfig.validator.toLowerCase() && (
                    <span className="ml-2 text-green-600">✓ Connected</span>
                  )}
                </div>
                <div className={`px-3 py-1 rounded text-xs font-mono ${connectedAddress.toLowerCase() === agentConfig.client.toLowerCase()
                  ? 'bg-purple-100 border-2 border-purple-500 text-purple-900 font-semibold'
                  : 'bg-purple-50 border border-purple-200'
                  }`}>
                  👤 Client: {agentConfig.client.slice(0, 6)}...
                  {agentConfig.client.slice(-4)}
                  {connectedAddress.toLowerCase() === agentConfig.client.toLowerCase() && (
                    <span className="ml-2 text-purple-600">✓ Connected</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Current wallet indicator */}
          {connectedAddress && agentConfig && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600">Currently connected:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                </span>
                {connectedAddress.toLowerCase() !== agentConfig.rebalancer.toLowerCase() &&
                  connectedAddress.toLowerCase() !== agentConfig.validator.toLowerCase() &&
                  connectedAddress.toLowerCase() !== agentConfig.client.toLowerCase() && (
                    <span className="px-2 py-0.5 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-xs font-medium">
                      ⚠️ Not a designated agent
                    </span>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-slate-700">
              {completedSteps} / {steps.length} steps
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {isRunning ? "Workflow in progress..." : completedSteps === steps.length ? "✓ Workflow completed!" : "Ready to start"}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="mb-8">
          <div className="flex gap-4 mb-3">
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

          {/* Wallet requirement notice */}
          {agentConfig && connectedAddress && (
            <div className="flex items-center gap-2 text-sm">
              {connectedAddress.toLowerCase() === agentConfig.rebalancer.toLowerCase() ? (
                <div className="flex items-center gap-2 text-green-700">
                  <span className="text-lg">✓</span>
                  <span>Ready to start! Rebalancer wallet is connected.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-lg">⚠️</span>
                  <span>
                    To start the workflow, please connect with the <strong>Rebalancer</strong> wallet ({agentConfig.rebalancer.slice(0, 6)}...{agentConfig.rebalancer.slice(-4)})
                  </span>
                </div>
              )}
            </div>
          )}
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
                  {networkInfo?.name || "Testnet"}
                </p>
                <p className="text-xs text-blue-700 leading-relaxed mb-2">
                  Using pre-deployed contracts on {networkInfo?.name}
                </p>
                {contracts && (
                  <div className="text-xs text-blue-600 font-mono">
                    <div className="truncate">Identity: {contracts.identityRegistry.slice(0, 10)}...</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
