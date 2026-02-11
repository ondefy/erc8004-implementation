// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IdentityRegistryUpgradeable} from "../src/IdentityRegistryUpgradeable.sol";
import {ValidationRegistryUpgradeable} from "../src/ValidationRegistryUpgradeable.sol";
import {ReputationRegistryUpgradeable} from "../src/ReputationRegistryUpgradeable.sol";
import {RebalancerVerifier} from "../src/RebalancerVerifier.sol";
import {ERC1967Proxy} from "../src/ERC1967Proxy.sol";

/**
 * @title BootstrapUUPS
 * @dev Minimal UUPS implementation used only during deployment to bootstrap ownership.
 * The real contracts use reinitializer(2) + onlyOwner, which creates a chicken-and-egg
 * problem for fresh deployments. This contract provides an initializer (version 1) that
 * sets the owner, then we upgrade to the real implementation and call reinitialize.
 */
contract BootstrapUUPS is OwnableUpgradeable, UUPSUpgradeable {
    address private _identityRegistry;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_) public initializer {
        __Ownable_init(owner_);
        __UUPSUpgradeable_init();
    }

    function initializeWithRegistry(address owner_, address identityRegistry_) public initializer {
        __Ownable_init(owner_);
        __UUPSUpgradeable_init();
        _identityRegistry = identityRegistry_;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}

/**
 * @title Deploy Script for ERC-8004 Registries
 * @notice Deploys all three registry contracts as upgradeable proxies.
 *
 * @dev Flow for each registry:
 * 1. Deploy BootstrapUUPS as initial implementation (sets owner, _initialized = 1)
 * 2. Deploy proxy with BootstrapUUPS.initialize() as init data
 * 3. Deploy real implementation
 * 4. Upgrade proxy to real implementation via upgradeToAndCall(realImpl, reinitData)
 *    - This calls the real initialize() which is reinitializer(2) + onlyOwner
 *    - Works because owner is set (step 1) and _initialized is 1 < 2 (step 1)
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey;
        address deployerAddress;

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

        // Deploy the bootstrap implementation (shared by all proxies)
        BootstrapUUPS bootstrap = new BootstrapUUPS();

        // --- IdentityRegistry ---
        IdentityRegistryUpgradeable identityImpl = new IdentityRegistryUpgradeable();
        ERC1967Proxy identityProxy = new ERC1967Proxy(
            address(bootstrap),
            abi.encodeCall(bootstrap.initialize, (deployerAddress))
        );
        IdentityRegistryUpgradeable identityRegistry = IdentityRegistryUpgradeable(address(identityProxy));
        // Upgrade to real impl and reinitialize (version 2)
        identityRegistry.upgradeToAndCall(
            address(identityImpl),
            abi.encodeCall(identityImpl.initialize, ())
        );
        console.log("IdentityRegistry proxy:", address(identityRegistry));

        // --- ValidationRegistry ---
        ValidationRegistryUpgradeable validationImpl = new ValidationRegistryUpgradeable();
        ERC1967Proxy validationProxy = new ERC1967Proxy(
            address(bootstrap),
            abi.encodeCall(bootstrap.initializeWithRegistry, (deployerAddress, address(identityRegistry)))
        );
        ValidationRegistryUpgradeable validationRegistry = ValidationRegistryUpgradeable(address(validationProxy));
        validationRegistry.upgradeToAndCall(
            address(validationImpl),
            abi.encodeCall(validationImpl.initialize, (address(identityRegistry)))
        );
        console.log("ValidationRegistry proxy:", address(validationRegistry));

        // --- ReputationRegistry ---
        ReputationRegistryUpgradeable reputationImpl = new ReputationRegistryUpgradeable();
        ERC1967Proxy reputationProxy = new ERC1967Proxy(
            address(bootstrap),
            abi.encodeCall(bootstrap.initializeWithRegistry, (deployerAddress, address(identityRegistry)))
        );
        ReputationRegistryUpgradeable reputationRegistry = ReputationRegistryUpgradeable(address(reputationProxy));
        reputationRegistry.upgradeToAndCall(
            address(reputationImpl),
            abi.encodeCall(reputationImpl.initialize, (address(identityRegistry)))
        );
        console.log("ReputationRegistry proxy:", address(reputationRegistry));

        // --- RebalancerVerifier (not upgradeable) ---
        RebalancerVerifier rebalancerVerifier = new RebalancerVerifier();
        console.log("RebalancerVerifier:", address(rebalancerVerifier));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployerAddress);
    }
}
