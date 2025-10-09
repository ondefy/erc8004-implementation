# Documentation Index

Welcome to the ZK Rebalancing Proof System documentation. This directory contains comprehensive guides to help you understand and use the system.

---

## Quick Navigation

### 📖 Start Here

- **New to the Project?** → Read [FILE_EXPLANATION.md](FILE_EXPLANATION.md)
- **Want to Run the Demo?** → See [../README.md](../README.md#quick-start)
- **Understanding Agents?** → Read [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md)
- **Integration Summary?** → Check [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)

---

## Documentation Files

### [FILE_EXPLANATION.md](FILE_EXPLANATION.md)

**Purpose**: Understand what each file in the project does

**Covers**:

- Complete ZK proof workflow
- Every file's purpose and creation process
- File sizes and growth patterns
- Common operations and troubleshooting
- Security considerations
- Lifecycle of each artifact

**When to Read**:

- When you want to understand the ZK proof system
- When debugging proof generation issues
- When you see unfamiliar files in `build/`

**Key Sections**:

- Source Files (circuits, inputs)
- Build Artifacts (r1cs, wasm, zkey, etc.)
- Runtime Files (witness, proof, public inputs)
- Smart Contracts (Verifier.sol)

---

### [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md)

**Purpose**: Understand the multi-agent orchestration system

**Covers**:

- Architecture overview
- Agent roles and responsibilities
- Complete workflow (11 steps)
- Privacy guarantees
- ERC-8004 integration
- Trust models
- API reference
- Security considerations

**When to Read**:

- When implementing new agent functionality
- When understanding the complete workflow
- When integrating with ERC-8004 registries
- Before modifying agent code

**Key Sections**:

- Agent Roles (Rebalancer, Validator, Client)
- Complete Workflow Phases
- Privacy Preservation
- Trust Models
- Example Use Cases

---

### [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)

**Purpose**: Summary of the agentic orchestration integration

**Covers**:

- Files created during integration
- Architecture overview
- Integration points
- Workflow comparison (before/after)
- Benefits achieved
- Next steps
- Comparison with reference project

**When to Read**:

- When you want to understand what was added
- When comparing to the reference project
- When explaining the integration to others
- Before extending the system

**Key Sections**:

- Files Created
- Architecture Diagrams
- Key Integration Points
- Workflow Comparison
- Success Metrics

---

### [FOUNDRY_SETUP.md](FOUNDRY_SETUP.md)

**Purpose**: Foundry smart contract setup and deployment

**Covers**:

- Foundry installation
- Contract compilation
- Testing with Foundry
- Deployment scripts
- Contract verification

**When to Read**:

- When setting up the smart contract environment
- When deploying to testnets
- When running contract tests

---

### [NPM_SCRIPTS.md](NPM_SCRIPTS.md)

**Purpose**: Available npm scripts reference

**Covers**:

- ZK proof setup scripts
- Circuit compilation commands
- Proof generation scripts
- Contract deployment commands
- Testing commands

**When to Read**:

- When you want to run specific operations
- When automating tasks
- When creating new scripts

---

### [SETUP_COMPLETE.md](SETUP_COMPLETE.md)

**Purpose**: Confirmation that initial setup is complete

**Covers**:

- Setup verification
- What files should exist
- Next steps after setup

**When to Read**:

- After running initial setup
- When verifying installation

---

## Common Workflows

### 1. Understanding the System

```
Read Order:
1. ../README.md (Overview)
2. FILE_EXPLANATION.md (File details)
3. AGENTIC_WORKFLOW.md (Agent system)
4. INTEGRATION_SUMMARY.md (What was added)
```

### 2. Running Your First Demo

```
Read Order:
1. ../README.md#quick-start
2. AGENTIC_WORKFLOW.md#running-the-demo
3. FILE_EXPLANATION.md (if errors occur)
```

### 3. Developing New Features

```
Read Order:
1. AGENTIC_WORKFLOW.md#api-reference
2. FILE_EXPLANATION.md (understand artifacts)
3. INTEGRATION_SUMMARY.md#next-steps
```

### 4. Deploying to Production

```
Read Order:
1. FOUNDRY_SETUP.md
2. FILE_EXPLANATION.md#security-considerations
3. AGENTIC_WORKFLOW.md#security-considerations
4. NPM_SCRIPTS.md (deployment commands)
```

---

## Quick Reference

### File System Overview

```
circuits/rebalancing.circom      → ZK circuit definition
build/rebalancing.wasm           → Witness generator
build/rebalancing_final.zkey     → Proving key
build/verification_key.json      → Verification key
contracts/src/Verifier.sol       → On-chain verifier
agents/rebalancer_agent.py       → Proof generation service
agents/validator_agent.py        → Proof validation service
agents/client_agent.py           → Feedback service
```

### Agent Interaction Flow

```
1. Rebalancer.create_rebalancing_plan()
2. Rebalancer.generate_zk_proof()
3. Rebalancer.submit_proof_for_validation()
4. Validator.validate_proof()
5. Validator.submit_validation_response()
6. Rebalancer.authorize_client_feedback()
7. Client.submit_feedback()
```

### Key Concepts

**Zero-Knowledge Proof**

- Proves statement without revealing data
- Uses Groth16 proof system
- Verifiable on-chain

**ERC-8004**

- Standard for trustless agent coordination
- Three registries: Identity, Validation, Reputation
- On-chain audit trail

**Multi-Agent System**

- Rebalancer: Proof generation
- Validator: Proof verification
- Client: Feedback and quality

---

## Troubleshooting Guide

### "Where do I start?"

→ Read [FILE_EXPLANATION.md](FILE_EXPLANATION.md) for system overview

### "How do agents work together?"

→ Read [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md) complete workflow section

### "What files are needed for proofs?"

→ See [FILE_EXPLANATION.md](FILE_EXPLANATION.md#build-artifacts)

### "How do I run the demo?"

→ Follow [../README.md](../README.md#quick-start) or run `./run_demo.sh`

### "Proof generation fails"

→ Check [FILE_EXPLANATION.md](FILE_EXPLANATION.md#troubleshooting)

### "What was integrated?"

→ Read [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)

### "How to deploy contracts?"

→ See [FOUNDRY_SETUP.md](FOUNDRY_SETUP.md) and [NPM_SCRIPTS.md](NPM_SCRIPTS.md)

---

## Documentation Standards

All documentation in this directory follows these principles:

✅ **Comprehensive**: Covers all aspects of the topic  
✅ **Practical**: Includes examples and code snippets  
✅ **Navigable**: Clear sections and cross-references  
✅ **Up-to-date**: Maintained with code changes  
✅ **Beginner-friendly**: Explains concepts from basics

---

## Contributing to Documentation

When adding new features, please update:

1. **README.md** (project root) - High-level changes
2. **FILE_EXPLANATION.md** - If new files are created
3. **AGENTIC_WORKFLOW.md** - If agent behavior changes
4. **INTEGRATION_SUMMARY.md** - If integration points change
5. **This file** - If new docs are added

---

## External Resources

### Zero-Knowledge Proofs

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Repository](https://github.com/iden3/snarkjs)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [ZK Whiteboard Sessions](https://zkhack.dev/whiteboard/)

### ERC-8004

- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [Reference Implementation](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-8004.md)

### Smart Contracts

- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Web3.py Documentation](https://web3py.readthedocs.io/)

---

## Version History

**v1.0.0** (October 2025)

- Initial agentic orchestration integration
- Complete ERC-8004 implementation
- ZK proof system integration
- Comprehensive documentation

---

## Feedback

Found an error or have a suggestion for the documentation?

1. Create an issue with the `documentation` label
2. Propose changes via pull request
3. Ask in project discussions

---

**Happy Building! 🚀**

For questions, start with the documentation file most relevant to your question, or run `./run_demo.sh` to see the system in action.
