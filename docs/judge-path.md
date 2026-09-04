# Two-minute judge path (PRD 29)

No wallet, no local setup, no repository search.

1. Open **https://setld.pages.dev/proof**.
2. Read the diptych: two mandates, one `FULFILLED`, one `INVALID_ATTEMPT`. Both headers say
   `Attestcoin proof: Verified`. The divergence is the predicate row.
3. Note the wrong case: **`Receipt status: Success`** — the Ethereum transaction *succeeded*.
   It still fails on `AMOUNT_IN_OVER_CAP`. That is the non-obvious point.
4. Open either mandate's `Source transaction ↗ Sepolia` and `Creditcoin settlement ↗ CC3`
   links from the certificate. Real transactions.
5. Scroll to **"Why Attestcoin earns its place"**: a compromised trusted-reporter baseline
   paid the reward for the same over-cap execution; setld refused it.
6. Open **https://setld.pages.dev/verify**, pick either demo, click **Verify**. Your browser
   calls `verify()` on the Creditcoin BlockProver precompile against the bundled proof,
   re-decodes the bytes through the deployed `EvmV1Decoder`, re-runs the predicate, and
   checks conservation. All six checks pass, `Result: match`.
7. Optional, from a terminal:
   `git clone https://github.com/winsznx/setld && cd setld && pnpm i && pnpm verify:mandate --id 0x907043a3e8db72db45e0fd737b69d8975a53570487ff1b4c47f3db3cc1fb9598 --tamper`
   — the tamper run flips one calldata word and shows the predicate diverges.

---

# 90-second repository walkthrough

1. `GATES.md` — every verification gate with its status, date, and the transaction hashes
   that back it. S0–S10 PASS (S6 too).
2. `evidence/manifests/environment.json` — the live S0/S1 probe: a real Sepolia tx proven
   and verified on CC3, every predicate field present, `missingRequiredFields: []`.
3. `contracts/src/creditcoin/adapters/SetldAttestcoinAdapter.sol` — the Attestcoin seam.
   `verifySingle` → native `verify()` precompile → `EvmV1Decoder` → normalized
   `VerifiedExecution`. Fails closed.
4. `contracts/src/creditcoin/templates/TreasuryRebalancePredicateV1.sol` — the 17-step
   committed predicate.
5. `packages/reference-model` + `contracts/test/creditcoin/*Parity*.t.sol` — the same
   classification and economics in TS and Solidity across 16 vectors.
6. `evidence/completed-mandates/` — the two real public lifecycles.
7. `evidence/campaigns/ablations/reporter-compromise.json` — the sponsor-removal experiment.
8. `apps/agent/src/` + `evidence/agent/decision-log.json` — the autonomous ACCEPT/ABSTAIN
   loop with a real model call and deterministic guardrails.

---

# 2–3 minute product demo (PRD 28)

Performed through the deployed site; explorer links opened from the certificates.

| Time | Action |
|---|---|
| 0:00–0:20 | Open `setld.pages.dev`. Read the line: *"The agent did not report completion. The receipt did."* The diptych specimen is right there. |
| 0:20–0:50 | Open `/proof`. Walk the correct certificate top to bottom: Attestcoin verified → executor match → receipt success → predicate pass → reward released, bond returned. Open its Sepolia tx and CC3 settlement from the certificate links. |
| 0:50–1:20 | The wrong certificate. Same `Attestcoin proof: Verified`. Same `Receipt status: Success`. Then `Committed amount cap: Fail — AMOUNT_IN_OVER_CAP (step 11)`. Reward refunded, penalty applied. State: this Ethereum transaction really happened and really succeeded; setld still refused it. |
| 1:20–1:45 | Scroll to the ablation: compromised reporter leaked 10 tSETLD for that same execution; setld's leakage is 0. Same predicate, same inputs. |
| 1:45–2:10 | Scroll to the agent rows: one model ACCEPT ("~6.5x the bond at risk"), one model ABSTAIN ("~2% of the bond at risk"). Guardrails gate every decision; the model never decides success or payout. |
| 2:10–2:40 | Open `/verify`, click Verify on the wrong case. Browser re-verifies the proof on the precompile and re-runs the predicate. `Result: match`. |
| 2:40–3:00 | Close on: *"The agent did not tell us it finished. The receipt did."* |
