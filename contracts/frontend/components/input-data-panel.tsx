interface InputDataPanelProps {
    data: {
        oldBalances?: string[];
        newBalances?: string[];
        prices?: string[];
        totalValueCommitment?: string;
        minAllocationPct?: string;
        maxAllocationPct?: string;
    };
}

export function InputDataPanel({ data }: InputDataPanelProps) {
    if (!data) return null;

    const formatNumber = (num: string) => {
        return parseInt(num).toLocaleString();
    };

    return (
        <div className="bg-zyfi-bg-secondary rounded-zyfi-lg shadow-zyfi-glow p-6 border border-zyfi-border">
            <h3 className="text-lg font-semibold gradient--primary mb-4">
                📊 Input Data
            </h3>
            <div className="space-y-3">
                {data.oldBalances && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            Assets
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                            {data.oldBalances.length} Positions
                        </p>
                    </div>
                )}
                {data.totalValueCommitment && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            Total Value
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                            {formatNumber(data.totalValueCommitment)}
                        </p>
                    </div>
                )}
                {data.minAllocationPct && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            Min Allocation
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                            {data.minAllocationPct}%
                        </p>
                    </div>
                )}
                {data.maxAllocationPct && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            Max Allocation
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                            {data.maxAllocationPct}%
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
