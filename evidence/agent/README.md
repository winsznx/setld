# Autonomous agent decision evidence (PRD 18.4A, AI-track acceptance)

`decision-log.json` is the structured OBSERVE→ANALYZE→DECIDE→AUTHORIZE→EXECUTE→RECONCILE→FEEDBACK
log from one run of `apps/agent` against live open mandates on Creditcoin CC3.

## What the model decides, and what it cannot

The model (`claude-sonnet-5`, via `apps/agent/src/decider.ts`) makes exactly one call per
guardrail-passing mandate: ACCEPT or ABSTAIN, plus an approved route name. Its structured
inputs are reward, bond-at-risk, estimated source gas, net margin, deadline-margin blocks,
simulation result, and the guardrail results.

The model **cannot**: alter mandate terms, bypass a guardrail, pick an unapproved route
(downgraded to ABSTAIN if it tries), sign calldata, mark its own execution successful, or
choose its payout. Those are outside `decide()` entirely — `apps/agent/src/policy.ts`
guardrails gate the decision deterministically, the isolated Sepolia signer submits the
transaction, and **Attestcoin + the setld predicate decide whether the work was correct and
paid** (see `evidence/completed-mandates/`).

## The recorded run

- **ACCEPT** `0x8e1efd16…` — model: "Net margin (~13 tSETLD) is ~6.5x the bond at risk with
  ample deadline buffer." Followed by a real on-chain `acceptMandate` + bonded Sepolia
  `router.execute` (tx `0xdf0701a9…`, block 11629883, receipt status 1).
- **ABSTAIN (model, economics)** `0x4bc87fd1…` — model: "Net margin of ~0.06 tSETLD is
  roughly 2% of the 3 tSETLD bond at risk, well under the ~10% threshold needed to justify
  putting the full bond on the line." Guardrails all passed; this was a genuine model
  judgement call.
- **ABSTAIN (deterministic guardrail)** `0xf7d1d1a7…` — `DEADLINE_TOO_CLOSE`; the model was
  never consulted.

Removing the agent turns the submitted story from "autonomous execution assurance" into a
plain keeper protocol, so the AI track is load-bearing, not cosmetic.
