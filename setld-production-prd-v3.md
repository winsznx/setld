# setld.xyz
## Production Product Requirements Document

Document version: 3.0  
Status: Product-locked, lifecycle-complete, winner-gated, scientific-proof-ready  
Product: setld  
Competition: BUIDL CTC 2026 Fall — BUIDL For The Real World  
Submission deadline: 2026-09-13 23:59 ET  
Primary track: AI  
Secondary fit: DeFi  
Execution chain: Creditcoin testnet using the current Attestcoin Protocol native-verifier path  
Source chain for the first complete implementation: Ethereum Sepolia  
Visual design source of truth: `design.md`, supplied separately during implementation

---

## 0. Competition lock, product constitution, and v3 build charter

### 0.1 Competition facts that govern this PRD

setld is being built for BUIDL CTC 2026 Fall, sponsored by Creditcoin and Credit Labs.

Binding competition facts supplied by the organizer:

- theme: Attestcoin Protocol,
- primary submission track for setld: AI,
- submission deadline: 2026-09-13 23:59 ET,
- total prize pool: $15,000,
- grand prize: $10,000,
- top three teams advance to the Creditcoin Ecosystem Investment Program fast-track due-diligence stage,
- the project must be original work created during the hackathon,
- the project must be deployed on a testnet,
- the repository must contain a README,
- the submission must include a project description, Attestcoin integration summary, GitHub URL, deck or whitepaper URL, and prototype demo video URL,
- Attestcoin integration must be meaningful, functional, and documented,
- depth of Attestcoin utilization is explicitly a core scoring consideration.

The PRD therefore treats Attestcoin depth as an engineering property that must be visible in the value path, not a submission paragraph added later.

### 0.2 Product Constitution

Attestcoin exists to let Creditcoin applications consume cryptographically attested cross-chain data and execute business logic without relying on a centralized oracle operator to decide what happened elsewhere.

For setld, the sponsor-native negative space is not "read external data." The product uses Attestcoin as a settlement authority for external machine work:

```text
external agent action
→ cryptographically attested source transaction and receipt
→ deterministic mandate evaluation on Creditcoin
→ economic settlement on Creditcoin
```

The ideal sponsor showcase is therefore not another dashboard that displays Ethereum state. It is a product where a consequential Creditcoin transfer would be unsafe or impossible without Attestcoin proving the external execution.

### 0.3 Four-truth build standard

Every major phase must satisfy four independent truths:

1. Technical truth: the contracts, proof path, agent, worker, and product actually work.
2. Economic truth: the verified outcome changes who gets paid, refunded, or penalized.
3. Mechanism truth: Attestcoin-backed receipt settlement measurably resists a failure that a credible centralized-reporter baseline does not.
4. Judge truth: a technically competent reviewer can understand the problem, mechanism, outcome, and proof in seconds.

A green test suite cannot compensate for a missing comparative proof. A polished UI cannot compensate for a mocked Attestcoin path. A clever agent cannot compensate for ambiguous settlement semantics.

### 0.4 Product lock

Product category:

> Bonded execution assurance for autonomous on-chain work.

First complete use case:

> An autonomous treasury execution agent accepts a bounded rebalance mandate, bonds on Creditcoin, executes the approved source action on Ethereum Sepolia, and is paid only when Attestcoin-backed evidence proves the committed execution conditions were satisfied.

Primary AI-track story:

> The agent decides whether and how to perform the bounded job. Deterministic code and Attestcoin decide what is true and whether the agent earned payment.

The submission must not drift into a generic agent marketplace, generic keeper network, generic reputation protocol, generic bridge, generic cross-chain oracle, or chat interface.

### 0.5 Familiar-first judge framing

10-second problem:

> Protocols increasingly let autonomous agents move money, but a valid signature does not prove the agent completed the exact job it was paid to perform.

20-second product:

> setld lets a protocol post a bonded execution mandate. The agent acts on Ethereum, Attestcoin proves the real transaction and receipt, and Creditcoin pays or penalizes the executor from the committed rules.

60-second proof:

> We run matched mandates with correct, incorrect, reverted, late, and replayed source executions. The same Attestcoin verifier proves the source evidence. setld pays only the executions whose verified receipt satisfies the precommitted predicate. A centralized reporter baseline is also run on the same cases, including a compromised-reporter cohort, so we can show exactly which trust failure Attestcoin removes.

### 0.6 Sponsor load-bearing score

Target sponsor-removal score: 5/5.

Removal test:

- with Attestcoin, Creditcoin can verify the authoritative source transaction and receipt before moving reward/bond value,
- without Attestcoin, Creditcoin must trust a reporter, oracle, bridge message, or same-chain redesign,
- the submitted runtime must fail closed if the required Attestcoin verifier/proof path is unavailable,
- no generic RPC result may silently replace Attestcoin while the product keeps claiming receipt-verified settlement.

Sponsor Directness target: Level 5. The Attestcoin primitive is cryptographically necessary to satisfy the core settlement proof.

### 0.7 Provisional winner score budget

No official weighted judging rubric has been supplied in the competition details provided to this PRD, so the internal Hackathon Operator scorecard is used only as a planning tool. These are forecast targets, not judge scores and not evidence of success.

| Axis | Weight | Target | What must exist to earn it |
|---|---:|---:|---|
| Sponsor-native pain | 15 | 14 | clear delegated-execution failure problem tied to cross-chain truth |
| 10-second judge legibility | 10 | 10 | correct-paid / wrong-refused visual contrast |
| Measurable value / headline metric | 10 | 9 | invalid reward leakage and settlement integrity campaign |
| Evidence-at-scale potential | 10 | 10 | 100-case deterministic campaign plus repeated real testnet proofs |
| Sponsor load-bearingness | 10 | 10 | native Attestcoin proof gates reward/bond movement |
| Existing-user adoption / distribution | 10 | 8 | SDK + protocol integration path with bounded adoption friction |
| Technical moat / originality | 10 | 9 | receipt-as-work-certificate + bonded cross-chain settlement |
| Agent-track legibility | 5 | 5 | visible observe → decide → execute → feedback loop |
| Business viability | 5 | 4 | settlement fees + assurance/underwriting path |
| Failure-path demo strength | 5 | 5 | valid proof of an execution that still fails the mandate |
| Upstream contribution potential | 5 | 4 | QueryBuilder/verifier test vectors or DX improvement from real usage |
| Reproducibility / external verification | 5 | 5 | public proof pages, raw artifacts, one-command verifier |
| Total | 100 | 93 | conditional on all evidence gates passing |

Automatic downgrade rule: if the comparative mechanism experiment, wide-proof campaign, or live Attestcoin settlement does not pass, the project remains REVISE regardless of UI completeness.

### 0.8 Build Contract requirement

Before implementation, create `BUILD_CONTRACT.md`. It is an operating contract for coding agents and contributors and must contain:

- this PRD as product/architecture source of truth,
- `design.md` as visual source of truth,
- live protocol evidence may correct stale PRD assumptions,
- no fabricated metrics, users, transactions, logs, receipts, or screenshots,
- every displayed number must trace to machine-readable evidence,
- targets must remain labelled as targets until measured,
- no silent fallback from Attestcoin to a generic reporter,
- materially failed runs and withdrawn claims must be retained,
- comparative experiments must use matched inputs/workloads,
- private keys and secrets may never be printed into logs or committed,
- completed gates must be recorded contemporaneously in `GATES.md`,
- public facts are synchronized through `submission-facts.json`.

---

## 0. Product lifecycle and onboarding audit

### A. Product-surface verdict

**REVISE, fixed in this document.**

The prior protocol specification was strong on contracts, proof verification, economic outcomes, security, and judge evidence, but the product surface was not complete enough to hand to a fresh target user. It named routes and listed high-level journeys without fully specifying entry, account/session creation, two-network wallet handling, role onboarding, the exact first action, confirmation and signature sequences, human-facing pending/error/recovery behavior, return usage, revocation, or the machine interface used by an autonomous executor.

This revision treats the product surface as part of the protocol. A user-visible action is incomplete until the user can enter it, understand it, sign or authorize it, observe processing, see the terminal artifact, recover from failure, and find it again later.

### B. Missing lifecycles found in the previous revision

The previous revision required the following capabilities but did not fully specify the user path that invoked them:

- creating the first authenticated browser session,
- distinguishing creator onboarding from executor onboarding,
- binding a Sepolia execution address to a Creditcoin executor identity,
- handling Creditcoin-to-Sepolia network switching without losing session context,
- funding gas, reward, creator bond, and executor bond before a transaction fails,
- resuming a mandate composer after a rejected or abandoned signature,
- making mandate validation understandable without exposing internal predicate jargon,
- taking an executor from an open mandate to source execution without reading SDK docs,
- exposing autonomous-agent intake as a real machine interface rather than prose,
- explaining Attestcoin waiting, proof generation, proof submission, and settlement as distinct user states,
- showing what a user can safely retry and what must never be resubmitted blindly,
- presenting completed, failed, released, timed-out, and invalidated mandates in history,
- rotating or revoking source-address bindings and API credentials,
- cancelling an open mandate and releasing an accepted mandate through explicit product actions,
- recovering interrupted browser sessions from on-chain state,
- giving a returning creator or executor an obvious next action,
- running the full demo through the product itself rather than through explorer tabs and terminal narration,
- enforcing a fresh-user acceptance test as a release gate.

### C through K: where the corrected specification lives

- **C. User journey map:** Sections 10 and 11.5.
- **D. Route / command / interface map:** Sections 11.2 and 11.3.
- **E. Onboarding spec:** Section 11.4.
- **F. Core action specs:** Sections 11.5 and 11.6.
- **G. Auth / wallet / identity flow:** Section 11.7.
- **H. State matrix:** Section 11.8.
- **I. Return-user loop:** Section 11.10.
- **J. 2–3 minute demo path:** Sections 11.13 and 28.
- **K. PRD patch:** Sections 9 through 11 were replaced, product-surface gates were strengthened, and v3 now requires live chain/environment discovery at Gate S0 instead of trusting a previously recorded testnet chain ID.

The visual system remains out of scope here. `design.md` remains the only source of truth for layout, typography, color, illustration, motion, and brand styling.

---

## 1. Product definition

setld is a receipt-verified execution assurance protocol for autonomous agents, keepers, bots, and human operators that perform on-chain work on an external blockchain.

A job creator escrows a reward on Creditcoin and defines an immutable execution mandate. An executor accepts the mandate and posts a bond. The executor performs the required transaction on Ethereum. The Attestcoin Protocol proves that the Ethereum transaction and receipt belong to a finalized source block. setld then evaluates the verified sender, target, function call, receipt status, and required event data against the mandate. Correct work releases the reward and returns the bond. A provably incorrect attempt or an unfulfilled deadline applies the mandate's precommitted settlement policy.

Core line:

> The agent does not report completion. The receipt does.

Product promise:

> External on-chain work is paid and accounted for from cryptographically verified execution evidence, without a human evaluator or centralized oracle deciding the result.

setld does not verify arbitrary off-chain work, model reasoning, intent, or physical-world outcomes. Version one verifies deterministic Ethereum transaction outcomes that can be expressed through transaction and receipt fields supported by the Attestcoin stack.

---

## 2. Current Attestcoin platform constraints and source lock

The implementation must use the current native-verifier Attestcoin architecture. Older USC prover-contract, STARK callback, or deprecated precompile flows must not be copied merely because an old tutorial or third-party repository contains them.

Current primary-source package evidence checked on 2026-09-03:

- official Gluwa SDK repository: `github.com/gluwa/cc-next-query-builder`,
- npm package name: `@gluwa/usc-sdk`,
- repository package version observed: `0.18.0`,
- official examples currently pin `@gluwa/usc-sdk@0.18.0` and `@gluwa/usc-contracts@0.1.2`,
- `PrecompileChainInfoProvider` exposes supported-chain/attestation information,
- `ProofBuilder` obtains transaction proofs from the proof-builder service,
- `PrecompileBlockProver` verifies single or batch transaction proofs on Creditcoin,
- `QueryBuilder` can construct result segments from transaction and receipt material, including static transaction/receipt fields, ABI-decoded events, function signatures, and function arguments.

These observations are build-time leads, not permission to hardcode stale environment values. Gate S0 must probe the live Creditcoin testnet and pin the exact package/ABI/environment that actually works at implementation time.

### 2.1 Required authoritative fields

The first template requires enough verified evidence to derive or verify:

- source chain key,
- source block number,
- transaction hash or a replay-safe unique source transaction identity,
- transaction sender,
- transaction target,
- function signature or selector,
- selected calldata arguments,
- receipt status,
- log emitter address,
- log topics,
- selected event values,
- attestation/proof provenance.

If a required field is unavailable through the current proof/query path, the template must be redesigned. The worker or browser may not fill an unavailable field from a normal RPC call and label it Attestcoin-verified.

### 2.2 Chain/environment rule

Do not trust a chain ID, source chain key, proof-builder URL, explorer URL, attested height, verifier ABI, or precompile address merely because it appears in an older PRD or tutorial.

Gate S0 must record:

```text
Creditcoin RPC
Creditcoin EVM chain ID
native verifier address + runtime code hash
ChainInfo address + runtime code hash
source chain registration
source chain key
latest attested source height
proof-builder URL
SDK version
contracts/decoder package version
explorer URLs
faucet path
probe timestamp
```

### 2.3 Security model of the proof worker

The proof worker is a liveness component, not the authority deciding whether the source action happened. It may discover the source transaction, wait for attestation, request/build the proof, and submit settlement, but:

- any party should be able to relay the same valid evidence,
- proof submission identity must never determine executor reward ownership,
- invalid or modified proof material must fail in the authoritative verifier path,
- worker outage may delay settlement but must not allow fabrication,
- duplicate delivery must be idempotent,
- hosted proof-builder outage must surface as an unavailable dependency and use an officially supported alternative only if that alternative has itself passed a gate.

### 2.4 Fail-closed sponsor dependency

The runtime must expose a stable error such as `ATTESTCOIN_UNAVAILABLE` or `ATTESTCOIN_PROOF_INVALID` when the required sponsor path cannot be completed. It may not silently settle from cached RPC truth, a backend boolean, or an administrator override while preserving the normal "verified" state.

---

## 3. Dominant mechanism

```text
immutable mandate + funded reward + bonded executor
                        |
                        v
          executor performs Ethereum action
                        |
                        v
       Attestcoin verifies transaction and receipt
                        |
                        v
        setld evaluates committed receipt predicate
                        |
                        v
      reward, refund, bond return, or bond penalty
```

Judge-compressible sentence:

> An agent acts on Ethereum, Attestcoin proves the receipt, and Creditcoin settles whether the work was done correctly.

---

## 4. Falsifiable core claim

Given:

- a funded mandate on Creditcoin,
- a registered executor with a bound Ethereum execution address,
- a real Ethereum Sepolia transaction,
- a valid Attestcoin proof for that transaction,
- and a versioned setld predicate committed before acceptance,

the setld contracts will:

1. verify the source transaction through the native Attestcoin verifier,
2. derive a unique source transaction key,
3. reject duplicate consumption,
4. verify the source chain, sender, target, selector or function shape, argument constraints, source block deadline, receipt status, required log emitter, event signature, and required event values,
5. settle only the executor bound to the verified source sender,
6. return or penalize funds exactly according to the immutable mandate policy,
7. produce an independently reproducible settlement trace.

The claim is falsified if any of the following occurs:

- an unverified or modified source transaction is accepted,
- the wrong sender earns the reward,
- a relayer earns the executor reward merely by submitting the proof,
- a failed receipt is classified as successful,
- a transaction with the wrong target, selector, arguments, event emitter, event signature, event values, or deadline earns the reward,
- one source transaction settles more than one mandate,
- one mandate reaches more than one terminal state,
- creator and executor asset conservation fails,
- the on-chain outcome differs from the executable reference model,
- the proof worker can choose the economic outcome,
- the public product claims a proof level higher than the evidence reached.

