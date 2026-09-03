// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {VerifiedExecution} from "../adapters/SetldAttestcoinAdapter.sol";
import {DecodedLog} from "../adapters/IAttestcoinPrecompiles.sol";

/// @notice Committed typed terms for a treasury-rebalance mandate (PRD 14.2).
struct TreasuryRebalanceTerms {
    address router;
    address vault;
    address assetIn;
    address assetOut;
    uint256 maxAmountIn;
    uint256 minAmountOut;
    bytes4 selector;
    bytes32 routePolicyHash;
}

/// @notice PRD 12.9 evaluation codes. Structured, never a bare bool.
enum EvaluationCode {
    FULFILLED,
    WRONG_SOURCE_CHAIN,
    BEFORE_EXECUTION_START,
    AFTER_EXECUTION_DEADLINE,
    SENDER_NOT_BOUND_EXECUTOR,
    WRONG_TARGET,
    WRONG_SELECTOR,
    WRONG_MANDATE_BINDING,
    WRONG_ASSET_IN,
    WRONG_ASSET_OUT,
    AMOUNT_IN_ZERO,
    AMOUNT_IN_OVER_CAP,
    MIN_OUT_BELOW_FLOOR,
    RECEIPT_REVERTED,
    EVENT_MISSING,
    EVENT_WRONG_EMITTER,
    EVENT_WRONG_MANDATE,
    EVENT_WRONG_EXECUTOR,
    EVENT_OUTPUT_BELOW_MIN,
    SOURCE_TX_ALREADY_CONSUMED
}

struct Evaluation {
    EvaluationCode code;
    uint256 observedAmountIn;
    uint256 observedAmountOut;
    bytes32 matchedLogHash;
    uint8 failedStep; // 1..17, 0 when fulfilled
}

