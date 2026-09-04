import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { existsSync } from 'node:fs';
const LOCAL = resolve(process.cwd(), 'data');
const ROOT = resolve(process.cwd(), '../..');
const read = (p: string) => {
  const local = resolve(LOCAL, p.replace(/^evidence\//, ''));
  const path = existsSync(local) ? local : resolve(ROOT, p);
  return JSON.parse(readFileSync(path, 'utf8'));
};

export interface Facts {
  productDescription: string;
  repository: string;
  networks: Record<string, { name: string; chainId: number; rpc?: string; attestcoinChainKey?: number }>;
  attestcoin: Record<string, string>;
  contracts: { creditcoin: Record<string, string>; sepolia: Record<string, string> };
  templateId: string;
  canonicalDemoTransactions: Record<string, Record<string, unknown>>;
  measuredHeadlineMetrics: Record<string, unknown>;
  limitations: string[];
  reproductionCommands: string[];
}

export function facts(): Facts {
  return read('evidence/submission-facts.json');
}

export interface CompletedMandate {
  label: string;
  mandateId: string;
  transactions: Record<string, string | null>;
  sourceExecution: { block: number; receiptStatus: number; note: string };
  attestcoinProof: Record<string, unknown>;
  verifiedExecution: Record<string, unknown>;
  referenceModelPrediction: string;
  onChainSettlement: { code: string; failedStep: number; terminalState: string; sourceTxKey: string } | null;
  finalState: string;
  match: string;
}

export function completed(label: string): CompletedMandate {
  return read(`evidence/completed-mandates/${label}.json`);
}

export function ablation() {
  return read('evidence/campaigns/ablations/reporter-compromise.json');
}

export function agentLog() {
  try {
    return read('evidence/agent/decision-log.json');
  } catch {
    return null;
  }
}

export const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io';
export const CC3_EXPLORER = 'https://dashboard.cc3-testnet.creditcoin.network';

export function short(hex: string, head = 6, tail = 4): string {
  if (!hex || hex.length < head + tail + 2) return hex;
  return `${hex.slice(0, 2 + head)}…${hex.slice(-tail)}`;
}

export function tSetld(wei: string | bigint): string {
  const n = BigInt(wei);
  const whole = n / 10n ** 18n;
  const frac = (n % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '').slice(0, 4);
  return frac ? `${whole}.${frac} tSETLD` : `${whole}.00 tSETLD`;
}
