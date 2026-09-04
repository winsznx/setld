# Epistemic red team (PRD 4A.9 / 23A.6)

Before publishing the headline result, we tested whether it could be misleading.

| Confound | Check | Status |
|---|---|---|
| Intentionally weak baseline | `BaselineReporterSettlement` runs the **same** `packages/reference-model` predicate the honest way. It only diverges from setld when the reporter lies. | clear |
| Different predicate logic between arms | Both arms use one reference model. The honest-parity cohort (S5) confirms they agree on every case before any security claim. | clear |
| Unequal source transactions | The ablation reuses the **exact** two real Sepolia executions from S8/S9. Same `sepoliaExecuteTx` in both arms. | clear |
| Different finality/block windows | Same source blocks; the baseline does not use a proof at all, so there is no window to differ. | clear |
| Cached proof used by only one arm | The Attestcoin arm re-verifies the proof on-chain each run; the baseline uses no proof. | clear |
| Failed RPC / proof-service calls counted as security refusals | The verifier distinguishes `mismatch` (a real predicate divergence) from `evidence-unavailable` (a dependency down). Only `mismatch` counts. | clear |
| Replay cases counted as independent jobs | The deterministic campaign's replay cohort settles a throwaway sibling first, then the real mandate; the sibling is not counted. | clear |
| Cherry-picked source transactions | The two canonical transactions were the first correct and first over-cap executions run; they were not selected after seeing results. | clear |
| Hidden manual intervention | Every lifecycle runs unattended via `apps/orchestrator`; the only human input is faucet funding. | clear |
| Output truncation / missing failed runs | The killed first S8 run and the D8 verifier failure that caught the `sourceTxKey` bug are retained in git history and `DECISIONS.md`. | retained |
| Changing the cohort after failures | The deterministic cohort split (40/20/10/10/10/10) is frozen in `DeterministicCampaign.t.sol` and `manifest.md`. | frozen |
| Small sample | Acknowledged in the README and `submission-facts.json` limitations. The ablation is 2 matched executions; the deterministic campaign is 100 cases on a fork. | disclosed |

## What the result does and does not show

- **Shows:** with the same predicate and the same real executions, a compromised trusted
  reporter can pay a reward that the Attestcoin-backed path refuses, because the treatment
  requires a source-transaction proof the Creditcoin verifier accepts before value moves.
- **Does not show:** that honest reporters always fail (they do not — S5), that this
  generalizes past the treasury template (it is not claimed — `claims.json`
  `setld-broad-generality` is withdrawn), or that a large-N study was run.
