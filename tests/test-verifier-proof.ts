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
      "5808506367496076115137797681117303818077944624938341183253977674074579472000",
      "5270605745182145652419062500066814998958339653653406012878574410992405335197",
      "1",
    ],
    pi_b: [
      [
        "8885883170907692575755782708677151047002902901633178809746155613569504943041",
        "2104291103560247205867869460199313096763832805523160723889115166617766269812",
      ],
      [
        "4139120738324171264782533843539667641395287267295767580511397833291611466534",
        "20711683582567592498512458532375874526005602943189073671020975015312597527994",
      ],
      ["1", "0"],
    ],
    pi_c: [
      "7860446099379479482474800662495255899670532148371157572789152603873989580234",
      "2283997298364557245522178535412552623378609119793354021413476810608393180800",
      "1",
    ],
    protocol: "groth16",
    curve: "bn128",
  },
  publicSignals: [
    "707759754",
    "17716",
    "1503385",
    "3279845307",
    "54352",
    "1",
    "1",
    "0",
    "0",
    "0",
    "1",
    "1",
    "1",
    "1",
    "1",
  ],
  publicSignalsDescription: [
    "liquidity: New opportunity liquidity",
    "zyfaiTvl: Zyfai TVL in the pool",
    "amount: Rebalancer amount",
    "poolTvl: Adjusted pool TVL",
    "newApy: New opportunity APY",
    "apyStable7Days: Boolean",
    "tvlStable: Boolean",
    "oldApy: Previous opportunity APY",
    "oldLiquidity: Old opportunity liquidity",
    "oldZyfaiTvl: Old opportunity Zyfai TVL",
    "oldTvlStable: Boolean",
    "oldUtilizationStable: Boolean",
    "oldCollateralHealth: Boolean",
    "oldZyfaiTVLCheck: Boolean",
    "supportsCurrentPool: Boolean",
  ],
  verifierAddress: "0x07A1Dc74Ec0C2F3F9e605Ad464A048099793be09",
  validationRegistryAddress: "0x8004C269D0A5647E51E121FeB226200ECE932d55",
  chainId: 84532,
  version: "1.0",
  circuit: "zyfi-rebalancing-validation",
  timestamp: 1767784082270,
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
    [
      BigInt(proofData.proof.pi_b[0][1]),
      BigInt(proofData.proof.pi_b[0][0]),
    ],
    [
      BigInt(proofData.proof.pi_b[1][1]),
      BigInt(proofData.proof.pi_b[1][0]),
    ],
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
    bigint,
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
      console.log("\nThe proof is valid and matches the verification key in the contract.");
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

