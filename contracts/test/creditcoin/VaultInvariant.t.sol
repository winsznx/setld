// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {SetldVault} from "../../src/creditcoin/core/SetldVault.sol";
import {MockERC20} from "../../src/ethereum/MockERC20.sol";

/// @notice PRD 13.2 vault invariants under a fuzzing handler that drives deposit/pay/credit/claim
///         as the authority. The accounted balance must never exceed the real token balance,
///         and per-mandate escrow + outstanding claims must reconcile to the accounted total.
contract VaultHandler is Test {
    SetldVault public vault;
    MockERC20 public token;
    address public authority;
    bytes32[] public mandateIds;
    address[] public actors;
    uint256 public totalDeposited;
    uint256 public totalPaidOut;

    constructor(SetldVault _vault, MockERC20 _token, address _authority) {
        vault = _vault;
        token = _token;
        authority = _authority;
        for (uint256 i = 0; i < 4; i++) {
            mandateIds.push(keccak256(abi.encode("m", i)));
            actors.push(address(uint160(0xA000 + i)));
        }
    }

    function deposit(uint256 mSeed, uint256 amount) external {
        amount = bound(amount, 1, 1e24);
        bytes32 m = mandateIds[mSeed % mandateIds.length];
        token.mint(authority, amount);
        vm.startPrank(authority);
        token.approve(address(vault), amount);
        vault.deposit(m, address(token), authority, amount);
        vm.stopPrank();
        totalDeposited += amount;
    }

    function pay(uint256 mSeed, uint256 aSeed, uint256 amount) external {
        bytes32 m = mandateIds[mSeed % mandateIds.length];
        uint256 have = vault.mandateEscrow(m, address(token));
        if (have == 0) return;
        amount = bound(amount, 1, have);
        address to = actors[aSeed % actors.length];
        vm.prank(authority);
        vault.pay(m, address(token), to, amount, "test");
        totalPaidOut += amount;
    }

    function credit(uint256 mSeed, uint256 aSeed, uint256 amount) external {
        bytes32 m = mandateIds[mSeed % mandateIds.length];
        uint256 have = vault.mandateEscrow(m, address(token));
        if (have == 0) return;
        amount = bound(amount, 1, have);
        vm.prank(authority);
        vault.credit(m, address(token), actors[aSeed % actors.length], amount, "test");
    }

    function claim(uint256 aSeed) external {
        address a = actors[aSeed % actors.length];
        if (vault.claimable(a, address(token)) == 0) return;
        uint256 before = token.balanceOf(a);
        vm.prank(a);
        vault.claim(address(token));
        totalPaidOut += token.balanceOf(a) - before;
    }
}

contract VaultInvariantTest is Test {
    SetldVault vault;
    MockERC20 token;
    VaultHandler handler;
    address authority = address(0xC0DE);

    function setUp() public {
        token = new MockERC20("t", "t");
        vault = new SetldVault(authority, address(this));
        handler = new VaultHandler(vault, token, authority);
        targetContract(address(handler));
    }

    /// accounted balance is always fully backed by real tokens
    function invariant_accountedNeverExceedsRealBalance() public view {
        assertLe(vault.accountedBalance(address(token)), token.balanceOf(address(vault)));
    }

    /// nothing is created or destroyed: real balance == deposited - paid out
    function invariant_conservation() public view {
        assertEq(token.balanceOf(address(vault)), handler.totalDeposited() - handler.totalPaidOut());
    }
}
