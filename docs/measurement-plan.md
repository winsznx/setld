# Measurement plan

## Primary metric

`invalid_reward_leakage` = total reward released to an executor for an execution the frozen
reference predicate classifies as non-fulfilling.

- setld (T0): **0** — deterministic-100 campaign, S9 on-chain, S10 ablation.
- baseline (B0) under a compromised reporter: **10 tSETLD** — S10 ablation.

## Secondary metrics (collected)

| Metric | Source | Value |
|---|---|---|
| correct settlement rate, honest conditions | deterministic-100 | 40/40 valid fulfilled |
| false rejection rate | deterministic-100 | 0/40 |
| differential-parity vectors passing | PredicateParity + SettlementParity | 16/16 |
| predicate fuzz properties | PredicateFuzz.t.sol | 5/5, 256 runs each |
| honest baseline / treatment disagreements | S5 | 0 |
| replay rejection | S2 on-chain | reverts SourceTxAlreadyConsumed |
| submitter-identity independence | S2 on-chain | reward → executor, not submitter |

## Not yet measured

- Attestcoin wait/proof/settle latency p50/p95 over a wide campaign (S13).
- verifier + predicate gas p50/p95 on-chain (S13).
- worker restart recovery, concurrent-queue behavior (S13).
- 20+ independent real Attestcoin-backed proofs (S11 wide half) — 2 canonical done, more
  gated on attestation throughput.

## Frozen manifests

- `evidence/campaigns/deterministic-100/manifest.md`
- `evidence/campaigns/ablations/reporter-compromise.json` (matched inputs listed inline)
