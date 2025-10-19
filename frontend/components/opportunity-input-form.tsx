"use client";

import { useState } from "react";
import { AlertCircle, Info, X } from "lucide-react";

export interface OpportunityInput {
  liquidity: number;           // Pool liquidity in dollars
  zyfiTvl: number;             // Current ZyFI TVL in dollars
  amount: number;              // Amount to rebalance (in token units)
  poolTvl: number;             // Total pool TVL (in token units)
  newApy: number;              // New APY (as percentage, will be multiplied by 100)
  oldApy: number;              // Old APY (as percentage, will be multiplied by 100)
  apyStable7Days: boolean;     // Is APY stable over 7 days?
  apyStable10Days: boolean;    // Is APY stable over 10 days?
  tvlStable: boolean;          // Is TVL stable?
}

interface OpportunityInputFormProps {
  onSubmit: (data: OpportunityInput) => void;
  onCancel?: () => void;
}

export function OpportunityInputForm({ onSubmit, onCancel }: OpportunityInputFormProps) {
  // Initialize with example data from rebalancer-input.json
  const [liquidity, setLiquidity] = useState("1000000");
  const [zyfiTvl, setZyfiTvl] = useState("50000");
  const [amount, setAmount] = useState("100000000");
  const [poolTvl, setPoolTvl] = useState("500000000");
  const [newApy, setNewApy] = useState("6.00");
  const [oldApy, setOldApy] = useState("4.50");
  const [apyStable7Days, setApyStable7Days] = useState(true);
  const [apyStable10Days, setApyStable10Days] = useState(true);
  const [tvlStable, setTvlStable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);

    // Validate inputs
    const liquidityNum = parseFloat(liquidity);
    const zyfiTvlNum = parseFloat(zyfiTvl);
    const amountNum = parseFloat(amount);
    const poolTvlNum = parseFloat(poolTvl);
    const newApyNum = parseFloat(newApy);
    const oldApyNum = parseFloat(oldApy);

    if (isNaN(liquidityNum) || liquidityNum <= 0) {
      setError("Liquidity must be a positive number");
      return;
    }

    if (isNaN(zyfiTvlNum) || zyfiTvlNum < 0) {
      setError("ZyFI TVL must be a non-negative number");
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    if (isNaN(poolTvlNum) || poolTvlNum <= 0) {
      setError("Pool TVL must be a positive number");
      return;
    }

    if (isNaN(newApyNum) || newApyNum < 0) {
      setError("New APY must be a non-negative number");
      return;
    }

    if (isNaN(oldApyNum) || oldApyNum < 0) {
      setError("Old APY must be a non-negative number");
      return;
    }

    const input: OpportunityInput = {
      liquidity: Math.floor(liquidityNum),
      zyfiTvl: Math.floor(zyfiTvlNum),
      amount: Math.floor(amountNum),
      poolTvl: Math.floor(poolTvlNum),
      newApy: newApyNum,
      oldApy: oldApyNum,
      apyStable7Days,
      apyStable10Days,
      tvlStable,
    };

    onSubmit(input);
  };

  // Calculate utilization rate
  const utilizationRate = poolTvl !== "0" && poolTvl !== ""
    ? ((parseFloat(amount) / parseFloat(poolTvl)) * 100).toFixed(2)
    : "0.00";

  // Calculate ZyFI utilization
  const zyfiUtilization = liquidity !== "0" && liquidity !== ""
    ? ((parseFloat(zyfiTvl) / parseFloat(liquidity)) * 100).toFixed(2)
    : "0.00";

  // Calculate APY improvement
  const apyImprovement = newApy !== "" && oldApy !== ""
    ? (parseFloat(newApy) - parseFloat(oldApy)).toFixed(2)
    : "0.00";

  return (
    <div className="bg-zyfi-bg-secondary rounded-zyfi-lg shadow-zyfi-glow border border-zyfi-border p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold gradient--primary mb-2">
            DeFi Opportunity Validation Input
          </h2>
          <p className="text-slate-300">
            Enter opportunity data to validate rebalancing decision with zero-knowledge proof
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-shrink-0 ml-4 p-2 hover:bg-zyfi-border rounded-zyfi transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="mb-6 bg-zyfi-accent-blue/10 border border-zyfi-accent-blue/30 rounded-zyfi px-4 py-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-zyfi-accent-light flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-zyfi-accent-light text-sm">
              <strong>ZK Validation Rules:</strong> The circuit validates 5 DeFi constraints:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              <li>1. Liquidity Check: liquidity × 1.05 &gt; zyfiTvl + (amount / 1M)</li>
              <li>2. TVL Constraint: poolTvl × 1M &gt; amount × 4 (max 25% allocation)</li>
              <li>3. APY Performance: newApy &gt; oldApy + 0.1% improvement</li>
              <li>4. APY Stability: At least 7-day OR 10-day stability required</li>
              <li>5. TVL Stability: Must be stable</li>
            </ul>
          </div>
        </div>
      </div>

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

      {/* Pool Metrics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Pool Metrics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Available Liquidity <span className="text-slate-400 text-xs">(USD)</span>
            </label>
            <input
              type="number"
              value={liquidity}
              onChange={(e) => setLiquidity(e.target.value)}
              className="w-full px-4 py-2 bg-zyfi-bg border border-zyfi-border rounded-zyfi text-slate-100 focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
              placeholder="1000000"
              min="0"
            />
            <p className="text-xs text-slate-400 mt-1">
              Total liquidity available in the pool
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current ZyFI TVL <span className="text-slate-400 text-xs">(USD)</span>
            </label>
            <input
              type="number"
              value={zyfiTvl}
              onChange={(e) => setZyfiTvl(e.target.value)}
              className="w-full px-4 py-2 bg-zyfi-bg border border-zyfi-border rounded-zyfi text-slate-100 focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
              placeholder="50000"
              min="0"
            />
            <p className="text-xs text-slate-400 mt-1">
              Current ZyFI total value locked
            </p>
          </div>
        </div>
      </div>

      {/* Rebalancing Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Rebalancing Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Rebalance Amount <span className="text-slate-400 text-xs">(token units)</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 bg-zyfi-bg border border-zyfi-border rounded-zyfi text-slate-100 focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
              placeholder="100000000"
              min="0"
            />
            <p className="text-xs text-slate-400 mt-1">
              Amount to rebalance (e.g., USDC with 6 decimals)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Total Pool TVL <span className="text-slate-400 text-xs">(token units)</span>
            </label>
            <input
              type="number"
              value={poolTvl}
              onChange={(e) => setPoolTvl(e.target.value)}
              className="w-full px-4 py-2 bg-zyfi-bg border border-zyfi-border rounded-zyfi text-slate-100 focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
              placeholder="500000000"
              min="0"
            />
            <p className="text-xs text-slate-400 mt-1">
              Total value locked in the pool
            </p>
          </div>
        </div>

        {/* Utilization display */}
        <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-zyfi-accent-blue/10 border border-zyfi-accent-blue/30 rounded-zyfi">
          <div>
            <p className="text-xs font-medium text-slate-400">Pool Utilization Rate</p>
            <p className="text-lg font-bold text-slate-100 mt-1">
              {utilizationRate}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {parseFloat(utilizationRate) > 25 && (
                <span className="text-amber-400">⚠️ Exceeds 25% limit</span>
              )}
              {parseFloat(utilizationRate) <= 25 && (
                <span className="text-green-400">✓ Within safe limit</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">ZyFI Liquidity Usage</p>
            <p className="text-lg font-bold text-slate-100 mt-1">
              {zyfiUtilization}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ZyFI TVL / Available Liquidity
            </p>
          </div>
        </div>
      </div>

      {/* APY Data */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          APY Performance
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Previous APY <span className="text-slate-400 text-xs">(%)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={oldApy}
              onChange={(e) => setOldApy(e.target.value)}
              className="w-full px-4 py-2 bg-zyfi-bg border border-zyfi-border rounded-zyfi text-slate-100 focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
              placeholder="4.50"
              min="0"
            />
            <p className="text-xs text-slate-400 mt-1">
              Current opportunity APY (e.g., 4.50%)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New APY <span className="text-slate-400 text-xs">(%)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={newApy}
              onChange={(e) => setNewApy(e.target.value)}
              className="w-full px-4 py-2 bg-zyfi-bg border border-zyfi-border rounded-zyfi text-slate-100 focus:outline-none focus:border-zyfi-accent-blue focus:ring-1 focus:ring-zyfi-accent-blue"
              placeholder="6.00"
              min="0"
            />
            <p className="text-xs text-slate-400 mt-1">
              Proposed opportunity APY (e.g., 6.00%)
            </p>
          </div>
        </div>

        {/* APY improvement display */}
        <div className="mt-4 p-4 bg-zyfi-accent-blue/10 border border-zyfi-accent-blue/30 rounded-zyfi">
          <p className="text-xs font-medium text-slate-400">APY Improvement</p>
          <p className="text-lg font-bold text-slate-100 mt-1">
            +{apyImprovement}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {parseFloat(apyImprovement) < 0.1 && (
              <span className="text-amber-400">⚠️ Below 0.1% minimum improvement</span>
            )}
            {parseFloat(apyImprovement) >= 0.1 && (
              <span className="text-green-400">✓ Meets minimum improvement</span>
            )}
          </p>
        </div>
      </div>

      {/* Stability Flags */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Stability Indicators
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-zyfi-bg border border-zyfi-border rounded-zyfi">
            <input
              type="checkbox"
              id="apyStable7Days"
              checked={apyStable7Days}
              onChange={(e) => setApyStable7Days(e.target.checked)}
              className="w-5 h-5 rounded border-zyfi-border bg-zyfi-bg-secondary text-zyfi-accent-blue focus:ring-2 focus:ring-zyfi-accent-blue focus:ring-offset-0"
            />
            <label htmlFor="apyStable7Days" className="flex-1 text-sm text-slate-200 cursor-pointer">
              APY Stable over 7 Days
              <span className="block text-xs text-slate-400 mt-0.5">
                APY has remained relatively stable for the past 7 days
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zyfi-bg border border-zyfi-border rounded-zyfi">
            <input
              type="checkbox"
              id="apyStable10Days"
              checked={apyStable10Days}
              onChange={(e) => setApyStable10Days(e.target.checked)}
              className="w-5 h-5 rounded border-zyfi-border bg-zyfi-bg-secondary text-zyfi-accent-blue focus:ring-2 focus:ring-zyfi-accent-blue focus:ring-offset-0"
            />
            <label htmlFor="apyStable10Days" className="flex-1 text-sm text-slate-200 cursor-pointer">
              APY Stable over 10 Days
              <span className="block text-xs text-slate-400 mt-0.5">
                APY has remained relatively stable for the past 10 days
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zyfi-bg border border-zyfi-border rounded-zyfi">
            <input
              type="checkbox"
              id="tvlStable"
              checked={tvlStable}
              onChange={(e) => setTvlStable(e.target.checked)}
              className="w-5 h-5 rounded border-zyfi-border bg-zyfi-bg-secondary text-zyfi-accent-blue focus:ring-2 focus:ring-zyfi-accent-blue focus:ring-offset-0"
            />
            <label htmlFor="tvlStable" className="flex-1 text-sm text-slate-200 cursor-pointer">
              TVL is Stable
              <span className="block text-xs text-slate-400 mt-0.5">
                Total Value Locked has remained stable (required)
              </span>
            </label>
          </div>

          {!apyStable7Days && !apyStable10Days && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/50 rounded-zyfi">
              <p className="text-xs text-amber-300">
                ⚠️ At least one APY stability period (7-day or 10-day) must be selected
              </p>
            </div>
          )}

          {!tvlStable && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/50 rounded-zyfi">
              <p className="text-xs text-amber-300">
                ⚠️ TVL stability is required for validation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          className="flex-1 px-6 py-3 bg-gradient-zyfi-quaternary text-white font-semibold rounded-zyfi shadow-zyfi-glow hover:shadow-zyfi-glow-lg transition-all duration-200 border border-zyfi-accent-bright/30"
        >
          Continue with This Opportunity
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
