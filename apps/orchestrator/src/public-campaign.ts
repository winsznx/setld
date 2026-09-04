/**
 * Gate S11 wide half — a batch of independent, real Attestcoin-backed lifecycles across
 * outcome classes. Each is a distinct Sepolia execution + distinct proof + distinct
 * settlement. Appends to evidence/campaigns/public-attestcoin/results.json and re-derives
 * evidence/campaigns/public-attestcoin/summary.json (latency + gas p50/p95, per-class counts).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { run, type LifecycleParams } from './lifecycle.js';
import { cc3, sepolia } from './env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const OUT = resolve(ROOT, 'evidence/campaigns/public-attestcoin');
const E = (n: number) => BigInt(n) * 10n ** 18n;

const COMMON = {
  rewardAmount: E(4),
  executorBond: E(2),
  creatorBond: E(1),
  relayerBudget: E(1),
  maxAmountIn: E(10_000),
  minAmountOut: E(9_000),
  execMinOut: E(9_000),
};

/** classes cycled through; keep proportions honest, label each run */
function plan(count: number): LifecycleParams[] {
  const out: LifecycleParams[] = [];
  for (let i = 0; i < count; i++) {
    const stamp = Date.now() + i;
    if (i % 3 === 0) {
      out.push({ ...COMMON, label: `wide-valid-${stamp}`, execAmountIn: E(5_000), expectTerminal: 'FULFILLED' });
    } else if (i % 3 === 1) {
      out.push({ ...COMMON, label: `wide-over-cap-${stamp}`, execAmountIn: E(25_000), expectTerminal: 'INVALID_ATTEMPT' });
    } else {
      // wrong minimum-output floor: committed minOut below the terms floor
      out.push({ ...COMMON, label: `wide-low-minout-${stamp}`, execAmountIn: E(5_000), execMinOut: E(1), expectTerminal: 'INVALID_ATTEMPT' });
    }
  }
  return out;
}

async function refreshSummary() {
  const results: Record<string, unknown>[] = existsSync(resolve(OUT, 'results.json'))
    ? JSON.parse(readFileSync(resolve(OUT, 'results.json'), 'utf8'))
    : [];
  const gas: number[] = [];
  const lat: number[] = [];
  const classes: Record<string, { count: number; match: number }> = {};
  for (const r of results as { label: string; match: string; settleTx?: string; settleGasUsed?: number; sourceToSettlementSeconds?: number }[]) {
    const klass = r.label.replace(/-\d+$/, '');
    classes[klass] ??= { count: 0, match: 0 };
    classes[klass].count++;
    if (r.match === 'PASS') classes[klass].match++;
    if (r.settleGasUsed) gas.push(r.settleGasUsed);
    if (r.sourceToSettlementSeconds) lat.push(r.sourceToSettlementSeconds);
  }
  gas.sort((a, b) => a - b);
  lat.sort((a, b) => a - b);
  const p = (arr: number[], q: number) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(q * arr.length))]! : null);
  const summary = {
    updatedAt: new Date().toISOString(),
    gate: 'S11 (wide half) + S13',
    totalRealLifecycles: results.length,
    perClass: classes,
    settleGasUsed: { n: gas.length, p50: p(gas, 0.5), p95: p(gas, 0.95) },
    sourceToSettlementSeconds: { n: lat.length, p50: p(lat, 0.5), p95: p(lat, 0.95) },
    note: 'Every row is an independent Sepolia transaction with its own Attestcoin proof and Creditcoin settlement. The 100-case deterministic campaign (evidence/campaigns/deterministic-100) is separate and is NOT counted as public-testnet breadth.',
  };
  writeFileSync(resolve(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const count = Number(process.argv[2] ?? 6);
  const results: Record<string, unknown>[] = existsSync(resolve(OUT, 'results.json'))
    ? JSON.parse(readFileSync(resolve(OUT, 'results.json'), 'utf8'))
    : [];

  for (const p of plan(count)) {
    try {
      const e = await run(p);
      const settleRc = e.transactions.settle ? await cc3.getTransactionReceipt(e.transactions.settle) : null;
      const srcRc = await sepolia.getTransactionReceipt(e.transactions.sepoliaExecute!);
      const srcBlk = srcRc ? await sepolia.getBlock(srcRc.blockNumber) : null;
      const setBlk = settleRc ? await cc3.getBlock(settleRc.blockNumber) : null;
      results.push({
        label: p.label,
        mandateId: e.mandateId,
        match: e.match,
        terminal: e.finalState,
        code: e.onChainSettlement?.code ?? null,
        sepoliaExecute: e.transactions.sepoliaExecute,
        settleTx: e.transactions.settle,
        settleGasUsed: settleRc ? Number(settleRc.gasUsed) : null,
        sourceToSettlementSeconds: srcBlk && setBlk ? setBlk.timestamp - srcBlk.timestamp : null,
        attestcoinProofHeader: e.attestcoinProof?.headerNumber ?? null,
        recordedAt: new Date().toISOString(),
      });
      writeFileSync(resolve(OUT, 'results.json'), JSON.stringify(results, null, 2) + '\n');
      await refreshSummary();
    } catch (err) {
      console.error(`  ${p.label} FAILED: ${(err as Error).message}`);
      results.push({ label: p.label, match: 'ERROR', error: (err as Error).message, recordedAt: new Date().toISOString() });
      writeFileSync(resolve(OUT, 'results.json'), JSON.stringify(results, null, 2) + '\n');
    }
  }
  await refreshSummary();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
