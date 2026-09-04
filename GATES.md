# GATES

Status log for PRD section 24 verification gates. Each entry recorded when it happened.
No later phase may build on a gate that has not passed.

| Gate | Description | Status | Date | Evidence |
|---|---|---|---|---|
| S0 | Live environment + dependency lock | PASS | 2026-09-03 | `evidence/manifests/environment.json`, `scripts/probe-attestcoin.ts` |
| S1 | Verified field extraction (all `TreasuryRebalancePredicateV1` fields) | PASS | 2026-09-03 | `evidence/manifests/environment.json` `requiredFieldMatrix`, `missingRequiredFields: []` |
| S2 | Replay, source identity, relayer neutrality | PARTIAL | 2026-09-03 | reference-model proves replay reject + sender binding + submitter independence; on-chain proof pending funding |
| S3 | Router-optional seam | TODO | | |
| S4 | Reference model | PASS (fuzz pending) | 2026-09-03 | 14/14 model + 16/16 predicate parity + settlement-economics parity (per-recipient deltas + conservation). Property/fuzz layer still to add. |
| S5 | Baseline harness parity | TODO | | |
| S6 | Core contracts + agent local composition | PARTIAL | 2026-09-03 | full 3-layer differential parity PASS (ref-model / Solidity predicate / SetldCore economics); local e2e lifecycle + agent + Slither pending |
| S7 | Economic + incentive model | TODO | | |
| S8 | Public Attestcoin success lifecycle | PASS | 2026-09-04 | mandate 0x2e69eac5, Sepolia exec 0x7a758701 (blk 11629791 status 1), proof txIndex 111, settle 0x6ee3bf87 -> FULFILLED; ref-model agreed; relayer != executor (neutrality). evidence/completed-mandates/canonical-correct.json |
| S9 | Public Attestcoin refusal lifecycle | PASS | 2026-09-04 | mandate 0x507b1d27, Sepolia exec 0x5e39e355 blk 11629847 **status 1 (succeeded)** with amountIn 25000 > cap 10000, proof txIndex 183, settle 0x8bca31f6 -> INVALID_ATTEMPT (AMOUNT_IN_OVER_CAP step 11); ref-model agreed; reward refunded + 100% bond penalty. evidence/completed-mandates/canonical-wrong-cap.json |
| S10 | Sponsor-removal / reporter-compromise ablation | TODO | | |
| S11 | Wide-proof campaign | BLOCKED | | needs funded wallets |
| S12 | Product lifecycle + fresh-user proof | PARTIAL | 2026-09-04 | agent loop: real model ACCEPT (+on-chain accept/execute) + real model ABSTAIN + guardrail ABSTAIN, evidence/agent/. Web product (design.md ready) + fresh-user tests pending. |
| S13 | Production-path evidence | TODO | | |
| S14 | Open-source residue | TODO | | |
| S15 | Submission integrity + judge path | TODO | | |

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
