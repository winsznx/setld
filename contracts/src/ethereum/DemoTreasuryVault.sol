// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MockERC20} from "./MockERC20.sol";

/// @title DemoTreasuryVault
/// @notice Deterministic Sepolia source target for the treasury-rebalance template (PRD 13.9).
///         The vault holds its own pool of both assets and mechanically rebalances between
///         them when an executor calls through the SetldExecutionRouter.
///
///         Deliberately, the vault does NOT know the setld mandate terms. It executes any
///         well-funded request and emits `RebalanceExecuted` with the real amounts. This is
///         what makes the "verified but semantically wrong" demo possible: an over-cap or
///         wrong-destination rebalance still SUCCEEDS here and produces a valid receipt;
///         setld's predicate is what refuses it. A genuinely broken request (insufficient
///         pool balance, or the injected fault) reverts, producing the distinct
///         EXECUTION_REVERTED path.
contract DemoTreasuryVault {
    /// @dev Fixed conversion rate per (assetIn => assetOut), 1e18-scaled. 0 means unset.
    mapping(address => mapping(address => uint256)) public rate;

    /// @dev When set for a mandateId, the next matching rebalance reverts once (revert-path test).
    mapping(bytes32 => bool) public injectedRevert;

    address public immutable admin;

    /// @dev All fields non-indexed: the setld predicate and reference model decode the full
    ///      tuple out of `log.data` uniformly. Off-chain workers still filter by emitter +
    ///      topic0.
    event RebalanceExecuted(
        bytes32 mandateId, address executor, address assetIn, address assetOut, uint256 amountIn, uint256 amountOut
    );
    event RateSet(address indexed assetIn, address indexed assetOut, uint256 rate1e18);
    event RevertInjected(bytes32 indexed mandateId);

    error PoolInsufficient(address asset, uint256 have, uint256 want);
    error RateUnset(address assetIn, address assetOut);
    error InjectedFault(bytes32 mandateId);
    error NotAdmin();

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    function setRate(address assetIn, address assetOut, uint256 rate1e18) external onlyAdmin {
        rate[assetIn][assetOut] = rate1e18;
        emit RateSet(assetIn, assetOut, rate1e18);
    }

    function injectRevert(bytes32 mandateId) external onlyAdmin {
        injectedRevert[mandateId] = true;
        emit RevertInjected(mandateId);
    }

    /// @notice Fund the vault's pool for `asset`. Caller must have approved this contract.
    function fund(address asset, uint256 amount) external {
        require(MockERC20(asset).transferFrom(msg.sender, address(this), amount), "fund transfer");
    }

    /// @notice Mechanical rebalance. Called by the router, which passes the source EOA as `executor`.
    /// @dev No mandate-term validation here on purpose (see contract notice).
    function rebalance(
        bytes32 mandateId,
        address executor,
        address assetIn,
        address assetOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        if (injectedRevert[mandateId]) revert InjectedFault(mandateId);

        uint256 r = rate[assetIn][assetOut];
        // Same-asset "rebalance" (a wrong-destination attempt) is allowed through at 1:1 so the
        // receipt still succeeds; the predicate rejects it on assetOut mismatch.
        if (assetIn == assetOut) r = 1e18;
        if (r == 0) revert RateUnset(assetIn, assetOut);

        amountOut = (amountIn * r) / 1e18;

        uint256 outBal = MockERC20(assetOut).balanceOf(address(this));
        if (outBal < amountOut) revert PoolInsufficient(assetOut, outBal, amountOut);

        // Move the treasury's own holdings: burn-in by sending assetIn to a sink is not needed;
        // we simply pay out assetOut to the executor and account the input as retained.
        require(MockERC20(assetOut).transfer(executor, amountOut), "payout transfer");

        // minAmountOut is echoed into the event via amountOut; the predicate independently
        // checks the committed floor, so we do not enforce it here.
        minAmountOut;

        emit RebalanceExecuted(mandateId, executor, assetIn, assetOut, amountIn, amountOut);
    }
}
