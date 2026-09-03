// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {SetldVault} from "../../src/creditcoin/core/SetldVault.sol";
import {SetldExecutorRegistry} from "../../src/creditcoin/core/SetldExecutorRegistry.sol";
import {SetldCore} from "../../src/creditcoin/core/SetldCore.sol";
import {VerifiedExecution} from "../../src/creditcoin/adapters/SetldAttestcoinAdapter.sol";
import {TreasuryRebalanceTerms} from "../../src/creditcoin/templates/TreasuryRebalancePredicateV1.sol";
import {MerkleProof, ContinuityProof, MerkleProofEntry} from "../../src/creditcoin/adapters/IAttestcoinPrecompiles.sol";
import {MockAttestcoinAdapter} from "./mocks/MockAttestcoinAdapter.sol";
import {MockERC20} from "../../src/ethereum/MockERC20.sol";

/// @notice Differential parity, layer 2: SetldCore settlement economics must match the TS
///         reference model's transfer ledger for every applicable vector (GATES S6, PRD 4A.2).
///         Compares aggregate token-balance deltas per recipient against
///         evidence/parity/vectors.json `referenceModel.transfers`.
contract SettlementParityTest is Test {
    using stdJson for string;

    string json;
    SetldVault vault;
    SetldExecutorRegistry registry;
    SetldCore core;
    MockAttestcoinAdapter adapter;
    MockERC20 token;

    uint256 constant SRC_PK = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d; // anvil #1
    address srcAddr; // == vm.addr(SRC_PK) == parity acceptedSourceSender

    address operator = address(0xF00D);
    address feeRecipient;
    address creator;
    address executorCc;
    address submitter;

    bytes32 templateId = keccak256("treasury-rebalance-v1");
    uint16 constant FEE_BPS = 500;

    function setUp() public {
        json = vm.readFile("../evidence/parity/vectors.json");
        srcAddr = vm.addr(SRC_PK);
        feeRecipient = json.readAddress(".addresses.feeRecipient");
        creator = json.readAddress(".addresses.creator");
        executorCc = json.readAddress(".addresses.executorCc");
        submitter = json.readAddress(".addresses.submitter");

        address predictedCore = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 2);
        vault = new SetldVault(predictedCore, operator);
        registry = new SetldExecutorRegistry(predictedCore);
        core = new SetldCore(address(vault), address(registry), operator, feeRecipient, FEE_BPS, 0);
        require(address(core) == predictedCore, "core addr prediction");

        adapter = new MockAttestcoinAdapter();
        token = new MockERC20("Test Settlement Token", "tSETLD");

        vm.prank(operator);
        core.registerTemplate(
            templateId,
            1,
            SetldCore.TemplateConfig({
                adapter: address(adapter),
                sourceChainKey: uint64(json.readUint(".mandate.sourceChainKey")),
                minDeadlineBlocks: 1,
                maxDeadlineBlocks: 1_000_000,
                active: true
            })
        );

        // register executor + bind the parity source address via EIP-712
        vm.prank(executorCc);
        bytes32 executorId = registry.register();
        _bind(executorId);
    }

    function testSettlementEconomicsMatchReferenceModelForEveryVector() public {
        TreasuryRebalanceTerms memory baseTerms = _readTerms();
        uint256 rewardAmount = json.readUint(".mandate.econ.rewardAmount");
        uint256 executorBond = json.readUint(".mandate.econ.executorBond");
        uint256 creatorBond = json.readUint(".mandate.econ.creatorBond");
        uint256 relayerBudget = json.readUint(".mandate.econ.relayerBudget");

        uint256 checked;
        for (uint256 i = 0; i < 64; i++) {
            string memory base = string.concat(".vectors[", vm.toString(i), "]");
            if (!vm.keyExistsJson(json, string.concat(base, ".name"))) break;

            string memory terminal = json.readString(string.concat(base, ".expected.terminalState"));
            bool economic =
                _eq(terminal, "FULFILLED") || _eq(terminal, "INVALID_ATTEMPT") || _eq(terminal, "EXECUTION_REVERTED");
            if (!economic) continue;
            if (_eq(json.readString(string.concat(base, ".klass")), "replay")) continue;

            string memory name = json.readString(string.concat(base, ".name"));
            bytes memory veHex = json.readBytes(string.concat(base, ".veAbiHex"));

            // fresh mandate per vector (unique nonce)
            token.mint(creator, rewardAmount + creatorBond + relayerBudget);
            token.mint(executorCc, executorBond);
            vm.prank(creator);
            token.approve(address(vault), type(uint256).max);
            vm.prank(executorCc);
            token.approve(address(vault), type(uint256).max);

            SetldCore.Econ memory econ = SetldCore.Econ({
                rewardToken: address(token),
                rewardAmount: rewardAmount,
                bondToken: address(token),
                executorBond: executorBond,
                creatorBond: creatorBond,
                relayerBudget: relayerBudget
            });

            vm.prank(creator);
            bytes32 mandateId = core.createMandate(
                templateId, 1, baseTerms, econ, uint64(block.timestamp + 1 days), 1_000, 2_000, 3_000, bytes32(0), i
            );
            vm.prank(executorCc);
            core.acceptMandate(mandateId);

            // The parity VE embeds a fixed placeholder mandate id; substitute the real
            // domain-separated id derived by createMandate (the "wrong-mandate-binding"
            // vector deliberately keeps a mismatching id, so it is not patched).
            bool patch = !_eq(name, "wrong-mandate-binding");
            adapter.setNext(patch ? _patchMandateId(veHex, mandateId) : veHex);

            uint256 exBefore = token.balanceOf(executorCc);
            uint256 crBefore = token.balanceOf(creator);
            uint256 feBefore = token.balanceOf(feeRecipient);
            uint256 suBefore = token.balanceOf(submitter);

            MerkleProof memory mp;
            mp.siblings = new MerkleProofEntry[](0);
            ContinuityProof memory cp;
            cp.roots = new bytes32[](0);
            vm.prank(submitter);
            core.settle(mandateId, uint64(json.readUint(".mandate.sourceChainKey")), 1_500, hex"00", mp, cp);

            (uint256 expExec, uint256 expCreator, uint256 expFee, uint256 expSub) = _expectedByRecipient(base);

            assertEq(token.balanceOf(executorCc) - exBefore, expExec, string.concat("executor delta: ", name));
            assertEq(token.balanceOf(creator) - crBefore, expCreator, string.concat("creator delta: ", name));
            assertEq(token.balanceOf(feeRecipient) - feBefore, expFee, string.concat("fee delta: ", name));
            assertEq(token.balanceOf(submitter) - suBefore, expSub, string.concat("submitter delta: ", name));

            // vault holds nothing for a settled mandate (conservation)
            assertEq(vault.mandateEscrow(mandateId, address(token)), 0, string.concat("escrow drained: ", name));
            checked++;
        }
        assertGe(checked, 8, "expected >= 8 economic vectors");
    }

    function _expectedByRecipient(string memory base)
        private
        view
        returns (uint256 exExec, uint256 exCreator, uint256 exFee, uint256 exSub)
    {
        for (uint256 k = 0; k < 12; k++) {
            string memory tp = string.concat(base, ".referenceModel.transfers[", vm.toString(k), "]");
            if (!vm.keyExistsJson(json, string.concat(tp, ".to"))) break;
            address to = json.readAddress(string.concat(tp, ".to"));
            uint256 amt = _toUint(json.readString(string.concat(tp, ".amount")));
            if (to == executorCc) exExec += amt;
            else if (to == creator) exCreator += amt;
            else if (to == feeRecipient) exFee += amt;
            else if (to == submitter) exSub += amt;
            else revert(string.concat("unexpected transfer recipient in vector"));
        }
    }

    bytes32 constant PLACEHOLDER_MANDATE_ID = keccak256("parity-mandate");

    /// @dev Rewrites the placeholder mandate id inside the VE's router calldata (bytes 4..36)
    ///      and every RebalanceExecuted log's data head (bytes 0..32) to `realId`.
    function _patchMandateId(bytes memory veAbi, bytes32 realId) private pure returns (bytes memory) {
        VerifiedExecution memory ve = abi.decode(veAbi, (VerifiedExecution));
        bytes memory cd = ve.txCalldata;
        if (cd.length >= 36) {
            for (uint256 k = 0; k < 32; k++) {
                cd[4 + k] = bytes1(uint8(uint256(realId) >> (8 * (31 - k))));
            }
        }
        for (uint256 j = 0; j < ve.logs.length; j++) {
            bytes memory d = ve.logs[j].data;
            if (d.length >= 32 && bytes32(_slice32(d, 0)) == PLACEHOLDER_MANDATE_ID) {
                for (uint256 k = 0; k < 32; k++) {
                    d[k] = bytes1(uint8(uint256(realId) >> (8 * (31 - k))));
                }
            }
        }
        return abi.encode(ve);
    }

    function _slice32(bytes memory b, uint256 off) private pure returns (bytes32 out) {
        assembly {
            out := mload(add(add(b, 0x20), off))
        }
    }

    function _readTerms() private view returns (TreasuryRebalanceTerms memory t) {
        t = TreasuryRebalanceTerms({
            router: json.readAddress(".terms.router"),
            vault: json.readAddress(".terms.vault"),
            assetIn: json.readAddress(".terms.assetIn"),
            assetOut: json.readAddress(".terms.assetOut"),
            maxAmountIn: _toUint(json.readString(".terms.maxAmountIn")),
            minAmountOut: _toUint(json.readString(".terms.minAmountOut")),
            selector: bytes4(json.readBytes(".terms.selector")),
            routePolicyHash: json.readBytes32(".terms.routePolicyHash")
        });
    }

    function _bind(bytes32 executorId) private {
        uint256 expiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(
            abi.encode(
                registry.BINDING_TYPEHASH(),
                executorId,
                executorCc,
                registry.SEPOLIA_CHAIN_ID(),
                srcAddr,
                address(registry),
                uint256(0),
                expiry
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", registry.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SRC_PK, digest);
        vm.prank(executorCc);
        registry.bindSourceAddress(srcAddr, 0, expiry, abi.encodePacked(r, s, v));
        assertEq(registry.activeSourceAddress(executorId), srcAddr);
    }

    function _eq(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function _toUint(string memory s) private pure returns (uint256 out) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            out = out * 10 + (uint8(b[i]) - 48);
        }
    }
}
