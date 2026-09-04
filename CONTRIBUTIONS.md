# CONTRIBUTIONS

Upstream contribution opportunities surfaced by building the setld Attestcoin integration
(PRD 19A.7 / Gate S14). Each is reproducible from this repo. PRs/issues are not filed
automatically — filing is an external action pending the maintainer's go-ahead.

## C1 — Tier B — CC3 testnet RPC omits `mixHash`, breaking Foundry / alloy block polling

**Reproduction:** `forge script … --rpc-url https://rpc.cc3-testnet.creditcoin.network/rpc
--broadcast` fails with `EVM error; header validation error: prevrandao not set`, and
`cast send … --rpc-url <cc3>` logs `deserialization error: missing field mixHash`. The block
JSON returned by the CC3 RPC has no `mixHash` / `difficulty` field that alloy's block
deserializer expects for a post-Merge header.

**Impact:** builders cannot use the standard Foundry deploy/verify workflow against CC3;
they must fall back to an ethers/viem script (see `apps/orchestrator/src/deploy-cc3.ts` and
`DECISIONS.md` D7).

**Suggested fix:** include `mixHash` (zero or the RANDAO value) in the CC3 EVM RPC block
response, or document the incompatibility + the workaround in
`docs.attestcoin.org/…/chains-environments`.

**Where:** Creditcoin node RPC / docs. Product relevance: every setld deploy is affected.

## C2 — Tier B — `@gluwa/usc-sdk` `PrecompileChainInfoProvider` does not implement the full `ChainInfoProvider` interface

**Reproduction:** the `ChainInfoProvider` interface in `chain-info/index.ts` declares
`getAttestationHeightForDigest`, `getCheckpointForHeight`, etc., and the ABI exposes
`is_height_attested(uint64,uint64)`, but `PrecompileChainInfoProvider` only surfaces a
subset. Calling `is_height_attested` through the provider is not possible without dropping
to a raw `ethers.Contract` on the precompile ABI.

**Suggested fix:** add the missing wrappers (`isHeightAttested`, `getAttestationHeightForDigest`,
`getCheckpointForHeight`, `findHighestAttestedBefore`, `findLowestAttestedAfter`) to
`PrecompileChainInfoProvider`.

**Where:** `github.com/gluwa/cc-next-query-builder`. Product relevance: the setld verifier
and relayer both need `is_height_attested` for a precise "is this source block provable yet"
check; we currently approximate it with `getLatestAttestedHeightAndHash`.

## C3 — Tier C — docs imply a separate receipt-proof step that does not exist

**Observation:** the readability docs describe an off-chain worker that "generates proofs"
and the SDK example verifies a transaction, but it is not stated that the single proof
`txBytes` envelope decodes into **both** the transaction and its receipt via
`EvmV1Decoder.decodeReceiptFields`. We initially designed a redundant receipt-proof path
before discovering this (`DECISIONS.md` D2).

**Suggested fix:** a one-paragraph note in
`docs.attestcoin.org/…/dapp-design-patterns-readability` that `verify()` attests an envelope
carrying tx + receipt, and `decodeCommonTxFields` / `decodeReceiptFields` read both halves
out of the same proven bytes.

**Where:** Attestcoin docs. Product relevance: saved a contract and an off-chain component.

## C4 — Tier B (candidate) — reusable replay-key + source-identity helper

The `sourceTxKey = keccak256(abi.encodePacked(uint64 chainKey, uint64 height, uint32
txIndex))` pattern plus "beneficiary from bound executor, never `msg.sender`" is a safety
pattern every settlement integration needs. `SetldAttestcoinAdapter.deriveSourceTxKey` +
the `PredicateParity` / `SettlementParity` test vectors could be upstreamed as a small
`@gluwa/usc-settlement-helpers` package or an examples-repo pattern.

**Status:** offered; would need maintainer interest before extraction.
