interface StepCardProps {
    step: {
        id: number;
        title: string;
        description: string;
        status: "pending" | "in_progress" | "completed" | "error";
        details?: string;
    };
    isActive: boolean;
}

export function StepCard({ step, isActive }: StepCardProps) {
    const getStatusStyles = () => {
        switch (step.status) {
            case "completed":
                return "bg-green-50 border-green-200";
            case "in_progress":
                return "bg-blue-50 border-blue-300 shadow-md";
            case "error":
                return "bg-red-50 border-red-200";
            default:
                return "bg-white border-slate-200";
        }
    };

    const getStatusIcon = () => {
        switch (step.status) {
            case "completed":
                return (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                );
            case "in_progress":
                return (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                );
            case "error":
                return (
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                        <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="text-slate-600 text-sm font-medium">
                            {step.id}
                        </span>
                    </div>
                );
        }
    };

    return (
        <div
            className={`border rounded-lg p-5 transition-all duration-300 ${getStatusStyles()} ${isActive ? "ring-2 ring-blue-400" : ""
                }`}
        >
            <div className="flex items-start gap-4">
                {getStatusIcon()}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-slate-900">{step.title}</h3>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Step {step.id}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{step.description}</p>
                    {step.details && (
                        <div className="mt-3 p-3 bg-white/60 rounded border border-slate-200">
                            <p className="text-xs text-slate-700 font-mono">{step.details}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

