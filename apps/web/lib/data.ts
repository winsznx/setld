import factsJson from '../data/submission-facts.json';
import correct from '../data/completed-mandates/canonical-correct.json';
import wrongCap from '../data/completed-mandates/canonical-wrong-cap.json';
import ablationJson from '../data/campaigns/ablations/reporter-compromise.json';
import agentJson from '../data/agent/decision-log.json';

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
  return factsJson as unknown as Facts;
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

const MANDATES: Record<string, CompletedMandate> = {
  'canonical-correct': correct as unknown as CompletedMandate,
  'canonical-wrong-cap': wrongCap as unknown as CompletedMandate,
};
export function completed(label: string): CompletedMandate {
  return MANDATES[label]!;
}
export interface Ablation {
  honestParity: { disagreements: number; verdict: string };
  reporterCompromise: {
    invalid_reward_leakage_count_B0: number;
    invalid_reward_leakage_value_B0_wei: string;
    invalid_reward_leakage_count_T0_setld: number;
    verdict: string;
  };
  results: unknown[];
}
export function ablation(): Ablation {
  return ablationJson as unknown as Ablation;
}
export function agentLog() {
  return agentJson as unknown as { outcomes: { decision: string; mandateId: string; rationale: string }[]; log: { step: string; data: { model?: string } }[] } | null;
}

export const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io';
export const CC3_EXPLORER = 'https://dashboard.cc3-testnet.creditcoin.network';

export function short(hex: string, head = 6, tail = 4): string {
  if (!hex || hex.length < head + tail + 2) return hex;
  return `${hex.slice(0, 2 + head)}…${hex.slice(-tail)}`;
}
