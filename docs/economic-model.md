# Economic and incentive model (Gate S7)

All amounts are committed by template version and visible before acceptance. Once a mandate
is published its policy cannot change (`SetldCore` immutable terms).

## Penalty schedule (bps of executor bond) — `SetldCore` constants

| Outcome | Executor bond consequence | Rationale |
|---|---:|---|
| `FULFILLED` | 0% | correct work, full bond returned + reward paid |
| Objective parameter mismatch by the bound executor | **100%** (`PENALTY_INVALID_BPS`) | the executor controlled every committed field; a mismatch is negligence or an attack |
| Matching call shape but the receipt reverted | 25% (`PENALTY_REVERTED_BPS`) | reverts can be externally caused (gas spike, slippage, transient protocol state); lower than deliberate mismatch |
| Timeout without any proof | 50% (`PENALTY_TIMEOUT_BPS`) | the executor took the job and produced nothing; harsher than an honest early exit |
| Voluntary release before execution start | 10% (`PENALTY_RELEASE_BPS`) | an executor who realizes it cannot complete should exit early and cheaply rather than time out |
| Wrong source sender / missing mandate binding | proof rejected, not classified as an executor attempt | not the bound executor's transaction |
| Creator cancellation before acceptance | n/a | no executor bond exists yet |

## Incentive-compatibility argument

**Executor accepts iff** `reward > E[cost]` where
`E[cost] = P(param mismatch)·bond + P(revert)·0.25·bond + P(timeout)·0.5·bond + gas`.
The agent's guardrail `NET_MARGIN_TOO_LOW` and its model decider enforce exactly this
(`apps/agent`), and the recorded ABSTAIN is a case where `reward − bond − gas` was ~2% of
the bond at risk.

**No cheap job-reservation strategy.** Acceptance transfers the *full* executor bond into
escrow immediately (`SetldCore.acceptMandate` → `SetldVault.deposit`). Reserving a valuable
mandate to deny it to others costs 10% (release) to 50% (timeout) of that bond, with no
upside. There is no partial or refundable reservation.

**No profitable replay / double-settlement.** `sourceTxKey` is consumed atomically with the
terminal-state write; a second `settle` on the same mandate hits `state != ACCEPTED`; the
same proof against a different mandate hits `SourceTxAlreadyConsumed`. Both are proven
on-chain (`evidence/negative/replay-and-neutrality.json`).

**Relayer cannot game the outcome.** Reimbursement is a fixed cap, paid to `msg.sender` of
`settle` for any valid proof that reaches evaluation, pass or fail, first proof only. The
beneficiary of the reward is derived from the accepted-executor state, never `msg.sender` —
proven on-chain (submitter `0x03D9…7b66` ≠ executor, reward went to the executor).

**Creator spam cost.** The creator funds reward + creator bond + relayer budget up front.
An impossible or malformed mandate that no executor accepts ties up the creator's capital
until `acceptanceDeadline`, then only reward + creator bond are refundable; the relayer
budget and any creation fee are the anti-spam cost.

## Not modeled in v1 (deferred, PRD 16.2 / 32)

- Dynamic bond underwriting from executor history (Release 0.3).
- Third-party bond providers / machine credit facilities.
- Creator-fault adjudication beyond the simple "impossible terms" case.
- Production fee levels (testnet uses 5% protocol fee on the reward, 0 creation fee).

## Parameters as deployed

- protocol fee: 500 bps of the reward on `FULFILLED`
- creation fee: 0 (testnet)
- executor/creator bond: creator-selected within template bounds
- the demo mandates use reward 10 tSETLD, executor bond 5, creator bond 2, relayer budget 1
