# setld — Receipt-Verified Execution Assurance for Autonomous On-Chain Work

BUIDL CTC 2026 Fall · AI track · https://setld.pages.dev · https://github.com/winsznx/setld

---

## 1. The gap

Protocols increasingly delegate money-moving transactions to autonomous agents, keepers and
bots. The authorization primitives are mature: a signature, a session key, a spending
policy. None of them answer the question that actually matters after the fact — **did the
agent perform the exact job it was paid for?** The right contract, the right function, the
right amount, inside the committed bounds, before the deadline.

Today that question is answered by one of:

- **the agent's own report** — trivially gamed;
- **a human reviewer** — slow, subjective, doesn't scale;
- **a centralized oracle or reporter** — a single trusted party that can be wrong or
  compromised.

setld replaces all three with a cryptographic receipt.

## 2. Mechanism

```
creator escrows a reward on Creditcoin + commits an immutable execution mandate
        │
executor bonds on Creditcoin, performs the required transaction on Ethereum
        │
Attestcoin Protocol proves that transaction + its receipt belong to a finalized Sepolia block
        │
setld evaluates the verified sender, target, calldata, receipt status and event data
against the mandate's 17-step committed predicate
        │
FULFILLED → reward to executor, bond returned
INVALID_ATTEMPT → reward refunded, executor bond penalized
EXECUTION_REVERTED → reward refunded, lower penalty
TIMED_OUT → reward refunded, reservation penalty
```

The executor never reports completion. The Attestcoin proof and the on-chain predicate do.

## 3. Attestcoin integration

`SetldCore.settle` → `SetldAttestcoinAdapter.verifySingle`:

1. `IChainInfo.is_height_attested(chainKey, height)` — fail closed if the source block is
   not yet attested.
2. `INativeQueryVerifier.verify(chainKey, height, txBytes, merkleProof, continuityProof)` —
   the native BlockProver precompile (`0x…FD2`); reverts `AttestcoinProofInvalid` on `false`.
3. `verifier.calculateTxIndex(merkleProof)` → the transaction index.
4. `EvmV1Decoder.decodeCommonTxFields(txBytes)` + `decodeReceiptFields(txBytes)` — one proof
   envelope carries **both** the transaction and its receipt; no separate receipt proof.
5. `sourceTxKey = keccak256(abi.encodePacked(chainKey, height, txIndex))` — consumed
   atomically with the terminal-state write.

Every settlement that moves reward or bond value is gated on step 2. The runtime never
substitutes an RPC result. SDK `@gluwa/usc-sdk@0.18.0`, contracts `@gluwa/usc-contracts@0.2.0`.

## 4. Why Attestcoin is load-bearing, measured

We built the counterfactual — `BaselineReporterSettlement`, a contract that settles from a
trusted reporter's assertion instead of a proof — and ran the identical predicate and the
identical two real Sepolia executions through both.

| | Honest reporter | Compromised reporter |
|---|---|---|
| agreement with setld | every case (S5) | — |
| **invalid reward leaked, baseline** | 0 | **10 tSETLD** |
| invalid reward leaked, setld | 0 | **0** |

The over-cap execution *succeeded on Ethereum* (receipt status 1). A compromised reporter
asserted `FULFILLED` and the baseline paid. setld refused the same execution because the
proof and predicate did not support it. `evidence/campaigns/ablations/reporter-compromise.json`.

## 5. The AI track

`apps/agent` runs an autonomous OBSERVE → ANALYZE → DECIDE → AUTHORIZE → EXECUTE → RECONCILE
→ FEEDBACK loop. A real `claude-sonnet-5` call makes the bounded ACCEPT/ABSTAIN choice over
structured economics (reward, bond at risk, gas, net margin, deadline margin, simulation).
Deterministic guardrails (`policy.ts`) gate every decision. The model **cannot** bypass a
guardrail, choose an unapproved route, sign calldata, mark an execution successful, or
choose a payout — those live outside the decision function. Attestcoin and the setld
predicate decide the outcome.

Recorded run: one genuine model ACCEPT ("net margin ~6.5x the bond at risk") followed by an
on-chain bond and Sepolia execution, and one genuine model ABSTAIN ("~2% of the bond at
risk, below the threshold to justify full bond exposure"). Remove the agent and setld
becomes a plain keeper protocol.

## 6. Correctness

- **Reference model** (`packages/reference-model`) — a dependency-light TS oracle for the
  predicate and settlement accounting.
- **3-layer differential parity** — the reference model, the Solidity predicate, and
  `SetldCore` economics agree on classification *and* per-recipient transfers across 16
  canonical vectors (`PredicateParity.t.sol`, `SettlementParity.t.sol`).
- **Fuzz** — 5 predicate properties, 256 runs each: never reverts, valid⇒FULFILLED,
  over-cap⇒refused, step consistency, replay⇒not-FULFILLED.
- **Invariants** — `SetldVault` accounted ≤ real balance and conservation, under 8k fuzzed
  operations.
- **Deterministic 100-case campaign** — 40 valid / 20 wrong-param / 10 wrong-sender / 10
  reverted / 10 after-deadline / 10 replay, all through the real settlement path:
  40/40 fulfilled, 60/60 refused, `invalid_reward_leakage = 0`.

## 7. Security

`SetldVault` is the sole custody boundary — no admin withdrawal, `nonReentrant` on every
mutator, balance-delta accounting against fee-on-transfer tokens. `SetldCore` sets terminal
state and consumes the source-tx key *before* any transfer (checks-effects-interactions).
Mandate ids are domain-separated with `block.chainid` + registry address. EIP-712 source
bindings are scoped to the Sepolia chain id + the deployment. The proof relayer is untrusted:
the reward beneficiary comes from the accepted-executor state, never `msg.sender` — proven
on-chain. Full mapping in `SECURITY.md`; Slither in CI.

## 8. What is proven, and what is not

**Proven on public testnets:** the full lifecycle pays a correct execution (S8) and refuses
a successful-but-wrong one (S9); replay reverts and the submitter is neutral (S2); an honest
baseline matches and a compromised one leaks (S5, S10); the field-extraction seam works with
every predicate field present (S0, S1).

**Not claimed:** arbitrary Ethereum task support (one production template; the broad claim
is withdrawn in `claims.json`); a large-N study (the ablation is 2 matched executions, the
campaign is 100 fork cases); a wallet-based consumer onboarding UI (the wallet-free judge
surface is live, the creator/executor product is roadmap).

## 9. Roadmap

- Direct adapters for protocols that emit a caller-controlled correlation id (no router).
- Additional deterministic templates (vault deposit, claim/settlement).
- Batch evidence for sequential workflows.
- Delegated bond providers and value-weighted machine credit — Creditcoin as the credit /
  assurance ledger for autonomous cross-chain work.

## 10. Reproduce

```
git clone https://github.com/winsznx/setld && cd setld && pnpm install
pnpm probe:attestcoin
cd contracts && forge test
cd .. && pnpm verify:mandate --id <mandateId> [--tamper]
```

All deployed addresses and transaction hashes: `evidence/submission-facts.json`.
Gate log: `GATES.md`. Every corrected assumption: `DECISIONS.md`.