---

## 4A. Competitive scientific proof layer

### 4A.1 Mechanism hypothesis

Pre-registered hypothesis:

> Under the same source transactions, mandate terms, reward/bond amounts, and predicate logic, using Attestcoin-backed source evidence instead of a centralized Ethereum RPC reporter should preserve correct settlement under honest conditions and prevent fabricated fulfillment under reporter compromise, because the treatment path requires a source transaction proof accepted by Creditcoin's Attestcoin verifier before value can move.

This hypothesis is allowed to fail. If the experiment does not distinguish the treatment from the baseline under the stated threat model, narrow the thesis rather than changing the metric after seeing results.

### 4A.2 Reference model, baseline, and counterfactual are distinct

Reference model:

- pure deterministic implementation of mandate evaluation and settlement accounting,
- receives normalized verified-execution objects,
- proves correctness of contract logic and edge cases,
- never counts as competitive proof by itself.

Primary baseline B0, centralized reporter:

- a competent service reads the same Sepolia transaction and receipt through a normal RPC,
- it evaluates the same predicate,
- it signs or submits a settlement assertion to a baseline Creditcoin contract,
- under honest operation it should match setld,
- under reporter compromise it can fabricate an apparently successful assertion because the Creditcoin contract trusts the reporter.

Treatment T0, setld:

- the same mandate and economic rules,
- the source transaction must be admitted through the actual Attestcoin proof/verifier path,
- the same deterministic predicate runs against Attestcoin-derived fields,
- the proof submitter has no discretionary settlement authority.

Secondary counterfactual B1, same-chain job contract:

- mandate, execution validation, and settlement all live on Ethereum,
- useful for understanding why a team might avoid a cross-chain assurance layer entirely,
- compare deployment/integration surface, settlement asset location, portable Creditcoin execution history, and cross-chain trust assumptions,
- do not cripple this baseline to make setld look better.

### 4A.3 Headline mechanism metric

Primary metric:

```text
invalid_reward_leakage =
  total reward released for executions that the frozen reference predicate classifies as non-fulfilling
```

Report both count and value-weighted leakage.

Secondary metrics:

- correct settlement rate under honest conditions,
- false rejection rate,
- proof/settlement latency p50 and p95,
- Attestcoin verification + predicate gas p50 and p95,
- worker retries per completed proof,
- replay rejection rate,
- executor/source-identity mismatch rejection rate,
- cost per completed settlement,
- time/changes needed to add a second supported mandate template.

Do not pre-fill numeric results in the UI, README, deck, or submission. Only measured artifacts may populate those values.

### 4A.4 Matched experiment cohorts

Freeze a machine-readable campaign manifest before running results.

Minimum deterministic campaign: 100 cases.

Suggested frozen cohort:

- 40 valid executions,
- 20 wrong protected parameter executions,
- 10 wrong source sender executions,
- 10 reverted source executions,
- 10 after-deadline executions,
- 10 replay/duplicate-consumption attempts.

Minimum real public campaign: 20 Attestcoin-backed source proofs across at least four outcome classes, plus the two canonical demo cases. Increase toward 30–50 if testnet latency/cost remains practical.

The public campaign must include multiple independent source transactions. Replaying one precomputed proof in many tests is not wide evidence.

### 4A.5 Reporter-compromise ablation

Run the same invalid cases through B0 and T0.

A compromised B0 reporter is permitted to sign "fulfilled" for invalid executions. This is not treated as ordinary honest-operation performance. It is a security ablation answering a specific question:

> What happens to reward integrity if the off-chain observer becomes malicious or compromised?

setld passes this ablation only when the Attestcoin path refuses the fabricated fulfillment because the authoritative source receipt/predicate does not support it.

Also include an honest-reporter cohort. If B0 and T0 disagree under honest conditions, treat that as a correctness incident and investigate before publishing any security advantage.

### 4A.6 Positive, negative, boundary, incomplete, and neutral controls

Positive control:

- exact valid execution must settle successfully.

Negative control:

- wrong protected destination or amount must not earn reward even when the source transaction itself is valid and Attestcoin-verifiable.

Boundary control:

- source transaction at the exact final acceptable source block must be accepted,
- one block after must be refused.

Incomplete-information control:

- if required proof/query material is unavailable, settlement must remain pending/fail closed rather than infer success from unverified RPC data.

Neutral control:

- two different proof relayer addresses submit equivalent valid evidence for otherwise identical mandates,
- economic outcome must not depend on relayer identity.

### 4A.7 Generalization gate

The submission may claim "receipt-verified execution assurance" broadly only after the frozen pipeline has been exercised across at least three independent action shapes.

Candidate shapes:

1. treasury rebalance with protected target/amount/event,
2. vault deposit or token operation with different function/event schema,
3. claim/settlement call with a distinct success event and argument set.

If only the treasury-rebalance shape passes by submission time, narrow all public claims to treasury execution assurance. Do not use one showcase template to imply arbitrary Ethereum task support.

### 4A.8 100-run question

If setld runs 100 times, the output should become a useful evidence corpus rather than 100 copies of the demo. Persist:

- mandate class,
- economic exposure,
- source execution type,
- predicate outcome,
- Attestcoin proof provenance,
- settlement result,
- latency,
- gas,
- retry count,
- refusal reason,
- baseline outcome where applicable.

This corpus is the beginning of the long-term machine execution ledger and the empirical basis for future bond pricing.

### 4A.9 Epistemic red team for the headline result

Before publishing results, explicitly test whether they could be misleading because of:

- intentionally weak reporter implementation,
- different predicate logic between baseline and treatment,
- unequal source transactions,
- different block/finality windows,
- cached proof artifacts used only by one arm,
- failed RPC/proof service calls counted as security refusals,
- replay cases counted as independent users or jobs,
- cherry-picked source transactions,
- hidden manual intervention,
- differing gas budgets,
- stale indexer state,
- output truncation or missing failed runs,
- changing the cohort after seeing failures.

When a confound appears, rerun the campaign. The nicer number does not survive a flawed harness.

### 4A.10 Sponsor causal proof

The sponsor-removal claim must be demonstrated, not only stated:

```text
Attestcoin path present
→ authoritative receipt accepted
→ predicate evaluated
→ settlement succeeds/refuses correctly

Attestcoin path removed and replaced with trusted reporter
→ honest reporter can match behavior
→ compromised reporter can fabricate fulfillment
→ baseline leaks reward under the defined attack
```

If a generic fallback can preserve the same trust guarantee, lower the sponsor-load-bearing claim and update the PRD.

---

## 5. Headline proof

The first public proof must show two settled mandates side by side:

| Correct mandate | Incorrect mandate |
|---|---|
| Ethereum transaction verified | Ethereum transaction verified |
| Bound executor matched | Bound executor matched |
| Predicate passed | Predicate failed on a visible committed field |
| Reward released | Reward refunded |
| Bond returned | Precommitted penalty applied |
| Replay rejected | Replay rejected |

Submission headline:

> The same Attestcoin verifier proved both transactions. setld paid the correct agent and rejected the wrong execution without an evaluator.

The incorrect case must be objectively attributable in version one. Use a committed wrong parameter, wrong target, wrong event value, or wrong sender. Do not use ambiguous MEV attribution or unverifiable intent.

---

## 5A. Winning screenshot and cross-track legibility

The winning screenshot is the side-by-side settlement proof, not the landing page and not a dashboard of test counts.

Required visual information:

```text
CORRECT EXECUTION                     VERIFIED BUT WRONG EXECUTION
Attestcoin proof: VERIFIED            Attestcoin proof: VERIFIED
Executor identity: MATCH              Executor identity: MATCH
Receipt status: SUCCESS               Receipt status: SUCCESS or REVERTED as designed
Protected destination: PASS           Protected destination: FAIL
Reward: RELEASED                      Reward: REFUNDED
Bond: RETURNED                        Bond: PENALTY APPLIED
Source tx: link                       Source tx: link
Creditcoin settlement: link           Creditcoin refusal/settlement: link
```

The screenshot must communicate a non-obvious point with the sound off:

> A valid cross-chain proof proves what happened. setld still decides whether what happened satisfied the job.

Cross-track final-round statement template, populated only after measurement:

> Same matched executions and economic rules. Attestcoin-backed setld reduced invalid reward leakage from X to Y under the pre-registered reporter-compromise test, while preserving Z/N correct settlements under honest conditions.

If X, Y, or Z are not measured, use a non-numeric statement and link the public proof instead of manufacturing a metric.

---

## 6. Product goals

### 6.1 Hackathon goals

- Demonstrate the Attestcoin Protocol as the load-bearing settlement authority for external agent work.
- Complete at least one success lifecycle and one provably incorrect lifecycle on public testnets.
- Make the central result understandable with the sound off.
- Provide a read-only proof page that a judge can inspect without a wallet.
- Show an autonomous agent creating and sending the source transaction while keeping the economic decision deterministic.
- Prove replay rejection and proof-submitter neutrality.
- Publish a generated claim ledger tied to real addresses and transaction hashes.

### 6.2 Product goals

- Let a creator define an objective external-chain job without appointing a discretionary evaluator.
- Let an executor understand the exact success predicate before bonding.
- Let any relayer deliver proof without becoming the beneficiary.
- Build value-weighted execution history from real settled mandates.
- Support a controlled library of mandate templates before allowing arbitrary predicates.
- Create a provider-neutral assurance layer around existing bots, AI agents, keeper systems, and operations teams.
- Keep Attestcoin verification and business settlement modular and auditable.

### 6.3 Long-term goals

- Support direct verification of existing protocol events where the current Attestcoin decoder exposes enough binding fields.
- Support multi-step workflow settlement using batch evidence, without claiming cross-transaction atomicity.
- Add delegated bond providers and machine credit facilities.
- Integrate optional agent identity standards such as ERC-8004 without depending on them for correctness.
- Support additional Attestcoin source chains only after official support and a complete proof lifecycle are verified.

---

## 7. Non-goals

Version one will not:

- verify off-chain deliverables, natural-language quality, model reasoning, or physical outcomes,
- claim that an AI agent's intent was correct,
- attribute a revert to MEV, market movement, a protocol bug, or executor fault unless the cause is objectively encoded in the mandate and receipt evidence,
- provide a universal arbitrary-expression interpreter,
- provide a generic agent marketplace,
- issue a governance token,
- bridge assets between Ethereum and Creditcoin,
- make separate Ethereum transactions atomic,
- replace transaction authorization or session-key policy systems,
- guarantee proof-service liveness,
- guarantee legal identity,
- support real-value lending or production funds during the hackathon,
- include a visual design specification in this PRD.

---

## 8. First complete use case

### 8.1 Mandate class

The first complete template is a treasury rebalance execution mandate.

A creator owns a deterministic demo treasury contract on Ethereum Sepolia. The mandate requires an executor agent to call a specific rebalance function with:

- an exact mandate identifier,
- an approved source asset,
- an approved destination asset,
- an input amount no greater than a committed cap,
- a minimum output,
- an expiry block,
- an approved target contract,
- and an expected `RebalanceExecuted` event.

The demo source contract must be deterministic enough to produce:

- one correct execution,
- one successful but semantically wrong execution, such as an amount above the mandate cap or wrong destination asset,
- one reverted execution for receipt-status testing,
- stable event fields that can be decoded by the Attestcoin integration.

The general setld protocol remains template-based. The treasury rebalance template is the first production-quality template and reference implementation.

### 8.2 Why a controlled template is required

A completely generic predicate language creates unsafe complexity, impossible mandates, gas unpredictability, and creator-side bond traps. Version one therefore uses audited template contracts with fixed validation code and typed parameters.

Each template must define:

- source action schema,
- required static transaction fields,
- required receipt fields,
- required events,
- parameter bounds,
- success classification,
- invalid-attempt classification,
- timeout policy,
- creator obligations,
- executor obligations,
- reference-model implementation,
- source-chain adapter requirements,
- proof decoding requirements.

---

## 9. Users, roles, and exact jobs-to-be-done

### 9.1 Primary interaction model

setld uses four surfaces because no single interface fits every role:

1. **Web application** for mandate creators, human executors, operators, and returning users.
2. **Agent SDK/API** for autonomous executors that must discover, preflight, accept, execute, and monitor mandates without a human clicking through the web app.
3. **Relayer service/CLI** for proof transport. It is intentionally machine-first and has no normal consumer dashboard requirement.
4. **Public read-only proof surface** for judges, auditors, mandate counterparties, and anyone verifying a completed record.

The web application is not a generic SaaS dashboard. Its home state is action-oriented and changes by role and outstanding obligation.

No Telegram bot, Discord bot, mobile app, browser extension, or voice interface is required for the first complete product. Adding one would duplicate a workflow already served by the web app or agent SDK.

### 9.2 Mandate creator

**Who they are:** a protocol engineer, treasury operator, DAO operator, smart-contract owner, or application operator who has a deterministic Ethereum action that can be expressed through an approved setld template.

**Problem that brings them here:** they need an external executor to perform an on-chain action and want payment and economic consequences tied to cryptographically verified execution rather than a human reviewer or the executor's self-report.

**What they know before arriving:** the desired source-chain action, acceptable parameter bounds, deadline, reward budget, and how much executor bond they require.

**What they need before starting:**

- an EVM wallet capable of signing on Creditcoin Testnet,
- enough tCTC for gas,
- the configured reward/bond asset if the template uses a token,
- a supported template and source target.

**What they should not need to understand:** Merkle proofs, continuity proofs, the `0x0FD2` precompile, transaction index derivation, decoder internals, relayer architecture, or the distinction between Attestcoin attestation and proof generation.

**Primary job-to-be-done:** publish a safe, understandable execution mandate with funded reward and precommitted settlement rules.

**Success:** the mandate reaches a terminal state with a visible evidence trail and the correct value movement.

**What they do next:** create another mandate from the same template, duplicate a completed configuration as a new draft, inspect executor history, or withdraw any claimable funds.

### 9.3 Human executor / operator

**Who they are:** a keeper operator, automation provider, protocol operations engineer, or technically capable individual willing to perform the source-chain action and place a bond behind execution.

**Problem that brings them here:** they want paid work with objective success conditions and do not want a creator to decide subjectively whether they deserve payment.

**What they know before arriving:** how to execute Ethereum transactions, how to inspect gas and source state, and their own profitability/risk limits.

**What they need before starting:**

- a Creditcoin wallet with gas and bond assets,
- a Sepolia execution wallet with gas,
- control of the source address they will bind,
- access to a supported source-chain RPC through the application or their own client.

**What they should not need to understand:** how Attestcoin proofs are constructed, how relayers are selected, or internal settlement-contract call graphs.

**Primary job-to-be-done:** find a compatible mandate, understand its exact success and penalty conditions, bond it, execute it, and receive deterministic settlement.

**Success:** the source transaction is verified, the predicate passes, the reward is paid, the bond is returned, and the result is added to execution history.

**What they do next:** accept another compatible mandate, inspect economics, export the evidence record, or update their execution policy.

### 9.4 Autonomous executor operator

**Who they are:** a developer operating an AI agent, keeper process, or autonomous transaction system that should participate in setld without browser intervention.

**Problem that brings them here:** their software needs a machine-readable way to discover mandates, reject unsafe jobs, accept and bond eligible work, construct exact source transactions, and observe settlement.

**What they know before arriving:** key-management policy, maximum bond exposure, allowed templates/targets, minimum reward thresholds, and gas policy.

**What they need before starting:**

- locally managed Creditcoin and Sepolia signing keys or approved external signers,
- the setld SDK/CLI,
- network configuration,
- optional scoped API credential for hosted indexing/webhooks,
- enough gas and bond assets.

**What they should not need to implement themselves:** raw Attestcoin proof decoding, mandate canonicalization, replay-key logic, or custom polling of every contract event.

