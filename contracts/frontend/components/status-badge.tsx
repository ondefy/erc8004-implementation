interface StatusBadgeProps {
    label: string;
    count: number;
    color: "green" | "blue" | "slate" | "red";
}

export function StatusBadge({ label, count, color }: StatusBadgeProps) {
    const getColorStyles = () => {
        switch (color) {
            case "green":
                return "bg-green-500/20 text-green-300 border-green-500/50";
            case "blue":
                return "bg-zyfi-accent-blue/20 text-zyfi-accent-light border-zyfi-accent-blue/50";
            case "red":
                return "bg-red-500/20 text-red-300 border-red-500/50";
            default:
                return "bg-slate-700/30 text-slate-300 border-slate-600/50";
        }
    };

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">{label}</span>
            <span
                className={`px-3 py-1 rounded-full text-sm font-semibold border ${getColorStyles()}`}
            >
                {count}
            </span>
        </div>
    );
}
