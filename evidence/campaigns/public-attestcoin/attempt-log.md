# S11 public campaign — attempt log (honest accounting)

Batch 1 (`pnpm tsx apps/orchestrator/src/public-campaign.ts 9`), started 2026-09-04:

| # | label | result | note |
|---|---|---|---|
| 1 | wide-valid | COMPLETED — FULFILLED | real Sepolia execution + Attestcoin proof + settle |
| 2 | wide-over-cap | COMPLETED — INVALID_ATTEMPT | real Sepolia execution + Attestcoin proof + settle |
| 3 | wide-low-minout | COMPLETED — INVALID_ATTEMPT | real Sepolia execution + Attestcoin proof + settle |
| 4-9 | wide-valid / wide-over-cap / wide-low-minout | ERROR — `getaddrinfo ENOTFOUND rpc.cc3-testnet.creditcoin.network` | transient DNS failure in the build sandbox, not an Attestcoin-throughput or contract issue; connectivity confirmed restored immediately after |

3/9 completed in batch 1. Continuing in batch 2 below rather than editing batch 1's rows.