**Primary job-to-be-done:** execute only mandates that pass machine policy and deterministic preflight, then reconcile the final on-chain result.

**Success:** the agent completes a full accept -> source execute -> settle lifecycle with no human approval after its configured policy gates.

**What they do next:** continue polling or receiving webhooks for compatible mandates and adjust policy from measured outcomes.

### 9.5 Proof relayer operator

**Who they are:** infrastructure operator running a proof-delivery worker.

**Problem that brings them here:** valid source transactions need Attestcoin proof material transported to Creditcoin reliably and idempotently.

**What they need:** RPC access, proof-builder access, a funded Creditcoin relayer signer, durable job storage, and health monitoring.

**What they should not need:** creator or executor private keys, authority to classify success, or custody of reward/bond funds.

**Primary job-to-be-done:** deliver a valid proof once and receive configured reimbursement if eligible.

**Success:** the proof is accepted or deterministically rejected as already consumed/invalid, with the worker marking the job terminal without causing duplicate settlement.

**What they do next:** continue processing the queue.

### 9.6 Template publisher / protocol operator

**Who they are:** the setld protocol team or later governance/multisig responsible for registering immutable template versions.

**Primary job-to-be-done:** register a template whose on-chain implementation, metadata, source adapter, and reference-model hash all match a reviewed release.

This role uses an operator-only admin script or protected internal route. It is not part of normal end-user onboarding.

### 9.7 Read-only verifier

**Who they are:** a judge, auditor, protocol risk reviewer, creator, executor, or public user.

**Problem that brings them here:** they want to know whether the advertised cross-chain execution actually happened and whether settlement followed the committed rules.

**Prerequisites:** none beyond a browser.

**What they should not need:** a wallet, test tokens, repository access, local CLI, or protocol terminology.

**Primary job-to-be-done:** open a completed mandate and independently inspect the source action, verified fields, predicate trace, and settlement.

**Success:** the verifier can state what happened, why the mandate passed or failed, and where each artifact exists on-chain.

**What they do next:** export the evidence bundle or inspect another mandate.

---

## 10. Complete user journey map

### 10.1 Creator journey: first visit to completed mandate

**ENTRY**

1. User lands on `/` from the hackathon page, direct link, docs, or shared mandate.
2. Above the fold they see three actions: `Create mandate`, `Find work`, and `View live proof`.
3. They choose `Create mandate`.
4. The app routes to `/app/onboarding?intent=create`.

**ONBOARDING**

5. The app explains the creator job in one sentence: define the execution, fund the reward, and let the verified receipt decide settlement.
6. User selects `Connect Creditcoin wallet`.
7. Wallet provider selection appears.
8. The app reads the connected address and chain.
9. If the wallet is not on Creditcoin Testnet, the user sees the required network and a `Switch network` action. No transaction action is enabled until the network is correct.
10. The app requests a domain-bound ownership/session signature. Rejection returns to the onboarding screen with `Signature cancelled, no funds moved` and a retry action.
11. On success the app creates a short-lived authenticated session tied to the Creditcoin address.
12. It checks tCTC gas balance and configured reward-token balance. Missing balances do not throw a raw RPC error. The user sees `You need testnet gas before publishing` with faucet and refresh actions.
13. The creator does not need to bind an Ethereum wallet unless they later choose to execute their own mandates.
14. The first-run checklist shows: `Wallet connected`, `Gas available`, `Choose a mandate template`, `Fund and publish`.
15. User may skip the explainer. The checklist remains available from Help and can be restarted from Settings.
16. App routes to `/app/create`.

**CORE ACTION**

17. User selects `Treasury rebalance`.
18. The composer asks only template fields, grouped as: what must happen, acceptable bounds, when it must happen, and economics.
19. Every field validates inline before the user can continue. Contract addresses are checksummed and source code/allowlist status is shown when available.
20. The app runs structural validation, canonical encoding, synthetic-perfect-receipt validation, source-state simulation, deadline feasibility, and balance checks.
21. Validation returns a human result: `Ready to publish`, `Needs changes`, or `Source state changed, simulate again`.
22. User opens `Review mandate`.
23. Review shows the exact action in plain language, reward, creator bond, required executor bond, execution deadline, proof grace period, failure penalties, and a collapsible canonical terms/hash section.
24. User confirms `I understand the reward and bond rules`.
25. User clicks `Fund and publish`.
26. Wallet transaction request appears on Creditcoin.
27. While signing, the page state is `Awaiting wallet approval` and the draft remains locally and server-side recoverable.
28. After broadcast the state becomes `Publishing mandate`, with tx hash and `Safe to leave this page` once the hash is known.
29. After confirmation the user is routed to `/app/mandates/{id}`.

**PROCESSING AND RESULT**

30. The mandate detail page has one dominant status timeline: `Published -> Accepted -> Executed on Ethereum -> Waiting for Attestcoin -> Proof submitted -> Settled`.
31. If no executor has accepted, the recommended action is `Share mandate` or `Edit a copy`. Published terms themselves cannot be edited.
32. When accepted, the creator sees executor identity, bound source address, bond amount, and deadline.
33. Source execution and proof states update without page refresh through indexed events/polling.
34. Terminal success displays reward/bond transfers, source transaction, proof verification transaction, predicate trace, and evidence export.
35. Terminal invalid attempt, timeout, release, cancellation, or invalidation displays the exact reason and asset movements.

**RECEIPT / HISTORY / NEXT ACTION**

36. The mandate automatically appears in `/app/history` and the public mandate record.
37. Creator can `Duplicate as new draft`, `Create another mandate`, `Export evidence`, or `Withdraw claimable balance` when a pull-payment path is used.

### 10.2 Executor journey: first visit to paid execution

**ENTRY**

1. User chooses `Find work` on `/` or opens a shared mandate.
2. If not onboarded, the action panel sends them to `/app/onboarding?intent=execute`.

**ONBOARDING**

3. Connect Creditcoin wallet, switch to Creditcoin Testnet, and sign the session challenge.
4. App verifies gas and bond-token balance.
5. User chooses `Bind Sepolia execution address`.
6. App asks the user to connect/select the source wallet and switch it to Sepolia.
7. The app displays the address that will be economically credited or penalized and the Creditcoin executor identity it will bind to.
8. User signs an EIP-712 binding challenge containing executor ID, Creditcoin account, Sepolia chain ID, source address, setld deployment, nonce, and expiry.
9. The app validates the signature off-chain, then asks the user to switch back to Creditcoin Testnet and submit the binding transaction.
10. After confirmation the source address is `Active`.
11. User optionally sets local filters: allowed templates, maximum bond, minimum reward, allowed targets, and minimum time-to-deadline. These are convenience policies, not protocol rules.
12. App routes to `/app/jobs` with compatible mandates.

**CORE ACTION**

13. Executor opens a mandate.
14. Action panel shows `Reward`, `Bond at risk`, `Execution deadline`, `Required source address`, `What counts as success`, `What causes penalty`, and estimated source gas.
15. `Run preflight` simulates the current source action without committing funds.
16. If simulation is stale, impossible, or the deadline is too short, `Accept` is disabled and the reason is explicit.
17. Executor clicks `Accept and bond`.
18. A final summary confirms bond, reservation penalty, deadline, source address, and one-executor exclusivity.
19. Creditcoin wallet signs acceptance/bond transaction.
20. After confirmation, page becomes `/app/executions/{mandateId}`.
21. The product generates the canonical source transaction from template terms. The user cannot manually edit protected fields in the normal UI.
22. Executor reviews source target, calldata summary, value, gas estimate, and expiry.
23. User clicks `Execute on Sepolia`.
24. App requests source-wallet signature on Sepolia.
25. After broadcast the source tx hash is pinned to the execution page and the app states `Broadcast is not completion. Waiting for the verified receipt.`
26. The product tracks receipt, Attestcoin readiness, proof acquisition, proof submission, and Creditcoin settlement as separate states.
27. If automated proof submission is delayed, a `Submit proof now` action is available once proof material is ready. The button is idempotent and disabled after consumption.

**RESULT**

28. On `FULFILLED`, the executor sees reward received, bond returned, source gas spent, settlement tx, and new history record.
29. On `INVALID_ATTEMPT` or `EXECUTION_REVERTED`, the exact predicate/result code and penalty are shown. No opaque `failed` toast is allowed.
30. On `TIMED_OUT`, the page states that no qualifying proof was received before the deadline, not that the source action provably never happened.

**NEXT ACTION**

31. Executor can `Find another mandate`, `View public execution record`, `Export evidence`, or `Update policy`.

### 10.3 Autonomous agent journey

The agent does not scrape the web application.

**ENTRY AND CONFIGURATION**

1. Operator installs the published SDK/CLI package.
2. `setld-agent init` creates a repo-relative/local config file from environment variables and never writes raw keys to source control.
3. Operator configures Creditcoin RPC, Sepolia RPC, Creditcoin signer, Sepolia signer, allowed template IDs, maximum bond, minimum reward, target allowlist, gas policy, and optional hosted API key/webhook endpoint.
4. `setld-agent doctor` checks RPCs, chain IDs, wallet balances, active source binding, template registry versions, and contract addresses.
5. If the source address is not bound, the command returns the exact binding action required rather than continuing unsafely.

**DISCOVERY TO SETTLEMENT**

6. Agent calls the SDK/indexer to list compatible `OPEN` mandates.
7. For each candidate it downloads the canonical `MandateEnvelope` and independently compares it with on-chain state.
8. It runs deterministic preflight and local profitability/risk policy.
9. Rejected candidates receive a machine reason such as `BOND_TOO_HIGH`, `TARGET_NOT_ALLOWED`, `DEADLINE_TOO_CLOSE`, or `SIMULATION_FAILED`.
10. For an accepted candidate the agent signs and submits the Creditcoin acceptance/bond transaction.
11. It builds the exact source transaction from the versioned template package.
12. It signs and broadcasts through its configured source signer.
13. It records the source tx hash and waits for settlement events. It may submit proof itself or rely on the relayer network.
14. It verifies that the terminal state and transfers match the local reference-model expectation.
15. It writes a structured task receipt to its own log.

No hosted API key may authorize bond transfer, mandate acceptance, or source execution. Those actions require the configured wallet signer.

### 10.4 Relayer journey

1. Operator installs `setld-relayer` or deploys the worker container.
2. `setld-relayer doctor` verifies Creditcoin RPC, Sepolia RPC, proof-builder health, relayer gas balance, contract addresses, and source chain key.
3. `setld-relayer run` watches accepted mandates and/or submitted source tx hashes.
4. Each source tx becomes a durable job with states `OBSERVED`, `RECEIPT_READY`, `WAITING_ATTESTATION`, `PROOF_READY`, `SUBMITTING`, `ACCEPTED`, `ALREADY_CONSUMED`, or `FAILED_RETRYABLE`.
5. The worker never decides `FULFILLED` versus `INVALID_ATTEMPT`; it transports evidence only.
6. On restart it resumes nonterminal jobs from durable storage.

### 10.5 Read-only verifier journey

1. Open `/proof` or a shared `/mandates/{id}` link.
2. No wallet prompt appears.
3. Page first states the terminal outcome in normal language.
4. User can expand `What was promised`, `What happened on Ethereum`, `What Attestcoin verified`, and `How Creditcoin settled`.
5. `Verify independently` recomputes the canonical hash, source key, decoded fields, predicate trace, and conservation checks from public data.
6. User can open explorer links or download `evidence.json`.

---

## 11. Product surface, onboarding, action inventory, and lifecycle states

### 11.1 Surface principles

- The product must never require a user to read protocol documentation to discover their next action.
- Internal terms such as continuity proof, transaction index, query verifier, and replay key appear only in progressive disclosure, evidence views, and docs.
- Every pending cross-chain state explains what the system is waiting for and whether the user can safely leave.
- Every irreversible action has a review step before signature.
- Every retryable action has an idempotency strategy.
- Every terminal action creates a permanent history item.
- A wallet connection is not treated as an account until ownership/session authentication succeeds where authentication is required.
- Read-only verification never requests a wallet.

### 11.2 Route and information architecture

#### Public routes

- `/`
  - answers what setld is, who it is for, the problem, the three-step mechanism, current testnet status, and trust evidence,
  - primary CTAs: `Create mandate`, `Find work`, `View live proof`,
  - no contract architecture dump above the fold.

- `/proof`
  - canonical successful and rejected completed examples,
  - side-by-side result,
  - `Verify independently`, explorer links, evidence download, demo.

- `/mandates`
  - public read-only list of testnet mandates,
  - filters by terminal/active status and template,
  - action buttons requiring identity route into onboarding.

- `/mandates/[mandateId]`
  - canonical terms, human success rule, lifecycle timeline, source tx, proof status, predicate trace, settlement, evidence,
  - if the connected user is creator/executor, a role-specific action panel appears.

- `/executors/[executorId]`
  - objective execution history, bound source addresses over time, values, outcomes, no universal opaque score.

- `/templates`
  - approved template versions, supported action, active/deprecated status, plain-language success rule, code/reference-model links.

- `/verify`
  - accepts mandate ID, source tx hash, or Creditcoin settlement tx,
  - resolves to a matching record or clearly says no setld record exists,
  - can run independent verification and export JSON.

- `/docs`
  - protocol and integration documentation. It is never the required route for completing a core user task.

#### Authenticated creator/executor routes

- `/app/onboarding`
  - role intent, session setup, wallet/balance checks, executor source binding when needed, first-run checklist.

- `/app`
  - role-aware action home, not a generic metrics dashboard.
  - creator priority order: `Needs attention`, `Active mandates`, `Recent results`, `Create mandate`.
  - executor priority order: `Accepted jobs`, `Proof/settlement pending`, `Compatible jobs`, `Recent results`.

- `/app/create`
  - template selection, terms, validation, review, fund-and-publish.

- `/app/jobs`
  - compatible open mandates with reward, bond, deadline, target, preflight status.

- `/app/executions/[mandateId]`
  - accepted-job control surface: source execution, tx hash, attestation/proof state, settlement, retry/release rules.

- `/app/history`
  - all user-related mandates with outcome, role, value, date, and next action.

- `/app/settings/identity`
  - Creditcoin account/session status, active/historical Sepolia bindings, rotate/unbind rules.

- `/app/settings/notifications`
  - browser/email/webhook preferences where enabled. Notifications are optional and never required to settle.

- `/app/settings/api`
  - create, name, scope, rotate, and revoke hosted API keys. Secret shown once.

- `/app/settings/session`
  - active session information, logout all sessions, disconnect connector.

No separate `/app/executor` mega-page is allowed. Jobs, active execution, history, and identity are separate jobs and therefore separate routes.

### 11.3 Machine interface map

The agent SDK exposes stable capabilities rather than UI routes:

```text
getEnvironment()
getExecutorProfile(address)
listMandates(filters)
getMandate(id)
preflightMandate(id, policy)
prepareAcceptance(id)
waitForAcceptance(txHash)
prepareSourceExecution(id)
waitForSourceReceipt(txHash)
getProofReadiness(txHash)
submitProof(id, proof)        // optional, idempotent
getSettlement(id)
verifySettlement(id)
```

Hosted HTTP endpoints may mirror read operations and webhook registration. Wallet-authorized state changes remain direct signed transactions or explicit signer calls through the SDK.

Relayer CLI capability map:

```text
setld-relayer doctor
setld-relayer run
setld-relayer retry <jobId>
setld-relayer inspect <jobId>
setld-relayer backfill --from-block <n>
```

### 11.4 Exact first-run onboarding

#### Creator onboarding

1. `/` -> `Create mandate`.
2. `/app/onboarding?intent=create` explains the creator lifecycle in three steps.
3. `Connect Creditcoin wallet`.
4. Choose provider.
5. Detect account and chain.
6. If wrong chain, show Creditcoin Testnet identity and `Switch network`.
7. Request ownership/session signature after the correct account is visible.
8. Create authenticated session.
9. Check tCTC gas and supported reward asset balance.
10. If insufficient, show exact missing asset, faucet/acquisition link, and `Recheck balance`.
11. Show first-run checklist and `Create first mandate`.
12. Route to `/app/create`.

