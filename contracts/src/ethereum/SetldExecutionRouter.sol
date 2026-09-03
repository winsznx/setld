// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IDemoTreasuryVault {
    function rebalance(
        bytes32 mandateId,
        address executor,
        address assetIn,
        address assetOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut);
}

/// @title SetldExecutionRouter
/// @notice Non-upgradeable Sepolia entrypoint for treasury-rebalance mandates (PRD 13.9, 12.6).
///         Its only jobs: enforce the target allowlist, bind the mandate id into the call,
///         preserve the source sender identity, and emit an unambiguous, mandate-scoped event
///         so the Attestcoin proof of this transaction uniquely identifies the mandate it
///         satisfies (PRD 17.4 router-based replay binding).
contract SetldExecutionRouter {
    address public immutable admin;
    mapping(address => bool) public allowedTarget;

    uint256 private _lock = 1;

    event TargetAllowed(address indexed target, bool allowed);
    event MandateExecutionAttempt(
        bytes32 indexed mandateId,
        address indexed executor,
        address indexed target,
        address assetIn,
        address assetOut,
        uint256 amountIn,
        uint256 minAmountOut
    );
    event MandateExecuted(bytes32 indexed mandateId, address indexed executor, address indexed target, uint256 amountOut);

    error NotAdmin();
    error TargetNotAllowed(address target);
    error Reentrancy();

    constructor() {
        admin = msg.sender;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    function setTargetAllowed(address target, bool allowed) external {
        if (msg.sender != admin) revert NotAdmin();
        allowedTarget[target] = allowed;
        emit TargetAllowed(target, allowed);
    }

    /// @notice Execute a treasury rebalance for `mandateId` against an allowlisted vault.
    /// @dev The caller (`msg.sender`) is the source EOA that setld binds as the executor.
    function execute(
        bytes32 mandateId,
        address target,
        address assetIn,
        address assetOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        if (!allowedTarget[target]) revert TargetNotAllowed(target);

        emit MandateExecutionAttempt(mandateId, msg.sender, target, assetIn, assetOut, amountIn, minAmountOut);

        amountOut = IDemoTreasuryVault(target).rebalance(
            mandateId, msg.sender, assetIn, assetOut, amountIn, minAmountOut
        );

        emit MandateExecuted(mandateId, msg.sender, target, amountOut);
    }
}
