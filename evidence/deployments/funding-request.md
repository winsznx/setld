# Funding request — disposable testnet keys

Generated 2026-09-03. Private keys exist only in the gitignored `.env`. These are throwaway
hackathon keys; do not send mainnet value.

## Addresses to fund

| Role | Address | Chain | Requested | Purpose |
|---|---|---|---|---|
| CC3 deployer | `0xA629431b12fcf2EF838966b79cD2ba0Ea452d738` | Creditcoin CC3 testnet | **900 tCTC** | deploy ~9 contracts, fund CC3 executor + relayer, mandate reward/bond escrow working capital, settlement gas for the deterministic + public + ablation campaigns, re-runs |
| CC3 executor | `0xb3Fbde35DcA37D65F19f2b40BbC2e8E6Fef3956C` | Creditcoin CC3 testnet | (funded from deployer, ~50 tCTC) | acceptance + bond txs, agent loop |
| CC3 relayer | `0x03D9bd775aE2D7757e79B9CC6B9abDaE85D27b66` | Creditcoin CC3 testnet | (funded from deployer, ~50 tCTC) | proof submission gas, relayer-neutrality test needs a distinct submitter |
| Sepolia deployer | `0xe1DCA061c96CD8a1464416FEBF6Ee0824c24F884` | Ethereum Sepolia | **0.3 ETH** | deploy router + demo treasury + mock assets, seed demo balances |
| Sepolia executor | `0xD76455eB2015591A239ef651518d0e9BEeF4787F` | Ethereum Sepolia | **0.2 ETH** | ~50+ real source executions for the public Attestcoin campaign + canonical demo pair |

## Totals

- **Creditcoin CC3 testnet: 900 tCTC** to the CC3 deployer address (it distributes internally).
- **Ethereum Sepolia: 0.5 ETH** (0.3 deployer + 0.2 executor).

## Basis for the numbers

- CC3 gas price observed 0.5 gwei; Sepolia 1.1 gwei (planned at 5 gwei for headroom).
- Contract deploys: CC3 ~18M gas total (~0.01 tCTC at spot, budgeted 20x for volatility).
- Settlement tx calls `verifySingle` precompile + decode + predicate + vault transfers;
  budgeted ~2M gas each, ~250 settlement/accept/bind txs across all campaigns.
- Mandate escrow working capital: demo amounts kept small (≈0.5 tCTC reward, ≈0.5 tCTC
  each bond); funds recycle on settlement. ~50 tCTC peak.
- The 100-case deterministic campaign runs on a Foundry fork (no real testnet spend).
- Bulk of the request is buffer for gas-price volatility and full campaign re-runs.

## Faucet path

Creditcoin tCTC: official Discord faucet — https://discord.gg/Gu43zTfmtc → faucet channel,
`!faucet 0xA629431b12fcf2EF838966b79cD2ba0Ea452d738`. If the faucet caps per claim, multiple
claims across the window will be needed; the build does not block on the full amount, only on
a first tranche large enough to deploy.
