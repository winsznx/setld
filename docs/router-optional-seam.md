# Gate S3 — router-optional seam

**Question (PRD 24 / S3):** can setld verify an existing standard protocol/event action
*without* `SetldExecutionRouter`, binding the mandate strongly enough from the raw
transaction and receipt alone?

## What the S1 evidence gives us

The Attestcoin proof + `EvmV1Decoder` expose, for any Sepolia transaction:

- `tx.from`, `tx.to`, `tx.value`, full calldata (→ selector + ABI-decoded arguments)
- receipt status, gas used
- every log: emitter, topics, data

So a "direct adapter" can bind: **source chain, block window, sender, target, selector,
argument values, receipt status, and any event the target emits.**

## Where a routerless binding is strong enough — Outcome A

A direct adapter is admissible when the source action *already* carries a value the mandate
can commit to that uniquely correlates this transaction with this mandate. Examples:

- a lending protocol `repay(bytes32 loanHash, ...)` — the mandate commits `loanHash`
- an order-settlement `fill(bytes32 orderId)` — the mandate commits `orderId`
- any protocol that emits an event containing a request/intent id the creator controls

For those, `SetldCore` can point the template at a direct adapter: the predicate checks
`tx.to == protocol`, `selector == expected`, `decoded.correlationId == mandate.boundId`,
plus the outcome event. `sourceTxKey` still prevents double-consumption.

## Where it is not — Outcome B (the treasury-rebalance template)

A generic "move X of asset A to B" action — e.g. a bare `ERC20.transfer(to, amount)` or an
AMM `swap` with no caller-supplied tag — exposes only `(sender, target, asset, amount,
block)`. That is **not** a unique mandate binding:

- one such transaction could plausibly satisfy several open mandates with the same shape;
- an executor could point one real transfer at a mandate it was not performed for.

`sourceTxKey` replay protection stops a transaction from settling *twice*, but it does not
resolve *which* mandate an untagged transaction belongs to. Committing a tight block window
narrows it but does not close it.

**Decision:** for the first production template (treasury rebalance), the routed template is
canonical. `SetldExecutionRouter.execute(bytes32 mandateId, …)` writes the mandate id into
the calldata and the vault emits `RebalanceExecuted(bytes32 mandateId, …)`, giving an
unambiguous, mandate-scoped binding that the S8/S9 lifecycles rely on.

The router preserves `tx.from` (it passes `msg.sender` explicitly to the vault as
`executor`), so executor-identity binding survives the indirection — confirmed by the S8
`Executor identity: MATCH` check and the S9 predicate reading `txFrom` directly.

Direct adapters are on the roadmap (Release 0.2) for protocols in the Outcome-A class. They
are not forced here purely to lower adoption friction (PRD S3: "do not force the direct path").
