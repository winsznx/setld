/**
 * Gate S13 final recompute — merges evidence/completed-mandates (S8/S9 canonical) and
 * evidence/campaigns/public-attestcoin/results.json (the wide campaign) into one p50/p95,
 * each statistic labelled with its exact n. Run once after the campaign reaches its
 * practical stopping point — this does not run mid-campaign to avoid a moving-target metric.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const p = (arr: number[], q: number) => {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

interface Row {
  source: 'canonical' | 'wide-campaign';
  label: string;
  match: string;
  settleGasUsed: number | null;
  sourceToSettlementSeconds: number | null;
}

function fromCompletedMandates(): Row[] {
  const dir = resolve(ROOT, 'evidence/completed-mandates');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const e = JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
      return { source: 'canonical' as const, label: e.label, match: e.match, settleGasUsed: null, sourceToSettlementSeconds: null };
    });
}

function fromCampaign(): Row[] {
  const f = resolve(ROOT, 'evidence/campaigns/public-attestcoin/results.json');
  if (!existsSync(f)) return [];
  const rows = JSON.parse(readFileSync(f, 'utf8')) as {
    label: string;
    match: string;
    settleGasUsed: number | null;
    sourceToSettlementSeconds: number | null;
  }[];
  return rows
    .filter((r) => r.match !== 'ERROR')
    .map((r) => ({ source: 'wide-campaign' as const, label: r.label, match: r.match, settleGasUsed: r.settleGasUsed, sourceToSettlementSeconds: r.sourceToSettlementSeconds }));
}

function main() {
  // canonical S8/S9 gas/latency come from measure.ts's production-path.json (already computed
  // against live receipts); merge those numeric samples with the campaign's.
  const canonicalNumeric: { settleGasUsed: number; sourceToSettlementSeconds: number }[] = existsSync(
    resolve(ROOT, 'evidence/campaigns/production-path.json'),
  )
    ? (JSON.parse(readFileSync(resolve(ROOT, 'evidence/campaigns/production-path.json'), 'utf8')).rows ?? [])
    : [];

  const campaign = fromCampaign();
  const allRows = [...fromCompletedMandates(), ...campaign];

  const gas = [...canonicalNumeric.map((r) => r.settleGasUsed), ...campaign.map((r) => r.settleGasUsed).filter((x): x is number => x != null)];
  const lat = [...canonicalNumeric.map((r) => r.sourceToSettlementSeconds), ...campaign.map((r) => r.sourceToSettlementSeconds).filter((x): x is number => x != null)];

  const publicAttestcoinBackedSettlements = allRows.filter((r) => r.match === 'PASS').length;

  const out = {
    recordedAt: new Date().toISOString(),
    gate: 'S13 (final) + S11 sample size',
    publicAttestcoinBackedSettlements_n: publicAttestcoinBackedSettlements,
    settleGasUsed: { n: gas.length, p50: p(gas, 0.5), p95: p(gas, 0.95) },
    sourceToSettlementSeconds: { n: lat.length, p50: p(lat, 0.5), p95: p(lat, 0.95) },
    rows: allRows,
    note: 'n is reported beside every statistic. This is a final recompute over the actual sample at campaign stop, not a moving target run mid-campaign.',
  };
  writeFileSync(resolve(ROOT, 'evidence/campaigns/production-path-final.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}

main();
