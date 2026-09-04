/**
 * Gate S13 — production-path evidence extracted from completed lifecycles.
 * Latency (source execution → attestation → proof → settlement) and on-chain gas for the
 * verify + decode + predicate + settle transaction.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { cc3, sepolia, deployments } from './env.js';

const ROOT = resolve(import.meta.dirname, '../../..');

async function main() {
  const dir = resolve(ROOT, 'evidence/completed-mandates');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const rows = [];

  for (const f of files) {
    const e = JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
    if (!e.transactions?.settle) continue;
    const settleRc = await cc3.getTransactionReceipt(e.transactions.settle);
    const settleBlk = await cc3.getBlock(settleRc!.blockNumber);
    const srcRc = await sepolia.getTransactionReceipt(e.transactions.sepoliaExecute);
    const srcBlk = await sepolia.getBlock(srcRc!.blockNumber);

    rows.push({
      label: e.label,
      settleGasUsed: Number(settleRc!.gasUsed),
      settleTx: e.transactions.settle,
      sourceBlockTime: srcBlk!.timestamp,
      settlementBlockTime: settleBlk!.timestamp,
      sourceToSettlementSeconds: settleBlk!.timestamp - srcBlk!.timestamp,
      proofGeneratedAt: e.attestcoinProof?.generatedAt ?? null,
      terminal: e.finalState,
    });
  }

  const gas = rows.map((r) => r.settleGasUsed).sort((a, b) => a - b);
  const lat = rows.map((r) => r.sourceToSettlementSeconds).sort((a, b) => a - b);
  const p = (arr: number[], q: number) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(q * arr.length))]! : null);

  const out = {
    recordedAt: new Date().toISOString(),
    gate: 'S13',
    n: rows.length,
    settleGasUsed: { p50: p(gas, 0.5), p95: p(gas, 0.95), min: gas[0] ?? null, max: gas[gas.length - 1] ?? null },
    sourceToSettlementSeconds: { p50: p(lat, 0.5), p95: p(lat, 0.95), min: lat[0] ?? null, max: lat[lat.length - 1] ?? null },
    note: 'settle gas = verify() precompile + EvmV1Decoder decode + 17-step predicate + vault transfers, in one Creditcoin transaction. Latency dominated by CC3<->Sepolia attestation throughput during the build (~5 blocks/min).',
    rows,
    contracts: deployments.creditcoin.contracts,
  };
  mkdirSync(resolve(ROOT, 'evidence/campaigns'), { recursive: true });
  writeFileSync(resolve(ROOT, 'evidence/campaigns/production-path.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
