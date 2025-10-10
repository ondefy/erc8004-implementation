import { NextResponse } from "next/server";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

/**
 * Generate a new wallet (private key + address)
 */
export async function POST() {
  try {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    return NextResponse.json({
      privateKey,
      address: account.address,
    });
  } catch (error) {
    console.error("Error generating wallet:", error);
    return NextResponse.json(
      { error: "Failed to generate wallet" },
      { status: 500 }
    );
  }
}
