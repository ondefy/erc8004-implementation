// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/IdentityRegistry.sol";
import "../src/ValidationRegistry.sol";
import "../src/ReputationRegistry.sol";

/**
 * @title Deploy Script for ERC-8004 Registries
 * @notice Deploys all three registry contracts in the correct order
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

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

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== Deployment Complete ===");
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("\nContract Addresses:");
        console.log("- IdentityRegistry:", address(identityRegistry));
        console.log("- ValidationRegistry:", address(validationRegistry));
        console.log("- ReputationRegistry:", address(reputationRegistry));
    }
}
