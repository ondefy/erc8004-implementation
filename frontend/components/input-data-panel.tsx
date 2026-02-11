interface InputDataPanelProps {
    data: {
        liquidity?: number;
        zyfiTvl?: number;
        amount?: number;
        poolTvl?: number;
        newApy?: number;
        oldApy?: number;
        apyStable7Days?: number;
        tvlStable?: number;
        supportsCurrentPool?: number;
    };
}

export function InputDataPanel({ data }: InputDataPanelProps) {
    if (!data) return null;

    return (
        <div className="bg-zyfi-bg-secondary rounded-zyfi-lg shadow-zyfi-glow p-6 border border-zyfi-border">
            <h3 className="text-lg font-semibold gradient--primary mb-4">
                Input Data
            </h3>
            <div className="space-y-3">
                {data.liquidity !== undefined && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            Liquidity
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                            ${data.liquidity.toLocaleString()}
                        </p>
                    </div>
                )}
                {data.zyfiTvl !== undefined && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            ZyFI TVL
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                            ${data.zyfiTvl.toLocaleString()}
                        </p>
                    </div>
                )}
                {data.amount !== undefined && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            Amount
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                            {data.amount.toLocaleString()}
                        </p>
                    </div>
                )}
                {data.newApy !== undefined && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            New APY
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                            {(data.newApy / 10000).toFixed(4)}%
                        </p>
                    </div>
                )}
                {data.oldApy !== undefined && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            Old APY
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                            {(data.oldApy / 10000).toFixed(4)}%
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
