# C3 — docs do not state that the proof envelope carries the receipt

**Type:** docs note (`docs.attestcoin.org/.../dapp-design-patterns-readability`)
**Status:** text drafted; not filed pending go-ahead

## Observation

The readability docs describe generating a proof and verifying a *transaction*. It is not
stated that the proof-builder `txBytes` is an ABI-encoded `(uint8 txType, bytes[])` envelope
that `EvmV1Decoder` decodes into **both** the transaction fields
(`decodeCommonTxFields`) **and** the receipt fields (`decodeReceiptFields` — status, gasUsed,
logs, logsBloom). We initially designed a redundant receipt-proof component before
discovering this from the ABI (`DECISIONS.md` D2), which cost a contract and an off-chain
worker.

## Suggested addition

> The proof returned by `getProof` attests a single envelope containing the source
> transaction **and its receipt**. On Creditcoin, `EvmV1Decoder.decodeCommonTxFields(txBytes)`
> reads the transaction (sender, target, calldata, value) and
> `EvmV1Decoder.decodeReceiptFields(txBytes)` reads the receipt (status, gas used, logs).
> There is no separate receipt proof.
