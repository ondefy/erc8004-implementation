interface StatusBadgeProps {
    label: string;
    count: number;
    color: "green" | "blue" | "slate" | "red";
}

export function StatusBadge({ label, count, color }: StatusBadgeProps) {
    const getColorStyles = () => {
        switch (color) {
            case "green":
                return "bg-green-100 text-green-800 border-green-200";
            case "blue":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "red":
                return "bg-red-100 text-red-800 border-red-200";
            default:
                return "bg-slate-100 text-slate-800 border-slate-200";
        }
    };

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">{label}</span>
            <span
                className={`px-3 py-1 rounded-full text-sm font-semibold border ${getColorStyles()}`}
            >
                {count}
            </span>
        </div>
    );
}

