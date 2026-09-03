# DECISIONS

Architectural decisions and points where live reality corrected a PRD assumption.
Precedence (PRD 34.4): live probe > official package source > official docs > official examples > PRD > third-party.

## D1 — `@gluwa/usc-contracts` is 0.2.0, not 0.1.2 (2026-09-03)

PRD section 2 / 34.2 recorded `@gluwa/usc-contracts@0.1.2` from older examples.
`npm view` shows latest `0.2.0`. Action: pin `0.2.0`, diff its ABIs before wiring the
on-chain adapter, record any interface delta here. PRD is stale but not wrong in spirit.

## D2 — Attestcoin proof already carries transaction + receipt in one envelope (2026-09-03)

The proof-builder `txBytes` is an ABI-encoded `(uint8 txType, bytes[])` envelope that the
on-chain `EvmV1Decoder` (`0x731c…F9f`) decodes into BOTH transaction fields and receipt
fields (status, gasUsed, logs, logsBloom). `PrecompileBlockProver.verifySingle` proves that
envelope is included under the attested block. Consequence for architecture:
`SetldAttestcoinAdapter` wraps `verifySingle` + `EvmV1Decoder` and returns a normalized
`VerifiedExecution`. There is no separate receipt-proof step to design. Matches PRD 12.8
intent; simpler than PRD 17.x implied.

## D3 — Proof builder needs no credential on CC3 testnet (2026-09-03)

`https://proof-gen-api.cc3-testnet.creditcoin.network` served real proofs with no API key
from an unauthenticated client. Relayer/worker liveness design does not need a secret for
proof acquisition on testnet. Revisit for mainnet.

## D4 — Creditcoin CC3 testnet EVM chain ID = 102543 (0x18e8f) (2026-09-03)

Pinned from live `eth_chainId`. All EIP-712 domains, binding messages, and wallet
network-switch UX use this value. Never copy a chain ID from a tutorial (PRD 2.2).

## D5 — SDK is ESM, ethers v6, Node >=24 (2026-09-03)

`@gluwa/usc-sdk@0.18.0` deps: `ethers@^6.15`, `axios`, `dotenv`, `exponential-backoff`.
Repo standardizes on ethers v6 (PRD 18.1 allows viem OR ethers; SDK forces ethers).

## D6 — Deployed-component set: 6 on-chain units, each with a distinct boundary (2026-09-03)

The PRD names ~10 Creditcoin modules (13.1–13.8). Deploying each separately would add
cross-contract call surface and reentrancy paths without adding a trust, security, or
economic boundary. Applying the rule "every separately deployed component must justify its
own boundary", the deployed set is:

| Unit | Boundary it owns | Why not merged |
|---|---|---|
| `SetldVault` | value custody | must have no arbitrary-withdraw path; only the settlement authority may move funds; isolating it bounds the blast radius of any core bug |
| `SetldAttestcoinAdapter` | Attestcoin protocol-version compatibility (PRD 13.3) | "replaceable only by deploying a new adapter version"; active mandates pin their adapter |
| `SetldExecutorRegistry` | executor identity + source-address binding | EIP-712 binding/rotation is self-contained, read by many parties, and is the identity other protocols would integrate against (PRD 12.1, ERC-8004 path) |
| `SetldCore` | mandate lifecycle + template config + settlement + fee params | registry, template-registry, settlement-engine and fee-controller all mutate or read the **same** mandate state and PRD 15.1 requires source-tx consumption and terminal-state update to be **atomic**. Splitting them forces external calls mid-settlement. Collapsed; capabilities preserved as internal functions with the PRD's intended access control (template registration = operator-gated, fee params = immutable at deploy for v1 per PRD 16.6/13.8). |
| `TreasuryRebalancePredicateV1` | pure predicate logic (PRD 13.5) | deployed as a linked library; no state, no admin, reused by reference-model parity tests |
| `BaselineReporterSettlement` (B0) | the reporter-trust counterfactual (PRD 4A.2) | MUST be isolated from setld's verifier path so the ablation is honest |

Capabilities the PRD assigned to now-internal modules are all retained. If a future
template needs an independent template registry (e.g. third-party template authors), it can
be extracted without touching settled mandates. Evidence: this file + `contracts/src/creditcoin/core`.
