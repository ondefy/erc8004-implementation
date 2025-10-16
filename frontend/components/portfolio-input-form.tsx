"use client";

import { useState } from "react";
import { PortfolioInput, validatePortfolioInput } from "@/lib/proof-generator";
import { Plus, Trash2, AlertCircle } from "lucide-react";

interface PortfolioInputFormProps {
  onSubmit: (data: PortfolioInput) => void;
  onCancel?: () => void;
}

interface Asset {
  oldBalance: string;
  newBalance: string;
  price: string;
}

export function PortfolioInputForm({ onSubmit, onCancel }: PortfolioInputFormProps) {
  const [assets, setAssets] = useState<Asset[]>([
    { oldBalance: "1000", newBalance: "1350", price: "100" },
    { oldBalance: "1000", newBalance: "1300", price: "100" },
    { oldBalance: "1000", newBalance: "725", price: "100" },
    { oldBalance: "750", newBalance: "375", price: "100" },
  ]);
  const [minAllocationPct, setMinAllocationPct] = useState("10");
  const [maxAllocationPct, setMaxAllocationPct] = useState("40");
  const [error, setError] = useState<string | null>(null);

  const handleAddAsset = () => {
    setAssets([...assets, { oldBalance: "", newBalance: "", price: "" }]);
  };

  const handleRemoveAsset = (index: number) => {
    if (assets.length > 2) {
      setAssets(assets.filter((_, i) => i !== index));
    }
  };

  const handleAssetChange = (
    index: number,
    field: keyof Asset,
    value: string
  ) => {
    const newAssets = [...assets];
    newAssets[index][field] = value;
    setAssets(newAssets);
  };

  const handleSubmit = () => {
    setError(null);

    const input: PortfolioInput = {
      oldBalances: assets.map((a) => a.oldBalance),
      newBalances: assets.map((a) => a.newBalance),
      prices: assets.map((a) => a.price),
      minAllocationPct,
      maxAllocationPct,
    };

    const validation = validatePortfolioInput(input);
    if (!validation.valid) {
      setError(validation.error || "Invalid input");
      return;
    }

    onSubmit(input);
  };

  // Calculate total values for display
  const oldTotal = assets.reduce(
    (sum, a) => sum + (parseFloat(a.oldBalance) || 0) * (parseFloat(a.price) || 0),
    0
  );
  const newTotal = assets.reduce(
    (sum, a) => sum + (parseFloat(a.newBalance) || 0) * (parseFloat(a.price) || 0),
    0
  );

  return (
    <div className="bg-zyfi-bg-secondary rounded-zyfi-lg shadow-zyfi-glow border border-zyfi-border p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold gradient--primary mb-2">
        Portfolio Rebalancing Input
      </h2>
      <p className="text-slate-300 mb-6">
        Enter your portfolio data to generate a zero-knowledge proof of valid rebalancing
      </p>

      {/* Error display */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-zyfi p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-300 text-sm font-medium">Validation Error</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Assets input */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">
            Portfolio Assets
          </h3>
          <button
            onClick={handleAddAsset}
            className="flex items-center gap-2 px-3 py-1.5 bg-zyfi-accent-blue/20 hover:bg-zyfi-accent-blue/30 border border-zyfi-accent-blue/50 text-zyfi-accent-light rounded-zyfi text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>

        <div className="space-y-3">
          {assets.map((asset, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr,1fr,1fr,auto] gap-3 items-start p-4 bg-zyfi-bg border border-zyfi-border rounded-zyfi"
            >
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Old Balance
                </label>
                <input
                  type="number"
                  value={asset.oldBalance}
                  onChange={(e) =>
                    handleAssetChange(index, "oldBalance", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-zyfi-bg-secondary border border-zyfi-border rounded-zyfi text-slate-100 text-sm focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  New Balance
                </label>
                <input
                  type="number"
                  value={asset.newBalance}
                  onChange={(e) =>
                    handleAssetChange(index, "newBalance", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-zyfi-bg-secondary border border-zyfi-border rounded-zyfi text-slate-100 text-sm focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
                  placeholder="1350"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Price
                </label>
                <input
                  type="number"
                  value={asset.price}
                  onChange={(e) =>
                    handleAssetChange(index, "price", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-zyfi-bg-secondary border border-zyfi-border rounded-zyfi text-slate-100 text-sm focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
                  placeholder="100"
                />
              </div>
              <div className="pt-6">
                <button
                  onClick={() => handleRemoveAsset(index)}
                  disabled={assets.length <= 2}
                  className="p-2 hover:bg-red-500/20 border border-zyfi-border hover:border-red-500/50 rounded-zyfi transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={assets.length <= 2 ? "Minimum 2 assets required" : "Remove asset"}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-zyfi-accent-blue/10 border border-zyfi-accent-blue/30 rounded-zyfi">
          <div>
            <p className="text-xs font-medium text-slate-400">Old Portfolio Value</p>
            <p className="text-lg font-bold text-slate-100 mt-1">
              {oldTotal.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">New Portfolio Value</p>
            <p className="text-lg font-bold text-slate-100 mt-1">
              {newTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Constraints */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Allocation Constraints
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Min Allocation %
            </label>
            <input
              type="number"
              value={minAllocationPct}
              onChange={(e) => setMinAllocationPct(e.target.value)}
              className="w-full px-4 py-2 bg-zyfi-bg border border-zyfi-border rounded-zyfi text-slate-100 focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
              placeholder="10"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Max Allocation %
            </label>
            <input
              type="number"
              value={maxAllocationPct}
              onChange={(e) => setMaxAllocationPct(e.target.value)}
              className="w-full px-4 py-2 bg-zyfi-bg border border-zyfi-border rounded-zyfi text-slate-100 focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
              placeholder="40"
              min="0"
              max="100"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Each asset allocation must be between {minAllocationPct}% and {maxAllocationPct}% of total portfolio value
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          className="flex-1 px-6 py-3 bg-gradient-zyfi-quaternary text-white font-semibold rounded-zyfi shadow-zyfi-glow hover:shadow-zyfi-glow-lg transition-all duration-200 border border-zyfi-accent-bright/30"
        >
          Continue with This Data
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-zyfi-bg-secondary border border-zyfi-border text-slate-200 font-semibold rounded-zyfi hover:bg-zyfi-border transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
