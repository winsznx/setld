# Deterministic 100-case campaign manifest (frozen)

- Harness: `contracts/test/creditcoin/DeterministicCampaign.t.sol`
- Path: real `SetldCore` create → accept → settle, with `MockAttestcoinAdapter` returning
  the case's `VerifiedExecution` (the Attestcoin verification path itself is exercised live
  in S8/S9; here the predicate + economics are the unit under test).
- Cohorts (PRD 4A.4): 40 valid, 20 wrong-parameter, 10 wrong-sender, 10 reverted,
  10 after-deadline, 10 replay/duplicate-consumption.
- Primary metric: `invalid_reward_leakage` = total reward released to an executor for a
  non-valid case. **Result: 0.**
- Per-case assertion: for every non-valid cohort, `executorBalanceDelta <= executorBond`
  (bond may return; reward never does).
- Result: `summary.json` in this directory. Re-run: `cd contracts && forge test --match-contract DeterministicCampaignTest`.
