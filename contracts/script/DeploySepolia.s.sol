// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "../src/ethereum/MockERC20.sol";
import {DemoTreasuryVault} from "../src/ethereum/DemoTreasuryVault.sol";
import {SetldExecutionRouter} from "../src/ethereum/SetldExecutionRouter.sol";

/// @notice Deploys the Sepolia source layer for the treasury-rebalance template.
///         forge script script/DeploySepolia.s.sol --rpc-url sepolia --broadcast
contract DeploySepolia is Script {
    function run() external {
        uint256 pk = vm.envUint("SEPOLIA_DEPLOYER_KEY");
        address deployer = vm.addr(pk);
        address executor = vm.envAddress("SEPOLIA_EXECUTOR_ADDR");
        vm.startBroadcast(pk);

        MockERC20 assetIn = new MockERC20("setld source asset IN", "sIN");
        MockERC20 assetOut = new MockERC20("setld source asset OUT", "sOUT");
        DemoTreasuryVault vault = new DemoTreasuryVault();
        SetldExecutionRouter router = new SetldExecutionRouter();

        router.setTargetAllowed(address(vault), true);

        // rate 1.9e18: a valid amountIn of 5_000 yields 9_500 out, clearing a 9_000 floor.
        vault.setRate(address(assetIn), address(assetOut), 1.9e18);

        // seed the vault's assetOut pool generously for the whole campaign
        uint256 pool = 100_000_000 ether;
        assetOut.mint(deployer, pool);
        assetOut.approve(address(vault), pool);
        vault.fund(address(assetOut), pool);
        // give the executor a display balance of assetIn (not required by the vault, but the
        // product shows the executor's source holdings)
        assetIn.mint(executor, 1_000_000 ether);

        vm.stopBroadcast();

        console2.log("SEPOLIA_ASSET_IN", address(assetIn));
        console2.log("SEPOLIA_ASSET_OUT", address(assetOut));
        console2.log("SEPOLIA_DEMO_VAULT", address(vault));
        console2.log("SEPOLIA_ROUTER", address(router));
        console2.log("SEPOLIA_EXECUTOR", executor);
        console2.log("ROUTER_SELECTOR");
        console2.logBytes4(bytes4(keccak256("execute(bytes32,address,address,address,uint256,uint256)")));
        console2.log("REBALANCE_EXECUTED_SIG");
        console2.logBytes32(keccak256("RebalanceExecuted(bytes32,address,address,address,uint256,uint256)"));
    }
}