No email, password, KYC, Sepolia wallet, API key, or agent configuration is required to create a testnet mandate.

#### Executor onboarding

1. `/` -> `Find work`.
2. Connect/authenticate Creditcoin wallet as above.
3. Check tCTC gas and supported bond balance.
4. `Bind execution address`.
5. Connect/select source wallet and switch to Sepolia.
6. Sign binding challenge, no source-chain transaction yet.
7. Switch to Creditcoin Testnet.
8. Submit binding transaction.
9. Wait for confirmation with explorer link.
10. Configure optional local policy filters.
11. Optional `Create agent API key` path, skipped by default.
12. Route to compatible jobs.

No executor may accept a mandate before an active source binding exists.

#### Skip, restart, logout, and reconnect

- Intro copy can be skipped. Mandatory wallet/balance/binding checks cannot.
- `Restart onboarding` exists under Help/Settings and does not delete on-chain identity.
- Logout revokes the server session but does not alter on-chain bindings.
- Disconnect clears the dapp connector/WalletConnect session where supported.
- Reconnecting the same account restores role state from chain/indexer, not browser local storage.
- Reconnecting a different Creditcoin account starts a separate session and never inherits the previous user's drafts or actions.

### 11.5 Core action specifications

#### Action A: create and publish mandate

`/app/create` -> choose template -> enter terms -> validate -> simulate -> review -> confirm economics -> sign Creditcoin funding/publication tx -> pending -> confirmed mandate -> mandate detail -> history.

- Drafts autosave using a client-generated draft ID and authenticated server copy.
- No on-chain mutation occurs before `Fund and publish`.
- A rejected wallet signature leaves the draft intact.
- If RPC submission times out after the wallet returns a tx hash, the app resolves the tx hash before offering retry.
- A confirmed publication cannot be edited. `Duplicate as draft` is the correction path.

#### Action B: cancel open mandate

Mandate detail -> `Cancel mandate` -> show reward/creator-bond refund -> confirm -> sign Creditcoin tx -> pending -> `CANCELLED` -> receipt/history.

- Only available before acceptance.
- Retry uses current on-chain state. If another executor accepted first, cancellation changes to `Unavailable, mandate was accepted` and the app refreshes state.

#### Action C: accept and bond

Mandate detail/job list -> run preflight -> review reward/bond/deadline/penalties/source address -> `Accept and bond` -> sign Creditcoin tx -> pending -> `ACCEPTED` -> execution workspace.

- Acceptance cannot be retried blindly after ambiguous RPC failure. Resolve by tx hash/account nonce/on-chain mandate state first.
- If another executor wins the race, no bond is taken and the user sees `Mandate already accepted`.

#### Action D: release before execution

Execution workspace -> `Release mandate` -> show reservation penalty and refund -> confirm -> sign Creditcoin tx -> `RELEASED` or, if template permits reopening, `OPEN` with previous executor record -> receipt/history.

- Disabled after a qualifying source execution attempt is proven or after release deadline.

#### Action E: execute source transaction

Execution workspace -> `Prepare execution` -> source-state refresh -> canonical calldata preview -> switch/connect Sepolia execution wallet -> verify address equals active binding -> `Execute on Sepolia` -> wallet signature -> source pending -> receipt found -> waiting for Attestcoin.

- Protected calldata cannot be edited in normal UI.
- Wrong network or wrong source account blocks signing.
- Reverted source tx is still recorded because its receipt may determine a protocol outcome.
- `Execute again` appears only if the template policy allows another attempt and the first source transaction has not made the mandate terminal.

#### Action F: submit proof manually

Execution workspace -> proof state is `Ready` and no proof is consumed -> `Submit proof` -> switch to Creditcoin -> sign proof-submission tx -> verifying -> settlement or deterministic rejection.

- Normal users should not need this because relayers automate it.
- The same proof cannot produce duplicate settlement. After consumption the button becomes `Proof already consumed`.

#### Action G: finalize timeout

Mandate detail -> proof deadline has passed and mandate is nonterminal -> `Finalize timeout` -> show exact timeout consequences -> sign Creditcoin tx -> terminal `TIMED_OUT` -> transfers/history.

- Any user may call if protocol permits permissionless finalization.
- Before sending, client rechecks whether a proof settlement appeared in the latest block.

#### Action H: bind, rotate, or retire source address

Settings -> Identity -> `Add source address` or `Rotate` -> Sepolia ownership signature -> Creditcoin binding/rotation transaction -> confirmation -> history.

- An address used by an active mandate cannot be immediately retired.
- Rotation shows effective block/time and active mandates still pinned to the old binding.
- Historical records always preserve the source address valid at acceptance time.

#### Action I: create/revoke API credential

Settings -> API -> `Create key` -> choose allowed read/webhook scopes -> session re-authentication -> key generated -> secret shown once -> user copies -> only hash stored server-side.

- Revocation is immediate for hosted API access.
- API keys never authorize asset-moving on-chain actions.

#### Action J: verify/export completed mandate

Any completed mandate -> `Verify independently` -> server/client rebuilds evidence from public RPCs -> match/mismatch report -> explorer links -> `Download evidence.json`.

- If a dependency is down, display `Verification temporarily unavailable` with which source could not be reached. Do not convert unavailability into a failed-proof claim.

### 11.6 Action inventory

| Action | Surface | Trigger | User-controlled inputs | Protocol-derived inputs | Permission / confirmation / signature | Processing | Pending state | Failure and safe retry | Cancellation | Artifact and next action |
|---|---|---|---|---|---|---|---|---|---|---|
| Start session | Onboarding | Protected action | provider/account | nonce, origin, chain ID, expiry | wallet ownership signature | verify challenge, issue session | awaiting signature | cancellation is safe; regenerate nonce on retry | before signature | authenticated session -> onboarding checklist |
| Publish mandate | `/app/create` | `Fund and publish` | template params, reward, deadlines | terms hash, fee, creator bond rules | review + Creditcoin tx | validate, escrow funds, register mandate | wallet -> mempool -> confirmed | resolve tx hash/state before resubmit | only before tx broadcast | mandate ID -> detail/share |
| Cancel open mandate | mandate detail | `Cancel` | none | refundable balances | confirm + Creditcoin tx | terminal state + refund | cancelling | refresh if acceptance raced | can abandon before signature | cancellation receipt -> history |
| Accept mandate | job/detail | `Accept and bond` | none beyond selected job | required bond, bound source address | review + Creditcoin tx | lock bond, exclusive executor | accepting | resolve race/tx state before retry | before signature | accepted execution -> source action |
| Release reservation | execution page | `Release` | none | penalty amount | confirm + Creditcoin tx | penalty/refund/state update | releasing | refresh state if deadline/attempt changed | before signature | release receipt -> find work |
| Execute source action | execution page / SDK | `Execute` | gas policy within allowed bounds | canonical target/calldata/deadline | source-wallet tx | broadcast, receipt tracking | source pending | use tx hash; never duplicate blindly | only before signature | source tx -> Attestcoin waiting |
| Submit proof | execution page / relayer | proof ready | optional gas policy | proof bytes, source key | Creditcoin tx | verify, decode, evaluate, settle | verifying | idempotent by source key; already-consumed is terminal | before signature | settlement receipt -> result |
| Finalize timeout | detail | deadline elapsed | none | current state, policy | confirm + Creditcoin tx | final deadline recheck, settle | finalizing | safe after state refresh | before signature | timeout receipt -> history |
| Bind source address | settings | `Bind` | source address | executor ID, nonce, expiry | Sepolia signature + Creditcoin tx | verify ownership, store binding | binding | new nonce on failed signature; resolve tx on RPC ambiguity | before binding tx | active binding -> jobs |
| Rotate source address | settings | `Rotate` | new source address | active-mandate constraints | two-step signatures/tx as policy | schedule/activate rotation | rotation pending | safe according to rotation nonce/state | before activation if policy allows | binding history -> jobs |
| Create API key | settings | `Create key` | label/scopes | key ID/secret | recent session auth | hash/store secret metadata | creating | safe if request idempotency key used | before creation | one-time secret -> agent config |
| Revoke API key | settings | `Revoke` | selected key | active key metadata | confirm | mark revoked | revoking | repeat is idempotent | n/a | revoked credential -> create replacement |
| Verify evidence | public verifier | `Verify` | mandate/tx identifier | public chain data | none | fetch, recompute, compare | verifying | retry when dependency recovers | cancel request | report/evidence bundle -> share/export |

Any backend capability not represented above must be deliberately machine-only and documented as such.

### 11.7 Auth, wallet, network, and identity lifecycle

#### Browser authentication

1. User chooses a wallet provider.
2. Client obtains account and current EVM chain ID.
3. For Creditcoin actions the client requires the exact Creditcoin testnet chain ID discovered and pinned by Gate S0. The UI must never rely on a chain ID copied from an older PRD or tutorial.
4. Server issues one-time challenge containing origin, account, chain ID, nonce, issued-at, expiry, and statement.
5. Wallet signs.
6. Server verifies signature and nonce, then creates a secure short-lived session.
7. Sensitive settings actions may require recent re-authentication.

No password is required for the protocol core. Optional email is only a notification channel and cannot recover control of an on-chain account.

#### Chain switching

- Creditcoin writes require Creditcoin Testnet.
- Source execution and source-address signatures require Sepolia.
- Switching to Sepolia does not destroy the browser session, but all Creditcoin write buttons become unavailable until the wallet returns to Creditcoin.
- Before every signature the app rechecks chain and account instead of trusting cached state.

#### Account change

If the connected Creditcoin account changes:

- invalidate privileged UI state,
- end the authenticated session or require a new challenge,
- keep unsent draft data isolated by account,
- never continue a pending confirmation under the old identity.

If the Sepolia account changes during execution:

- compare it to the mandate's bound source address,
- block execution on mismatch,
- provide `Switch account` guidance rather than allowing a doomed transaction.

#### Session expiry

- Read-only pages continue working.
- Protected actions show `Session expired. Re-authenticate to continue`.
- Drafts and active mandate state remain recoverable after re-authentication.

#### Disconnect and revoke

- `Logout` invalidates server session.
- `Disconnect wallet` clears the dapp connector and closes WalletConnect sessions where the connector supports it.
- Source-address binding is on-chain and therefore requires explicit retire/rotate action, not merely wallet disconnect.
- API credentials are independently revocable.

### 11.8 State matrix and human-facing recovery

| Product state | User-facing meaning | UI behavior | Technical detail available | Recovery |
|---|---|---|---|---|
| First visit | You have not set up this role | show one next action | none required | start onboarding |
| Empty creator | No mandates yet | `Create first mandate` | contract status | create |
| Empty executor | No compatible jobs | show filters and why jobs are excluded | filter reason codes | adjust policy/wait |
| Loading | Reading current state | skeleton/progress, no stale actions | RPC/indexer source | wait |
| Validating | Checking terms before funds move | progress by check | validation trace | edit failed field |
| Awaiting wallet | Your wallet must approve | keep draft/context intact | requested network/action | approve/reject |
| Wrong network | Connected wallet is on another chain | block write, `Switch network` | expected/current chain IDs | switch |
| Wrong account | Source account does not match binding | block execution | expected/current address | switch account |
| Wallet disconnected | Signing unavailable | read-only state remains | connector state | reconnect |
| Transaction pending | Signed transaction is not finalized | tx hash + explorer | nonce/hash | wait or replace if wallet supports |
| Transaction rejected | User cancelled wallet request | no error stack | wallet rejection code | retry safely |
| RPC submission ambiguous | Wallet may have broadcast but RPC failed | do not offer blind retry | tx hash/nonce when known | resolve chain state first |
| Source receipt pending | Ethereum has not produced receipt yet | source progress | tx hash | wait/replace per source-wallet policy |
| Source reverted | Transaction was included but failed | explain it can still be proof-relevant | receipt status | wait for settlement policy |
| Waiting for Attestcoin | Source receipt exists but proof continuity is not ready | explain attestation dependency, safe to leave | source block and latest supported height | auto-retry |
| Proof generating | Evidence is being constructed | progress, no duplicate action | worker job ID | auto-retry/manual proof later |
| Proof ready | Evidence can be submitted | automatic or manual submit | proof metadata | submit once |
| Proof rejected | Evidence failed verification/decoding | show exact class, no settlement | revert/result code | retry only if transport/schema issue; never mutate evidence |
| Predicate failed | Receipt was valid but mandate condition failed | highlight exact committed field | structured trace | terminal according to policy |
| Indexer delayed | Chain is ahead of UI cache | show `Live chain state may be newer` | last indexed block | direct RPC refresh |
| Stale simulation | Source state changed since preflight | disable acceptance/execution as appropriate | simulated block/current block | rerun preflight |
| Rate limited | Hosted API is throttled | preserve action, countdown/retry | request ID | retry with backoff or direct chain path |
| Dependency unavailable | RPC/proof API/indexer unavailable | identify dependency, keep on-chain actions safe | health endpoint/status | retry/failover endpoint |
| Contract paused | New risky actions disabled | read-only/history still available | pause reason/block | wait for unpause, no bypass |
| Unsupported template | Client cannot safely execute version | disable action | template/version | update client/use supported template |
| Cancelled | Creator cancelled before acceptance | terminal receipt | cancel tx | duplicate as new draft |
| Released | Executor exited under policy | show penalty/refunds | settlement tx | find another job/reopen if allowed |
| Timed out | No qualifying proof settled by deadline | show exact timeout meaning | deadline/finalize tx | terminal, create new mandate |
| Fulfilled | Verified execution passed | payment/proof/history | full evidence | repeat/export |
| Invalid attempt | Verified execution violated mandate | exact failed field and penalty | full evidence | terminal, review history |
| Partial service outage | Some hosted features unavailable | core read/write via chain stays visible when safe | degraded service list | use direct path or retry later |

Raw contract reverts remain accessible under `Technical details`, but the first-line UI message must be actionable and human-readable.

### 11.9 Results, receipts, history, and proof

Every terminal mandate page must show:

- mandate ID and terminal status,
- creator and executor addresses,
- template/version,
- committed human-readable success conditions,
- reward, creator bond, executor bond, fees, and final transfers,
- source transaction hash and source block,
- proof/verification transaction on Creditcoin,
- structured predicate trace with each condition pass/fail,
- source transaction replay/consumption identifier,
- lifecycle timestamps,
- limitations relevant to that record,
- `Verify independently`,
- `Download evidence.json`,
- shareable canonical URL.

`/app/history` must support role, status, template, date, and amount filters. History is derived from indexed on-chain state and may use cached metadata only for presentation.

No terminal flow may end only with a toast.

### 11.10 Return-user loop

#### Creator return

On `/app`, show in priority order:

1. `Needs attention`: draft validation failed, open mandate nearing deadline, claimable refund, service issue affecting an active mandate.
2. `Active`: open, accepted, source executed, proof pending.
3. `Recent results`: fulfilled, invalid attempt, timeout, released, cancelled.
4. `Create mandate` using the last compatible template.

Completed mandate offers `Duplicate as new draft` so repeat use does not require re-entering every parameter.

#### Executor return

Show:

1. accepted mandates requiring source execution,
2. source transactions waiting on Attestcoin/settlement,
3. claimable reward/bond if pull payment is used,
4. compatible open jobs,
5. recent execution results and bond performance.

#### Autonomous agent return

The process resumes durable local state, reconciles every nonterminal job against chain state, then resumes discovery. It never assumes that a previous process crash means the action failed.

### 11.11 Exit, revocation, cancellation, and recovery

