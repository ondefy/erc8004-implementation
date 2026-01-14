// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistryUpgradeable} from "../src/IdentityRegistryUpgradeable.sol";
import {ValidationRegistryUpgradeable} from "../src/ValidationRegistryUpgradeable.sol";
import {ReputationRegistryUpgradeable} from "../src/ReputationRegistryUpgradeable.sol";
import {RebalancerVerifier} from "../src/RebalancerVerifier.sol";
import {ERC1967Proxy} from "../src/ERC1967Proxy.sol";

/**
 * @title Deploy Script for ERC-8004 Registries
 * @notice Deploys all three registry contracts as upgradeable proxies in the correct order
 * 
 * @dev NOTE: The ERC-8004 contracts use `reinitializer(2)` which requires the contracts
 * to be initialized first. For fresh deployments, we deploy the proxy with empty initialization
 * data, then manually initialize. However, the contracts' initialize() functions require
 * `onlyOwner`, which creates a chicken-and-egg problem since owner isn't set.
 * 
 * This script works around this by deploying proxies without initialization, then
 * using storage manipulation to set the owner, then calling initialize().
 * 
 * WARNING: This is a workaround. The official ERC-8004 contracts may need a proper
 * first-time initializer function that sets the owner.
 */
contract Deploy is Script {
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
            // Anvil's default account #0 private key
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
            deployerAddress = vm.addr(deployerPrivateKey);
            console.log("Using Anvil default account for local deployment");
        }

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy IdentityRegistry implementation
        IdentityRegistryUpgradeable identityRegistryImpl = new IdentityRegistryUpgradeable();
        console.log("IdentityRegistry implementation deployed at:", address(identityRegistryImpl));

        // 2. Deploy IdentityRegistry proxy (empty initialization for now)
        // We'll set owner and initialize manually due to reinitializer(2) requirement
        ERC1967Proxy identityProxy = new ERC1967Proxy(
            address(identityRegistryImpl),
            ""
        );
        IdentityRegistryUpgradeable identityRegistry = IdentityRegistryUpgradeable(address(identityProxy));
        
        // Set owner using storage slot (Ownable stores owner at slot 0x00)
        // This is a workaround for the missing initializer
        vm.store(address(identityRegistry), bytes32(uint256(0)), bytes32(uint256(uint160(deployerAddress))));
        
        // Now call initialize() which requires owner to be set (reinitializer(2))
        identityRegistry.initialize();
        console.log("IdentityRegistry proxy deployed at:", address(identityRegistry));

        // 3. Deploy ValidationRegistry implementation
        ValidationRegistryUpgradeable validationRegistryImpl = new ValidationRegistryUpgradeable();
        console.log("ValidationRegistry implementation deployed at:", address(validationRegistryImpl));

        // 4. Deploy ValidationRegistry proxy (empty initialization)
        ERC1967Proxy validationProxy = new ERC1967Proxy(
            address(validationRegistryImpl),
            ""
        );
        ValidationRegistryUpgradeable validationRegistry = ValidationRegistryUpgradeable(address(validationProxy));
        
        // Set owner using storage slot
        vm.store(address(validationRegistry), bytes32(uint256(0)), bytes32(uint256(uint160(deployerAddress))));
        
        // Now initialize with identity registry address
        validationRegistry.initialize(address(identityRegistry));
        console.log("ValidationRegistry proxy deployed at:", address(validationRegistry));

        // 5. Deploy ReputationRegistry implementation
        ReputationRegistryUpgradeable reputationRegistryImpl = new ReputationRegistryUpgradeable();
        console.log("ReputationRegistry implementation deployed at:", address(reputationRegistryImpl));

        // 6. Deploy ReputationRegistry proxy (empty initialization)
        ERC1967Proxy reputationProxy = new ERC1967Proxy(
            address(reputationRegistryImpl),
            ""
        );
        ReputationRegistryUpgradeable reputationRegistry = ReputationRegistryUpgradeable(address(reputationProxy));
        
        // Set owner using storage slot
        vm.store(address(reputationRegistry), bytes32(uint256(0)), bytes32(uint256(uint160(deployerAddress))));
        
        // Now initialize with identity registry address
        reputationRegistry.initialize(address(identityRegistry));
        console.log("ReputationRegistry proxy deployed at:", address(reputationRegistry));

        // 7. Deploy Rebalancer Validation Verifier (for ZyFI rebalancer validation)
        // This is not upgradeable, so deploy directly
        RebalancerVerifier rebalancerVerifier = new RebalancerVerifier();
        console.log("RebalancerVerifier deployed at:", address(rebalancerVerifier));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== Deployment Complete ===");
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("Deployer Address:", deployerAddress);
        console.log("\nContract Addresses:");
        console.log("- IdentityRegistry (proxy):", address(identityRegistry));
        console.log("- IdentityRegistry (impl):", address(identityRegistryImpl));
        console.log("- ValidationRegistry (proxy):", address(validationRegistry));
        console.log("- ValidationRegistry (impl):", address(validationRegistryImpl));
        console.log("- ReputationRegistry (proxy):", address(reputationRegistry));
        console.log("- ReputationRegistry (impl):", address(reputationRegistryImpl));
        console.log("- RebalancerVerifier:", address(rebalancerVerifier));
    }
}
