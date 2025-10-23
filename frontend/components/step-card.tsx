import { useAccount } from "wagmi";
import { getNetworkInfo } from "@/lib/constants";

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
    const { chainId } = useAccount();
    const networkInfo = chainId ? getNetworkInfo(chainId) : null;

    const getStatusStyles = () => {
        switch (step.status) {
            case "completed":
                return "bg-green-500/10 border-green-500/50";
            case "in_progress":
                return "bg-zyfi-accent-blue/20 border-zyfi-accent-blue shadow-zyfi-glow";
            case "error":
                return "bg-red-500/10 border-red-500/50";
            default:
                return "bg-zyfi-bg-secondary border-zyfi-border";
        }
    };

    // Function to parse and linkify transaction hashes and addresses
    const renderDetailsWithLinks = (details: string) => {
        if (!networkInfo) {
            return <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{details}</p>;
        }

        // Split by lines and process each line
        const lines = details.split('\n');
        return (
            <div className="text-xs text-slate-300 font-mono space-y-1">
                {lines.map((line, index) => {
                    // Check if line contains a transaction hash (0x followed by 64 hex chars)
                    const txHashMatch = line.match(/(0x[a-fA-F0-9]{64})/);
                    // Check if line contains shortened tx/hash (0x...xxxx pattern)
                    const shortTxMatch = line.match(/Transaction:\s+(0x[a-fA-F0-9]{6,10})\.\.\.([a-fA-F0-9]{4})/);
                    // Check if line contains ethereum address (0x followed by 40 hex chars)
                    const addressMatch = line.match(/(0x[a-fA-F0-9]{40})/);

                    if (txHashMatch) {
                        const txHash = txHashMatch[1];
                        const beforeHash = line.substring(0, txHashMatch.index);
                        const afterHash = line.substring(txHashMatch.index! + txHash.length);

                        return (
                            <div key={index}>
                                {beforeHash}
                                <a
                                    href={`${networkInfo.explorer}/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zyfi-accent-blue hover:text-zyfi-accent-bright underline decoration-dotted hover:decoration-solid transition-colors"
                                >
                                    {txHash}
                                </a>
                                {afterHash}
                            </div>
                        );
                    } else if (shortTxMatch) {
                        // For shortened transaction display, we need the full hash from state
                        // For now, just make it look clickable but non-functional
                        return <div key={index}>{line}</div>;
                    } else if (addressMatch && !line.includes('Request Hash') && !line.includes('Response Hash')) {
                        const address = addressMatch[1];
                        const beforeAddr = line.substring(0, addressMatch.index);
                        const afterAddr = line.substring(addressMatch.index! + address.length);

                        return (
                            <div key={index}>
                                {beforeAddr}
                                <a
                                    href={`${networkInfo.explorer}/address/${address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zyfi-accent-blue hover:text-zyfi-accent-bright underline decoration-dotted hover:decoration-solid transition-colors"
                                >
                                    {address}
                                </a>
                                {afterAddr}
                            </div>
                        );
                    } else {
                        return <div key={index}>{line}</div>;
                    }
                })}
            </div>
        );
    };

    const getStatusIcon = () => {
        switch (step.status) {
            case "completed":
                return (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-zyfi-glow">
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
                    <div className="w-8 h-8 rounded-full bg-gradient-zyfi-quaternary flex items-center justify-center shadow-zyfi-glow-lg">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                );
            case "error":
                return (
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-zyfi-glow">
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
                    <div className="w-8 h-8 rounded-full bg-zyfi-bg border border-zyfi-border flex items-center justify-center">
                        <span className="text-slate-400 text-sm font-medium">
                            {step.id}
                        </span>
                    </div>
                );
        }
    };

    return (
        <div
            className={`border rounded-zyfi-lg p-5 transition-all duration-300 ${getStatusStyles()} ${isActive ? "ring-2 ring-zyfi-accent-bright shadow-zyfi-glow-lg" : ""
                }`}
        >
            <div className="flex items-start gap-4">
                {getStatusIcon()}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-slate-100">{step.title}</h3>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Step {step.id}
                        </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{step.description}</p>
                    {step.details && (
                        <div className="mt-3 p-3 bg-zyfi-bg/60 rounded-zyfi border border-zyfi-border">
                            {renderDetailsWithLinks(step.details)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