- Creator can cancel only an unaccepted mandate through the mandate page.
- Executor can release only under the template's pre-execution release policy.
- Free/claimable vault balances can be withdrawn from `/app` or the relevant history item.
- Logout invalidates browser session.
- Wallet disconnect removes connector session but does not alter chain state.
- Source binding can be retired/rotated only under active-mandate safety rules.
- API keys can be revoked individually or all at once.
- Notification destinations can be removed without affecting protocol execution.
- Interrupted drafts resume after re-authentication.
- Interrupted signed transactions are recovered by tx hash, nonce, and on-chain state, not by blindly creating a new transaction.
- Lost wallet keys are not recoverable by setld. The product may help rotate a still-controlled operational key according to protocol policy, but it cannot recover an account whose controlling key is lost.

### 11.12 Notifications and background behavior

Notifications are convenience, not authority.

Supported notification events:

- mandate accepted,
- execution deadline approaching,
- source transaction observed,
- Attestcoin proof ready/submitted,
- settlement terminal,
- timeout eligible,
- binding rotation effective,
- API key revoked.

Channels may include browser, email, and webhook. No notification may contain a secret, full API key, or private signing material.

### 11.13 Landing page role

The landing page must answer within the first screen and first scroll:

- **What:** receipt-verified execution assurance for autonomous on-chain work.
- **Who:** protocols that need work done and executors/agents willing to bond execution.
- **Problem:** a signed transaction request or agent self-report does not prove the assigned work was completed correctly.
- **How:** mandate -> external transaction -> Attestcoin-verified receipt -> deterministic settlement.
- **What now:** create a mandate, find work, or inspect live proof.
- **Why trust it:** link directly to one completed public success and one public rejected execution.

Architecture diagrams, precompile addresses, decoder internals, SDK setup, and security proofs belong in progressive disclosure or `/docs`.

### 11.14 Fresh-user acceptance test

A release fails the product-surface gate unless all of these pass from a clean browser profile with no repository open:

#### Creator test

A technically competent target creator who has never seen setld can:

1. land on `/`,
2. choose create,
3. connect/authenticate Creditcoin wallet,
4. understand and fix missing gas/balance state,
5. create a treasury rebalance mandate,
6. run validation,
7. review economics,
8. sign and publish,
9. find the mandate again in history,

without asking what button to click or what Attestcoin terminology means.

#### Executor test

A target executor can:

1. choose find work,
2. authenticate,
3. bind a Sepolia source address,
4. understand bond/deadline/penalty,
5. accept a mandate,
6. execute the generated source transaction,
7. observe proof/settlement states,
8. find the terminal result and evidence,

without repository or PRD access.

#### Verifier test

A read-only user can open a shared completed mandate, understand success/failure, and verify the evidence without connecting a wallet.

Record each clean-room session in `evidence/fresh-user/` with start/end time, blocking issues, retries, and whether any developer explanation was required. Any developer intervention that changes what the tester clicks or types is a failure until the product is fixed.

---

## 12. Functional requirements

### 12.1 Executor registration and address binding

The system must:

- assign a stable Creditcoin executor identifier,
- store owner and operational Creditcoin addresses,
- bind one or more Ethereum execution addresses through EIP-712 signatures,
- include chain ID, setld contract address, executor ID, nonce, and expiry in the binding message,
- prevent replay across chains and deployments,
- allow key rotation only when no active mandate relies on the outgoing key or through an explicit delayed rotation,
- preserve historical address bindings for past records,
- expose current and historical bindings read-only.

Optional ERC-8004 interoperability may publish setld outcome references, but setld correctness must not depend on ERC-8004.

### 12.2 Template registry

Each template record must include:

- `templateId`,
- semantic version,
- immutable implementation address,
- source adapter type,
- supported source chain key,
- template metadata URI and content hash,
- reference-model package hash,
- maximum proof items,
- minimum and maximum deadline ranges,
- allowed settlement policies,
- active, deprecated, or blocked status,
- audit status,
- deployment timestamp.

A deprecated template remains readable and executable for existing mandates but cannot create new mandates.

### 12.3 Mandate creation

A mandate must commit to:

- creator,
- template ID and version,
- source chain key,
- source target or router,
- executor selection mode,
- permitted executor or open qualification rule,
- typed template parameters,
- canonical predicate hash,
- execution start and end block,
- proof deadline,
- reward token and amount,
- executor bond token and amount,
- creator bond token and amount,
- relayer reimbursement cap,
- settlement policy version,
- unique nonce,
- metadata commitment.

Requirements:

- reward and creator bond transfer into vault atomically with publication,
- all values within template bounds,
- execution deadline in the future,
- proof deadline after execution deadline,
- no zero-value mandatory amounts,
- token allowlist,
- no fee-on-transfer or rebasing token unless explicitly supported,
- canonical mandate ID derived from chain, contract, creator, nonce, template, and terms hash,
- immutable terms after publication.

### 12.4 Predicate preflight

The composer and executor client must run:

1. structural validation,
2. canonical encoding validation,
3. synthetic-perfect-receipt validation,
4. source RPC simulation where possible,
5. deadline feasibility check,
6. token and target allowlist check,
7. reward-to-estimated-cost check,
8. bond exposure summary.

The on-chain contract must repeat structural validation. Off-chain simulation is advisory and must never be presented as proof of future success.

### 12.5 Acceptance and bonding

- Version one uses exclusive acceptance.
- Acceptance transfers executor bond and sets the bound source sender.
- Acceptance must occur before `acceptanceDeadline`.
- The executor must have an active source-address binding.
- A creator cannot accept their own mandate unless template explicitly allows self-execution.
- The mandate moves from `OPEN` to `ACCEPTED`.
- A short preparation window may be configured.
- An executor may release the mandate before execution starts, paying the template-defined reservation penalty.
- After an execution attempt is proven, voluntary release is unavailable.

### 12.6 Source execution

The executor agent must:

- build the transaction only from canonical mandate data,
- verify chain ID, target, selector, value, gas policy, and expiry,
- bind `mandateId` in calldata or event when using the router template,
- sign with the registered source address,
- store transaction hash and local construction trace,
- never treat local broadcast as completion.

The first template uses `SetldExecutionRouter` so the event contains an explicit mandate binding. Direct-existing-protocol adapters are admitted only after Gate S3 passes.

### 12.7 Proof acquisition

The worker must:

- subscribe to source events or poll deterministically,
- confirm the source transaction receipt exists,
- wait until the source block is supported by current Attestcoin continuity bounds,
- request a single proof from the configured proof builder,
- validate response schema locally,
- submit proof to Creditcoin,
- use idempotency keys,
- persist retry state,
- support at least two RPC endpoints,
- support hosted proof builder first,
- expose a replaceable interface for local proof generation when officially supported,
- never hold creator or executor settlement funds.

### 12.8 Proof verification and decoding

The Attestcoin adapter must:

- call the current pinned native verifier interface,
- derive transaction index from the proof structure as required by the current SDK/contracts,
- produce `sourceTxKey = keccak256(sourceChainKey, blockHeight, transactionIndex)`,
- reject a consumed source transaction key,
- decode only the fields required by the template,
- validate transaction type supported by the decoder,
- expose sender, target, function selector and arguments when requested,
- expose receipt status,
- search logs by exact emitter and full topic signature,
- decode indexed and non-indexed event fields,
- reject malformed or ambiguous log matches,
- return a normalized `VerifiedExecution` struct.

The adapter must not equate proof validity with mandate success.

### 12.9 Predicate evaluation

For the treasury rebalance template, evaluate in this order:

1. source chain key,
2. source block not before execution start,
3. source block not after execution deadline,
4. receipt transaction sender equals accepted executor source address,
5. transaction target equals approved router or direct target,
6. function selector equals expected selector,
7. calldata `mandateId` equals current mandate,
8. asset in and asset out match terms,
9. amount in is non-zero and no greater than cap,
10. minimum output argument is no lower than committed floor,
11. receipt status equals success for fulfillment,
12. expected event exists,
13. event emitter equals approved target,
14. event mandate ID matches,
15. event executor matches source sender,
16. event output amount meets minimum,
17. source transaction key is unused.

The evaluation returns a structured code and trace. It must not return only a boolean.

### 12.10 Settlement outcomes

Version-one outcomes:

- `FULFILLED`
  - valid proof,
  - all success predicates pass,
  - reward paid to executor,
  - executor bond returned,
  - creator bond returned,
  - valid relayer reimbursement paid,
  - execution history updated.

- `INVALID_ATTEMPT`
  - valid proof,
  - source sender is the accepted executor,
  - transaction is within deadline,
  - objective mandate binding exists,
  - one or more committed execution fields fail,
  - reward refunded to creator,
  - executor penalty applied according to immutable policy,
  - remaining executor bond returned,
  - creator bond returned,
  - history records exact reason.

- `EXECUTION_REVERTED`
  - valid proof,
  - sender, target, mandate binding, and committed call shape match,
  - receipt status indicates failure,
  - no claim is made about root cause,
  - template policy determines penalty,
  - default v1 policy applies a lower penalty than deliberate parameter mismatch,
  - reward refunded.

- `TIMED_OUT`
  - no qualifying proof by proof deadline,
  - permissionless finalize call,
  - reward refunded,
  - reservation/service-level penalty applied,
  - creator bond returned,
  - history marks absence of proven fulfillment, not proof that no source transaction existed.

- `RELEASED`
  - executor releases before execution start,
  - fixed reservation penalty to creator,
  - remaining bond returned,
  - reward refunded or mandate reopened according to creator setting.

- `CANCELLED`
  - creator cancels before acceptance,
  - reward and creator bond returned.

- `INVALIDATED`
  - template or system proves mandate structurally invalid before acceptance,
  - cannot be accepted,
  - creator pays creation fee,
  - funds returned.

No post-hoc discretionary slashing exists in the hackathon core. Governance may pause new mandates or a compromised template, but cannot rewrite terminal outcomes.

### 12.11 Read-only verification

The verifier must independently recompute:

- canonical mandate hash,
- template version,
- source transaction key,
- decoded transaction fields,
- decoded receipt fields,
- predicate trace,
- settlement transfers,
- terminal state,
- asset conservation.

Outputs:

- human-readable report,
- JSON evidence bundle,
- exit code 0 for match,
- non-zero for mismatch or unavailable evidence,
- timestamps and source endpoints,
- no private key requirement.

---

## 13. Contract architecture

### 13.1 `SetldMandateRegistry`

Responsibilities:

- create and store mandates,
- enforce immutable terms,
- manage lifecycle transitions,
- bind creator and executor,
- expose canonical view functions,
- emit complete lifecycle events.

Must not:

- custody tokens directly,
- decode Attestcoin proofs,
- contain template-specific business logic.

### 13.2 `SetldVault`

Responsibilities:

- custody rewards, creator bonds, executor bonds, and relayer reimbursement budgets,
- account balances by mandate,
- settle transfers only when authorized by settlement engine,
- support emergency pause on new deposits,
- preserve withdrawals for already finalized mandates,
- reject unsupported token behavior.

Invariants:

- total accounted token balance never exceeds actual token balance,
- terminal settlement executes once,
- no arbitrary admin withdrawal,
- fees are explicit,
- refunds cannot be redirected.

### 13.3 `SetldAttestcoinAdapter`

Responsibilities:

- wrap the current BlockProver precompile ABI,
- verify single or batch proof,
- normalize source transaction data,
- derive source transaction key,
- expose decoder helpers,
- centralize protocol-version compatibility.

It must be replaceable only by deploying a new adapter version and registering it for new templates. Active templates retain their original adapter.

### 13.4 `SetldTemplateRegistry`

Responsibilities:

- register immutable template versions,
- map template to adapter and predicate implementation,
- store metadata and reference hashes,
- deprecate or block templates for new mandates.

### 13.5 `TreasuryRebalancePredicateV1`

Responsibilities:

- validate typed mandate terms,
- evaluate normalized verified execution,
- produce structured result code,
- expose pure reference-compatible functions.

### 13.6 `SetldSettlementEngine`

Responsibilities:

- receive verified execution result,
- verify lifecycle eligibility,
- consume source transaction key,
- set terminal state,
- instruct vault transfers,
- update executor history,
- emit settlement trace hash.

### 13.7 `SetldExecutorRegistry`

Responsibilities:

- executor profile ownership,
- source-address binding and rotation,
- active mandate references,
- value-weighted outcome aggregates,
- optional external identity references.

### 13.8 `SetldFeeController`

Responsibilities:

- protocol fee schedule,
- relayer reimbursement rules,
- maximum fees,
- fee recipient.

Version one should use immutable or timelocked fee parameters. Fees cannot be changed for existing mandates.

### 13.9 Source-chain contracts

#### `SetldExecutionRouter`

- non-upgradeable for the first deployment,
- accepts `mandateId`, target, and typed call data,
- executes only allowlisted demo target methods in v1,
- emits `MandateExecutionAttempt`,
- emits `MandateExecuted` on success,
- preserves source sender,
- cannot custody funds longer than one call,
- reentrancy protected.

#### `DemoTreasuryVault`

- holds mock source assets,
- exposes deterministic rebalance method,
- emits detailed result event,
- supports controlled invalid and revert paths for adversarial demonstration,
- never holds real funds.

---

## 14. Canonical data structures

### 14.1 Mandate

```solidity
struct Mandate {
    bytes32 mandateId;
    address creator;
    bytes32 templateId;
    uint32 templateVersion;
    uint64 sourceChainKey;
    address sourceTarget;
    address acceptedExecutor;
    address acceptedSourceSender;
    address rewardToken;
    uint256 rewardAmount;
    address bondToken;
    uint256 executorBond;
    uint256 creatorBond;
    uint256 relayerBudget;
    uint64 acceptanceDeadline;
    uint64 executionStartBlock;
    uint64 executionEndBlock;
    uint64 proofDeadline;
    bytes32 termsHash;
    bytes32 metadataHash;
    MandateState state;
}
```

### 14.2 Treasury terms

```solidity
struct TreasuryRebalanceTerms {
    address router;
    address vault;
    address assetIn;
    address assetOut;
    uint256 maxAmountIn;
    uint256 minAmountOut;
    bytes4 selector;
    bytes32 routePolicyHash;
}
```

### 14.3 Verified execution

```solidity
struct VerifiedExecution {
    uint64 sourceChainKey;
    uint64 blockHeight;
    uint32 transactionIndex;
    bytes32 sourceTxKey;
    address txFrom;
    address txTo;
    bytes4 selector;
    bytes canonicalArguments;
    uint8 receiptStatus;
    VerifiedLog[] logs;
}
```

### 14.4 Evaluation

```solidity
struct Evaluation {
    EvaluationCode code;
    bytes32 traceHash;
    uint256 observedAmountIn;
    uint256 observedAmountOut;
    bytes32 matchedLogHash;
}
```

Every struct must be finalized against actual current SDK and decoder types during Gate S1. The PRD names logical fields, not an assumed ABI.

---

## 15. State machines

### 15.1 Mandate state

```text
DRAFT
  |
  v
OPEN ----------------------> CANCELLED
  |
  v
ACCEPTED ------------------> RELEASED
  |
  +------------------------> FULFILLED
  |
  +------------------------> INVALID_ATTEMPT
  |
  +------------------------> EXECUTION_REVERTED
  |
  +------------------------> TIMED_OUT
```

Rules:

- only `OPEN` may be accepted,
- only `OPEN` may be creator-cancelled,
- only `ACCEPTED` may consume execution proof,
- terminal states cannot transition,
- source transaction consumption and terminal state update are atomic,
- a proof submitted after terminal timeout must fail,
- timeout cannot finalize before proof deadline,
- a source transaction at the exact execution deadline is handled by explicit inclusive/exclusive semantics fixed in the template.

### 15.2 Executor address binding

```text
UNBOUND -> PENDING -> ACTIVE -> ROTATION_PENDING -> RETIRED
```

Active mandates keep the address binding snapshot captured at acceptance.

