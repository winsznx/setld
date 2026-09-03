// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "../core/SetldVault.sol";

/// @title BaselineReporterSettlement (B0)
/// @notice The counterfactual for the sponsor-removal experiment (PRD 4A.2). Same mandate,
///         same reward/bond economics, same off-chain predicate — but settlement is decided
///         by a trusted reporter's assertion instead of an Attestcoin proof. Under an honest
///         reporter this matches setld (Gate S5). Under a compromised reporter it can be made
///         to pay out an invalid execution (Gate S10). That difference is the whole point:
///         this contract has a trust assumption setld does not.
///
///         Deliberately isolated from the setld verifier path so the ablation is honest.
contract BaselineReporterSettlement {
    enum Outcome {
        NONE,
        FULFILLED,
        INVALID_ATTEMPT,
        EXECUTION_REVERTED
    }

    struct Job {
        address creator;
        address executor;
        address token;
        uint256 reward;
        uint256 executorBond;
        uint256 creatorBond;
        uint16 protocolFeeBps;
        bool settled;
    }

    address public immutable reporter;
    address public immutable feeRecipient;
    mapping(bytes32 => Job) public jobs;

    error NotReporter();
    error JobExists();
    error JobMissing();
    error AlreadySettled();

    event JobOpened(bytes32 indexed jobId, address creator, address executor, uint256 reward);
    event JobSettledByReport(bytes32 indexed jobId, Outcome outcome, string reportedSourceTx);

    constructor(address _reporter, address _feeRecipient) {
        reporter = _reporter;
        feeRecipient = _feeRecipient;
    }

    /// @notice Creator opens a job and escrows reward + both bonds up front (executor bond is
    ///         fronted by the creator here to keep the baseline single-transaction; the
    ///         comparison only needs matched economics, not matched UX).
    function openJob(
        bytes32 jobId,
        address executor,
        address token,
        uint256 reward,
        uint256 executorBond,
        uint256 creatorBond,
        uint16 protocolFeeBps
    ) external {
        if (jobs[jobId].creator != address(0)) revert JobExists();
        jobs[jobId] = Job(msg.sender, executor, token, reward, executorBond, creatorBond, protocolFeeBps, false);
        require(IERC20(token).transferFrom(msg.sender, address(this), reward + executorBond + creatorBond), "escrow");
        emit JobOpened(jobId, msg.sender, executor, reward);
    }

    /// @notice The trusted reporter asserts the outcome. No proof. The contract believes it.
    function settleByReport(bytes32 jobId, Outcome outcome, string calldata reportedSourceTx) external {
        if (msg.sender != reporter) revert NotReporter();
        Job storage j = jobs[jobId];
        if (j.creator == address(0)) revert JobMissing();
        if (j.settled) revert AlreadySettled();
        j.settled = true;

        if (outcome == Outcome.FULFILLED) {
            uint256 fee = (j.reward * j.protocolFeeBps) / 10_000;
            require(IERC20(j.token).transfer(j.executor, j.reward - fee), "t1");
            if (fee > 0) require(IERC20(j.token).transfer(feeRecipient, fee), "t2");
            require(IERC20(j.token).transfer(j.executor, j.executorBond), "t3");
            require(IERC20(j.token).transfer(j.creator, j.creatorBond), "t4");
        } else {
            uint16 bps = outcome == Outcome.EXECUTION_REVERTED ? 2_500 : 10_000;
            uint256 penalty = (j.executorBond * bps) / 10_000;
            require(IERC20(j.token).transfer(j.creator, j.reward), "t1");
            if (penalty > 0) require(IERC20(j.token).transfer(j.creator, penalty), "t2");
            if (j.executorBond - penalty > 0) {
                require(IERC20(j.token).transfer(j.executor, j.executorBond - penalty), "t3");
            }
            require(IERC20(j.token).transfer(j.creator, j.creatorBond), "t4");
        }
        emit JobSettledByReport(jobId, outcome, reportedSourceTx);
    }
}
