# GATES

Status log for PRD section 24 verification gates. Each entry recorded when it happened.
No later phase may build on a gate that has not passed.

| Gate | Description | Status | Date | Evidence |
|---|---|---|---|---|
| S0 | Live environment + dependency lock | PASS | 2026-09-03 | `evidence/manifests/environment.json`, `scripts/probe-attestcoin.ts` |
| S1 | Verified field extraction (all `TreasuryRebalancePredicateV1` fields) | PASS | 2026-09-03 | `evidence/manifests/environment.json` `requiredFieldMatrix`, `missingRequiredFields: []` |
| S2 | Replay, source identity, relayer neutrality | PASS | 2026-09-04 | on-chain (hardened deployment): S8 proof re-submitted vs fresh mandate 0x77f073d8 reverted SourceTxAlreadyConsumed; S8 settle submitted by relayer 0x03D9..7b66 (not creator/executor), reward -> executor. |
| S3 | Router-optional seam | PASS (Outcome B) | 2026-09-04 | docs/router-optional-seam.md — untagged generic actions do not bind a mandate uniquely; routed template canonical for treasury rebalance; direct adapters admissible only for protocols emitting a caller-controlled correlation id (roadmap 0.2). Router preserves tx.from (S8 executor-identity MATCH). |
| S4 | Reference model | PASS | 2026-09-04 | 14/14 model + 16/16 predicate parity + settlement-economics parity + 5 fuzz properties (256 runs ea) + vault invariants (8k ops). |
| S5 | Baseline harness parity | PASS | 2026-09-04 | B0 (0x34A8CFb0) and setld T0 agree on both real executions under an honest reporter; 0 disagreements. On the hardened deployment. |
| S6 | Core contracts + agent local composition | PASS | 2026-09-04 | 17 forge tests: 3-layer parity, core lifecycle (cancel/release/timeout/double-settle/one-tx-one-mandate), vault invariants, predicate fuzz, deterministic-100. Agent local ACCEPT+ABSTAIN. Slither in CI, findings triaged in SECURITY.md. |
| S7 | Economic + incentive model | PASS | 2026-09-04 | docs/economic-model.md — penalty schedule + incentive-compatibility (no cheap reservation, no profitable replay, relayer cannot game outcome, executor accept-iff-profitable enforced by agent guardrail + shown in the recorded ABSTAIN). |
| S8 | Public Attestcoin success lifecycle | PASS | 2026-09-04 | hardened deployment (core 0x975c043b). mandate 0x907043a3, Sepolia exec 0xa9df340e (blk 11632681 status 1), proof txIndex 109, settle 0x56f0adde -> FULFILLED; ref-model agreed; relayer != executor. |
| S9 | Public Attestcoin refusal lifecycle | PASS | 2026-09-04 | mandate 0xc28c59ba, Sepolia exec 0xb1e4cb61 blk 11632731 **status 1 (succeeded)** amountIn 25000 > cap 10000, settle 0x20f9e00e -> INVALID_ATTEMPT (AMOUNT_IN_OVER_CAP step 11); ref-model agreed; reward refunded + 100% bond penalty. |
| S10 | Sponsor-removal / reporter-compromise ablation | PASS | 2026-09-04 | compromised reporter asserted FULFILLED for the S9 over-cap execution -> B0 paid 10 tSETLD (invalid_reward_leakage); setld T0 refused the identical execution on-chain (0). Hardened deployment. evidence/campaigns/ablations/ |
| S11 | Wide-proof campaign | PARTIAL | 2026-09-04 | deterministic 100-case PASS (40/40 fulfilled, 60/60 refused, leakage 0). Real Attestcoin proofs: S8 + S9 + replay + honest/compromised ablation (6 real settlements) on the hardened deployment. 20+ independent-tx wide half gated on Attestcoin attestation throughput. |
| S12 | Product lifecycle + fresh-user proof | PARTIAL | 2026-09-04 | full wallet-based creator + executor lifecycle built + deployed (/app/create, /app/jobs, /app/mandate, /app/execution: bind source EIP-712 -> accept+bond -> Sepolia execute -> Attestcoin wait -> browser fetch proof -> settle). Playwright: 8/8 render + headless-wallet connect + browser-verify PASS on live. Transacting lifecycle spec written; full authenticated run deferred to avoid nonce collision with the S11 campaign. |
| S13 | Production-path evidence | PARTIAL | 2026-09-04 | settle gas p50 675k (verify() precompile + decode + 17-step predicate + vault transfers, one tx); source->settlement p50 570s on-chain. n=2. Concurrency/restart-recovery + larger n pending. |
| S14 | Open-source residue | PARTIAL | 2026-09-04 | 4 findings written up in docs/upstream/ with reproduction (C1 CC3 mixHash CONFIRMED via scripts/upstream/c1-repro.mjs; C2 is_height_attested wrapper patch drafted; C3 receipt-envelope docs note; C4 replay-key helper proposal). Not filed externally — pending explicit authorization. |
| S15 | Submission integrity + judge path | PARTIAL | 2026-09-04 | hosted GitHub Actions GREEN on all 4 jobs (contracts/slither/packages/evidence) — run 33867575470, commit d41c13b; forge-std pinned as git submodule (reproducible from fresh checkout); README/WHITEPAPER/submission-facts/claims/GATES synced to hardened deployment; clean-room web 5/5. Canonical-commit freeze + final demo scripts pending closure of S11-S14. |

