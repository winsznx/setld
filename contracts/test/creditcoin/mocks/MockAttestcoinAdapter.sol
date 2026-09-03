// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ISetldAttestcoinAdapter} from "../../../src/creditcoin/adapters/ISetldAttestcoinAdapter.sol";
import {VerifiedExecution} from "../../../src/creditcoin/adapters/SetldAttestcoinAdapter.sol";
import {MerkleProof, ContinuityProof} from "../../../src/creditcoin/adapters/IAttestcoinPrecompiles.sol";

/// @notice Test double: returns a preset VerifiedExecution, ignoring proof material.
///         Used only to drive SetldCore settlement economics against the parity corpus.
///         The real adapter's verification path is exercised by the on-chain S1 probe and
///         the live public campaign, never mocked in the submitted lifecycle.
contract MockAttestcoinAdapter is ISetldAttestcoinAdapter {
    bytes private _nextVe;

    function setNext(bytes calldata veAbi) external {
        _nextVe = veAbi;
    }

    function verifySingle(uint64, uint64, bytes calldata, MerkleProof calldata, ContinuityProof calldata)
        external
        view
        returns (VerifiedExecution memory)
    {
        return abi.decode(_nextVe, (VerifiedExecution));
    }

    function deriveSourceTxKey(uint64 chainKey, uint64 height, uint32 txIndex) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(chainKey, height, txIndex));
    }
}