/// @title TreasuryRebalancePredicateV1
/// @notice Pure, reference-model-compatible predicate for the first template (PRD 13.5).
///         Evaluation order is exactly PRD 12.9. Every branch has a mirrored case in
///         `packages/reference-model` and a differential test (Gate S4/S6).
///
///         RebalanceExecuted(bytes32,address,address,address,uint256,uint256)
///         execute(bytes32,address,address,address,uint256,uint256)
library TreasuryRebalancePredicateV1 {
    bytes32 internal constant REBALANCE_EXECUTED_SIG =
        keccak256("RebalanceExecuted(bytes32,address,address,address,uint256,uint256)");
    bytes4 internal constant ROUTER_SELECTOR =
        bytes4(keccak256("execute(bytes32,address,address,address,uint256,uint256)"));

    struct Context {
        bytes32 mandateId;
        uint64 sourceChainKey;
        uint64 executionStartBlock;
        uint64 executionEndBlock;
        address boundExecutorSourceAddress;
        bool sourceTxKeyConsumed;
    }

    function _err(EvaluationCode code, uint8 step) private pure returns (Evaluation memory e) {
        e.code = code;
        e.failedStep = step;
    }

    function evaluate(TreasuryRebalanceTerms memory t, VerifiedExecution memory ve, Context memory ctx)
        internal
        pure
        returns (Evaluation memory)
    {
        // 1
        if (ve.sourceChainKey != ctx.sourceChainKey) return _err(EvaluationCode.WRONG_SOURCE_CHAIN, 1);
        // 2
        if (ve.blockHeight < ctx.executionStartBlock) return _err(EvaluationCode.BEFORE_EXECUTION_START, 2);
        // 3
        if (ve.blockHeight > ctx.executionEndBlock) return _err(EvaluationCode.AFTER_EXECUTION_DEADLINE, 3);
        // 4
        if (ve.txFrom != ctx.boundExecutorSourceAddress) return _err(EvaluationCode.SENDER_NOT_BOUND_EXECUTOR, 4);
        // 5
        if (ve.txTo != t.router) return _err(EvaluationCode.WRONG_TARGET, 5);
        // 6
        if (ve.selector != ROUTER_SELECTOR || ve.selector != t.selector) return _err(EvaluationCode.WRONG_SELECTOR, 6);

        (bytes32 callMandateId,, address callAssetIn, address callAssetOut, uint256 callAmountIn, uint256 callMinOut) =
            _decodeRouterCall(ve.txCalldata);

        // 7
        if (callMandateId != ctx.mandateId) return _err(EvaluationCode.WRONG_MANDATE_BINDING, 7);
        // 8
        if (callAssetIn != t.assetIn) return _err(EvaluationCode.WRONG_ASSET_IN, 8);
        // 9
        if (callAssetOut != t.assetOut) return _err(EvaluationCode.WRONG_ASSET_OUT, 9);
        // 10
        if (callAmountIn == 0) return _err(EvaluationCode.AMOUNT_IN_ZERO, 10);
        // 11
        if (callAmountIn > t.maxAmountIn) {
            Evaluation memory e = _err(EvaluationCode.AMOUNT_IN_OVER_CAP, 11);
            e.observedAmountIn = callAmountIn;
            return e;
        }
        // 12
        if (callMinOut < t.minAmountOut) return _err(EvaluationCode.MIN_OUT_BELOW_FLOOR, 12);
        // 13 — receipt status AFTER call-shape so a well-formed revert is EXECUTION_REVERTED
        if (ve.receiptStatus != 1) {
            Evaluation memory e = _err(EvaluationCode.RECEIPT_REVERTED, 13);
            e.observedAmountIn = callAmountIn;
            return e;
        }

        (bool found, DecodedLog memory log) = _findLog(ve.logs, REBALANCE_EXECUTED_SIG);
        // 14
        if (!found) return _err(EvaluationCode.EVENT_MISSING, 14);
        // 15
        if (log.address_ != t.vault) return _err(EvaluationCode.EVENT_WRONG_EMITTER, 15);

        (bytes32 evMandateId, address evExecutor,,, uint256 evAmountIn, uint256 evAmountOut) =
            _decodeRebalanceEvent(log);
        evAmountIn;

        // 16
        if (evMandateId != ctx.mandateId) return _err(EvaluationCode.EVENT_WRONG_MANDATE, 16);
        // 17a (kept within step 16..17 numbering as PRD 12.9 items 15-16)
        if (evExecutor != ve.txFrom) return _err(EvaluationCode.EVENT_WRONG_EXECUTOR, 16);
        // 17b
        if (evAmountOut < t.minAmountOut) {
            Evaluation memory e = _err(EvaluationCode.EVENT_OUTPUT_BELOW_MIN, 17);
            e.observedAmountOut = evAmountOut;
            return e;
        }
        // 17c — replay
        if (ctx.sourceTxKeyConsumed) return _err(EvaluationCode.SOURCE_TX_ALREADY_CONSUMED, 17);

        return Evaluation({
            code: EvaluationCode.FULFILLED,
            observedAmountIn: callAmountIn,
            observedAmountOut: evAmountOut,
            matchedLogHash: keccak256(abi.encode(log.address_, log.topics, log.data)),
            failedStep: 0
        });
    }

    function _decodeRouterCall(bytes memory data)
        private
        pure
        returns (bytes32 mandateId, address target, address assetIn, address assetOut, uint256 amountIn, uint256 minOut)
    {
        if (data.length < 4 + 6 * 32) return (bytes32(0), address(0), address(0), address(0), 0, 0);
        bytes memory body = new bytes(data.length - 4);
        for (uint256 i = 0; i < body.length; i++) {
            body[i] = data[i + 4];
        }
        (mandateId, target, assetIn, assetOut, amountIn, minOut) =
            abi.decode(body, (bytes32, address, address, address, uint256, uint256));
    }

    function _decodeRebalanceEvent(DecodedLog memory log)
        private
        pure
        returns (
            bytes32 mandateId,
            address executor,
            address assetIn,
            address assetOut,
            uint256 amountIn,
            uint256 amountOut
        )
    {
        (mandateId, executor, assetIn, assetOut, amountIn, amountOut) =
            abi.decode(log.data, (bytes32, address, address, address, uint256, uint256));
    }

    function _findLog(DecodedLog[] memory logs, bytes32 sig) private pure returns (bool found, DecodedLog memory out) {
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == sig) return (true, logs[i]);
        }
    }
}