## S0 — PASS (2026-09-03)

Executable probe `scripts/probe-attestcoin.ts` against live CC3 testnet:

- Creditcoin CC3 testnet RPC: `https://rpc.cc3-testnet.creditcoin.network/rpc`
- Creditcoin EVM chain ID: **102031** (`0x18e8f`)
- BlockProver precompile: `0x0000000000000000000000000000000000000FD2` (native, `eth_getCode` empty as expected)
- ChainInfo precompile: `0x0000000000000000000000000000000000000fd3`
- EvmV1Decoder library (deployed): `0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f`
- Proof builder: `https://proof-gen-api.cc3-testnet.creditcoin.network` (root 308 -> `/api/swagger`), no auth required
- Supported source chains via `get_supported_chains()`:
  - chainKey **1** = Sepolia (chainId 11155111, encoding 1)
  - chainKey **3** = Ethereum mainnet (chainId 1, encoding 1)
- Sepolia attestation genesis height: 0; latest attested height advancing (~11,627,900 at probe time)
- SDK: `@gluwa/usc-sdk@0.18.0` (latest dist-tag)
- Contracts pkg: `@gluwa/usc-contracts@0.2.0` (see DECISIONS: PRD assumed 0.1.2)

Stop condition (could not generate + verify a recent Sepolia proof): NOT triggered.

## S1 — PASS (2026-09-03)

Real attested Sepolia tx `0xd64ba21d1146816e36730fe301343e4db76b8a5a97e88d7a8e0b1cd56390080b`
(ERC20 `transfer`, block 11,627,510, txIndex 2):

1. `ProofBuilder.getProof()` -> success (~760 ms, cached)
2. `PrecompileBlockProver.verifySingle(...)` on CC3 testnet -> **true** (~260 ms)
3. `computeTransactionIndex()` on-chain -> 2, matches proof `txIndex`
4. `EvmV1Decoder.decodeEvmV1Transaction(txBytes)` on CC3 testnet yielded every predicate field:

| Field | Value | Source |
|---|---|---|
| sourceChainKey | 1 | proof |
| sourceBlockHeight | 11627510 | proof |
| transactionIndex | 2 | on-chain compute + proof |
| txFrom (sender) | 0xE6Ad…F687 | decoder `commonTx.from` |
| txTo (target) | 0xF4f1…E951 | decoder `commonTx.to` |
| function selector | 0xa9059cbb | decoder `commonTx.data[0:4]` |
| calldata args | full `data` (138 hex) | decoder `commonTx.data` |
| receipt status | 1 | decoder `receipt.receiptStatus` |
| receipt gasUsed | 34929 | decoder `receipt.receiptGasUsed` |
| log emitter | 0xF4f1…E951 | decoder `receipt.receiptLogs[].address_` |
| log topics | 3 topics incl `Transfer` sig | decoder `receipt.receiptLogs[].topics` |
| log data | 66 hex bytes | decoder `receipt.receiptLogs[].data` |

`missingRequiredFields: []`. No mandatory field required an RPC fallback.

PRD section 31 kill criteria checked against reality — none triggered:
- proof exposes receipt logs + function arguments: YES
- source sender decodable and bindable: YES
- replay-safe unique tx id implementable: YES (`keccak256(chainKey, blockHeight, txIndex)`, txIndex verifiable on-chain)
- proof latency coherent for a demo: YES (sub-second cached, verify ~260 ms)

Residual for S1 -> carried into S6: on-chain **gas cost** of verify+decode inside a settlement
transaction (probe used `staticCall`/`eth_call`; needs a real tx measurement).
