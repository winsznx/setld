# setld contracts

Foundry workspace. Two chains:

- `src/ethereum/` — Sepolia source layer: `SetldExecutionRouter`, `DemoTreasuryVault`,
  `MockERC20`. The vault executes mechanically and does not know mandate terms, which is
  what lets a semantically-wrong rebalance still succeed on Ethereum and be refused by
  setld (the canonical negative demo).
- `src/creditcoin/adapters/` — `SetldAttestcoinAdapter` wraps the native verifier + the
  deployed `EvmV1Decoder`. One proof envelope carries tx + receipt (DECISIONS.md D2); there
  is no separate receipt proof.
- `src/creditcoin/templates/` — `TreasuryRebalancePredicateV1`, evaluation order exactly
  PRD 12.9, mirrored 1:1 by `packages/reference-model`.

Precompile / library addresses are pinned from the S0/S1 probe in
`evidence/manifests/environment.json` and injected at deploy time, never hardcoded in
business logic.
