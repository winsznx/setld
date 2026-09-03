// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "../src/ethereum/MockERC20.sol";
import {SetldVault} from "../src/creditcoin/core/SetldVault.sol";
import {SetldExecutorRegistry} from "../src/creditcoin/core/SetldExecutorRegistry.sol";
import {SetldAttestcoinAdapter} from "../src/creditcoin/adapters/SetldAttestcoinAdapter.sol";
import {SetldCore} from "../src/creditcoin/core/SetldCore.sol";

/// @notice Deploys the Creditcoin CC3 core. Precompile/decoder addresses pinned from the
///         S0 probe (evidence/manifests/environment.json).
///         forge script script/DeployCreditcoin.s.sol --rpc-url creditcoin_cc3 --broadcast
contract DeployCreditcoin is Script {
    address constant BLOCK_PROVER = 0x0000000000000000000000000000000000000FD2;
    address constant CHAIN_INFO = 0x0000000000000000000000000000000000000fD3;
    address constant EVM_V1_DECODER = 0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f;
    uint64 constant SEPOLIA_CHAIN_KEY = 1;

    function run() external {
        uint256 pk = vm.envUint("CC3_DEPLOYER_KEY");
        address deployer = vm.addr(pk);
        address executor = vm.envAddress("CC3_EXECUTOR_ADDR");
        address relayer = vm.envAddress("CC3_RELAYER_ADDR");
        uint16 feeBps = uint16(vm.envOr("SETLD_FEE_BPS", uint256(500)));

        vm.startBroadcast(pk);

        MockERC20 token = new MockERC20("setld test settlement token", "tSETLD");
        SetldAttestcoinAdapter adapter = new SetldAttestcoinAdapter(BLOCK_PROVER, CHAIN_INFO, EVM_V1_DECODER);

        // vault + registry take the core address; core takes vault + registry. Predict core.
        uint64 nonce = vm.getNonce(deployer);
        address predictedCore = vm.computeCreateAddress(deployer, nonce + 2);
        SetldVault vault = new SetldVault(predictedCore, deployer);
        SetldExecutorRegistry registry = new SetldExecutorRegistry(predictedCore);
        SetldCore core = new SetldCore(address(vault), address(registry), deployer, deployer, feeBps, 0);
        require(address(core) == predictedCore, "core address prediction failed");

        bytes32 templateId = keccak256("treasury-rebalance-v1");
        core.registerTemplate(
            templateId,
            1,
            SetldCore.TemplateConfig({
                adapter: address(adapter),
                sourceChainKey: SEPOLIA_CHAIN_KEY,
                minDeadlineBlocks: 1,
                maxDeadlineBlocks: 5_000_000,
                active: true
            })
        );

        // working capital: mint tSETLD to deployer (acts as creator) and to the executor
        token.mint(deployer, 1_000_000_000 ether);
        token.mint(executor, 1_000_000_000 ether);

        // fund executor + relayer with native tCTC for gas
        payable(executor).transfer(2000 ether);
        payable(relayer).transfer(2000 ether);

        vm.stopBroadcast();

        console2.log("CC3_TOKEN", address(token));
        console2.log("CC3_ADAPTER", address(adapter));
        console2.log("CC3_VAULT", address(vault));
        console2.log("CC3_EXECUTOR_REGISTRY", address(registry));
        console2.log("CC3_CORE", address(core));
        console2.log("CC3_TEMPLATE_ID");
        console2.logBytes32(templateId);
        console2.log("CC3_OPERATOR", deployer);
    }
}
