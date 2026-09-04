// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {SetldVault} from "../../src/creditcoin/core/SetldVault.sol";
import {SetldExecutorRegistry} from "../../src/creditcoin/core/SetldExecutorRegistry.sol";
import {SetldCore} from "../../src/creditcoin/core/SetldCore.sol";
import {TreasuryRebalanceTerms, EvaluationCode} from "../../src/creditcoin/templates/TreasuryRebalancePredicateV1.sol";
import {
    MerkleProof,
    ContinuityProof,
    MerkleProofEntry,
    DecodedLog
} from "../../src/creditcoin/adapters/IAttestcoinPrecompiles.sol";
import {VerifiedExecution} from "../../src/creditcoin/adapters/SetldAttestcoinAdapter.sol";
import {MockAttestcoinAdapter} from "./mocks/MockAttestcoinAdapter.sol";
import {MockERC20} from "../../src/ethereum/MockERC20.sol";

/// @notice Gate S11 deterministic half: a 100-case frozen campaign across the PRD 4A.4
///         cohorts, run through the real SetldCore settlement path with a mock adapter.
///         Asserts the primary metric — invalid_reward_leakage — is exactly zero, and emits
///         per-cohort counts + a machine-readable summary to evidence/campaigns/.
contract DeterministicCampaignTest is Test {
    using stdJson for string;

    SetldVault vault;
    SetldExecutorRegistry registry;
    SetldCore core;
    MockAttestcoinAdapter adapter;
    MockERC20 token;

    uint256 constant SRC_PK = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    address src;
    address operator = address(0xF00D);
    address creator = address(0xC0FFEE);
    address executor = address(0xE0E0);
    address relayer = address(0x5EE);
    bytes32 templateId = keccak256("treasury-rebalance-v1");
    bytes32 executorId;

    bytes4 SEL = bytes4(keccak256("execute(bytes32,address,address,address,uint256,uint256)"));
    bytes32 EVSIG = keccak256("RebalanceExecuted(bytes32,address,address,address,uint256,uint256)");
    address rtr = makeAddr("rtr");
    address vlt = makeAddr("vlt");
    address aIn = makeAddr("aIn");
    address aOut = makeAddr("aOut");

    uint256 constant REWARD = 1_000_000;
    uint256 constant EBOND = 500_000;
    uint256 constant CBOND = 200_000;
    uint256 constant RBUD = 40_000;

    function setUp() public {
        src = vm.addr(SRC_PK);
        address predicted = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 2);
        vault = new SetldVault(predicted, operator);
        registry = new SetldExecutorRegistry(predicted);
        core = new SetldCore(address(vault), address(registry), operator, operator, 500, 0);
        adapter = new MockAttestcoinAdapter();
        token = new MockERC20("t", "t");
        vm.prank(operator);
        core.registerTemplate(templateId, 1, SetldCore.TemplateConfig(address(adapter), 1, 1, 5_000_000, true));
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

    function test_deterministic_campaign_100() public {
        uint256[6] memory cohort = [uint256(40), 20, 10, 10, 10, 10]; // valid, wrong-param, wrong-sender, reverted, after-deadline, replay
        string[6] memory names = ["valid", "wrong-param", "wrong-sender", "reverted", "after-deadline", "replay"];
        uint256[6] memory fulfilled;
        uint256[6] memory refused;
        uint256 invalidRewardLeakage;
        uint256 total;

        for (uint256 c = 0; c < 6; c++) {
            for (uint256 k = 0; k < cohort[c]; k++) {
                uint256 seed = total;
                bytes32 mId = _create(seed);
                vm.prank(executor);
                core.acceptMandate(mId);

                VerifiedExecution memory ve = _case(c, mId, seed);
                bool replay = c == 5;
                if (replay) {
                    // consume the key first via a throwaway sibling mandate
                    bytes32 sib = _create(seed + 10_000);
                    vm.prank(executor);
                    core.acceptMandate(sib);
                    adapter.setNext(abi.encode(ve));
                    _emptyProof();
                    vm.prank(relayer);
                    core.settle(sib, 1, ve.blockHeight, hex"00", _mp(), _cp());
                }

                adapter.setNext(abi.encode(ve));
                uint256 execBefore = token.balanceOf(executor);
                bool reverted;
                try core.settle(mId, 1, ve.blockHeight, hex"00", _mp(), _cp()) {}
                catch {
                    reverted = true;
                }
                vm.prank(relayer);
                if (reverted) {
                    // replay path: settle reverts SourceTxAlreadyConsumed — mandate stays ACCEPTED.
                    // Roll past this mandate's own proof deadline, then finalize as timeout.
                    uint64 pd = core.getMandate(mId).proofDeadline;
                    vm.roll(uint256(pd) + 1);
                    core.finalizeTimeout(mId);
                }

                SetldCore.State st = core.getMandate(mId).state;
                if (st == SetldCore.State.FULFILLED) {
                    fulfilled[c]++;
                    // a fulfilled case in a non-valid cohort would be reward leakage
                    if (c != 0) invalidRewardLeakage += REWARD;
                } else {
                    refused[c]++;
                }
                // reward must never reach the executor for a non-valid cohort
                if (c != 0) {
                    assertLe(
                        token.balanceOf(executor) - execBefore,
                        EBOND, // at most the bond back (reverted cohort keeps 75%); never + reward
                        string.concat("reward leaked in cohort ", names[c])
                    );
                }
                total++;
            }
        }

        assertEq(total, 100, "campaign size");
        assertEq(invalidRewardLeakage, 0, "PRIMARY METRIC: invalid_reward_leakage must be 0");
        assertEq(fulfilled[0], 40, "all 40 valid cases fulfilled");

        string memory out = "{";
        for (uint256 c = 0; c < 6; c++) {
            out = string.concat(
                out,
                '"',
                names[c],
                '":{"count":',
                vm.toString(cohort[c]),
                ',"fulfilled":',
                vm.toString(fulfilled[c]),
                ',"refused":',
                vm.toString(refused[c]),
                "}",
                c < 5 ? "," : ""
            );
        }
        out = string.concat(out, ',"invalid_reward_leakage":', vm.toString(invalidRewardLeakage), ',"total":100}');
        vm.writeFile("../evidence/campaigns/deterministic-100/summary.json", out);
        emit log_string(out);
    }

    // --- helpers ---

    function _terms() internal view returns (TreasuryRebalanceTerms memory) {
        return TreasuryRebalanceTerms(rtr, vlt, aIn, aOut, 100_000, 90_000, SEL, keccak256("r"));
    }

    function _create(uint256 salt) internal returns (bytes32) {
        SetldCore.Econ memory e = SetldCore.Econ(address(token), REWARD, address(token), EBOND, CBOND, RBUD);
        vm.prank(creator);
        return core.createMandate(
            templateId,
            1,
            _terms(),
            e,
            uint64(block.timestamp + 1 days),
            1_000,
            2_000,
            uint64(block.number + 500),
            bytes32(0),
            salt
        );
    }

    function _case(uint256 c, bytes32 mId, uint256 seed) internal view returns (VerifiedExecution memory ve) {
        uint256 amountIn = 40_000 + (seed % 20_000); // within cap for valid
        uint64 blk = 1_500;
        address from = src;
        uint256 status = 1;
        bytes32 callMandate = mId;
        bool goodEvent = true;

        if (c == 1) {
            // wrong param: amountIn over cap (variant), or wrong assetOut
            if (seed % 2 == 0) amountIn = 150_000 + (seed % 50_000);
            else callMandate = keccak256(abi.encode("wrong", seed));
        } else if (c == 2) {
            from = address(uint160(uint256(keccak256(abi.encode("badsender", seed)))));
        } else if (c == 3) {
            status = 0;
            goodEvent = false;
        } else if (c == 4) {
            blk = 2_500; // after executionEndBlock 2_000
        }

        ve.sourceChainKey = 1;
        ve.blockHeight = blk;
        ve.transactionIndex = uint32(seed + 1);
        ve.sourceTxKey = keccak256(abi.encodePacked(uint64(1), blk, uint32(seed + 1)));
        ve.txFrom = from;
        ve.txTo = rtr;
        ve.selector = SEL;
        ve.txCalldata = abi.encodePacked(SEL, abi.encode(callMandate, vlt, aIn, aOut, amountIn, uint256(90_000)));
        ve.receiptStatus = uint8(status);
        ve.receiptGasUsed = 100_000;
        if (goodEvent) {
            DecodedLog[] memory logs = new DecodedLog[](1);
            bytes32[] memory topics = new bytes32[](1);
            topics[0] = EVSIG;
            logs[0] = DecodedLog(vlt, topics, abi.encode(mId, from, aIn, aOut, amountIn, uint256(95_000)));
            ve.logs = logs;
        } else {
            ve.logs = new DecodedLog[](0);
        }
    }

    function _mp() internal pure returns (MerkleProof memory mp) {
        mp.siblings = new MerkleProofEntry[](0);
    }

    function _cp() internal pure returns (ContinuityProof memory cp) {
        cp.roots = new bytes32[](0);
    }

    function _emptyProof() internal {}

    function _bind() internal {
        uint256 expiry = block.timestamp + 1 days;
        bytes32 sh = keccak256(
            abi.encode(
                registry.BINDING_TYPEHASH(),
                executorId,
                executor,
                registry.SEPOLIA_CHAIN_ID(),
                src,
                address(registry),
                uint256(0),
                expiry
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", registry.DOMAIN_SEPARATOR(), sh));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SRC_PK, digest);
        vm.prank(executor);
        registry.bindSourceAddress(src, 0, expiry, abi.encodePacked(r, s, v));
    }
}
