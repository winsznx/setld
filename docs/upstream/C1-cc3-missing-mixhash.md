# C1 — Creditcoin CC3 testnet RPC omits `mixHash`, breaking Foundry / alloy

**Type:** issue (Creditcoin node RPC and/or docs)
**Severity:** blocks the standard Foundry deploy/verify workflow on CC3
**Status:** documented + reproduced here; not filed pending @winsznx go-ahead

## Reproduction

```
$ cast block latest --rpc-url https://rpc.cc3-testnet.creditcoin.network/rpc
ERROR alloy_provider::blocks: failed to fetch block ... err=deserialization error: missing field `mixHash`

$ forge script script/DeployCreditcoin.s.sol --rpc-url <cc3> --broadcast
Error: EVM error; header validation error: `prevrandao` not set
```

`node scripts/upstream/c1-repro.mjs` prints the CC3 `eth_getBlockByNumber` response and
highlights that `mixHash` / `difficulty` are absent, whereas Sepolia and Ethereum mainnet
include them.

## Impact

Every setld CC3 deployment had to be driven by an ethers script
(`apps/orchestrator/src/deploy-cc3.ts`) instead of `forge script`, and CC3 contracts are
compiled with `evm_version = london` to avoid the `prevrandao` opcode. See `DECISIONS.md` D7.

## Suggested fix

Include `mixHash` (the RANDAO value, or `0x000…0` for a non-RANDAO chain) and `difficulty`
in the CC3 EVM RPC block response, OR add an explicit note + the ethers/viem workaround to
`docs.attestcoin.org/attestcoin-protocol/attestcoin-protocol-chains-environments`.
