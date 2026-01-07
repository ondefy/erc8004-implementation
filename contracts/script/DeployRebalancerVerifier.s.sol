// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {RebalancerVerifier} from "../src/RebalancerVerifier.sol";

/**
 * @title Deploy RebalancerVerifier
 * @notice Deploys only the RebalancerVerifier contract
 */
contract DeployRebalancerVerifier is Script {
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

        // Deploy Rebalancer Validation Verifier
        RebalancerVerifier rebalancerVerifier = new RebalancerVerifier();
        console.log("RebalancerVerifier deployed at:", address(rebalancerVerifier));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== Deployment Complete ===");
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("\nContract Address:");
        console.log("RebalancerVerifier:", address(rebalancerVerifier));
    }
}
