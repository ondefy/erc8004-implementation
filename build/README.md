# Build Directory

This directory contains generated build artifacts that are **NOT committed to git**.

## Generated Files

After running the setup, this directory will contain:

- `rebalancing.r1cs` - R1CS constraint system
- `rebalancing.wasm` - Circuit WebAssembly
- `rebalancing.sym` - Symbol table for debugging
- `pot8_*.ptau` - Powers of Tau ceremony files
- `rebalancing_*.zkey` - Proving keys
- `verification_key.json` - Verification key
- `witness.wtns` - Generated witness (when creating proofs)
- `proof.json` - Generated proof (when creating proofs)
- `public.json` - Public inputs (when creating proofs)

## Setup Instructions

To generate these files, run:

```bash
# From project root
./scripts/setup.sh
```

Or follow the manual steps in the main README.md.

## Why Not Committed?

Build artifacts are excluded from git because:

1. **Size**: Powers of Tau files can be large (~500KB)
2. **Reproducibility**: Can be regenerated from source
3. **Security**: Ceremony contributions should use your own entropy
4. **Flexibility**: Different users may want different ceremony parameters

## For New Contributors

1. Clone the repository
2. Run the setup script: `./scripts/setup.sh`
3. Wait for trusted setup to complete (~1-2 minutes)
4. Generate a test proof: `./scripts/generate-proof.sh`
