# C4 — reusable replay-key + submitter-neutrality helper

**Type:** optional example / helper package
**Status:** offered; needs maintainer interest before extraction

Every settlement integration on Attestcoin needs the same two safety patterns:

1. `sourceTxKey = keccak256(abi.encodePacked(uint64 chainKey, uint64 height, uint32 txIndex))`
   consumed atomically with the terminal state (prevents a proof settling twice).
2. beneficiary derived from bound-executor state, never `msg.sender` (prevents a relayer
   stealing the reward).

setld's `SetldAttestcoinAdapter.deriveSourceTxKey` + `SetldExecutorRegistry` binding +
the `PredicateParity` / `SettlementParity` test vectors could be upstreamed as
`@gluwa/usc-settlement-helpers` or an entry in `USC-Builder-Examples`. The `abi.encodePacked`
detail matters — an `abi.encode` version silently produces different keys (`DECISIONS.md` D8).
