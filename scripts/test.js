const snarkjs = require("snarkjs");
const fs = require("fs");

async function run() {
  const input = {
    oldBalances: ["1000", "500", "2000", "750"],
    newBalances: ["800", "600", "1800", "900"],
    prices: ["100", "200", "50", "150"],
    totalValueCommitment: "420000",
    minAllocationPct: "10",
    maxAllocationPct: "40",
  };

  // Calculate witness
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "build/rebalancing_js/rebalancing.wasm",
    "build/rebalancing_final.zkey"
  );

  console.log("Proof generated successfully!");
  console.log("Public signals:", publicSignals);

  // Verify proof
  const vKey = JSON.parse(fs.readFileSync("build/verification_key.json"));
  const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

  if (res === true) {
    console.log("✓ Proof verification OK");
  } else {
    console.log("✗ Invalid proof");
  }

  // Generate call data for Solidity verifier
  const calldata = await snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );
  console.log("\nSolidity call data:");
  console.log(calldata);
}

run().then(() => {
  process.exit(0);
});
