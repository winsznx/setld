// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {
    INativeQueryVerifier,
    IChainInfo,
    IEvmV1Decoder,
    MerkleProof,
    ContinuityProof,
    CommonTxFields,
    ReceiptFields,
    DecodedLog
} from "./IAttestcoinPrecompiles.sol";

/// @notice Normalized, predicate-ready view of one Attestcoin-verified source transaction.
///         Field set matches @setld/protocol-types VerifiedExecution and the S1 field matrix.
struct VerifiedExecution {
    uint64 sourceChainKey;
    uint64 blockHeight;
    uint32 transactionIndex;
    bytes32 sourceTxKey;
    address txFrom;
    address txTo;
    bool txToIsNull;
    uint256 txValue;
    bytes4 selector;
    bytes txCalldata;
    uint8 receiptStatus;
    uint64 receiptGasUsed;
    DecodedLog[] logs;
}

/// @title SetldAttestcoinAdapter
/// @notice Wraps the current native-verifier path (PRD 13.3). One proof envelope carries the
///         transaction AND its receipt (DECISIONS.md D2), so there is no separate receipt
///         proof: `verify` attests the envelope, `EvmV1Decoder` reads both halves out of the
///         same bytes.
///
///         The adapter proves inclusion and normalizes fields. It never decides mandate
///         success — that is the predicate's job (PRD 12.8 last line). It fails closed:
///         a false `verify` result or an unsupported tx type reverts, it does not fall back
///         to any RPC-derived value.
contract SetldAttestcoinAdapter {
    INativeQueryVerifier public immutable verifier;
    IChainInfo public immutable chainInfo;
    IEvmV1Decoder public immutable decoder;

    error AttestcoinProofInvalid();
    error AttestcoinUnavailable();
    error UnsupportedTransactionType(uint8 txType);
    error SourceBlockNotAttested(uint64 chainKey, uint64 height);

    constructor(address _verifier, address _chainInfo, address _decoder) {
        verifier = INativeQueryVerifier(_verifier);
        chainInfo = IChainInfo(_chainInfo);
        decoder = IEvmV1Decoder(_decoder);
    }

    function deriveSourceTxKey(uint64 chainKey, uint64 height, uint32 txIndex) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(chainKey, height, txIndex));
    }

    /// @notice Verify a single source transaction and return its normalized fields.
    /// @dev View: callers (the settlement engine) invoke this inside a state-changing tx and
    ///      then persist the consumed `sourceTxKey`. Any address may supply identical valid
    ///      proof material — nothing here reads `msg.sender` (PRD 17.6 neutrality).
    function verifySingle(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (VerifiedExecution memory ve) {
        if (!chainInfo.is_height_attested(chainKey, height)) {
            revert SourceBlockNotAttested(chainKey, height);
        }

        bool ok = verifier.verify(chainKey, height, encodedTransaction, merkleProof, continuityProof);
        if (!ok) revert AttestcoinProofInvalid();

        uint64 txIndex = verifier.calculateTxIndex(merkleProof);
        require(txIndex <= type(uint32).max, "txIndex overflow");

        uint8 txType = decoder.getTransactionType(encodedTransaction);
        if (!decoder.isValidTransactionType(txType)) revert UnsupportedTransactionType(txType);

        CommonTxFields memory c = decoder.decodeCommonTxFields(encodedTransaction);
        ReceiptFields memory r = decoder.decodeReceiptFields(encodedTransaction);

        ve.sourceChainKey = chainKey;
        ve.blockHeight = height;
        ve.transactionIndex = uint32(txIndex);
        ve.sourceTxKey = deriveSourceTxKey(chainKey, height, uint32(txIndex));
        ve.txFrom = c.from;
        ve.txTo = c.to;
        ve.txToIsNull = c.toIsNull;
        ve.txValue = c.value;
        ve.selector = _selectorOf(c.data);
        ve.txCalldata = c.data;
        ve.receiptStatus = r.receiptStatus;
        ve.receiptGasUsed = r.receiptGasUsed;
        ve.logs = r.receiptLogs;
    }

    function _selectorOf(bytes memory data) private pure returns (bytes4 s) {
        if (data.length < 4) return bytes4(0);
        assembly {
            s := mload(add(data, 0x20))
        }
    }

    /// @notice First log whose topic0 matches `eventSig`, or a zero-length struct if none.
    function findLog(DecodedLog[] memory logs, bytes32 eventSig)
        external
        pure
        returns (bool found, DecodedLog memory log)
    {
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == eventSig) {
                return (true, logs[i]);
            }
        }
    }
}
