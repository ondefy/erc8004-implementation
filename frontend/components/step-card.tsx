import { useAccount } from "wagmi";
import { getNetworkInfo } from "@/lib/constants";

interface StepCardProps {
    step: {
        id: number;
        title: string;
        description: string;
        status: "pending" | "in_progress" | "completed" | "error";
        details?: string;
        proof?: any; // ZK proof data
        publicInputs?: any; // Public signals
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

                    // Check if this is a data hash that should NOT be a transaction link
                    const isDataHash = line.includes('Request Hash') ||
                        line.includes('Response Hash') ||
                        line.includes('Response Data Hash') ||
                        line.includes('Data Hash') ||
                        line.includes('DataHash') ||
                        line.includes('dataHash') ||
                        line.includes('requestHash') ||
                        line.includes('responseHash') ||
                        line.includes('Proof Hash') ||
                        line.includes('proofHash') ||
                        line.includes('Validation Hash') ||
                        line.includes('validationHash');

                    if (txHashMatch && !isDataHash) {
                        // Only create transaction link if it's NOT a data hash
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
                    } else if (
                        addressMatch &&
                        !line.includes('Request Hash') &&
                        !line.includes('Response Hash') &&
                        !line.includes('Response Data Hash') &&
                        !line.includes('Data Hash') &&
                        !line.includes('dataHash') &&
                        !line.includes('requestHash') &&
                        !line.includes('responseHash') &&
                        !line.includes('(Event)')
                    ) {
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

    // Render proof data in a collapsible section
    const renderProofData = () => {
        if (!step.proof || !step.publicInputs) return null;

        return (
            <details className="mt-3 group">
                <summary className="cursor-pointer p-3 bg-zyfi-bg/60 rounded-zyfi border border-zyfi-border hover:border-zyfi-accent-blue transition-colors">
                    <div className="flex items-center gap-2">
                        {/* <svg
                            className="w-4 h-4 text-zyfi-accent-blue transform transition-transform group-open:rotate-90"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M9 5l7 7-7 7" />
                        </svg> */}
                        <span className="text-xs font-semibold text-zyfi-accent-blue uppercase tracking-wider">
                            View Proof Data
                        </span>
                    </div>
                </summary>
                <div className="mt-2 p-4 bg-zyfi-bg/80 rounded-zyfi border border-zyfi-accent-blue/30 space-y-3">
                    {/* Public Inputs */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Public Signals ({Array.isArray(step.publicInputs) ? step.publicInputs.length : 0})
                        </h4>
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-700 overflow-x-auto">
                            <pre className="text-[10px] text-green-400 font-mono">
                                {JSON.stringify(step.publicInputs, null, 2)}
                            </pre>
                        </div>
                    </div>

                    {/* Proof Components */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            Groth16 Proof
                        </h4>
                        <div className="space-y-2">
                            {/* pi_a */}
                            <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                                <div className="text-[10px] text-purple-300 font-semibold mb-1">π_A (G1 Point)</div>
                                <pre className="text-[9px] text-slate-400 font-mono break-all">
                                    {step.proof.pi_a?.[0]?.slice(0, 50)}...
                                </pre>
                            </div>

                            {/* pi_b */}
                            <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                                <div className="text-[10px] text-purple-300 font-semibold mb-1">π_B (G2 Point)</div>
                                <pre className="text-[9px] text-slate-400 font-mono break-all">
                                    {step.proof.pi_b?.[0]?.[0]?.slice(0, 50)}...
                                </pre>
                            </div>

                            {/* pi_c */}
                            <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                                <div className="text-[10px] text-purple-300 font-semibold mb-1">π_C (G1 Point)</div>
                                <pre className="text-[9px] text-slate-400 font-mono break-all">
                                    {step.proof.pi_c?.[0]?.slice(0, 50)}...
                                </pre>
                            </div>
                        </div>
                    </div>

                    {/* Full Proof JSON (collapsible) */}
                    <details className="group/proof">
                        <summary className="cursor-pointer text-[10px] text-slate-400 hover:text-zyfi-accent-blue transition-colors">
                            View Full Proof JSON
                        </summary>
                        <div className="mt-2 bg-slate-900/70 p-3 rounded border border-slate-700 max-h-64 overflow-auto">
                            <pre className="text-[9px] text-slate-300 font-mono whitespace-pre-wrap break-all">
                                {JSON.stringify(step.proof, null, 2)}
                            </pre>
                        </div>
                    </details>
                </div>
            </details>
        );
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
                    {renderProofData()}
                </div>
            </div>
        </div>
    );
}
