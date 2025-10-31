# ZK Rebalancing Frontend

A minimal Next.js frontend to showcase the ZK rebalancing workflow step-by-step.

## Live Demo

```
┌─────────────────────────────────────────────────────────────────┐
│  ZK Rebalancing Workflow                                        │
│  Zero-Knowledge proof system for portfolio rebalancing          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Progress: ████████████████████░░░░░░  60% (8/13)             │
│                                                                 │
│  [▶ Start Workflow]  [↻ Reset]                                 │
│                                                                 │
│  Steps:                              │  Status Summary:        │
│  ┌────────────────────────────────┐  │  ┌──────────────────┐  │
│  │ ✅ 0. Deploy Contracts          │  │  │ Completed: 8     │  │
│  │ ✅ 1. Initialize Agents         │  │  │ In Progress: 1   │  │
│  │ ✅ 2. Fund Agents               │  │  │ Pending: 4       │  │
│  │ ✅ 3. Register Agents           │  │  │ Errors: 0        │  │
│  │ ✅ 4. Load Input Data           │  │  └──────────────────┘  │
│  │ ✅ 5. Create Rebalancing Plan   │  │                        │
│  │ ✅ 6. Generate ZK Proof         │  │  📊 Input Data:      │
│  │ ✅ 7. Submit for Validation     │  │  ┌──────────────────┐  │
│  │ 🔄 8. Validate Proof            │  │  │ Assets: 4        │  │
│  │ ⏳ 9. Submit Validation         │  │  │ Total: 420,000   │  │
│  │ ⏳ 10. Authorize Feedback       │  │  │ Min: 10%         │  │
│  │ ⏳ 11. Client Feedback          │  │  │ Max: 40%         │  │
│  │ ⏳ 12. Check Reputation         │  │  └──────────────────┘  │
│  └────────────────────────────────┘  │                        │
└─────────────────────────────────────────────────────────────────┘
```

## Features

- 📊 **Step-by-step visualization** of the complete workflow
- 🎨 **Modern UI** with Tailwind CSS
- ⚡ **Real-time updates** as each step executes
- 📈 **Progress tracking** with visual indicators
- 🎯 **Status summary** panel
- 📱 **Responsive design** for all devices

## Getting Started

### Prerequisites

Make sure you have:

- Node.js 14+ installed
- Anvil running (for local blockchain)
- Parent project set up and deployed

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `env.local.example` to `.env.local` and fill the Pinata credentials (choose ONE method):

```
# Option 1 (recommended):
PINATA_JWT=your_pinata_jwt_token

# Option 2 (fallback):
# PINATA_API_KEY=your_key
# PINATA_SECRET_API_KEY=your_secret
```

These variables are used only in server-side API routes to pin proofs and validation results to IPFS via Pinata.

## Architecture

### Components

- **StepCard**: Individual step display with status indicators
- **StatusBadge**: Colored badges for status counts
- **InputDataPanel**: Display of portfolio input data

### API Routes

- `/api/workflow/execute-step`: Execute individual workflow steps
- `/api/workflow/run-full`: Run the complete E2E workflow

### Pages

- `/` (Home): Main workflow visualization page

## Workflow Steps

The frontend visualizes these 13 steps:

0. **Deploy Contracts** - Deploy smart contracts to blockchain
1. **Initialize Agents** - Create Rebalancer, Validator, and Client agents
2. **Fund Agents** - Transfer ETH to agent wallets
3. **Register Agents** - Register all agents on-chain
4. **Load Input Data** - Load portfolio balances and constraints
5. **Create Rebalancing Plan** - Generate new allocation strategy
6. **Generate ZK Proof** - Create zero-knowledge proof
7. **Submit for Validation** - Send proof to validator agent
8. **Validate Proof** - Verify proof on-chain
9. **Submit Validation** - Record validation result
10. **Authorize Feedback** - Grant client permission
11. **Client Feedback** - Client evaluates and rates
12. **Check Reputation** - View updated reputation

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Pattern**: Modern, functional components
- **State**: React hooks (useState)

## Code Style

Following best practices:

- Functional and declarative patterns
- TypeScript for type safety
- Tailwind for styling
- Mobile-first responsive design
- Clean, modular component structure

## Integration

The frontend integrates with the parent project's:

- E2E test workflow (`tests/e2e/test-zk-rebalancing-workflow.ts`)
- Input data (`input/input.json`)
- Deployed contracts

## License

MIT
