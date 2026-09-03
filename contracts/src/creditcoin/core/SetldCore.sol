// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SetldVault} from "./SetldVault.sol";
import {SetldExecutorRegistry} from "./SetldExecutorRegistry.sol";
import {VerifiedExecution} from "../adapters/SetldAttestcoinAdapter.sol";
import {ISetldAttestcoinAdapter} from "../adapters/ISetldAttestcoinAdapter.sol";
import {MerkleProof, ContinuityProof} from "../adapters/IAttestcoinPrecompiles.sol";
import {
    TreasuryRebalancePredicateV1 as Predicate,
    TreasuryRebalanceTerms,
    Evaluation,
    EvaluationCode
} from "../templates/TreasuryRebalancePredicateV1.sol";

/// @title SetldCore
/// @notice Mandate lifecycle, template configuration, settlement and fees for setld v1
///         (collapse rationale in DECISIONS.md D6). Source-transaction consumption and the
///         terminal-state update happen atomically inside `settle` (PRD 15.1). The address
///         that submits proof (`msg.sender` in `settle`) receives only the fixed relayer
///         reimbursement and never influences classification or the reward beneficiary
///         (PRD 17.6).
contract SetldCore {
    enum State {
        NONE,
        OPEN,
        ACCEPTED,
        CANCELLED,
        RELEASED,
        FULFILLED,
        INVALID_ATTEMPT,
        EXECUTION_REVERTED,
        TIMED_OUT
    }

    struct Econ {
        address rewardToken;
        uint256 rewardAmount;
        address bondToken;
        uint256 executorBond;
        uint256 creatorBond;
        uint256 relayerBudget;
    }

    struct Mandate {
        address creator;
        bytes32 templateId;
        uint32 templateVersion;
        uint64 sourceChainKey;
        uint64 acceptanceDeadline;
        uint64 executionStartBlock;
        uint64 executionEndBlock;
        uint64 proofDeadline;
        address acceptedExecutor;
        bytes32 acceptedExecutorId;
        address acceptedSourceSender;
        bytes32 termsHash;
        bytes32 metadataHash;
        State state;
        Econ econ;
    }

    struct TemplateConfig {
        address adapter;
        uint64 sourceChainKey;
        uint256 minDeadlineBlocks;
        uint256 maxDeadlineBlocks;
        bool active;
    }

    // PRD 16.4 default schedule (bps of executor bond). Immutable for v1.
    uint16 public constant PENALTY_INVALID_BPS = 10_000;
    uint16 public constant PENALTY_REVERTED_BPS = 2_500;
    uint16 public constant PENALTY_TIMEOUT_BPS = 5_000;
    uint16 public constant PENALTY_RELEASE_BPS = 1_000;

    SetldVault public immutable vault;
    SetldExecutorRegistry public immutable executors;
    address public immutable operator;
    address public immutable feeRecipient;
    uint16 public immutable protocolFeeBps;
    uint16 public immutable creationFeeBps;

    mapping(bytes32 => TemplateConfig) public templates;
    mapping(bytes32 => TreasuryRebalanceTerms) private _terms;
    mapping(bytes32 => Mandate) private _mandates;
    mapping(uint256 => bool) private _usedNonce; // creator-scoped via mandateId derivation; kept for clarity
    mapping(bytes32 => bool) public consumedSourceTxKey;
    uint256 public mandateCount;

    error NotOperator();
    error NotCreator();
    error NotAcceptedExecutor();
    error TemplateInactive(bytes32 templateId);
    error BadState(State have, State want);
    error DeadlineInPast();
    error DeadlineWindowInvalid();
    error ProofDeadlineTooEarly();
    error ZeroAmount();
    error AcceptanceClosed();
    error ExecutorNotBound();
    error SourceTxAlreadyConsumed(bytes32 key);
    error ProofDeadlineNotReached();
    error MandateNotFound();

    event TemplateRegistered(bytes32 indexed templateId, uint32 version, address adapter, uint64 sourceChainKey);
    event MandateCreated(
        bytes32 indexed mandateId, address indexed creator, bytes32 indexed templateId, bytes32 termsHash
    );
    event MandateAccepted(
        bytes32 indexed mandateId, address indexed executor, bytes32 executorId, address sourceSender
    );
    event MandateCancelled(bytes32 indexed mandateId);
    event MandateReleased(bytes32 indexed mandateId, uint256 reservationPenalty);
    event MandateSettled(
        bytes32 indexed mandateId,
        State terminalState,
        uint8 evaluationCode,
        uint8 failedStep,
        bytes32 sourceTxKey,
        bytes32 settlementTraceHash
    );
    event MandateTimedOut(bytes32 indexed mandateId);

    constructor(
        address _vault,
        address _executors,
        address _operator,
        address _feeRecipient,
        uint16 _protocolFeeBps,
        uint16 _creationFeeBps
    ) {
        vault = SetldVault(_vault);
        executors = SetldExecutorRegistry(_executors);
        operator = _operator;
        feeRecipient = _feeRecipient;
        protocolFeeBps = _protocolFeeBps;
        creationFeeBps = _creationFeeBps;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    function registerTemplate(bytes32 templateId, uint32 version, TemplateConfig calldata cfg) external onlyOperator {
        templates[templateId] = cfg;
        emit TemplateRegistered(templateId, version, cfg.adapter, cfg.sourceChainKey);
    }

    function getMandate(bytes32 mandateId) external view returns (Mandate memory m) {
        m = _mandates[mandateId];
        if (m.state == State.NONE) revert MandateNotFound();
    }

    function getTerms(bytes32 mandateId) external view returns (TreasuryRebalanceTerms memory) {
        return _terms[mandateId];
    }

    // --- lifecycle ---

    function createMandate(
        bytes32 templateId,
        uint32 templateVersion,
        TreasuryRebalanceTerms calldata terms,
        Econ calldata econ,
        uint64 acceptanceDeadline,
        uint64 executionStartBlock,
        uint64 executionEndBlock,
        uint64 proofDeadline,
        bytes32 metadataHash,
        uint256 nonce
    ) external returns (bytes32 mandateId) {
        TemplateConfig memory cfg = templates[templateId];
        if (!cfg.active) revert TemplateInactive(templateId);
        if (acceptanceDeadline <= block.timestamp) revert DeadlineInPast();
        if (executionEndBlock <= executionStartBlock) revert DeadlineWindowInvalid();
        // execution*Block are SOURCE-chain (Sepolia) block numbers; proofDeadline is a
        // CREDITCOIN block number (PRD 17.5, different clocks). It only has to be in this
        // chain's future so finalizeTimeout has a well-defined trigger.
        if (proofDeadline <= block.number) revert ProofDeadlineTooEarly();
        if (econ.rewardAmount == 0 || econ.executorBond == 0 || econ.creatorBond == 0) revert ZeroAmount();

        bytes32 termsHash = keccak256(abi.encode(terms));
        mandateId = keccak256(abi.encodePacked(block.chainid, address(this), msg.sender, nonce, templateId, termsHash));
        require(_mandates[mandateId].state == State.NONE, "mandate exists");

        _terms[mandateId] = terms;
        Mandate storage m = _mandates[mandateId];
        m.creator = msg.sender;
        m.templateId = templateId;
        m.templateVersion = templateVersion;
        m.sourceChainKey = cfg.sourceChainKey;
        m.acceptanceDeadline = acceptanceDeadline;
        m.executionStartBlock = executionStartBlock;
        m.executionEndBlock = executionEndBlock;
        m.proofDeadline = proofDeadline;
        m.termsHash = termsHash;
        m.metadataHash = metadataHash;
        m.state = State.OPEN;
        m.econ = econ;

        // escrow reward + creator bond atomically with publication (PRD 12.3)
        vault.deposit(mandateId, econ.rewardToken, msg.sender, econ.rewardAmount);
        vault.deposit(mandateId, econ.bondToken, msg.sender, econ.creatorBond + econ.relayerBudget);

        mandateCount++;
        emit MandateCreated(mandateId, msg.sender, templateId, termsHash);
    }

    function acceptMandate(bytes32 mandateId) external {
        Mandate storage m = _mandates[mandateId];
        if (m.state != State.OPEN) revert BadState(m.state, State.OPEN);
        if (block.timestamp > m.acceptanceDeadline) revert AcceptanceClosed();

        bytes32 executorId = executors.executorIdOf(msg.sender);
        if (executorId == bytes32(0)) revert ExecutorNotBound();
        address sourceSender = executors.activeSourceAddress(executorId); // reverts if no active binding

        m.acceptedExecutor = msg.sender;
        m.acceptedExecutorId = executorId;
        m.acceptedSourceSender = sourceSender;
        m.state = State.ACCEPTED;

        executors.lockForMandate(executorId);
        vault.deposit(mandateId, m.econ.bondToken, msg.sender, m.econ.executorBond);

        emit MandateAccepted(mandateId, msg.sender, executorId, sourceSender);
    }

    function cancelMandate(bytes32 mandateId) external {
        Mandate storage m = _mandates[mandateId];
        if (m.state != State.OPEN) revert BadState(m.state, State.OPEN);
        if (msg.sender != m.creator) revert NotCreator();
        m.state = State.CANCELLED;
        vault.pay(mandateId, m.econ.rewardToken, m.creator, m.econ.rewardAmount, "reward-refund");
        vault.pay(
            mandateId, m.econ.bondToken, m.creator, m.econ.creatorBond + m.econ.relayerBudget, "creator-bond-return"
        );
        emit MandateCancelled(mandateId);
    }

    function releaseMandate(bytes32 mandateId) external {
        Mandate storage m = _mandates[mandateId];
        if (m.state != State.ACCEPTED) revert BadState(m.state, State.ACCEPTED);
        if (msg.sender != m.acceptedExecutor) revert NotAcceptedExecutor();
        if (block.number >= m.executionStartBlock) revert BadState(m.state, State.ACCEPTED);

        uint256 penalty = (m.econ.executorBond * PENALTY_RELEASE_BPS) / 10_000;
        m.state = State.RELEASED;
        executors.releaseFromMandate(m.acceptedExecutorId);

        if (penalty > 0) vault.pay(mandateId, m.econ.bondToken, m.creator, penalty, "reservation-penalty");
        if (m.econ.executorBond - penalty > 0) {
            vault.pay(
                mandateId, m.econ.bondToken, m.acceptedExecutor, m.econ.executorBond - penalty, "executor-bond-return"
            );
        }
        vault.pay(mandateId, m.econ.rewardToken, m.creator, m.econ.rewardAmount, "reward-refund");
        vault.pay(
            mandateId, m.econ.bondToken, m.creator, m.econ.creatorBond + m.econ.relayerBudget, "creator-bond-return"
        );
        emit MandateReleased(mandateId, penalty);
    }

    function settle(
        bytes32 mandateId,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external {
        Mandate storage m = _mandates[mandateId];
        if (m.state != State.ACCEPTED) revert BadState(m.state, State.ACCEPTED);

        TemplateConfig memory cfg = templates[m.templateId];
        VerifiedExecution memory ve = ISetldAttestcoinAdapter(cfg.adapter)
            .verifySingle(chainKey, height, encodedTransaction, merkleProof, continuityProof);

        if (consumedSourceTxKey[ve.sourceTxKey]) revert SourceTxAlreadyConsumed(ve.sourceTxKey);

        Evaluation memory ev = Predicate.evaluate(
            _terms[mandateId],
            ve,
            Predicate.Context({
                mandateId: mandateId,
                sourceChainKey: m.sourceChainKey,
                executionStartBlock: m.executionStartBlock,
                executionEndBlock: m.executionEndBlock,
                boundExecutorSourceAddress: m.acceptedSourceSender,
                sourceTxKeyConsumed: false
            })
        );

        // atomic: consume the source tx key and set terminal state together (PRD 15.1)
        consumedSourceTxKey[ve.sourceTxKey] = true;

        State terminal;
        if (ev.code == EvaluationCode.FULFILLED) terminal = State.FULFILLED;
        else if (ev.code == EvaluationCode.RECEIPT_REVERTED) terminal = State.EXECUTION_REVERTED;
        else terminal = State.INVALID_ATTEMPT;
        m.state = terminal;

        executors.releaseFromMandate(m.acceptedExecutorId);

        // relayer reimbursement: fixed, any valid proof reaching evaluation, to msg.sender
        if (m.econ.relayerBudget > 0) {
            vault.pay(mandateId, m.econ.bondToken, msg.sender, m.econ.relayerBudget, "relayer-reimbursement");
        }

        _payOut(mandateId, m, terminal);

        bytes32 traceHash =
            keccak256(abi.encode(mandateId, uint8(ev.code), ev.failedStep, ev.observedAmountIn, ev.observedAmountOut));
        emit MandateSettled(mandateId, terminal, uint8(ev.code), ev.failedStep, ve.sourceTxKey, traceHash);
    }

    function finalizeTimeout(bytes32 mandateId) external {
        Mandate storage m = _mandates[mandateId];
        if (m.state != State.ACCEPTED) revert BadState(m.state, State.ACCEPTED);
        if (block.number <= m.proofDeadline) revert ProofDeadlineNotReached();

        m.state = State.TIMED_OUT;
        executors.releaseFromMandate(m.acceptedExecutorId);

        uint256 penalty = (m.econ.executorBond * PENALTY_TIMEOUT_BPS) / 10_000;
        vault.pay(mandateId, m.econ.rewardToken, m.creator, m.econ.rewardAmount, "reward-refund");
        if (penalty > 0) vault.pay(mandateId, m.econ.bondToken, m.creator, penalty, "executor-bond-penalty");
        if (m.econ.executorBond - penalty > 0) {
            vault.pay(
                mandateId, m.econ.bondToken, m.acceptedExecutor, m.econ.executorBond - penalty, "executor-bond-return"
            );
        }
        vault.pay(
            mandateId, m.econ.bondToken, m.creator, m.econ.creatorBond + m.econ.relayerBudget, "creator-bond-return"
        );
        emit MandateTimedOut(mandateId);
    }

    function _payOut(bytes32 mandateId, Mandate storage m, State terminal) private {
        Econ memory e = m.econ;
        if (terminal == State.FULFILLED) {
            uint256 fee = (e.rewardAmount * protocolFeeBps) / 10_000;
            vault.pay(mandateId, e.rewardToken, m.acceptedExecutor, e.rewardAmount - fee, "reward");
            if (fee > 0) vault.pay(mandateId, e.rewardToken, feeRecipient, fee, "protocol-fee");
            vault.pay(mandateId, e.bondToken, m.acceptedExecutor, e.executorBond, "executor-bond-return");
            vault.pay(mandateId, e.bondToken, m.creator, e.creatorBond, "creator-bond-return");
        } else {
            uint16 bps = terminal == State.EXECUTION_REVERTED ? PENALTY_REVERTED_BPS : PENALTY_INVALID_BPS;
            uint256 penalty = (e.executorBond * bps) / 10_000;
            vault.pay(mandateId, e.rewardToken, m.creator, e.rewardAmount, "reward-refund");
            if (penalty > 0) vault.pay(mandateId, e.bondToken, m.creator, penalty, "executor-bond-penalty");
            if (e.executorBond - penalty > 0) {
                vault.pay(mandateId, e.bondToken, m.acceptedExecutor, e.executorBond - penalty, "executor-bond-return");
            }
            vault.pay(mandateId, e.bondToken, m.creator, e.creatorBond, "creator-bond-return");
        }
    }
}
