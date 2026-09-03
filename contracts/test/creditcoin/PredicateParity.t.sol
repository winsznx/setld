// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {VerifiedExecution} from "../../src/creditcoin/adapters/SetldAttestcoinAdapter.sol";
import {DecodedLog} from "../../src/creditcoin/adapters/IAttestcoinPrecompiles.sol";
import {
    TreasuryRebalancePredicateV1 as Predicate,
    TreasuryRebalanceTerms,
    Evaluation
} from "../../src/creditcoin/templates/TreasuryRebalancePredicateV1.sol";

/// @notice Differential parity: the Solidity predicate must classify every canonical vector
///         in evidence/parity/vectors.json identically to the TS reference model that
///         produced it (GATES S4/S6). Any disagreement fails the build.
contract PredicateParityTest is Test {
    using stdJson for string;

    string json;
    TreasuryRebalanceTerms terms;
    bytes32 mandateId;
    uint64 startBlock;
    uint64 endBlock;
    uint64 sourceChainKey;
    address boundSource;

    function setUp() public {
        json = vm.readFile("../evidence/parity/vectors.json");
        mandateId = json.readBytes32(".mandate.mandateId");
        startBlock = uint64(json.readUint(".mandate.executionStartBlock"));
        endBlock = uint64(json.readUint(".mandate.executionEndBlock"));
        sourceChainKey = uint64(json.readUint(".mandate.sourceChainKey"));
        boundSource = json.readAddress(".mandate.acceptedSourceSender");

        terms = TreasuryRebalanceTerms({
            router: json.readAddress(".terms.router"),
            vault: json.readAddress(".terms.vault"),
            assetIn: json.readAddress(".terms.assetIn"),
            assetOut: json.readAddress(".terms.assetOut"),
            maxAmountIn: json.readUint(".terms.maxAmountIn"),
            minAmountOut: json.readUint(".terms.minAmountOut"),
            selector: bytes4(json.readBytes(".terms.selector")),
            routePolicyHash: json.readBytes32(".terms.routePolicyHash")
        });
    }

    function testPredicateMatchesReferenceModelForEveryVector() public view {
        uint256 n = 0;
        for (uint256 i = 0; i < 64; i++) {
            string memory base = string.concat(".vectors[", vm.toString(i), "]");
            if (!vm.keyExistsJson(json, string.concat(base, ".name"))) break;
            n = i + 1;

            string memory name = json.readString(string.concat(base, ".name"));
            bytes memory veHex = json.readBytes(string.concat(base, ".veAbiHex"));
            uint256 expectedCodeIndex = json.readUint(string.concat(base, ".expected.codeIndex"));
            uint256 expectedStep = json.readUint(string.concat(base, ".expected.failedStep"));
            bool replay = _eq(json.readString(string.concat(base, ".klass")), "replay");

            VerifiedExecution memory ve = abi.decode(veHex, (VerifiedExecution));

            Evaluation memory ev = Predicate.evaluate(
                terms,
                ve,
                Predicate.Context({
                    mandateId: mandateId,
                    sourceChainKey: sourceChainKey,
                    executionStartBlock: startBlock,
                    executionEndBlock: endBlock,
                    boundExecutorSourceAddress: boundSource,
                    sourceTxKeyConsumed: replay
                })
            );

            assertEq(uint256(uint8(ev.code)), expectedCodeIndex, string.concat("code mismatch for vector: ", name));
            assertEq(uint256(ev.failedStep), expectedStep, string.concat("failedStep mismatch for vector: ", name));
        }
        assertGt(n, 10, "expected at least 11 parity vectors");
    }

    function _eq(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
