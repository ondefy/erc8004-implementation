"use client";

import { useState } from "react";
import { StepCard } from "@/components/step-card";
import { StatusBadge } from "@/components/status-badge";
import { InputDataPanel } from "@/components/input-data-panel";

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
    description: "Deploy smart contracts to blockchain",
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
    description: "Transfer ETH to agent wallets",
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

export default function Home() {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [inputData, setInputData] = useState<any>(null);

  const updateStepStatus = (stepId: number, status: StepStatus, details?: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, details } : step
      )
    );
  };

  const runWorkflow = async () => {
    setIsRunning(true);
    setSteps(initialSteps);

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        updateStepStatus(i, "in_progress");

        const response = await fetch("/api/workflow/execute-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stepId: i }),
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

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            ZK Rebalancing Workflow
          </h1>
          <p className="text-slate-600 text-lg">
            Zero-Knowledge proof system for portfolio rebalancing validation
          </p>
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

              {/* Info Panel */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  ℹ️ About
                </h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                  This demo showcases a complete ZK rebalancing workflow using
                  Circom, Groth16 proofs, and ERC-8004 agent validation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
