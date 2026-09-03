# Funding request — disposable testnet keys

Generated 2026-09-03. Private keys live only in the gitignored `.env`. Throwaway hackathon
keys; never send mainnet value. Keys are fixed and will not be regenerated.

Mandate reward/bond escrow uses a freely-mintable mock ERC20 (`tSETLD`) deployed on CC3, so
native **tCTC is needed for gas only** — the amounts below are far lower than the first
draft of this file.

## Addresses, roles, and amounts

| Address | Role | Chain | Minimum immediate | Full campaign | Next gate it unlocks |
|---|---|---|---:|---:|---|
| `0xA629431b12fcf2EF838966b79cD2ba0Ea452d738` | **Deployer / operator.** Deploys all 6 CC3 units (`SetldVault`, `SetldAttestcoinAdapter`, `SetldExecutorRegistry`, `SetldCore`, `TreasuryRebalancePredicateV1` lib, `BaselineReporterSettlement`), registers the template, mints + distributes `tSETLD`, funds the CC3 executor and relayer from its balance. | Creditcoin CC3 testnet | **40 tCTC** | **150 tCTC** | **S8** (public Attestcoin success lifecycle) — needs the CC3 contracts deployed and a settlement tx paid |
| `0xb3Fbde35DcA37D65F19f2b40BbC2e8E6Fef3956C` | **CC3 executor / agent signer.** Registers as executor, binds the Sepolia source address, signs `acceptMandate` + bond txs, runs the autonomous ACCEPT/ABSTAIN loop's Creditcoin side. | Creditcoin CC3 testnet | 0 (funded from deployer) | 0 (funded from deployer) | S8 / S12 |
| `0x03D9bd775aE2D7757e79B9CC6B9abDaE85D27b66` | **CC3 relayer.** Distinct proof submitter — required so Gate S2's relayer-neutrality claim is demonstrated on-chain (submitter ≠ reward beneficiary). Pays `settle` gas. | Creditcoin CC3 testnet | 0 (funded from deployer) | 0 (funded from deployer) | S2 on-chain, S8 |
| `0xe1DCA061c96CD8a1464416FEBF6Ee0824c24F884` | **Sepolia deployer.** Deploys `SetldExecutionRouter`, `DemoTreasuryVault`, two `MockERC20` assets; sets the vault rate; seeds the vault's `assetOut` pool; allowlists the vault on the router. | Ethereum Sepolia | **0.08 ETH** | **0.20 ETH** | **S1-on-chain closeout + S8** (real source layer must exist to produce the proven tx) |
| `0xD76455eB2015591A239ef651518d0e9BEeF4787F` | **Sepolia executor.** The bound source address. Sends every real `router.execute` source transaction: the canonical correct one, the canonical verified-but-wrong one, and the ~20-50 public-campaign executions. | Ethereum Sepolia | **0.05 ETH** | **0.20 ETH** | **S9** (verified-but-wrong refusal) + **S11** (wide public campaign) |

### Totals

| Chain | Minimum immediate (unblocks deploy + first public gate) | Full campaign |
|---|---:|---:|
| Creditcoin CC3 testnet → `0xA629…d738` | **40 tCTC** | **150 tCTC** |
| Ethereum Sepolia → `0xe1DC…F884` | **0.08 ETH** | **0.20 ETH** |
| Ethereum Sepolia → `0xD764…787F` | **0.05 ETH** | **0.20 ETH** |

Minimum-immediate gets contracts deployed on both chains and the first correct + first
refused public lifecycle (Gates S8, S9) done. Full-campaign covers the 20-50 real
Attestcoin-backed proofs for Gate S11, the reporter-compromise ablation (S10), and full
re-runs.

### Basis

- CC3 gas 0.5 gwei observed; Sepolia 1.1 gwei (budgeted at 5 gwei).
- CC3: ~20M gas of deploys (~0.01 tCTC spot) + ~300 lifecycle/settlement txs at ~1.5M gas
  (~0.22 tCTC spot). The request is ~20-600x that for gas-price volatility and re-runs.
- Sepolia: ~4M gas deploys + ~60 `router.execute` at ~150k gas.
- The 100-case deterministic campaign runs on a Foundry fork — no testnet spend.

### Faucet path

tCTC: Creditcoin Discord (https://discord.gg/Gu43zTfmtc) faucet channel —
`!faucet 0xA629431b12fcf2EF838966b79cD2ba0Ea452d738`. If the per-claim cap is below 40,
several claims across the window are needed; deployment can begin as soon as ~5 tCTC lands.
Sepolia ETH: any Sepolia faucet to the two addresses above.
