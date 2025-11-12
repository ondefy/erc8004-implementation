// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {ValidationRegistry} from "../src/ValidationRegistry.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {Groth16Verifier} from "../src/Verifier.sol";
import {RebalancerVerifier} from "../src/RebalancerVerifier.sol";

/**
 * @title Deploy Script for ERC-8004 Registries
 * @notice Deploys all three registry contracts in the correct order
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey;

        // Try to load PRIVATE_KEY from environment
        // If not found (local dev), use Anvil's default account #0
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
            console.log("Using PRIVATE_KEY from environment");
        } catch {
            // Anvil's default account #0 private key
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
            console.log("Using Anvil default account for local deployment");
        }

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy IdentityRegistry first (no dependencies)
        IdentityRegistry identityRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identityRegistry));

        // 2. Deploy ValidationRegistry (depends on IdentityRegistry)
        ValidationRegistry validationRegistry = new ValidationRegistry(address(identityRegistry));
        console.log("ValidationRegistry deployed at:", address(validationRegistry));

        // 3. Deploy ReputationRegistry (depends on IdentityRegistry)
        ReputationRegistry reputationRegistry = new ReputationRegistry(address(identityRegistry));
        console.log("ReputationRegistry deployed at:", address(reputationRegistry));

        // 4. Deploy Groth16 Verifier (used for on-chain ZK verification)
        Groth16Verifier verifier = new Groth16Verifier();
        console.log("Groth16Verifier deployed at:", address(verifier));

        // 5. Deploy Rebalancer Validation Verifier (for ZyFI rebalancer validation)
        RebalancerVerifier rebalancerVerifier = new RebalancerVerifier();
        console.log("RebalancerVerifier deployed at:", address(rebalancerVerifier));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== Deployment Complete ===");
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("\nContract Addresses:");
        console.log("- IdentityRegistry:", address(identityRegistry));
        console.log("- ValidationRegistry:", address(validationRegistry));
        console.log("- ReputationRegistry:", address(reputationRegistry));
        console.log("- Groth16Verifier:", address(verifier));
        console.log("- RebalancerVerifier:", address(rebalancerVerifier));
    }
}
