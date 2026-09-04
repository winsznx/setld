# S11 public campaign — attempt log (honest accounting)

Batch 1 (`pnpm tsx apps/orchestrator/src/public-campaign.ts 9`), started 2026-09-04:

| # | label | result | note |
|---|---|---|---|
| 1 | wide-valid | COMPLETED — FULFILLED | real Sepolia execution + Attestcoin proof + settle |
| 2 | wide-over-cap | COMPLETED — INVALID_ATTEMPT | real Sepolia execution + Attestcoin proof + settle |
| 3 | wide-low-minout | COMPLETED — INVALID_ATTEMPT | real Sepolia execution + Attestcoin proof + settle |
| 4-9 | wide-valid / wide-over-cap / wide-low-minout | ERROR — `getaddrinfo ENOTFOUND rpc.cc3-testnet.creditcoin.network` | transient DNS failure in the build sandbox, not an Attestcoin-throughput or contract issue; connectivity confirmed restored immediately after |

3/9 completed in batch 1. Continuing in batch 2 below rather than editing batch 1's rows.

Batch 2 (8 attempts), continued after connectivity recovered:

10/17 cumulative completed (rows 0,1,2,9,10,11,12,13,15,16 of results.json). 7 errors:
6 transient DNS (`ENOTFOUND`), 1 transient TLS (`EPROTO`/SSL alert). No Attestcoin-throughput
or contract-correctness failures. Launching batch 3 (10 attempts) to push toward the PRD's
20+ target; will stop and report the honest final count regardless of outcome.
