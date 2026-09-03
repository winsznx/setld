// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @dev Minimal bindings for the Attestcoin native-verifier stack on Creditcoin CC3 testnet.
///      Addresses and shapes pinned from S0/S1 probe (evidence/manifests/environment.json):
///        BlockProver precompile : 0x0000000000000000000000000000000000000FD2
///        ChainInfo  precompile  : 0x0000000000000000000000000000000000000fd3
///        EvmV1Decoder library   : 0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f
///      ABI taken from @gluwa/usc-sdk@0.18.0 (block_prover.json, evmV1DecoderAbi.json).

struct MerkleProofEntry {
    bytes32 hash;
    bool isLeft;
}

struct MerkleProof {
    bytes32 root;
    MerkleProofEntry[] siblings;
}

struct ContinuityProof {
    bytes32 lowerEndpointDigest;
    bytes32[] roots;
}

interface INativeQueryVerifier {
    /// @notice Verifies a single source transaction proof against attested continuity. View.
    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    function calculateTxIndex(MerkleProof calldata merkleProof) external view returns (uint64);
}

interface IChainInfo {
    function is_height_attested(uint64 chainKey, uint64 height) external view returns (bool);
    function get_latest_attestation_height_and_hash(uint64 chainKey)
        external
        view
        returns (uint64 height, bytes32 hash, bool isAttestation, bool exists);
}

// --- EvmV1Decoder library structs (subset used by setld) ---

struct CommonTxFields {
    uint64 nonce;
    uint64 gasLimit;
    address from;
    bool toIsNull;
    address to;
    uint256 value;
    bytes data;
}

struct DecodedLog {
    address address_;
    bytes32[] topics;
    bytes data;
}

struct ReceiptFields {
    uint8 receiptStatus;
    uint64 receiptGasUsed;
    DecodedLog[] receiptLogs;
    bytes receiptLogsBloom;
}

interface IEvmV1Decoder {
    function getTransactionType(bytes calldata encoded) external pure returns (uint8);
    function isValidTransactionType(uint8 txType) external pure returns (bool);
    function decodeCommonTxFields(bytes calldata encoded) external pure returns (CommonTxFields memory);
    function decodeReceiptFields(bytes calldata encoded) external pure returns (ReceiptFields memory);
    function getLogsByEventSignature(DecodedLog[] calldata logs, bytes32 topic0)
        external
        pure
        returns (DecodedLog[] memory);
}
