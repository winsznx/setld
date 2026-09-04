# C2 — `@gluwa/usc-sdk` has no typed wrapper for `is_height_attested`

**Type:** small feature patch (`github.com/gluwa/cc-next-query-builder`)
**Status:** patch drafted below; not filed pending go-ahead

## The gap

`chain_info.json` exposes `is_height_attested(uint64 chainKey, uint64 height) -> bool`,
`find_highest_attested_before`, and `find_lowest_attested_after`, but
`PrecompileChainInfoProvider` surfaces none of them. Callers that need a precise
"is this source block provable yet?" check must either drop to a raw `ethers.Contract`
on the precompile ABI, or approximate with `getLatestAttestedHeightAndHash().height >= target`
(which is what `packages/verifier` and `apps/web/lib/proofBuilder.ts` currently do).

## Suggested patch

```ts
// src/chain-info/index.ts — add to ChainInfoProvider and PrecompileChainInfoProvider

/** True if `targetHeight` on `chainKey` has been attested on Creditcoin. */
async isHeightAttested(chainKey: number, targetHeight: number): Promise<boolean> {
  return this.chainInfoContract.is_height_attested(chainKey, targetHeight);
}

/** Highest attested height <= `before` (0 if none). */
async findHighestAttestedBefore(chainKey: number, before: number): Promise<number> {
  return Number(await this.chainInfoContract.find_highest_attested_before(chainKey, before));
}
```

Plus the two lines in the `ChainInfoProvider` interface. This is a pure additive change.
