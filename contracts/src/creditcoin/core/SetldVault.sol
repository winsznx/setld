// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title SetldVault
/// @notice Sole custody boundary (PRD 13.2). Holds rewards, creator bonds, executor bonds and
///         relayer budgets, accounted per mandate. Only the settlement authority (SetldCore)
///         may move funds. There is no arbitrary admin withdrawal. Balance-delta accounting
///         rejects fee-on-transfer / rebasing behavior on deposit.
///
///         Invariants (checked in tests, PRD 13.2):
///           - accountedBalance[asset] <= IERC20(asset).balanceOf(this)   [always]
///           - a mandate's escrow is paid out at most once
///           - refunds cannot be redirected (recipients come from SetldCore, not msg.sender)
contract SetldVault {
    address public immutable authority; // SetldCore
    address public immutable admin; // pause only
    bool public depositsPaused;

    // asset => total accounted (sum of all per-mandate escrow not yet settled + claimable)
    mapping(address => uint256) public accountedBalance;
    // mandateId => asset => escrowed amount still held
    mapping(bytes32 => mapping(address => uint256)) public mandateEscrow;
    // pull-payment ledger: account => asset => claimable
    mapping(address => mapping(address => uint256)) public claimable;

    error NotAuthority();
    error NotAdmin();
    error DepositsPaused();
    error DepositAmountMismatch(uint256 requested, uint256 received);
    error EscrowInsufficient(bytes32 mandateId, address asset, uint256 have, uint256 want);

    event Deposited(bytes32 indexed mandateId, address indexed asset, address indexed from, uint256 amount);
    event Paid(bytes32 indexed mandateId, address indexed asset, address indexed to, uint256 amount, bytes32 reason);
    event Claimed(address indexed account, address indexed asset, uint256 amount);
    event DepositsPausedSet(bool paused);

    constructor(address _authority, address _admin) {
        authority = _authority;
        admin = _admin;
    }

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotAuthority();
        _;
    }

    function setDepositsPaused(bool paused) external {
        if (msg.sender != admin) revert NotAdmin();
        depositsPaused = paused;
        emit DepositsPausedSet(paused);
    }

    /// @notice Pull `amount` of `asset` from `from` into `mandateId`'s escrow.
    /// @dev Uses measured delta, not the requested amount, and reverts on any shortfall so
    ///      unsupported token behavior cannot corrupt accounting.
    function deposit(bytes32 mandateId, address asset, address from, uint256 amount) external onlyAuthority {
        if (depositsPaused) revert DepositsPaused();
        uint256 before = IERC20(asset).balanceOf(address(this));
        require(IERC20(asset).transferFrom(from, address(this), amount), "transferFrom");
        uint256 received = IERC20(asset).balanceOf(address(this)) - before;
        if (received != amount) revert DepositAmountMismatch(amount, received);
        mandateEscrow[mandateId][asset] += amount;
        accountedBalance[asset] += amount;
        emit Deposited(mandateId, asset, from, amount);
    }

    /// @notice Move `amount` of a mandate's escrow to `to` immediately (push).
    function pay(bytes32 mandateId, address asset, address to, uint256 amount, bytes32 reason) external onlyAuthority {
        _debitEscrow(mandateId, asset, amount);
        accountedBalance[asset] -= amount;
        require(IERC20(asset).transfer(to, amount), "transfer");
        emit Paid(mandateId, asset, to, amount, reason);
    }

    /// @notice Move `amount` of a mandate's escrow into `to`'s pull-payment balance.
    function credit(bytes32 mandateId, address asset, address to, uint256 amount, bytes32 reason)
        external
        onlyAuthority
    {
        _debitEscrow(mandateId, asset, amount);
        claimable[to][asset] += amount;
        emit Paid(mandateId, asset, to, amount, reason);
    }

    function claim(address asset) external {
        uint256 amount = claimable[msg.sender][asset];
        require(amount > 0, "nothing to claim");
        claimable[msg.sender][asset] = 0;
        accountedBalance[asset] -= amount;
        require(IERC20(asset).transfer(msg.sender, amount), "transfer");
        emit Claimed(msg.sender, asset, amount);
    }

    function _debitEscrow(bytes32 mandateId, address asset, uint256 amount) private {
        uint256 have = mandateEscrow[mandateId][asset];
        if (have < amount) revert EscrowInsufficient(mandateId, asset, have, amount);
        mandateEscrow[mandateId][asset] = have - amount;
    }
}
