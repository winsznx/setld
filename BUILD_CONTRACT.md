# BUILD_CONTRACT

Operating contract for coding agents and contributors on setld.

## Sources of truth
- `setld-production-prd-v3.md` — product, architecture, data, states, evidence, experiments, acceptance.
- `design.md` — sole visual/design source of truth. NOT YET SUPPLIED. UI work (Phase 08) is blocked on it.
- Live protocol evidence overrides a stale PRD assumption; record every such correction in `DECISIONS.md`.

## Non-negotiable rules
- No fabricated metrics, users, transactions, logs, receipts, proofs, or screenshots.
- Every displayed number traces to a machine-readable artifact under `evidence/`.
- Targets stay labelled "target" until measured.
- No silent fallback from the Attestcoin path to a generic RPC reporter. Fail closed with
  `ATTESTCOIN_UNAVAILABLE` / `ATTESTCOIN_PROOF_INVALID`.
- Materially failed runs and withdrawn claims are retained, not deleted.
- Comparative experiments use matched inputs/workloads.
- Private keys and secrets are never printed to logs or committed. Disposable dev keys only,
  via `.env` (gitignored).
- Completed gates recorded in `GATES.md` contemporaneously.
- Public facts synchronized through `evidence/submission-facts.json`.

## Toolchain (pinned)
- pnpm 11, Node >=24, Foundry (forge 1.7), TypeScript strict, ethers v6.
- `@gluwa/usc-sdk@0.18.0`, `@gluwa/usc-contracts@0.2.0`.

## Build order (PRD 35) — do not reorder
pain evidence -> live Attestcoin seam [DONE S0/S1] -> frozen mechanism hypothesis + baseline
-> reference model -> smallest load-bearing public success/refusal -> comparative ablation
-> repeated evidence -> autonomous agent loop -> complete product lifecycle
-> production-path evidence -> security/reproducibility -> submission sync + polish.
