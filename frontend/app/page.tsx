"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { StepCard } from "@/components/step-card";
import { StatusBadge } from "@/components/status-badge";
import { WalletConnect } from "@/components/wallet-connect";
import { AgentWalletManager } from "@/components/agent-wallet-manager";
import { DeployedContractsPanel } from "@/components/deployed-contracts-panel";
import { PortfolioInputForm } from "@/components/portfolio-input-form";
import { OpportunityInputForm, OpportunityInput } from "@/components/opportunity-input-form";
import { isSupportedNetwork, getNetworkInfo, getContractsForNetwork } from "@/lib/constants";
import { executeWorkflowStep, WorkflowState } from "@/lib/workflow-executor";
import { PortfolioInput } from "@/lib/proof-generator";

type StepStatus = "pending" | "in_progress" | "completed" | "error";

interface Step {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  details?: string;
  proof?: any; // ZK proof data
  publicInputs?: any; // Public signals
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
    title: "Load Opportunity Data",
    description: "Load DeFi opportunity metrics for validation",
    status: "pending",
  },
  {
    id: 2,
    title: "Generate ZK Proof",
    description: "Create zero-knowledge proof of valid rebalancing",
    status: "pending",
  },
  {
    id: 3,
    title: "Submit Proof for Validation",
    description: "Request for validation",
    status: "pending",
  },
  {
    id: 4,
    title: "Validate Proof",
    description: "Verify proof on-chain",
    status: "pending",
  },
  {
    id: 5,
    title: "Submit Validation",
    description: "Record validation result",
    status: "pending",
  },
  {
    id: 6,
    title: "Select Client for Feedback",
    description: "Rebalancer selects which client to authorize",
    status: "pending",
  },
  {
    id: 7,
    title: "Authorize Feedback",
    description: "Grant selected client permission to provide feedback",
    status: "pending",
  },
  {
    id: 8,
    title: "Client Feedback",
    description: "Client evaluates and rates the service",
    status: "pending",
  },
  {
    id: 9,
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
  const { data: walletClient } = useWalletClient();
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [inputData, setInputData] = useState<any>(null);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [showAgentSetup, setShowAgentSetup] = useState(true);
  const [selectedClientAddress, setSelectedClientAddress] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowState>({});
  const [mounted, setMounted] = useState(false);
  const [waitingForWalletSwitch, setWaitingForWalletSwitch] = useState<{
    stepId: number;
    requiredAddress: string;
    role: string;
  } | null>(null);
  const [waitingForAgentId, setWaitingForAgentId] = useState<{
    stepId: number;
    role: "rebalancer" | "validator" | "client";
    message: string;
  } | null>(null);
  const [manualAgentId, setManualAgentId] = useState("");
  const [showInputForm, setShowInputForm] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioInput | null>(null);
  const [opportunityData, setOpportunityData] = useState<OpportunityInput | null>(null);
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [inputMode, setInputMode] = useState<"Rebalancing" | "Math">("Rebalancing");

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-resume workflow when wallet is switched to the correct one
  useEffect(() => {
    if (
      waitingForWalletSwitch &&
      connectedAddress &&
      connectedAddress.toLowerCase() === waitingForWalletSwitch.requiredAddress.toLowerCase() &&
      !isRunning
    ) {
      console.log("Correct wallet connected! Auto-resuming workflow from step", waitingForWalletSwitch.stepId);
      const resumeFromStep = waitingForWalletSwitch.stepId;
      setWaitingForWalletSwitch(null);
      // Auto-resume the workflow from the specific step
      setTimeout(() => resumeWorkflowFromStep(resumeFromStep), 500);
    }
  }, [connectedAddress, waitingForWalletSwitch, isRunning]);

  const isCorrectNetwork = isSupportedNetwork(chainId);
  const networkInfo = getNetworkInfo(chainId);
  const contracts = getContractsForNetwork(chainId);

  // Prevent hydration mismatch - show loading until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen bg-zyfi-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zyfi-accent-bright mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </main>
    );
  }

  const updateStepStatus = (stepId: number, status: StepStatus, details?: string, proof?: any, publicInputs?: any) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, details, proof, publicInputs } : step
      )
    );
  };

  // Helper function to get required wallet for each step
  const getRequiredWallet = (stepId: number): { address: string; role: string } | null => {
    if (!agentConfig) return null;

    switch (stepId) {
      case 0: // Register Agents - can be any of the three agents
        return null; // Will check dynamically
      case 3: // Submit Proof for Validation
      case 7: // Authorize Feedback
        return { address: agentConfig.rebalancer, role: "Rebalancer" };
      case 4: // Validate Proof
      case 5: // Submit Validation
        return { address: agentConfig.validator, role: "Validator" };
      case 8: // Client Feedback
        return { address: agentConfig.client, role: "Client" };
      default:
        return null; // No wallet required (simulated steps)
    }
  };

  const resumeWorkflowFromStep = async (startFromStep: number) => {
    if (!agentConfig || !contracts || !connectedAddress) {
      return;
    }

    setIsRunning(true);
    console.log(`Resuming workflow from step ${startFromStep}`);

    // Use local state that accumulates across steps
    let currentWorkflowState = { ...workflowState };

    try {
      for (let i = startFromStep; i < steps.length; i++) {
        currentWorkflowState = await executeStep(i, currentWorkflowState);
      }
    } catch (error) {
      console.error("Workflow error during resume:", error);
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  };

  const executeStep = async (i: number, currentState: WorkflowState): Promise<WorkflowState> => {
    setCurrentStep(i);
    updateStepStatus(i, "in_progress");

    // Handle input step (step 1) - show form if custom input is enabled
    if (i === 1 && useCustomInput) {
      const hasInputData = inputMode === "Rebalancing" ? opportunityData : portfolioData;
      if (!hasInputData) {
        setShowInputForm(true);
        // Wait for user to submit the form
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            const currentData = inputMode === "Rebalancing" ? opportunityData : portfolioData;
            if (currentData) {
              clearInterval(checkInterval);
              setShowInputForm(false);
              resolve();
            }
          }, 500);
        });
      }
    }

    // Handle client selection step (step 6)
    if (i === 6) {
      const clientChoice = await new Promise<string | null>((resolve) => {
        const choice = confirm(
          `Select client for feedback authorization:\n\n` +
          `Click OK to use the default Client Agent\n` +
          `Click Cancel to enter a different address`
        );

        if (choice) {
          resolve(agentConfig!.client);
        } else {
          const customAddress = prompt("Enter client address to authorize:");
          resolve(customAddress);
        }
      });

      if (!clientChoice) {
        updateStepStatus(i, "error", "Client selection cancelled");
        throw new Error("Client selection cancelled");
      }

      setSelectedClientAddress(clientChoice);
      updateStepStatus(i, "completed", `Selected client: ${clientChoice}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return currentState; // Return unchanged state
    }

    // Check if correct wallet is connected for this step
    const requiredWallet = getRequiredWallet(i);
    if (requiredWallet && connectedAddress!.toLowerCase() !== requiredWallet.address.toLowerCase()) {
      setWaitingForWalletSwitch({
        stepId: i,
        requiredAddress: requiredWallet.address,
        role: requiredWallet.role,
      });
      updateStepStatus(
        i,
        "error",
        `⚠️ Wrong wallet connected!\n\n` +
        `This step requires: ${requiredWallet.role} wallet\n` +
        `Expected: ${requiredWallet.address}\n` +
        `Current: ${connectedAddress}\n\n` +
        `Please switch to the ${requiredWallet.role} wallet in MetaMask.\n` +
        `The workflow will auto-resume once the correct wallet is connected.`
      );
      throw new Error("Wrong wallet - waiting for switch");
    }

    // Execute step with real blockchain transactions
    console.log(`Executing step ${i} with state:`, currentState);

    let result;
    try {
      result = await executeWorkflowStep({
        stepId: i,
        agents: agentConfig!,
        chainId,
        selectedClient: selectedClientAddress,
        writeContract: writeContractAsync,
        currentAddress: connectedAddress!,
        publicClient,
        walletClient, // Pass wallet client for message signing
        workflowState: currentState, // Use the current accumulated state
        customData: opportunityData || portfolioData, // Pass opportunity or portfolio data
        inputMode, // Pass the input mode so executor knows which type
      });
    } catch (stepError: any) {
      console.error(`Error in step ${i}:`, stepError);
      updateStepStatus(i, "error", `Error: ${stepError.message || "Unknown error occurred"}`);
      throw stepError;
    }

    if (result.requiresWalletSwitch) {
      updateStepStatus(
        i,
        "error",
        `⚠️ Please switch to ${result.requiresWalletSwitch.role} wallet\n\nCurrent: ${result.requiresWalletSwitch.from.slice(0, 10)}...\nRequired: ${result.requiresWalletSwitch.to.slice(0, 10)}...\n\nSwitch wallets in MetaMask and click "Start Workflow" again`
      );
      throw new Error("Wallet switch required");
    }

    if (result.requiresManualAgentId) {
      setWaitingForAgentId({
        stepId: i,
        role: result.requiresManualAgentId.role,
        message: result.requiresManualAgentId.message,
      });
      updateStepStatus(
        i,
        "error",
        `⚠️ Agent ID not found!\n\n${result.error}\n\nPlease enter your ${result.requiresManualAgentId.role} agent ID to continue.`
      );
      throw new Error("Manual agent ID required");
    }

    if (result.success) {
      // For step 2 (Generate ZK Proof), pass proof data to the step card
      if (i === 2 && result.stateUpdate?.proof && result.stateUpdate?.publicInputs) {
        updateStepStatus(i, "completed", result.details, result.stateUpdate.proof, result.stateUpdate.publicInputs);
      } else {
        updateStepStatus(i, "completed", result.details);
      }

      if (result.data) {
        setInputData(result.data);
      }

      // Update workflow state if there are state changes
      let updatedState = currentState;
      if (result.stateUpdate) {
        const update = result.stateUpdate!;
        // Deep merge for nested objects
        updatedState = {
          ...currentState,
          ...update,
        };

        // Handle nested agentIds
        if (update.agentIds) {
          updatedState.agentIds = {
            ...currentState.agentIds,
            ...update.agentIds,
          };
        }

        // Handle nested validationResult
        if (update.validationResult) {
          updatedState.validationResult = {
            ...currentState.validationResult,
            ...update.validationResult,
          };
        }

        console.log(`Step ${i} state update:`, update);
        console.log(`Updated workflow state:`, updatedState);

        // Also update React state for UI
        setWorkflowState(updatedState);
      }

      // Small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return updatedState; // Return updated state for next step
    } else {
      updateStepStatus(i, "error", result.error || "Step failed");
      throw new Error(result.error || "Step failed");
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

    // Use local state that accumulates across steps
    let currentWorkflowState: WorkflowState = {};

    try {
      for (let i = 0; i < steps.length; i++) {
        currentWorkflowState = await executeStep(i, currentWorkflowState);
      }
    } catch (error) {
      console.error("Workflow error:", error);
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  };

  const resetWorkflow = () => {
    setSteps(initialSteps);
    setCurrentStep(null);
    setInputData(null);
    setPortfolioData(null);
    setOpportunityData(null);
    setShowInputForm(false);
  };

  const handleAgentsReady = (agents: AgentConfig) => {
    setAgentConfig(agents);
    setShowAgentSetup(false);
  };

  const handlePortfolioSubmit = (data: PortfolioInput) => {
    console.log("Portfolio data submitted:", data);
    setPortfolioData(data);
    setShowInputForm(false);
  };

  const handleOpportunitySubmit = (data: OpportunityInput) => {
    console.log("Opportunity data submitted:", data);
    setOpportunityData(data);
    setShowInputForm(false);
  };

  const handlePortfolioCancel = () => {
    setShowInputForm(false);
    setUseCustomInput(false);
    setPortfolioData(null);
    setOpportunityData(null);
  };

  const handleManualAgentIdSubmit = () => {
    if (!waitingForAgentId || !manualAgentId) return;

    const agentIdNum = parseInt(manualAgentId);
    if (isNaN(agentIdNum) || agentIdNum <= 0) {
      alert("Please enter a valid positive number for the agent ID");
      return;
    }

    // Update workflow state with the manual agent ID
    setWorkflowState((prev) => ({
      ...prev,
      agentIds: {
        ...prev.agentIds,
        [waitingForAgentId.role]: agentIdNum,
      },
    }));

    // Clear the modal and resume workflow
    const resumeFromStep = waitingForAgentId.stepId;
    setWaitingForAgentId(null);
    setManualAgentId("");

    // Auto-resume the workflow from the specific step
    setTimeout(() => resumeWorkflowFromStep(resumeFromStep), 500);
  };

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progress = (completedSteps / steps.length) * 100;

  // Show network warning if not on a supported network
  if (isConnected && !isCorrectNetwork) {
    return (
      <main className="min-h-screen bg-zyfi-bg">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-zyfi-bg-secondary border-2 border-red-500/50 rounded-zyfi-lg p-8 text-center shadow-zyfi-glow">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-red-400 mb-2">
              Unsupported Network
            </h1>
            <p className="text-slate-300 mb-4">
              Please switch to one of the supported networks in your wallet
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-zyfi-bg border border-zyfi-border rounded-zyfi p-4 text-left text-sm">
                <p className="font-semibold gradient--primary mb-2">Base Sepolia</p>
                <ul className="space-y-1 text-slate-400 text-xs">
                  <li>• <strong className="text-slate-200">Chain ID:</strong> 84532</li>
                  <li>• <strong className="text-slate-200">RPC:</strong> sepolia.base.org</li>
                </ul>
              </div>
              <div className="bg-zyfi-bg border border-zyfi-border rounded-zyfi p-4 text-left text-sm">
                <p className="font-semibold gradient--primary mb-2">Ethereum Sepolia</p>
                <ul className="space-y-1 text-slate-400 text-xs">
                  <li>• <strong className="text-slate-200">Chain ID:</strong> 11155111</li>
                  <li>• <strong className="text-slate-200">RPC:</strong> sepolia.infura.io</li>
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
      <main className="min-h-screen bg-zyfi-bg">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient--primary mb-2">
                ZK Rebalancing Workflow
              </h1>
              <p className="text-slate-300 text-lg">
                Base Sepolia • Zero-Knowledge Portfolio Rebalancing
              </p>
            </div>
            <WalletConnect />
          </div>

          {!isConnected ? (
            <div className="bg-zyfi-bg-secondary border border-zyfi-border rounded-zyfi-lg p-8 text-center shadow-zyfi-glow">
              {/* <div className="text-6xl mb-4">👛</div> */}
              <h2 className="text-2xl font-bold gradient--quaternary mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-slate-300 mb-4">
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
    <main className="min-h-screen bg-zyfi-bg">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient--primary mb-2">
              ZK Rebalancing Workflow
            </h1>
            <p className="text-slate-300 text-lg">
              {networkInfo?.name || "Testnet"} • Zero-Knowledge Portfolio Rebalancing
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAgentSetup(true)}
              className="px-4 py-2 bg-zyfi-bg-secondary hover:bg-zyfi-border border border-zyfi-border text-slate-200 text-sm font-medium rounded-zyfi transition-colors"
            >
              Change Agents
            </button>
            <WalletConnect />
          </div>
        </div>

        {/* Agent Info Banner */}
        <div className="bg-zyfi-bg-secondary rounded-zyfi-lg shadow-zyfi-glow p-4 mb-6 border border-zyfi-border">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm text-slate-300">
              <strong className="text-slate-100">Active Agents:</strong>
            </div>
            {agentConfig && connectedAddress && (
              <>
                <div className={`px-3 py-1 rounded-zyfi text-xs font-mono ${connectedAddress.toLowerCase() === agentConfig.rebalancer.toLowerCase()
                  ? 'bg-zyfi-accent-blue/20 border-2 border-zyfi-accent-blue text-zyfi-accent-light font-semibold shadow-zyfi-glow'
                  : 'bg-zyfi-bg border border-zyfi-accent-blue/30 text-zyfi-accent-blue'
                  }`}>
                  🔄 Rebalancer: {agentConfig.rebalancer.slice(0, 6)}...
                  {agentConfig.rebalancer.slice(-4)}
                  {connectedAddress.toLowerCase() === agentConfig.rebalancer.toLowerCase() && (
                    <span className="ml-2 text-zyfi-accent-bright">✓ Connected</span>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-zyfi text-xs font-mono ${connectedAddress.toLowerCase() === agentConfig.validator.toLowerCase()
                  ? 'bg-green-500/20 border-2 border-green-500 text-green-300 font-semibold shadow-zyfi-glow'
                  : 'bg-zyfi-bg border border-green-500/30 text-green-400'
                  }`}>
                  ✅ Validator: {agentConfig.validator.slice(0, 6)}...
                  {agentConfig.validator.slice(-4)}
                  {connectedAddress.toLowerCase() === agentConfig.validator.toLowerCase() && (
                    <span className="ml-2 text-green-300">✓ Connected</span>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-zyfi text-xs font-mono ${connectedAddress.toLowerCase() === agentConfig.client.toLowerCase()
                  ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-300 font-semibold shadow-zyfi-glow'
                  : 'bg-zyfi-bg border border-purple-500/30 text-purple-400'
                  }`}>
                  👤 Client: {agentConfig.client.slice(0, 6)}...
                  {agentConfig.client.slice(-4)}
                  {connectedAddress.toLowerCase() === agentConfig.client.toLowerCase() && (
                    <span className="ml-2 text-purple-300">✓ Connected</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Current wallet indicator */}
          {connectedAddress && agentConfig && (
            <div className="mt-3 pt-3 border-t border-zyfi-border">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Currently connected:</span>
                <span className="font-mono font-semibold text-slate-100">
                  {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                </span>
                {connectedAddress.toLowerCase() !== agentConfig.rebalancer.toLowerCase() &&
                  connectedAddress.toLowerCase() !== agentConfig.validator.toLowerCase() &&
                  connectedAddress.toLowerCase() !== agentConfig.client.toLowerCase() && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 rounded text-xs font-medium">
                      ⚠️ Not a designated agent
                    </span>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="bg-zyfi-bg-secondary rounded-zyfi-lg shadow-zyfi-glow p-6 mb-6 border border-zyfi-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-200">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-slate-200">
              {completedSteps} / {steps.length} steps
            </span>
          </div>
          <div className="w-full bg-zyfi-bg rounded-full h-3 overflow-hidden border border-zyfi-border">
            <div
              className="bg-gradient-zyfi-quaternary h-full transition-all duration-500 ease-out shadow-zyfi-glow-lg"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {isRunning ? "Workflow in progress..." : completedSteps === steps.length ? "✓ Workflow completed!" : "Ready to start"}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="mb-8">
          <div className="flex gap-4 mb-3">
            <button
              onClick={runWorkflow}
              disabled={isRunning}
              className="px-6 py-3 bg-gradient-zyfi-quaternary text-white font-semibold rounded-zyfi shadow-zyfi-glow hover:shadow-zyfi-glow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 border border-zyfi-accent-bright/30"
            >
              {isRunning ? "Running..." : "▶ Start Workflow"}
            </button>
            <button
              onClick={resetWorkflow}
              disabled={isRunning}
              className="px-6 py-3 bg-zyfi-bg-secondary border border-zyfi-border text-slate-200 font-semibold rounded-zyfi shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-zyfi-border"
            >
              ↻ Reset
            </button>
            <button
              onClick={() => {
                setUseCustomInput(!useCustomInput);
                if (!useCustomInput) {
                  setShowInputForm(true);
                } else {
                  setPortfolioData(null);
                  setOpportunityData(null);
                }
              }}
              disabled={isRunning}
              className={`px-6 py-3 border font-semibold rounded-zyfi shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${useCustomInput
                ? 'bg-zyfi-accent-blue/20 border-zyfi-accent-blue text-zyfi-accent-light shadow-zyfi-glow'
                : 'bg-zyfi-bg-secondary border-zyfi-border text-slate-200 hover:bg-zyfi-border'
                }`}
            >
              {useCustomInput ? "✓ Using Custom Input" : "📝 Enter Custom Input"}
            </button>
            <button
              onClick={() => setInputMode(inputMode === "Rebalancing" ? "Math" : "Rebalancing")}
              disabled={true}
              className="px-6 py-3 bg-zyfi-bg-secondary border border-zyfi-border text-slate-200 font-semibold rounded-zyfi shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-zyfi-border"
            >
              Mode: {inputMode === "Rebalancing" ? "Rebalancing" : "Math"}
            </button>
          </div>

          {/* Wallet requirement notice */}
          {agentConfig && connectedAddress && !waitingForWalletSwitch && (
            <div className="flex items-center gap-2 text-sm">
              {connectedAddress.toLowerCase() === agentConfig.rebalancer.toLowerCase() ? (
                <div className="flex items-center gap-2 text-green-400">
                  <span className="text-lg">✓</span>
                  <span>Ready to start! Rebalancer wallet is connected.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-300 bg-amber-500/20 border border-amber-500/50 rounded-zyfi px-3 py-2">
                  <span className="text-lg">⚠️</span>
                  <span>
                    To start the workflow, please connect with the <strong>Rebalancer</strong> wallet ({agentConfig.rebalancer.slice(0, 6)}...{agentConfig.rebalancer.slice(-4)})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Waiting for wallet switch banner */}
          {waitingForWalletSwitch && (
            <div className="flex items-center gap-3 text-sm bg-zyfi-accent-blue/20 border-2 border-zyfi-accent-blue rounded-zyfi px-4 py-3 animate-pulse shadow-zyfi-glow">
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zyfi-accent-bright"></div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-zyfi-accent-light">
                  Waiting for {waitingForWalletSwitch.role} wallet...
                </p>
                <p className="text-slate-300 text-xs mt-1">
                  Please switch to: {waitingForWalletSwitch.requiredAddress.slice(0, 10)}...{waitingForWalletSwitch.requiredAddress.slice(-6)}
                </p>
                <p className="text-zyfi-accent-bright text-xs mt-1">
                  ✨ Workflow will auto-resume when correct wallet is connected
                </p>
              </div>
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
              <div className="bg-zyfi-bg-secondary rounded-zyfi-lg shadow-zyfi-glow p-6 border border-zyfi-border">
                <h3 className="text-lg font-semibold gradient--primary mb-4">
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

              {/* Deployed Contracts Panel */}
              <DeployedContractsPanel />
            </div>
          </div>
        </div>

        {/* Input Form Modal */}
        {showInputForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              {inputMode === "Rebalancing" ? (
                <OpportunityInputForm
                  onSubmit={handleOpportunitySubmit}
                  onCancel={handlePortfolioCancel}
                />
              ) : (
                <PortfolioInputForm
                  onSubmit={handlePortfolioSubmit}
                  onCancel={handlePortfolioCancel}
                />
              )}
            </div>
          </div>
        )}

        {/* Manual Agent ID Entry Modal */}
        {waitingForAgentId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zyfi-bg-secondary border-2 border-zyfi-accent-blue rounded-zyfi-lg shadow-zyfi-glow-lg max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-zyfi-accent-blue/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-zyfi-accent-bright"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-100">
                    Enter Agent ID
                  </h3>
                  <p className="text-xs text-slate-400">
                    Step {waitingForAgentId.stepId}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-slate-300 mb-4">
                  {waitingForAgentId.message}
                </p>
                <div className="bg-amber-500/10 border border-amber-500/50 rounded-zyfi p-3 mb-4">
                  <p className="text-xs text-amber-200">
                    <strong>💡 Tip:</strong> You can find your agent ID from the transaction receipt when you registered the agent, or check the IdentityRegistry contract on the block explorer.
                  </p>
                </div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  {waitingForAgentId.role.charAt(0).toUpperCase() + waitingForAgentId.role.slice(1)} Agent ID
                </label>
                <input
                  type="number"
                  min="1"
                  value={manualAgentId}
                  onChange={(e) => setManualAgentId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualAgentIdSubmit();
                  }}
                  placeholder="e.g., 1"
                  className="w-full px-4 py-3 bg-zyfi-bg border border-zyfi-border rounded-zyfi text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-zyfi-accent-blue focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setWaitingForAgentId(null);
                    setManualAgentId("");
                  }}
                  className="flex-1 px-4 py-2 bg-zyfi-bg hover:bg-zyfi-border border border-zyfi-border text-slate-300 text-sm font-medium rounded-zyfi transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualAgentIdSubmit}
                  disabled={!manualAgentId}
                  className="flex-1 px-4 py-2 bg-gradient-zyfi-quaternary text-white font-semibold rounded-zyfi shadow-zyfi-glow hover:shadow-zyfi-glow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Continue Workflow ➜
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
