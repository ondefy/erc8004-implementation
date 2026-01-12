/**
 * Test script to verify a proof against the deployed RebalancerVerifier contract
 *
 * Usage:
 *   REBALANCER_VERIFIER_ADDRESS=0x... RPC_URL=... ts-node tests/test-verifier-proof.ts
 */

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const proofData = {
  proof: {
    pi_a: [
      "10598892650137383277942058771425304378824841544963276060674047720063260535523",
      "7846709327565689082764439546026227652494660258671054704842630258561550482378",
      "1",
    ],
    pi_b: [
      [
        "11995047261804797775721300718467390927486715731708683180377210931380040584685",
        "18048300820497311947382636819430336043947608631729900708849384999189915106830",
      ],
      [
        "5175993259332735261107895036740040408281006739713285523147485957891887240915",
        "14140636184071334089594151969251698661351704802349425790216988781840606189421",
      ],
      ["1", "0"],
    ],
    pi_c: [
      "180465996080860691788571053418256801922020844593135150899766645127853804070",
      "8616687746436002206452894977593265645861924456990356103983468812480300295700",
      "1",
    ],
    protocol: "groth16",
    curve: "bn128",
  },
  publicSignals: [
    "235442332",
    "20196044",
    "1010877551",
    "873309100",
    "58905",
    "1",
    "1",
    "55481",
    "1618605129",
    "106211928",
    "1",
    "1",
    "1",
    "1",
    "1",
  ],
  publicSignalsDescription: [
    "liquidity: New opportunity liquidity (scaled by 100, 2 decimal precision)",
    "zyfaiTvl: Zyfai TVL in the pool (scaled by 100, 2 decimal precision)",
    "amount: Rebalancer amount (token smallest units, no scaling)",
    "poolTvl: Adjusted pool TVL (scaled by 100, 2 decimal precision)",
    "newApy: New opportunity APY (scaled by 10000, 4 decimal precision, e.g., 54352 = 5.4352%)",
    "apyStable7Days: Boolean (0 or 1)",
    "tvlStable: Boolean (0 or 1)",
    "oldApy: Previous opportunity APY (scaled by 10000, 4 decimal precision)",
    "oldLiquidity: Old opportunity liquidity (scaled by 100, 2 decimal precision)",
    "oldZyfaiTvl: Old opportunity Zyfai TVL (scaled by 100, 2 decimal precision)",
    "oldTvlStable: Boolean (0 or 1)",
    "oldUtilizationStable: Boolean (0 or 1)",
    "oldCollateralHealth: Boolean (0 or 1)",
    "oldZyfaiTVLCheck: Boolean (0 or 1)",
    "supportsCurrentPool: Boolean (0 or 1)",
  ],
  verifierAddress: "0x07A1Dc74Ec0C2F3F9e605Ad464A048099793be09",
  validationRegistryAddress: "0x8004C269D0A5647E51E121FeB226200ECE932d55",
  chainId: 84532,
  version: "1.0",
  circuit: "zyfi-rebalancing-validation",
  timestamp: 1768210243024,
};

async function testVerifierProof() {
  console.log("🔍 Testing RebalancerVerifier Contract\n");
  console.log("=".repeat(80));

  const verifierAddress =
    process.env.REBALANCER_VERIFIER_ADDRESS || proofData.verifierAddress;
  const rpcUrl =
    process.env.RPC_URL ||
    process.env.RPC_URL_BASE_SEPOLIA ||
    "https://sepolia.base.org";

  console.log(`Verifier Address: ${verifierAddress}`);
  console.log(`Chain ID: ${proofData.chainId} (Base Sepolia)`);
  console.log(`RPC URL: ${rpcUrl}\n`);

  // Create public client
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  // RebalancerVerifier ABI
  const verifierAbi = [
    {
      inputs: [
        {
          internalType: "uint256[2]",
          name: "_pA",
          type: "uint256[2]",
        },
        {
          internalType: "uint256[2][2]",
          name: "_pB",
          type: "uint256[2][2]",
        },
        {
          internalType: "uint256[2]",
          name: "_pC",
          type: "uint256[2]",
        },
        {
          internalType: "uint256[15]",
          name: "_pubSignals",
          type: "uint256[15]",
        },
      ],
      name: "verifyProof",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  // Format proof for Solidity
  const pA: [bigint, bigint] = [
    BigInt(proofData.proof.pi_a[0]),
    BigInt(proofData.proof.pi_a[1]),
  ];
  const pB: [[bigint, bigint], [bigint, bigint]] = [
    [BigInt(proofData.proof.pi_b[0][1]), BigInt(proofData.proof.pi_b[0][0])],
    [BigInt(proofData.proof.pi_b[1][1]), BigInt(proofData.proof.pi_b[1][0])],
  ];
  const pC: [bigint, bigint] = [
    BigInt(proofData.proof.pi_c[0]),
    BigInt(proofData.proof.pi_c[1]),
  ];

  // Convert public signals to BigInt array (15 signals)
  const pubSignals: [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint
  ] = proofData.publicSignals.map((s) => BigInt(s)) as any;

  console.log("📊 Public Signals:");
  proofData.publicSignals.forEach((signal, i) => {
    const desc = proofData.publicSignalsDescription[i] || `Signal ${i}`;
    console.log(`   ${i}: ${signal} (${desc})`);
  });
  console.log();

  console.log("🔐 Verifying proof on-chain...\n");

  try {
    // Verify proof
    const isValid = await publicClient.readContract({
      address: verifierAddress as `0x${string}`,
      abi: verifierAbi,
      functionName: "verifyProof",
      args: [pA, pB, pC, pubSignals],
    });

    console.log("=".repeat(80));
    if (isValid) {
      console.log("✅ SUCCESS - Proof verified successfully!");
      console.log(
        "\nThe proof is valid and matches the verification key in the contract."
      );
    } else {
      console.log("❌ FAILED - Proof verification returned false");
      console.log("\nPossible reasons:");
      console.log("  - Verification key in contract doesn't match the circuit");
      console.log("  - Proof was generated with a different circuit version");
      console.log("  - Public signals don't match the proof");
      console.log("\n💡 Solution: Regenerate the verifier contract with:");
      console.log("   npm run setup:zkp:rebalancer");
      console.log("   Then redeploy the RebalancerVerifier contract");
    }
    console.log("=".repeat(80));

    return isValid;
  } catch (error: any) {
    console.error("❌ ERROR during verification:");
    console.error(`   ${error.message}`);
    if (error.cause) {
      console.error(`   Cause: ${error.cause.message || error.cause}`);
    }
    console.log("\n💡 Troubleshooting:");
    console.log("  - Check if contract is deployed at the address");
    console.log("  - Verify RPC URL is correct");
    console.log("  - Ensure contract ABI matches RebalancerVerifier");
    throw error;
  }
}

// Run test
testVerifierProof()
  .then((isValid) => {
    process.exit(isValid ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
