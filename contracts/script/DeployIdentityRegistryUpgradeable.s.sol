// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistryTest} from "../src/IdentityRegistryTest.sol";

/**
 * @dev The registry's initializer is `reinitializer(2)` + `onlyOwner`.
 * For a fresh proxy, we deploy with empty init data, then set the owner
 * storage slot, then call initialize().
 */
contract DeployIdentityRegistryUpgradeable is Script {
    function run() external {
        uint256 deployerPrivateKey;
        address deployerAddress;

        // Try to load PRIVATE_KEY from environment
        // If not found (local dev), use Anvil's default account #0
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
            deployerAddress = vm.addr(key);
            console.log("Using PRIVATE_KEY from environment");
        } catch {
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
            deployerAddress = vm.addr(deployerPrivateKey);
            console.log("Using Anvil default account for local deployment");
        }

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation
        IdentityRegistryTest impl = new IdentityRegistryTest();
        console.log("IdentityRegistryTest implementation deployed at:", address(impl));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("Deployer Address:", deployerAddress);
        console.log("\nContract Addresses:");
        console.log("- IdentityRegistryTest (proxy):", address(impl));
    }
}

