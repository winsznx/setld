// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {SetldVault} from "../../src/creditcoin/core/SetldVault.sol";
import {SetldExecutorRegistry} from "../../src/creditcoin/core/SetldExecutorRegistry.sol";
import {SetldCore} from "../../src/creditcoin/core/SetldCore.sol";
import {TreasuryRebalanceTerms} from "../../src/creditcoin/templates/TreasuryRebalancePredicateV1.sol";
import {
    MerkleProof,
    ContinuityProof,
    MerkleProofEntry,
    DecodedLog
} from "../../src/creditcoin/adapters/IAttestcoinPrecompiles.sol";
import {VerifiedExecution} from "../../src/creditcoin/adapters/SetldAttestcoinAdapter.sol";
import {MockAttestcoinAdapter} from "./mocks/MockAttestcoinAdapter.sol";
import {MockERC20} from "../../src/ethereum/MockERC20.sol";

/// @notice PRD 15.1 state-machine + settlement-guard coverage for SetldCore (Gate S6).
contract CoreLifecycleTest is Test {
    SetldVault vault;
    SetldExecutorRegistry registry;
    SetldCore core;
    MockAttestcoinAdapter adapter;
    MockERC20 token;

    uint256 constant SRC_PK = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    address srcAddr;
    address operator = address(0xF00D);
    address creator = address(0xC0FFEE);
    address executor = address(0xE0E0);
    address relayer = address(0x5EE);
    bytes32 templateId = keccak256("treasury-rebalance-v1");
    bytes32 executorId;

    function setUp() public {
        srcAddr = vm.addr(SRC_PK);
        address predicted = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 2);
        vault = new SetldVault(predicted, operator);
        registry = new SetldExecutorRegistry(predicted);
        core = new SetldCore(address(vault), address(registry), operator, operator, 500, 0);
        adapter = new MockAttestcoinAdapter();
        token = new MockERC20("t", "t");

        vm.prank(operator);
        core.registerTemplate(
            templateId,
            1,
            SetldCore.TemplateConfig({
                adapter: address(adapter),
                sourceChainKey: 1,
                minDeadlineBlocks: 1,
                maxDeadlineBlocks: 5_000_000,
                active: true
            })
        );

        vm.prank(executor);
        executorId = registry.register();
        _bind();

        token.mint(creator, 1e30);
        token.mint(executor, 1e30);
        vm.prank(creator);
        token.approve(address(vault), type(uint256).max);
        vm.prank(executor);
        token.approve(address(vault), type(uint256).max);
    }

    function _terms() internal returns (TreasuryRebalanceTerms memory) {
        return TreasuryRebalanceTerms({
            router: makeAddr("router"),
            vault: makeAddr("srcVault"),
            assetIn: makeAddr("assetIn"),
            assetOut: makeAddr("assetOut"),
            maxAmountIn: 100_000,
            minAmountOut: 90_000,
            selector: bytes4(keccak256("execute(bytes32,address,address,address,uint256,uint256)")),
            routePolicyHash: keccak256("r")
        });
    }

    function _econ() internal view returns (SetldCore.Econ memory) {
        return SetldCore.Econ({
            rewardToken: address(token),
            rewardAmount: 1_000_000,
            bondToken: address(token),
            executorBond: 500_000,
            creatorBond: 200_000,
            relayerBudget: 40_000
        });
    }

    function _create(uint256 salt) internal returns (bytes32) {
        vm.prank(creator);
        return core.createMandate(
            templateId, 1, _terms(), _econ(), uint64(block.timestamp + 1 days), 1_000, 2_000, 3_000, bytes32(0), salt
        );
    }

    function _bind() internal {
        uint256 expiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(
            abi.encode(
                registry.BINDING_TYPEHASH(),
                executorId,
                executor,
                registry.SEPOLIA_CHAIN_ID(),
                srcAddr,
                address(registry),
                uint256(0),
                expiry
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", registry.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SRC_PK, digest);
        vm.prank(executor);
        registry.bindSourceAddress(srcAddr, 0, expiry, abi.encodePacked(r, s, v));
    }

    function test_cancel_returns_all_creator_funds() public {
        bytes32 m = _create(1);
        uint256 before = token.balanceOf(creator);
        vm.prank(creator);
        core.cancelMandate(m);
        assertEq(token.balanceOf(creator), before + 1_240_000); // reward + creatorBond + relayerBudget
        assertEq(uint256(core.getMandate(m).state), uint256(SetldCore.State.CANCELLED));
    }

    function test_cancel_only_creator_only_open() public {
        bytes32 m = _create(2);
        vm.expectRevert();
        vm.prank(executor);
        core.cancelMandate(m);

        vm.prank(executor);
        core.acceptMandate(m);
        vm.expectRevert();
        vm.prank(creator);
        core.cancelMandate(m);
    }

    function test_release_before_execution_applies_reservation_penalty() public {
        bytes32 m = _create(3);
        vm.prank(executor);
        core.acceptMandate(m);
        vm.roll(999); // still before executionStartBlock (1_000) on this chain's block number
        uint256 exBefore = token.balanceOf(executor);
        uint256 crBefore = token.balanceOf(creator);
        vm.prank(executor);
        core.releaseMandate(m);
        assertEq(uint256(core.getMandate(m).state), uint256(SetldCore.State.RELEASED));
        // 10% of 500_000 = 50_000 penalty to creator; 450_000 back to executor
        assertEq(token.balanceOf(executor), exBefore + 450_000);
        assertEq(token.balanceOf(creator), crBefore + 1_000_000 + 200_000 + 40_000 + 50_000);
    }

    function test_timeout_after_proof_deadline() public {
        bytes32 m = _create(4);
        vm.prank(executor);
        core.acceptMandate(m);
        vm.expectRevert(); // before proof deadline
        core.finalizeTimeout(m);

        vm.roll(3_001);
        uint256 crBefore = token.balanceOf(creator);
        core.finalizeTimeout(m); // permissionless
        assertEq(uint256(core.getMandate(m).state), uint256(SetldCore.State.TIMED_OUT));
        // reward refunded + 50% bond penalty + creatorBond + relayerBudget
        assertEq(token.balanceOf(creator), crBefore + 1_000_000 + 250_000 + 200_000 + 40_000);
    }

    function test_double_settle_rejected() public {
        bytes32 m = _create(5);
        vm.prank(executor);
        core.acceptMandate(m);
        adapter.setNext(_validVe(m));

        MerkleProof memory mp;
        mp.siblings = new MerkleProofEntry[](0);
        ContinuityProof memory cp;
        cp.roots = new bytes32[](0);
        vm.prank(relayer);
        core.settle(m, 1, 1_500, hex"00", mp, cp);
        assertEq(uint256(core.getMandate(m).state), uint256(SetldCore.State.FULFILLED));

        vm.expectRevert(); // mandate no longer ACCEPTED
        vm.prank(relayer);
        core.settle(m, 1, 1_500, hex"00", mp, cp);
    }

    function test_same_source_tx_cannot_settle_two_mandates() public {
        bytes32 m1 = _create(6);
        bytes32 m2 = _create(7);
        vm.prank(executor);
        core.acceptMandate(m1);
        vm.prank(executor);
        core.acceptMandate(m2);

        MerkleProof memory mp;
        mp.siblings = new MerkleProofEntry[](0);
        ContinuityProof memory cp;
        cp.roots = new bytes32[](0);

        adapter.setNext(_validVe(m1));
        vm.prank(relayer);
        core.settle(m1, 1, 1_500, hex"00", mp, cp);

        // reuse the exact same VE (same sourceTxKey) for m2
        adapter.setNext(_validVe(m1));
        vm.expectRevert(abi.encodeWithSignature("SourceTxAlreadyConsumed(bytes32)", _key(1, 1_500, 7)));
        vm.prank(relayer);
        core.settle(m2, 1, 1_500, hex"00", mp, cp);
    }

    function _key(uint64 ck, uint64 h, uint32 idx) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(ck, h, idx));
    }

    function _validVe(bytes32 mandateId) internal returns (bytes memory) {
        TreasuryRebalanceTerms memory t = _terms();
        bytes memory cd = abi.encodePacked(
            t.selector, abi.encode(mandateId, t.vault, t.assetIn, t.assetOut, uint256(50_000), uint256(90_000))
        );
        VerifiedExecution memory ve;
        ve.sourceChainKey = 1;
        ve.blockHeight = 1_500;
        ve.transactionIndex = 7;
        ve.sourceTxKey = _key(1, 1_500, 7);
        ve.txFrom = srcAddr;
        ve.txTo = t.router;
        ve.selector = t.selector;
        ve.txCalldata = cd;
        ve.receiptStatus = 1;
        ve.receiptGasUsed = 100_000;

        bytes32[] memory topics = new bytes32[](1);
        topics[0] = keccak256("RebalanceExecuted(bytes32,address,address,address,uint256,uint256)");
        DecodedLog[] memory logs = new DecodedLog[](1);
        logs[0] = DecodedLog({
            address_: t.vault,
            topics: topics,
            data: abi.encode(mandateId, srcAddr, t.assetIn, t.assetOut, uint256(50_000), uint256(95_000))
        });
        ve.logs = logs;
        return abi.encode(ve);
    }
}