### 15.3 Proof worker job

```text
DISCOVERED
  -> RECEIPT_CONFIRMED
  -> WAITING_ATTESTATION
  -> PROOF_REQUESTED
  -> PROOF_READY
  -> SUBMITTING
  -> CONFIRMED
  -> FAILED_RETRYABLE
  -> FAILED_FINAL
```

Every transition persists to durable storage.

---

## 16. Economic model

### 16.1 Reward

The creator funds the full reward before publication.

### 16.2 Executor bond

The bond must reflect:

- maximum harm the objective task can cause,
- task complexity,
- executor history,
- deadline reservation cost,
- template risk.

Version one uses creator-selected bond within template bounds. Dynamic underwriting is deferred.

### 16.3 Creator bond

The creator bond discourages spam and malicious/impossible mandates. It funds:

- executor compensation when a creator-side breach is objectively proven by a template,
- relayer cost on invalid creator terms,
- protocol anti-spam fee.

The first template avoids complex creator-fault adjudication. The creator bond is mostly returned after terminal settlement and partially consumed for creation/relayer fees.

### 16.4 Penalty schedule

The penalty schedule is committed by template version and visible before acceptance.

Recommended first-template baseline:

| Outcome | Executor bond consequence |
|---|---:|
| Fulfilled | 0% penalty |
| Wrong sender or missing mandate binding | proof rejected, not classified as executor attempt |
| Objective parameter mismatch by bound executor | 100% penalty |
| Matching call shape but receipt reverted | 25% penalty |
| Timeout without proof | 50% penalty |
| Voluntary release before execution start | 10% penalty |
| Creator cancellation before acceptance | no executor bond exists |

These percentages are product defaults, not immutable truths. Gate S6 must simulate incentive compatibility and may adjust them before deployment. Once a mandate is published, its policy cannot change.

### 16.5 Relayer reimbursement

- fixed maximum per mandate,
- paid only for a valid Attestcoin proof that reaches evaluation,
- does not depend on pass or fail,
- paid to `msg.sender`,
- cannot exceed gas-based and mandate budget caps,
- first proof only,
- invalid proof submissions receive nothing.

### 16.6 Protocol fee

- percentage of reward on fulfillment,
- flat creation fee,
- no fee on returned principal/bond,
- testnet UI labels all assets as test assets,
- production pricing deferred.

---

## 17. Attestcoin integration requirements

### 17.1 Required proof contents

The implementation must prove, through current official interfaces, that it can access:

- source chain key,
- source block height,
- transaction index or a unique equivalent,
- transaction sender,
- transaction target,
- function selector,
- selected function arguments,
- receipt status,
- logs,
- log emitter,
- topics,
- event data.

If any field is unavailable, the template must be redesigned. The frontend or off-chain worker may not fill an unavailable field and label it verified.

### 17.2 Single proof first

The first complete lifecycle uses single-transaction verification. Batch proof support is implemented only after the single path passes public testnet.

### 17.3 Batch extension

A sequential mandate may later prove up to the officially supported maximum number of source transactions in one batch. The settlement may require all steps and order constraints, then settle once. Documentation must state:

- evidence is aggregated,
- prior source transactions remain final,
- setld does not make them atomic or roll them back.

### 17.4 Replay protection

Use at least:

```text
sourceTxKey = hash(sourceChainKey, blockHeight, transactionIndex)
```

and:

- `consumedSourceTx[sourceTxKey]`,
- mandate ID inside the source call or required event for router-based templates,
- terminal mandate state,
- unique creator nonce.

Proof freshness is not a substitute for replay protection.

### 17.5 Proof deadline

The execution deadline is measured in source blocks. The proof deadline is measured on Creditcoin time or blocks and includes an attestation/proof grace period.

The system must distinguish:

- action occurred before source deadline,
- proof arrived after action but before proof deadline,
- proof arrived after terminal timeout.

### 17.6 Worker neutrality

Any address can submit proof. The beneficiary is determined from accepted executor state and verified source sender, never `msg.sender`.

---

## 18. Off-chain architecture

### 18.1 Web application

Recommended stack:

- Next.js or equivalent typed React framework,
- TypeScript strict mode,
- viem or ethers with a single chosen abstraction,
- wallet connectors for Creditcoin and Ethereum,
- server-rendered public proof pages where possible,
- generated contract clients,
- no secrets in browser bundles.

### 18.2 API service

Responsibilities:

- index contract events,
- provide derived read models,
- cache explorer metadata,
- serve evidence bundles,
- manage notification subscriptions,
- report worker status,
- never act as settlement authority.

Suggested endpoints:

```text
GET  /api/mandates
GET  /api/mandates/:id
GET  /api/mandates/:id/evidence
GET  /api/executors/:id
GET  /api/templates
GET  /api/health
POST /api/simulate
POST /api/notifications
```

Every response includes chain height, indexed height, and staleness indicator.

### 18.3 Proof worker

- TypeScript service,
- durable PostgreSQL job table,
- at-least-once processing,
- idempotent chain writes,
- exponential backoff with bounded retries,
- separate source RPC, proof-builder, and Creditcoin submission health,
- structured logs,
- no unhandled process exit on idle,
- deterministic restart recovery.

### 18.4 Agent executor

Components:

- mandate intake,
- template validator,
- profitability and policy filter,
- deterministic transaction builder,
- optional LLM planner constrained to typed tools,
- transaction signer,
- source-chain submitter,
- local evidence recorder.

The LLM may decide whether to accept or which approved route to use. It cannot alter the canonical mandate or settlement predicate.

### 18.4A Canonical AI agent loop

The AI-track submission must visibly contain an autonomous decision/action loop. The agent is not allowed to be a decorative chat layer around deterministic scripts.

Canonical loop:

```text
OBSERVE
  fetch compatible open mandates + current source conditions
      ↓
ANALYZE
  estimate gas, reward, bond exposure, deadline, simulation result
      ↓
DECIDE
  ACCEPT / ABSTAIN and choose only among approved execution routes
      ↓
AUTHORIZE
  deterministic policy checks enforce template, max bond, max gas, allowlists
      ↓
EXECUTE
  isolated signer submits the Ethereum transaction
      ↓
RECONCILE
  wait for Attestcoin proof + Creditcoin settlement
      ↓
FEEDBACK
  update execution history and next-job policy
```

The model may:

- compare available mandates,
- reason about expected reward versus gas/bond risk,
- choose an approved route when the template permits alternatives,
- abstain when simulation or policy indicates unacceptable risk,
- produce a human-readable explanation of its decision.

The model may not:

- rewrite the mandate,
- change settlement predicates,
- bypass deterministic wallet policy,
- select an unapproved target,
- sign arbitrary calldata,
- mark itself successful,
- control proof verification,
- decide its own payout.

Required agent tools:

```text
listMandates()
getMandate(id)
simulateMandate(id, route)
estimateExecutionCost(id, route)
acceptMandate(id)
executeMandate(id, route)
getSourceReceipt(txHash)
getSettlementStatus(id)
```

Agent decision evidence must record structured tool inputs/outputs and the final ACCEPT/ABSTAIN choice. Internal chain-of-thought is not required and must not be treated as proof of correctness.

The demo must show at least one autonomous ACCEPT and one rational ABSTAIN or refusal condition so judges can see that the agent is making a bounded decision rather than merely replaying a hard-coded transaction.

### 18.5 Indexer

- reads Creditcoin and Sepolia events,
- reconciles against direct contract calls,
- supports reorg-safe confirmation policies,
- stores raw logs and normalized records,
- can rebuild from genesis/deployment blocks,
- does not overwrite canonical chain data.

### 18.6 Evidence generator

Generates:

- mandate JSON,
- source transaction JSON,
- proof metadata,
- decoded fields,
- predicate trace,
- settlement transfers,
- verification result,
- source code references,
- limitations.

---

## 19. Repository structure

```text
/
├─ apps/
│  ├─ web/
│  ├─ api/
│  ├─ worker/
│  └─ agent/
├─ contracts/
│  ├─ creditcoin/
│  │  ├─ core/
│  │  ├─ adapters/
│  │  ├─ templates/
│  │  └─ test/
│  └─ ethereum/
│     ├─ router/
│     ├─ demo/
│     └─ test/
├─ packages/
│  ├─ protocol-types/
│  ├─ reference-model/
│  ├─ baseline-reporter/
│  ├─ benchmark-harness/
│  ├─ contract-clients/
│  ├─ attestcoin-client/
│  ├─ template-sdk/
│  ├─ agent-sdk/
│  ├─ verifier/
│  └─ config/
├─ evidence/
│  ├─ claims.json
│  ├─ submission-facts.json
│  ├─ manifests/
│  ├─ campaigns/
│  │  ├─ deterministic-100/
│  │  ├─ public-attestcoin/
│  │  ├─ reporter-baseline/
│  │  └─ ablations/
│  ├─ negative/
│  ├─ deployments/
│  ├─ fresh-user/
│  └─ completed-mandates/
├─ docs/
│  ├─ PRD.md
│  ├─ architecture.md
│  ├─ threat-model.md
│  ├─ attestcoin-seam.md
│  ├─ measurement-plan.md
│  ├─ baseline-and-ablation.md
│  ├─ epistemic-red-team.md
│  ├─ limitations.md
│  ├─ judge-path.md
│  ├─ contribution-log.md
│  └─ runbooks/
├─ scripts/
│  ├─ probe-attestcoin.ts
│  ├─ run-campaign.ts
│  ├─ verify-mandate.ts
│  ├─ verify-submission-facts.ts
│  └─ clean-room.sh
├─ BUILD_CONTRACT.md
├─ GATES.md
├─ DECISIONS.md
├─ CONTRIBUTIONS.md
├─ SETUP.md
├─ design.md
├─ README.md
├─ ARCHITECTURE.md
├─ SECURITY.md
├─ CONTRIBUTING.md
└─ LICENSE
```

`design.md` is required at implementation time and is the sole visual design source. This PRD controls product behavior, data, states, evidence, experiments, and acceptance criteria.

`submission-facts.json` is the source of truth for deployed URLs, networks, contract addresses, canonical transaction IDs, measured headline values, live/test/simulated status, limitations, and reproduction commands. README, demo script, deck, and submission copy must be checked against it before release.

---

## 19A. Distribution, business, CEIP, and ecosystem residue

### 19A.1 Earliest adopter

First buyer/user:

- a DeFi protocol or treasury team already delegating bounded Ethereum actions to a custom bot, keeper, or autonomous agent,
- the team has a meaningful cost of incorrect or unverifiable execution,
- it is willing to escrow a reward and require executor bond for selected high-value operations.

The first wedge is not "replace all automation." It wraps one consequential delegated execution with portable, receipt-verified assurance.

### 19A.2 Distribution surface

Primary distribution surfaces:

1. `@setld/sdk` for mandate creation, executor discovery, acceptance, proof status, and verification.
2. A small protocol adapter package for treasury/keeper workflows.
3. The public web app for creators, human operators, and judge verification.
4. A machine-readable capability manifest for autonomous agents.

Adoption-friction target: medium or lower.

- creator: deploy/use Creditcoin mandate contract and fund reward,
- executor: bind source execution identity and post bond,
- existing source action should remain as close as possible to the protocol's current transaction shape,
- a mandatory source router is accepted only when Gate S3 proves direct receipt/event binding is insufficient.

### 19A.3 Conversion and retention

Conversion event:

> A protocol posts one real bounded execution mandate and an external agent completes it through Attestcoin-backed settlement.

Retention loop:

```text
more mandates
→ more value-weighted execution outcomes
→ clearer executor reliability history
→ better executor selection / future bond terms
→ more high-value mandates
```

### 19A.4 Value capture

Long-term candidate revenue, none required to be live for hackathon scoring:

- settlement fee on fulfilled mandates,
- enterprise assurance policy / SLA fee,
- premium protocol adapters and monitoring,
- delegated bond/underwriting fees when third-party capital is introduced.

No governance token is required.

### 19A.5 Sponsor KPI

If Creditcoin announces setld as a winner, the sponsor should be able to point to concrete ecosystem value such as:

- number of consequential Attestcoin-backed settlements,
- number/value of invalid executions refused,
- number of repeated proof verifications generated,
- a reusable receipt-predicate SDK/template,
- an upstream Attestcoin SDK test/fix/example produced from real integration work.

### 19A.6 CEIP thesis

setld's investment thesis is not "hackathon agent demo." It is cross-chain machine assurance infrastructure:

- portable execution history lives on Creditcoin,
- protocols can outsource execution without outsourcing settlement truth to the same operator,
- executors accumulate value-weighted performance history,
- future delegated bond providers can underwrite machine execution capacity,
- Creditcoin becomes the credit/assurance ledger for autonomous cross-chain work.

The CEIP pitch must still disclose that demand for a separate assurance layer is not yet proven. User interviews and one real protocol integration are post-demo validation priorities.

### 19A.7 Open-source contribution layer

Inspect current Attestcoin/Creditcoin SDK and examples while building. Prioritize real issues produced by the setld integration path:

Tier A targets:

- correctness/security bug in QueryBuilder or verifier integration,
- replay/source-identity helper that can be upstreamed,
- missing typed receipt/event primitive needed by production integrations.

Tier B targets:

- missing regression tests for sender/target/status/event extraction,
- reproducible SDK error handling or proof-builder recovery fix,
- environment probe utility that prevents builders from using stale chain configuration.

Tier C only when no stronger opportunity exists:

- docs correction or tutorial update.

Every contribution must be recorded in `CONTRIBUTIONS.md` with issue/PR URL, reproduction, status, and product relevance. Do not manufacture trivial pull requests for optics.

### 19A.8 Production-path evidence

Measure rather than merely claim production readiness:

- Attestcoin wait/proof/settlement latency p50/p95 over the public campaign,
- verifier + predicate gas p50/p95,
- source gas and total workflow cost,
- proof worker recovery time after forced restart,
- duplicate-delivery idempotency,
- concurrent queue behavior for at least 20 queued jobs in a controlled environment,
- indexer catch-up from deployment block,
- time and code changes required to add a second mandate template,
- one estimate of cost per 100 or 1,000 settlements using measured components, clearly labelled as a projection.

---


## 20. Security model

### 20.1 Trust assumptions

Trusted or assumed:

- Creditcoin consensus and Attestcoin attestor quorum operate as documented,
- Ethereum consensus/finality for supported blocks,
- the deployed template and adapter bytecode match published code,
- token contracts conform to supported behavior,
- source RPC and proof builder are available for liveness, not correctness.

Not trusted:

- proof relayer,
- creator,
- executor,
- agent model,
- API server,
- indexer,
- hosted frontend,
- notification service.

### 20.2 Threats and mitigations

#### Forged proof

Mitigation: native verifier, pinned ABI, adversarial modified-proof tests.

#### Valid proof of irrelevant transaction

Mitigation: sender, target, selector, arguments, mandate ID, block range, receipt status, exact event emitter and fields.

#### Receipt replay

Mitigation: unique source transaction key consumed atomically.

#### Mandate replay across deployments

Mitigation: domain-separated mandate ID includes chain ID and registry address.

#### Relayer reward theft

Mitigation: beneficiary comes from accepted executor and verified sender.

#### Open-mandate execution hijack

Mitigation: exclusive acceptance and bound source address.

#### Malicious creator predicate

Mitigation: audited templates, structural validation, creator bond, simulation, immutable parameters, no arbitrary interpreter.

#### Executor reserves and abandons

Mitigation: timeout penalty, bounded acceptance window, creator option to reopen after release.

#### Front-running acceptance

Mitigation: optional signed acceptance intent or executor allowlist; open mode accepts race as market behavior.

#### Front-running proof submission

Mitigation: proof submitter neutrality; fixed reimbursement only.

#### Reentrancy

Mitigation: checks-effects-interactions, nonReentrant vault settlement, pull withdrawals where appropriate.

