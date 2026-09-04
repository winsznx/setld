# SECURITY

## Trust model (PRD 20.1)

**Assumed honest:** Creditcoin consensus + the Attestcoin attestor quorum; Ethereum
finality for attested blocks; deployed bytecode matches this repo; allowlisted tokens
behave as standard ERC20; source RPC and the proof builder are available for *liveness*,
not correctness.

**Not trusted:** the proof relayer, the creator, the executor, the agent model, any hosted
API, the indexer, the web frontend.

## How each threat is handled

| Threat | Mitigation | Where |
|---|---|---|
| Forged / modified proof | native `verify()` precompile, pinned ABI; adversarial modified-proof path fails closed | `SetldAttestcoinAdapter` |
| Valid proof of an irrelevant transaction | 17-step predicate binds sender, target, selector, calldata mandate id, block window, receipt status, event emitter, event fields | `TreasuryRebalancePredicateV1` |
| Receipt replay | `sourceTxKey = keccak256(abi.encodePacked(chainKey, height, txIndex))` consumed atomically with the terminal-state write; **proven on-chain** (`evidence/negative/replay-and-neutrality.json`) | `SetldCore.settle` |
| Relayer steals the reward | beneficiary is the accepted executor + verified source sender, never `msg.sender`; submitter earns only a fixed reimbursement; **proven on-chain** | `SetldCore.settle` |
| Mandate replay across deployments | mandate id domain-separated with `block.chainid` + registry address | `SetldCore.createMandate` |
| Reentrancy via a malicious token | checks-effects-interactions (state + `consumedSourceTxKey` set before any transfer) + `nonReentrant` on every `SetldVault` mutator + the token allowlist | `SetldVault`, `SetldCore` |
| Fee-on-transfer / rebasing token | balance-delta accounting on deposit; `accountedBalance <= real balance` invariant fuzzed | `SetldVault`, `VaultInvariant.t.sol` |
| `arbitrary-from` in `SetldVault.deposit` | `onlyAuthority`; `SetldCore` only ever passes the `createMandate` / `acceptMandate` caller, who pulls their own pre-approved funds | documented inline |
| Executor reserves and abandons | timeout penalty (50% bond) via permissionless `finalizeTimeout`; reservation penalty on voluntary release | `SetldCore` |
| Wrong decoder interpretation | differential tests: TS reference model == Solidity predicate == `SetldCore` economics, 16 vectors + fuzz | `PredicateParity.t.sol`, `SettlementParity.t.sol`, `PredicateFuzz.t.sol` |
| Attestation delay | proof grace period; no premature timeout; settle has no proof-deadline check, only `finalizeTimeout` after `proofDeadline` | `SetldCore` |

## Known limitations / Slither notes

- `BaselineReporterSettlement` (B0) is **deliberately naive** — it is the trusted-reporter
  counterfactual and is never part of the setld settlement path. Its reentrancy/CEI
  findings are expected.
- `block.timestamp` is used for the acceptance deadline and EIP-712 binding expiry only;
  execution/proof deadlines are block-number based.
- One production template. No arbitrary-predicate interpreter (PRD 8.2).
- Hackathon deployments are immutable (no upgrade path); a compromised adapter would require
  a new template registration, not an upgrade.

## Reporting

This is a hackathon testnet build with test-only assets. Open an issue at
https://github.com/winsznx/setld.
