# Threat model

Full threat → mitigation → test mapping lives in [`../SECURITY.md`](../SECURITY.md).
This file records the trust boundaries and the one-line adversary model.

## Adversary model

An adversary may control any combination of: the executor, the creator, the proof relayer,
the agent model, the hosted API/indexer/frontend, and the source RPC. They may not break
Creditcoin consensus, the Attestcoin attestor quorum, Ethereum finality for attested
blocks, or the deployed bytecode.

## Trust boundaries (deployed units, DECISIONS.md D6)

- `SetldVault` — value custody. Only `SetldCore` moves funds; no admin withdrawal.
- `SetldAttestcoinAdapter` — the only path from a proof to a `VerifiedExecution`; fails closed.
- `SetldExecutorRegistry` — identity; EIP-712 binding scoped to chain id + deployment.
- `SetldCore` — the settlement authority; atomic `sourceTxKey` consume + terminal state.
- `BaselineReporterSettlement` — isolated; not part of the setld path.

## The one guarantee

No reward or bond value moves for a mandate unless a source-transaction proof accepted by
the Creditcoin BlockProver precompile shows an execution that satisfies every committed
field of that mandate. Demonstrated: S8 (pays), S9 (refuses a successful-but-wrong tx),
S2 (replay + neutrality), S10 (the baseline without this guarantee leaks).
