// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {
    TreasuryRebalancePredicateV1 as P,
    TreasuryRebalanceTerms,
    Evaluation,
    EvaluationCode
} from "../../src/creditcoin/templates/TreasuryRebalancePredicateV1.sol";
import {VerifiedExecution} from "../../src/creditcoin/adapters/SetldAttestcoinAdapter.sol";
import {DecodedLog} from "../../src/creditcoin/adapters/IAttestcoinPrecompiles.sol";

/// @notice Property tests for the predicate under fuzzed inputs (Gate S4 fuzz layer).
contract PredicateFuzzTest is Test {
    bytes4 constant SEL = bytes4(keccak256("execute(bytes32,address,address,address,uint256,uint256)"));
    bytes32 constant EVSIG = keccak256("RebalanceExecuted(bytes32,address,address,address,uint256,uint256)");

    address router = makeAddr("router");
    address vault = makeAddr("vault");
    address assetIn = makeAddr("assetIn");
    address assetOut = makeAddr("assetOut");
    address src = makeAddr("src");
    bytes32 mandateId = keccak256("m");

    function _terms(uint256 cap, uint256 floor) internal view returns (TreasuryRebalanceTerms memory) {
        return TreasuryRebalanceTerms(router, vault, assetIn, assetOut, cap, floor, SEL, keccak256("r"));
    }

    function _ctx(uint64 start, uint64 end, bool consumed) internal view returns (P.Context memory) {
        return P.Context(mandateId, 1, start, end, src, consumed);
    }

    function _validVe(uint256 amountIn, uint256 minOut, uint256 amountOut, uint64 blk)
        internal
        view
        returns (VerifiedExecution memory ve)
    {
        ve.sourceChainKey = 1;
        ve.blockHeight = blk;
        ve.transactionIndex = 1;
        ve.sourceTxKey = keccak256(abi.encodePacked(uint64(1), blk, uint32(1)));
        ve.txFrom = src;
        ve.txTo = router;
        ve.selector = SEL;
        ve.txCalldata = abi.encodePacked(SEL, abi.encode(mandateId, vault, assetIn, assetOut, amountIn, minOut));
        ve.receiptStatus = 1;
        ve.receiptGasUsed = 100000;
        DecodedLog[] memory logs = new DecodedLog[](1);
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = EVSIG;
        logs[0] = DecodedLog(vault, topics, abi.encode(mandateId, src, assetIn, assetOut, amountIn, amountOut));
        ve.logs = logs;
    }

    /// the predicate never reverts, whatever the calldata / logs look like
    function testFuzz_neverReverts(bytes calldata calldata_, uint8 status, uint64 blk) public view {
        VerifiedExecution memory ve;
        ve.sourceChainKey = 1;
        ve.blockHeight = blk;
        ve.txFrom = src;
        ve.txTo = router;
        ve.selector = calldata_.length >= 4 ? bytes4(calldata_[:4]) : bytes4(0);
        ve.txCalldata = calldata_;
        ve.receiptStatus = status;
        ve.logs = new DecodedLog[](0);
        P.evaluate(_terms(1e24, 1), ve, _ctx(0, type(uint64).max, false));
    }

    /// a fully valid execution within the window and cap always returns FULFILLED
    function testFuzz_validAlwaysFulfilled(uint256 amountIn, uint256 extra, uint64 blk) public view {
        amountIn = bound(amountIn, 1, 1e24);
        uint256 cap = amountIn + bound(extra, 0, 1e24);
        blk = uint64(bound(blk, 1000, 2000));
        VerifiedExecution memory ve = _validVe(amountIn, 9000, 9000, blk);
        Evaluation memory e = P.evaluate(_terms(cap, 9000), ve, _ctx(1000, 2000, false));
        assertEq(uint256(uint8(e.code)), uint256(uint8(EvaluationCode.FULFILLED)), "should be FULFILLED");
        assertEq(e.failedStep, 0);
    }

    /// amountIn strictly above the cap is always refused, even when the tx "succeeded"
    function testFuzz_overCapAlwaysRefused(uint256 cap, uint256 over) public view {
        cap = bound(cap, 1, 1e24 - 1);
        uint256 amountIn = cap + bound(over, 1, 1e24);
        VerifiedExecution memory ve = _validVe(amountIn, 9000, amountIn, 1500);
        Evaluation memory e = P.evaluate(_terms(cap, 9000), ve, _ctx(1000, 2000, false));
        assertEq(uint256(uint8(e.code)), uint256(uint8(EvaluationCode.AMOUNT_IN_OVER_CAP)));
        assertTrue(e.code != EvaluationCode.FULFILLED);
    }

    /// FULFILLED implies failedStep == 0; any non-FULFILLED implies failedStep in 1..17
    function testFuzz_stepConsistency(uint256 amountIn, uint256 cap, uint64 blk, uint8 status) public view {
        amountIn = bound(amountIn, 0, 1e24);
        cap = bound(cap, 1, 1e24);
        blk = uint64(bound(blk, 0, 4000));
        VerifiedExecution memory ve = _validVe(amountIn == 0 ? 0 : amountIn, 9000, 9000, blk);
        ve.receiptStatus = status;
        Evaluation memory e = P.evaluate(_terms(cap, 9000), ve, _ctx(1000, 2000, false));
        if (e.code == EvaluationCode.FULFILLED) {
            assertEq(e.failedStep, 0);
        } else {
            assertGt(e.failedStep, 0);
            assertLe(e.failedStep, 17);
        }
    }

    /// a consumed source tx key can never yield FULFILLED
    function testFuzz_replayNeverFulfilled(uint256 amountIn) public view {
        amountIn = bound(amountIn, 1, 1e18);
        VerifiedExecution memory ve = _validVe(amountIn, 9000, 9000, 1500);
        Evaluation memory e = P.evaluate(_terms(1e24, 9000), ve, _ctx(1000, 2000, true));
        assertTrue(e.code != EvaluationCode.FULFILLED);
    }
}
