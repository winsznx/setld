// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {VerifiedExecution} from "./SetldAttestcoinAdapter.sol";
import {MerkleProof, ContinuityProof} from "./IAttestcoinPrecompiles.sol";

interface ISetldAttestcoinAdapter {
    function verifySingle(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (VerifiedExecution memory);

    function deriveSourceTxKey(uint64 chainKey, uint64 height, uint32 txIndex) external pure returns (bytes32);
}
