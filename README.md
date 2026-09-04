# setld

**Receipt-verified execution assurance for autonomous on-chain work.**

Built for BUIDL CTC 2026 Fall — primary track: AI.
Live: **https://setld.pages.dev** · Proof: **https://setld.pages.dev/proof**
[![ci](https://github.com/winsznx/setld/actions/workflows/ci.yml/badge.svg)](https://github.com/winsznx/setld/actions/workflows/ci.yml)

---

## The problem

Protocols increasingly let autonomous agents move money. A valid signature proves the agent
*asked* for a transaction. It does not prove the agent completed the exact job it was paid
to perform — the right target, the right amount, within the committed bounds, before the
deadline.

## What setld does

A job creator escrows a reward on Creditcoin and commits an immutable execution mandate. An
executor bonds and performs the required transaction on Ethereum. The **Attestcoin Protocol**
proves that transaction and its receipt belong to a finalized Sepolia block. setld then
evaluates the verified sender, target, calldata, receipt status and event data against the
mandate. Correct work releases the reward and returns the bond. A provably incorrect attempt
applies the mandate's precommitted penalty.

> The agent does not report completion. The receipt does.

```
immutable mandate + funded reward + bonded executor
        → executor performs the Ethereum action
        → Attestcoin verifies the transaction and receipt
        → setld evaluates the committed predicate
        → reward, refund, bond return, or bond penalty
```

## Measured outcome (real public testnets)

Two mandates, same Attestcoin verifier, opposite results:

| | Correct execution | Verified but wrong execution |
|---|---|---|
| Ethereum transaction | succeeded (receipt status 1) | **succeeded (receipt status 1)** — `amountIn` 25 000 over the committed cap of 10 000 |
| Attestcoin proof | verified (block 11 632 681, tx 109) | verified (block 11 632 731) |
| setld predicate | every field passed | failed on `AMOUNT_IN_OVER_CAP` at step 11 |
| Reward | released to the executor | refunded to the creator |
| Executor bond | returned | 100% penalty applied |
| Settlement tx | [`0x56f0adde…`](https://dashboard.cc3-testnet.creditcoin.network/tx/0x56f0addefd9ac86220f02dbb6c0f8fa72c7461a23727ce2b6ede0101030dad4b) | [`0x20f9e00e…`](https://dashboard.cc3-testnet.creditcoin.network/tx/0x20f9e00ec36861521edeb410c1f3aa84cb5dec831026d463cd04842268841fc9) |

The wrong case is the point: a **successful, Attestcoin-verifiable** Ethereum transaction that
violates one committed field. Not a revert. setld refuses it with no human evaluator.

### Why Attestcoin is load-bearing

We ran the same two executions, same predicate, same economics, through a trusted-reporter
baseline (`BaselineReporterSettlement`) instead of the Attestcoin path:

| | Honest reporter | Compromised reporter |
|---|---|---|
| Agreement with setld | every case | — |
| **Invalid reward leaked (baseline)** | 0 | **10 tSETLD** — reporter asserted `FULFILLED` for the over-cap execution and the contract paid |
| Invalid reward leaked (setld) | 0 | **0** — the on-chain proof and predicate did not support it |

Full run: [`evidence/campaigns/ablations/reporter-compromise.json`](evidence/campaigns/ablations/reporter-compromise.json).

## The winning screenshot

The side-by-side settlement diptych at [**setld.pages.dev/proof**](https://setld.pages.dev/proof):
both certificates show an identical `Attestcoin proof: Verified` header; the divergence is in
the predicate row below.

## Public proof links

- Correct mandate record: https://setld.pages.dev/mandates/0x907043a3e8db72db45e0fd737b69d8975a53570487ff1b4c47f3db3cc1fb9598
- Verified-but-wrong record: https://setld.pages.dev/mandates/0xc28c59bac1c4ca108af0361c0cf27820a0455c57eff53ab05b3f9da3fe5e9360
- Browser-side independent recompute: https://setld.pages.dev/verify
- Replay + submitter-neutrality evidence: [`evidence/negative/replay-and-neutrality.json`](evidence/negative/replay-and-neutrality.json)
- Autonomous agent decision log: [`evidence/agent/decision-log.json`](evidence/agent/decision-log.json)

## How could this result be misleading?

- **One template.** setld verifies one production-quality mandate shape (treasury rebalance).
  We do not claim arbitrary Ethereum task support.
- **Small ablation.** The reporter-compromise result uses 2 matched real executions. It
  demonstrates the mechanism; it is not a large-sample study.
- **The honest baseline is real.** `BaselineReporterSettlement` runs the *same* reference-model
  predicate the honest way. It only diverges from setld when the reporter is compromised —
  which is exactly the trust assumption Attestcoin removes.
- **Attestation latency.** During the build, CC3↔Sepolia attestation ran ~1 block/min net (and briefly stalled on 2026-09-04); a fresh source transaction takes ~20–40 min to become provable. The live demo uses
  pre-generated proofs (the proof material is public and re-verifiable on-chain any time).
- **What Attestcoin proves vs. what setld decides.** Attestcoin proves *what happened* on
  Ethereum. setld's predicate decides whether what happened satisfied the job. The wrong-case
  proof is valid; the settlement still refuses it.
- The 100-case deterministic campaign runs on a Foundry fork, not public testnet.

## The AI track

`apps/agent` runs an autonomous OBSERVE→ANALYZE→DECIDE→AUTHORIZE→EXECUTE→RECONCILE→FEEDBACK
loop. A real Claude call (`claude-sonnet-5`) makes the bounded ACCEPT/ABSTAIN choice over
structured economics; deterministic guardrails (`apps/agent/src/policy.ts`) gate every
decision. The model cannot bypass a guardrail, pick an unapproved route, sign calldata, mark
an execution successful, or choose a payout. The recorded run has a genuine model ACCEPT
(followed by an on-chain bond + Sepolia execution) and a genuine model ABSTAIN ("net margin
~2% of the bond at risk"). Remove the agent and the story becomes a plain keeper protocol.

## Architecture

| Layer | Where | Note |
|---|---|---|
| Attestcoin seam | `contracts/src/creditcoin/adapters/SetldAttestcoinAdapter.sol` | wraps the native `verify()` precompile + the deployed `EvmV1Decoder`; one proof envelope carries tx + receipt |
| Predicate | `contracts/src/creditcoin/templates/TreasuryRebalancePredicateV1.sol` | 17-step committed order (PRD 12.9), structured result code |
| Core | `contracts/src/creditcoin/core/SetldCore.sol` | mandate lifecycle + atomic settle (source-tx-key consume + terminal state together) + fees |
| Custody | `contracts/src/creditcoin/core/SetldVault.sol` | isolated value boundary, delta accounting, no arbitrary withdrawal |
| Identity | `contracts/src/creditcoin/core/SetldExecutorRegistry.sol` | EIP-712 source-address binding, rotation lock, historical snapshots |
| Source layer | `contracts/src/ethereum/` | `SetldExecutionRouter` + term-agnostic `DemoTreasuryVault` (so a wrong rebalance still *succeeds* on Ethereum) |
| Reference model | `packages/reference-model` | dependency-light TS oracle; differential parity with the Solidity predicate and `SetldCore` economics |
| Verifier | `packages/verifier` + `apps/web/lib/verify-client.ts` | recompute source-tx key, re-verify the proof, re-run the predicate, check conservation |

Deployed addresses and every transaction hash: [`evidence/submission-facts.json`](evidence/submission-facts.json),
[`evidence/deployments/addresses.json`](evidence/deployments/addresses.json).
Gate log: [`GATES.md`](GATES.md). Decisions and corrected assumptions: [`DECISIONS.md`](DECISIONS.md).

## Reproduce

```bash
pnpm install
pnpm probe:attestcoin        # S0/S1: live environment + field-extraction proof
cd contracts && forge test   # reference-model parity, vault invariants, lifecycle guards
cd .. && pnpm verify:mandate --id 0x907043a3e8db72db45e0fd737b69d8975a53570487ff1b4c47f3db3cc1fb9598
pnpm verify:mandate --id 0x907043a3e8db72db45e0fd737b69d8975a53570487ff1b4c47f3db3cc1fb9598 --tamper
```

No funded wallet, model credits, or private service credentials are needed to verify the
published claims.

## Attestcoin integration summary

`SetldCore.settle` calls `SetldAttestcoinAdapter.verifySingle`, which invokes the native
BlockProver precompile (`0x…FD2`) `verify()` over the source-transaction proof, then decodes
the same proven bytes — transaction *and* receipt in one envelope — through the deployed
`EvmV1Decoder` (`0x731c…F9f`). Every settlement that moves reward or bond value is gated on a
proof the Creditcoin verifier accepts. The runtime fails closed
(`AttestcoinProofInvalid` / `SourceBlockNotAttested`) and never substitutes an RPC result.
SDK: `@gluwa/usc-sdk@0.18.0`, contracts `@gluwa/usc-contracts@0.2.0`.