#### Fee-on-transfer or rebasing tokens

Mitigation: token allowlist and balance-delta accounting.

#### Upgrade compromise

Mitigation: immutable hackathon deployments where possible; otherwise timelocked upgrade, published implementation hashes, active-mandate adapter pinning.

#### Worker duplicate submissions

Mitigation: database idempotency plus on-chain replay protection.

#### Attestation delay

Mitigation: proof grace period, visible status, retries, no premature timeout.

#### Source reorg before finality

Mitigation: rely on Attestcoin-supported finalized/attested continuity, not local confirmations alone.

#### Wrong decoder interpretation

Mitigation: differential tests against Ethereum RPC and SDK QueryBuilder, pinned test vectors, fuzzing.

#### Gas denial

Mitigation: bounded log scan, bounded proof size, template-specific field extraction, gas benchmarks.

#### Creator source-state manipulation

Mitigation: deterministic first template, immutable source contract, explicit creator obligations. Broader templates require separate fault rules.

### 20.3 Emergency controls

Allowed:

- pause creation,
- pause acceptance,
- block a template for new mandates,
- pause proof consumption for a compromised adapter,
- preserve read-only access and finalized withdrawals.

Not allowed:

- admin seizure,
- rewriting settled outcomes,
- changing active mandate terms,
- redirecting rewards or bonds.

---

## 21. Privacy and data handling

setld is publicly auditable, not private.

Public:

- wallet addresses,
- mandate terms and commitments,
- reward and bond,
- source transaction,
- receipt fields used by the predicate,
- settlement,
- execution history.

Never put on-chain:

- agent API keys,
- model prompts unless intentionally published,
- private strategy logs,
- personal identity data,
- internal infrastructure secrets.

Off-chain metadata must be content-hashed. Telemetry must redact secrets and full raw signed payloads when unnecessary.

---

## 22. Observability and operations

### Metrics

- source events discovered,
- average time to attestation,
- proof-generation latency,
- Creditcoin submission latency,
- proof success/failure by reason,
- duplicate attempts,
- mandate state counts,
- settlement gas,
- worker retry count,
- RPC error rate,
- indexer lag,
- frontend proof-page availability.

### Logs

Every worker log includes:

- mandate ID,
- source transaction hash,
- source block,
- source transaction key when known,
- job state,
- retry count,
- error category,
- no private key or signed raw transaction.

### Alerts

- proof builder unavailable,
- Attestcoin continuity height stalled,
- worker queue age above threshold,
- Creditcoin RPC divergence,
- contract paused,
- vault accounting mismatch,
- indexer lag,
- failed end-to-end canary.

### Runbooks

- worker restart,
- proof-service outage,
- RPC failover,
- indexer rebuild,
- contract pause,
- evidence regeneration,
- key rotation,
- testnet reset.

---

## 23. Testing strategy

### 23.1 Reference model

Implement an executable, dependency-light model before contracts.

Inputs:

- mandate state,
- template terms,
- accepted executor,
- verified execution,
- deadlines,
- consumed source keys,
- vault balances.

Outputs:

- evaluation code,
- state transition,
- transfer ledger,
- history update.

Properties:

- asset conservation,
- one terminal state,
- one source receipt consumed once,
- proof submitter independence,
- exact deadline boundaries,
- no reward on non-fulfillment,
- no executor penalty without accepted mandate,
- no creator withdrawal while active.

### 23.2 Contract tests

- unit tests for every transition,
- fuzz canonical encoding,
- property tests for vault conservation,
- decoder test vectors from real Sepolia transactions,
- malformed proof components,
- wrong chain key,
- wrong block height,
- wrong transaction index,
- wrong sender,
- wrong target,
- wrong selector,
- wrong args,
- wrong event emitter,
- wrong topics,
- wrong event data,
- receipt status 0,
- duplicate receipt,
- duplicate finalize,
- deadline edges,
- token edge cases,
- reentrancy mocks,
- pause behavior.

### 23.3 Differential tests

Compare:

- SDK QueryBuilder output,
- direct Ethereum RPC decoding,
- Solidity decoder output,
- reference-model evaluation,
- deployed contract evaluation.

### 23.4 Integration tests

- local Ethereum and Creditcoin-compatible test harness,
- pinned official example stack where available,
- proof-builder mock only for lower-rung tests,
- real public testnet proof for higher-rung tests.

### 23.5 End-to-end tests

- creator publishes,
- executor accepts,
- agent executes correct transaction,
- proof worker settles success,
- executor and creator balances match,
- replay fails,
- second mandate executes wrong committed parameter,
- valid proof reaches invalid-attempt settlement,
- public proof page renders both.

### 23.6 Security tooling

- Slither,
- Foundry fuzz and invariant tests,
- dependency audit,
- secret scan,
- static TypeScript checks,
- container scan if Docker is used,
- manual adversarial review,
- final external or independent audit prompt.

---

## 23A. Evidence campaign and claim discipline

### 23A.1 Campaign manifest

Before running the headline campaign, commit a frozen manifest containing:

- repository commit,
- contract deployment identifiers,
- SDK/contracts package versions,
- RPC/proof-builder endpoints,
- source and Creditcoin chain identifiers discovered by Gate S0,
- cohort case IDs,
- case-generation seed where used,
- baseline/treatment configuration,
- exact predicate version,
- reward/bond schedule,
- gas limit policy,
- pass/fail rules,
- artifact output paths.

Changing the manifest after observing results requires a new campaign ID and written reason.

### 23A.2 Deep proof

Required deep proof:

- reference-model parity,
- contract fuzz/invariant suite,
- replay rejection,
- sender binding,
- wrong target/selector/argument/event refusals,
- deadline boundaries,
- value conservation,
- proof tamper test,
- worker restart/idempotency,
- clean-room verifier.

### 23A.3 Wide proof

Required wide proof where testnet conditions permit:

- 100-case deterministic/fork campaign,
- minimum 20 real Attestcoin-backed source proofs,
- multiple success and refusal categories,
- at least three action shapes before broad generality claims,
- publish failed/unavailable cases with reasons,
- no deletion of inconvenient runs from the working evidence trail.

### 23A.4 Verification cheaper than creation

The judge/verifier path must not require funded wallets, model credits, or private service credentials when the claim can be recomputed from published evidence.

Provide:

```text
pnpm verify:mandate --id <mandateId>
```

The verifier should:

- fetch or read the canonical mandate and settlement state,
- re-derive the source transaction identity,
- re-check stored proof/query provenance where possible,
- re-run the predicate against published decoded evidence,
- verify reward/bond transfer accounting,
- return named pass/fail reasons,
- include a tamper mode/test that changes one protected field and proves verification fails.

### 23A.5 Claim ledger and submission facts

`evidence/claims.json` records every important claim with:

- exact wording,
- status: `target | verified | failed | unavailable | withdrawn`,
- evidence IDs,
- network and contract/transaction identifiers,
- proof level,
- measured denominator,
- provenance manifest,
- verification command,
- limitation,
- verified timestamp.

`evidence/submission-facts.json` contains only currently valid judge-facing facts.

A withdrawn claim must disappear from README, UI, deck, script, and submission copy.

### 23A.6 How could this result be misleading?

The public evidence page and README must contain a concise section answering:

- what the baseline can and cannot prove,
- why compromised-reporter tests do not imply honest reporters always fail,
- whether the public campaign is large enough to generalize,
- whether all source actions use the same router/template,
- whether proof-builder availability affects liveness,
- what Attestcoin proves versus what setld's predicate decides,
- what remains outside the guarantee.

---


## 24. Verification gates

No later phase may claim or build on a gate that has not passed. Record every consequential pass/fail in `GATES.md` when it happens.

### Gate S0: Live environment and dependency lock

Verify by executable probes:

- current Attestcoin documentation/repository path,
- Creditcoin testnet RPC and EVM chain ID,
- current native verifier and ChainInfo addresses/ABIs/runtime code,
- supported source chain registration and latest attested height,
- source chain key,
- exact `@gluwa/usc-sdk` version,
- exact contracts/decoder package version,
- proof-builder endpoint and health,
- explorer URLs,
- faucet access.

Evidence:

- `evidence/manifests/environment.json`,
- `scripts/probe-attestcoin.ts` output,
- pinned lockfile,
- timestamped code hashes and RPC responses.

Stop condition:

- current environment cannot generate and verify a recent Sepolia transaction proof.

### Gate S1: Verified field extraction

Using a real Sepolia transaction, prove that the authoritative Attestcoin path supplies every field required by `TreasuryRebalancePredicateV1`.

Compare decoded values against direct Sepolia RPC only as an independent oracle, never as settlement input.

Stop condition:

- any mandatory field cannot be proven or safely decoded.

### Gate S2: Replay, source identity, and relayer neutrality

Prove:

- replay-safe unique source transaction key,
- first consumption accepted,
- duplicate consumption rejected,
- same receipt cannot settle another mandate,
- wrong bound executor/source sender rejected,
- different relayer address does not change reward beneficiary or predicate result.

### Gate S3: Router-optional seam

Attempt to verify one existing standard protocol/event action without `SetldExecutionRouter`.

Outcome A:

- transaction/event fields bind the mandate strongly enough, direct adapter admitted.

Outcome B:

- evidence is insufficient for unique mandate binding, routed template remains canonical.

Do not force the direct path merely to lower adoption friction.

### Gate S4: Reference model

Pass:

- state transitions,
- conservation,
- deadline edges,
- penalty policy,
- malformed/unknown states,
- property tests.

### Gate S5: Baseline harness parity

Before adversarial comparison:

- honest centralized reporter B0 and Attestcoin treatment T0 run the same frozen valid cases,
- both use the exact same predicate implementation or generated predicate vectors,
- any disagreement is investigated and resolved,
- no security claim is published from a baseline that is already incorrect under honest operation.

### Gate S6: Core contracts and agent local composition

Pass:

- mandate registry,
- vault,
- executor/source binding,
- Attestcoin adapter interface,
- predicate,
- settlement,
- agent policy boundary,
- local end-to-end lifecycle,
- no unresolved critical/high static finding.

### Gate S7: Economic and incentive model

Model and test:

- reward/bond sizing,
- reservation/cancellation incentives,
- timeout behavior,
- creator spam cost,
- relayer reimbursement,
- failed/reverted execution policy,
- no profitable replay/duplicate path,
- no obvious dominant strategy to reserve valuable jobs and abandon them cheaply.

### Gate S8: Public Attestcoin success lifecycle

A real source transaction, real Attestcoin proof, and real Creditcoin testnet settlement transfer complete end to end.

### Gate S9: Public Attestcoin refusal lifecycle

A real transaction from the bound executor is Attestcoin-verifiable but fails one objective precommitted predicate field. Reward is not released and the resulting accounting matches the reference model.

This is the canonical failure-path proof.

### Gate S10: Sponsor-removal / reporter-compromise ablation

Run matched cases through B0 and T0.

Required evidence:

- honest parity cohort,
- compromised reporter attempts to assert fulfillment for invalid executions,
- baseline consequence,
- Attestcoin treatment consequence,
- raw artifacts for every case,
- no post-hoc case removal.

Pass only if the measured result supports the sponsor-causal thesis. Otherwise narrow the claim.

### Gate S11: Wide-proof campaign

Pass:

- 100-case deterministic campaign complete,
- minimum 20 real public Attestcoin-backed proofs unless documented testnet economics/liveness make that impossible,
- multiple outcome classes,
- failures retained,
- latency/gas statistics generated from raw artifacts,
- broad mechanism claim only if the generalization gate passes.

### Gate S12: Product lifecycle and fresh-user proof

Pass criteria:

- fresh creator reaches funded published mandate without docs,
- fresh executor binds source identity, accepts/bonds, executes, and sees settlement without docs,
- autonomous agent completes discover → analyze → ACCEPT/ABSTAIN → execute → reconcile through SDK/API,
- relayer restarts and recovers pending job,
- wrong network/account, rejected signature, RPC ambiguity, source revert, Attestcoin delay, proof failure, rate limit, indexer lag, and session expiry show human recovery states,
- judge verifier requires no wallet,
- return visit restores active work,
- logout/revoke/rotate paths function,
- Playwright clean-browser tests and recorded artifacts pass.

### Gate S13: Production-path evidence

Pass:

- latency and gas distributions measured,
- worker restart recovery measured,
- at least 20 queued jobs exercised in a controlled concurrency test,
- indexer rebuild/catch-up proven,
- second-template integration effort measured if broad expansion claim is used.

### Gate S14: Open-source residue

Pass:

- sponsor repositories inspected,
- real contribution opportunities documented,
- any discovered issue has reproduction evidence,
- submitted PR/issue tracked where meaningful,
- no manufactured trivial contribution required if no substantive issue exists.

### Gate S15: Submission integrity and judge path

Pass:

- claim ledger valid,
- `submission-facts.json` valid,
- README/value/proof framing synchronized,
- all URLs and transaction links live,
- exact limitations visible,
- CI green,
- clean-room reproduction complete,
- demo rehearsed from clean browser,
- 90–120 second repo walkthrough prepared,
- 2–3 minute product demo prepared,
- no dead buttons, mock critical integration, fake activity, or stale architecture text.

---

## 25. Phased implementation plan

Product-surface obligation for every phase:

If a phase creates or changes user-visible state, the same phase must update the route/action state, loading/error/recovery behavior, receipt/history projection, and automated product test. Backend-only completion is not a pass for a user-visible capability.

### Phase 00: Repository, source, and build contract

Scope:

- repository bootstrap,
- `BUILD_CONTRACT.md`, `GATES.md`, `DECISIONS.md`, `CONTRIBUTIONS.md`,
- copy canonical PRD to `docs/PRD.md`,
- pin toolchain/package manager,
- strict TypeScript,
- Solidity toolchain,
- CI skeleton,
- claim/submission-fact schemas,
- Gate S0.

Stop boundary:

- no business contract work before the live environment probe passes.

### Phase 01: Attestcoin seam and authoritative decoder

Scope:

- recent Sepolia source transaction,
- wait for attestation,
- proof generation,
- native verification,
- QueryBuilder/decoder vectors,
- required field extraction,
- tamper case,
- replay/source-key prototype,
- Gates S1-S3.

Completion artifact:

```text
pnpm seam:verify <txHash>
```

prints Attestcoin-verified fields, provenance, gas, and named failure reasons.

### Phase 02: Reference model, baseline, and frozen measurement design

Scope:

- canonical types/state machines,
- reference model,
- B0 centralized reporter baseline,
- campaign manifest schema,
- pre-registered cohorts,
- primary/secondary metrics,
- controls/ablation plan,
- initial economic policy,
- Gates S4-S5.

Stop boundary:

- do not start the headline campaign until baseline honest parity is proven.

### Phase 03: Source execution template

Scope:

- `SetldExecutionRouter` if required,
- demo treasury/vault target,
- treasury rebalance template,
- correct/wrong/reverted/deadline source vectors,
- source identity/event bindings.

Completion:

- deterministic source transactions can exercise every v1 predicate branch.

### Phase 04: Creditcoin core and economic settlement

Scope:

- registry,
- vault,
- executor registry,
- template registry,
- Attestcoin adapter,
- predicate engine,
- settlement engine,
- conservation and invariant tests,
- Gate S6-S7.

### Phase 05: Autonomous agent and proof worker

Scope:

- typed mandate intake,
- tool-calling AI decision loop,
- deterministic safety policy,
- isolated signer,
- simulation and cost tools,
- ACCEPT/ABSTAIN behavior,
- proof worker durable queue,
- restart/idempotency,
- observability.

Completion:

- agent can autonomously accept one valid job and abstain from one unsuitable job in a deterministic test environment.

### Phase 06: First public mechanism proof

Scope:

- public deployments,
- Gate S8 success,
- Gate S9 verified-but-wrong refusal,
- replay rejection,
- independent proof artifact.

Stop boundary:

- no secondary feature outranks completing these public transactions.

### Phase 07: Comparative mechanism campaign

Scope:

- honest baseline parity,
- reporter-compromise ablation,
- deterministic 100-case cohort,
- repeated real Attestcoin-backed cases,
- raw evidence bundle,
- epistemic red-team pass,
- Gates S10-S11.

Completion:

- `evidence/campaigns/` contains enough raw data to recompute every public mechanism metric.

### Phase 08: Full product surface and onboarding

Scope:

- landing page,
- creator onboarding/session/wallet flow,
- mandate composer/review/fund/publish,
- executor onboarding/source binding,
- job discovery/action workspace,
- Attestcoin progress states,
- terminal receipts/history,
- source identity/API-key revocation,
- agent activity/decision surface,
- public proof/verify pages,
- notifications,
- all state-matrix recovery behavior,
- `design.md` applied,
- Gate S12.

Completion:

- clean-browser creator, executor, and judge journeys pass without repo/docs/developer help.

### Phase 09: Generalization, production path, and contribution layer

Scope:

- second/third action shapes where technically justified,
- production latency/gas/concurrency/recovery measurements,
- direct adapter if Gate S3 admitted it,
- sponsor repository contribution work,
- Gates S13-S14.

Do not broaden the public claim if independent action shapes have not passed.

### Phase 10: Submission hardening and freeze

Scope:

- security red team,
- clean-room reproduction,
- evidence hashing/manifests,
- public surface synchronization,
- README scientific-argument structure,
- final deployment checks,
- demo/video/deck/submission copy,
- Gate S15.

Internal freeze:

Once core mechanism, sponsor path, comparative proof, product lifecycle, security, and required evidence are complete, stop adding non-critical features. Use the remaining window to rerun verification and synchronize public artifacts. The freeze is an integrity buffer, not a reason to weaken proof.

---

## 26. CI and release requirements

Required checks:

- formatting,
- lint,
- TypeScript typecheck,
- contract compile,
- unit tests,
- fuzz tests,
- invariant tests,
- integration tests,
- verifier regression vectors,
- dependency audit,
- secret scan,
- artifact size check,
- generated clients up to date,
- claim ledger schema validation,
- `submission-facts.json` schema validation,
- benchmark/campaign manifest validation,
- baseline/treatment cohort ID parity,
- generated evidence indexes up to date,
- stale public-fact detection,
- clean verifier vectors,
- no silent Attestcoin fallback test.

Protected main branch:

- pull request required,
- all checks required,
- no force push,

Reproducible deployment:

- chain config committed,
- constructor args committed,
- bytecode hashes recorded,
- verification status recorded,
- deployment script idempotent,
- no private keys in repo.

---

## 27. Acceptance criteria

The product is complete for submission only when all protocol and product-surface criteria pass.

### Protocol acceptance

- current Attestcoin native-verifier proof path is used,
- one correct and one objectively incorrect Sepolia action are real,
- both are verified on Creditcoin Testnet,
- success and rejection settlements execute,
- replay fails on-chain,
- proof relayer is not the reward beneficiary,
- bound source sender is enforced,
- the reference model predicts both outcomes,
- balances conserve exactly,
- no mocked proof is used in the submitted central lifecycle.

### Product-surface acceptance

- landing page explains product, user, mechanism, action, and trust evidence without becoming documentation,
- creator can onboard, authenticate, fund, publish, track, cancel where eligible, inspect result, and find history without docs,
- executor can onboard, bind source identity, preflight, accept/bond, execute, track Attestcoin/proof state, inspect settlement, and find history without docs,
- all signatures have a preceding review state and a following pending/receipt state,
- wrong-network, wrong-account, rejected-signature, session-expiry, RPC ambiguity, source-revert, proof-delay, proof-failure, indexer-delay, rate-limit, and service-outage states have defined user recovery,
- user can safely return after closing the browser and recover active work from chain/indexer state,
- logout, connector disconnect, API-key revocation, and source-binding rotation/retirement are implemented,
- autonomous agent completes the machine lifecycle through SDK/API without using browser automation,
- judges can inspect and verify without a wallet,
- terminal outcomes create permanent receipts/history rather than transient success toasts,
- clean-browser fresh-user tests pass with zero developer navigation help,
- all public claims map to evidence,
- limitations are visible,
- `design.md` has been applied without changing product semantics.

### Scientific / winner-gate acceptance

- mechanism hypothesis was committed before the headline campaign,
- reference model, baseline, and treatment are distinct artifacts,
- honest baseline parity is demonstrated,
- sponsor-removal/reporter-compromise ablation is complete,
- deterministic 100-case campaign is complete,
- repeated real Attestcoin-backed cases are published,
- negative/failure evidence is retained,
- public generality claim matches the number of independently tested action shapes,
- primary metric has raw numerator/denominator and provenance,
- epistemic red-team review is published,
- sponsor KPI is supported by actual run counts/transactions rather than estimates,
- production latency/gas claims are measured rather than inferred from architecture,
- upstream contribution claims, if any, link to real issues/PRs,
- `submission-facts.json` matches README, UI, deck, demo, and submission form.

### AI-track acceptance

- the product visibly shows an autonomous agent observe mandates, analyze structured evidence, choose ACCEPT or ABSTAIN, execute through typed tools, and receive settlement feedback,
- deterministic guardrails rather than the model enforce target/amount/template/signing bounds,
- agent cannot mark itself successful or choose its payout,
- the submitted demo includes at least one actual autonomous decision and consequential transaction,
- removing the agent materially changes the submitted user story from autonomous execution assurance to a human/keeper protocol, so the AI track is not cosmetic.

---

## 28. Demo script

The demo is performed primarily through the actual product. Explorer links are opened from the product's evidence panels rather than by navigating manually to unrelated URLs.

### 0:00 to 0:15: entry and problem

Open `/` in a clean browser profile.

Show the line:

> Agents can sign transactions. That does not prove they completed the assigned work.

Choose `Create mandate`.

### 0:15 to 0:35: onboarding and mandate creation

Connect the prepared creator Creditcoin wallet, show the correct-network check and completed first-run checklist, then open the treasury rebalance composer.

Use a saved-but-unpublished demo draft to avoid typing delay. Show the plain-language success conditions, reward, bond, and deadline. Run `Validate` and show `Ready to publish`.

### 0:35 to 0:55: fund and publish

Review the mandate and sign `Fund and publish` on Creditcoin. The app routes to the mandate timeline.

A second pre-created mandate with one different protected parameter is already open for the negative case.

### 0:55 to 1:20: executor acceptance and source action

Switch to the prepared autonomous executor surface. Show the agent observing compatible jobs, the structured simulation/cost inputs, and its ACCEPT decision for mandate A. Show an ABSTAIN or policy refusal for one unsuitable job to establish that the agent is not a hard-coded transaction player.

For the canonical matched pair, the agent/operator executes:

- a correct rebalance for mandate A,
- an objectively wrong destination/parameter for mandate B under the dedicated adversarial test path.

Both Sepolia tx hashes appear inside their execution pages.

### 1:20 to 1:50: meaningful system behavior

The UI progresses through:

`Source receipt confirmed -> Waiting for Attestcoin -> Proof submitted -> Evaluating`.

State that the proof relayer is a separate address, visible in technical details, but do not leave the app to explain it.

### 1:50 to 2:20: result contrast

Open the side-by-side proof/result view:

- A: every predicate passes, reward paid, bond returned.
- B: verified receipt, one committed field highlighted as failed, reward refunded, penalty applied.

The visual result must be understandable without narration.

### 2:20 to 2:40: attack/replay proof

Use the product's `Replay test` demo control or a pre-recorded evidence row generated by the real replay transaction. Show `Already consumed` and link to the failed Creditcoin tx.

### 2:40 to 3:00: independent proof and close

Click `Verify independently` from the mandate page. Show the matching evidence report and downloadable JSON.

End on:

> The agent did not tell us it finished. The receipt did.

---

## 29. Two-minute judge path

1. Open the finished proof page.
2. Inspect successful mandate terms and settlement.
3. Open its Sepolia transaction and Creditcoin verification transaction.
4. Inspect rejected mandate and failed predicate trace.
5. Run read-only verification and view replay rejection.

No wallet, local setup, or repository search is required.

---

## 30. Claim ledger and submission-fact synchronization

Machine-readable `evidence/claims.json` example:

```json
{
  "claimId": "setld-core-001",
  "wording": "A verified Sepolia receipt released a reward on Creditcoin.",
  "status": "verified",
  "proofLevel": 9,
  "sourceNetwork": "Sepolia",
  "executionNetwork": "Creditcoin testnet",
  "sourceTx": "0x...",
  "creditcoinTx": "0x...",
  "contracts": [],
  "campaignId": "public-attestcoin-001",
  "manifestHash": "sha256:...",
  "numerator": 1,
  "denominator": 1,
  "verificationCommand": "pnpm verify:mandate --id ...",
  "verifiedAt": "ISO-8601",
  "limitations": []
}
```

Allowed status values:

```text
target
verified
failed
unavailable
withdrawn
```

`evidence/submission-facts.json` must contain:

- one-line product description,
- primary track,
- deployed URLs,
- exact networks,
- contract addresses,
- package/protocol versions,
- canonical demo transaction IDs,
- measured headline metrics with denominators,
- live/test/simulated status,
- reproduction commands,
- explicit limitations.

Frontend statistics, README claims, deck captions, demo narration, and submission copy must be generated from or validated against these files.

A stale or withdrawn fact is a CI failure.

---

## 31. Open questions and kill criteria

### Open questions

- Exact current ABI and package version for the native verifier.
- Whether direct existing-protocol event verification binds enough fields without a router.
- Exact gas cost of selective decoding for the first template.
- Typical Sepolia attestation and proof latency under current testnet conditions.
- Stable test token behavior on Creditcoin Creditcoin testnet.
- Economic penalty percentages.
- Whether the reporter-compromise ablation produces a meaningful measured separation without an unfair baseline.
- Whether protocols will accept the bond/reward workflow for real delegated execution.
- Whether the agent can make a genuine bounded ACCEPT/ABSTAIN decision without adding unsafe model authority.

### Kill or redesign criteria

- Current Attestcoin proof cannot expose receipt logs or function arguments required by the template.
- Source sender cannot be reliably decoded and bound.
- Replay-safe unique transaction identification cannot be implemented.
- Public testnet proof latency is consistently too long for a coherent demo.
- Proof and decoding gas exceed practical testnet limits.
- The source router changes `tx.from` semantics in a way that prevents executor identity binding and cannot be recovered through event fields.
- A close existing product already implements evaluator-free cross-chain receipt settlement with the same mechanism and stronger distribution.
- The core outcome requires discretionary fault attribution.
- Honest baseline and Attestcoin treatment cannot achieve parity on matched valid cases.
- Sponsor-removal experiment shows the same guarantee can be preserved by a generic fallback without introducing a trust assumption.
- Wide-proof campaign cannot produce enough independent real cases to support the public generality claim and the claim cannot be narrowed coherently.
- The AI agent is removable from the submitted user story without materially changing the product experience.
- Real target users reject the bond/reward adoption model even for high-value delegated actions and no lower-friction packaging exists.

---

## 32. Product roadmap

### Release 0.1

- treasury rebalance template,
- exclusive executor,
- single proof,
- deterministic penalty policy,
- public proof page,
- agent demo.

### Release 0.2

- direct event adapters,
- additional deterministic task templates,
- richer executor policy SDK,
- batch evidence for sequential workflows,
- notifications and webhooks.

### Release 0.3

- delegated bond providers,
- value-weighted machine credit,
- ERC-8004 outcome export,
- protocol integration SDK,
- multiple executor bidding.

### Release 1.0

- audited production contracts,
- real supported settlement assets,
- risk-based bonding,
- broader source-chain support as Attestcoin expands,
- institutional operations and SLA products.

---

## 33. Required documentation

Required repository documentation:

- `README.md` with product + measured result/proof first,
- `ARCHITECTURE.md`,
- `SECURITY.md`,
- `SETUP.md`,
- `DECISIONS.md`,
- `CONTRIBUTIONS.md`,
- `BUILD_CONTRACT.md`,
- `GATES.md`,
- `docs/PRD.md`,
- Attestcoin seam report,
- contract specifications,
- reference model specification,
- baseline/counterfactual specification,
- campaign measurement plan,
- epistemic red-team report,
- threat model,
- economic policy,
- worker operations/runbooks,
- agent integration guide,
- API/SDK guide,
- deployment manifest,
- public proof/verifier guide,
- known limitations,
- security disclosure policy,
- claim ledger,
- `submission-facts.json`.

README top-section order:

1. user problem,
2. concrete product/mechanism,
3. measured outcome when available,
4. winning screenshot,
5. public proof links,
6. "How could this result be misleading?",
7. then architecture, setup, tests, and deeper engineering.

Do not lead with contract count, test count, agent count, or package count.

---

## 34. Research basis and source precedence

### 34.1 Competition source

The competition details supplied for this PRD state:

- BUIDL CTC 2026 Fall,
- theme: Attestcoin Protocol,
- five tracks: DeFi, RWA, DePIN, Gaming, AI,
- setld primary track: AI,
- deadline extended to 2026-09-13 23:59 ET,
- top three teams enter CEIP fast-track due diligence,
- meaningful functional Attestcoin integration and technical documentation are mandatory,
- testnet deployment is mandatory,
- depth of Attestcoin usage is a core scoring factor.

### 34.2 Current protocol/package source

Primary official implementation sources checked on 2026-09-03:

- Attestcoin docs: `https://docs.attestcoin.org/`,
- official SDK repository: `https://github.com/gluwa/cc-next-query-builder`,
- official source examples: `https://github.com/gluwa/usc-testnet-bridge-examples`,
- official smart-contract examples: `https://github.com/gluwa/USC-Builder-Examples`,
- current SDK package observed in official repository: `@gluwa/usc-sdk@0.18.0`,
- official example dependency observed: `@gluwa/usc-contracts@0.1.2`.

The SDK repository documents:

- `PrecompileChainInfoProvider`,
- `ProofBuilder`,
- `PrecompileBlockProver`,
- single and batch proof verification,
- `QueryBuilder` extraction of static transaction/receipt fields, events, function signatures, and function arguments.

### 34.3 Adjacent standards/products to test against

Research and competitor response should include current primary sources for:

- ERC-8004 agent identity/reputation,
- ERC-8183 agent jobs/evaluation,
- Keep3r job/keeper mechanics,
- Gelato/Chainlink automation where relevant,
- same-chain bonded job architectures,
- current Attestcoin hackathon projects that already prove real cross-chain state/transaction use.

Do not claim uniqueness merely because no exact brand match was found. The defensible claim is the narrower mechanism that survives competitor review and the measured baseline/ablation.

### 34.4 Source precedence

When interfaces conflict, use this order:

1. live chain/runtime probe,
2. current official Attestcoin/Creditcoin package source,
3. current official docs,
4. current official examples,
5. this PRD,
6. third-party repositories/blogs.

A live contradiction must update `DECISIONS.md`, `GATES.md`, affected tests, and public claims. Never keep building against a premise already disproven by the current chain or SDK.

---

## 35. Final build rule

The full product ambition remains intact, but the winning build order is strict:

```text
pain evidence
→ live Attestcoin seam
→ frozen mechanism hypothesis + baseline
→ reference model
→ smallest load-bearing public success/refusal
→ comparative ablation
→ repeated evidence
→ autonomous agent loop
→ complete product lifecycle
→ production-path evidence
→ security/reproducibility
→ submission synchronization and polish
```

No dashboard, extra template, social feature, token, or decorative integration outranks an unfinished sponsor-causal mechanism proof.

The product is submission-ready only when a fresh user can use it, a skeptical judge can verify it, and a controlled experiment shows why Attestcoin-backed receipt settlement earns its place.
