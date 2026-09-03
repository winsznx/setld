/**
 * Deterministic policy guardrails (PRD 18.4A "AUTHORIZE").
 *
 * These checks — not the model — enforce the hard bounds. The model may only choose ACCEPT
 * or ABSTAIN among mandates that already pass every guardrail here, and it may only pick an
 * approved execution route. A model output of ACCEPT for a mandate that fails any guardrail
 * is overridden to ABSTAIN with reason POLICY_BLOCKED.
 */
export interface AgentPolicy {
  allowedTemplateIds: string[];
  allowedTargets: string[];
  maxExecutorBondWei: bigint;
  minRewardWei: bigint;
  maxSourceGasWei: bigint;
  /** minimum Sepolia blocks remaining before executionEndBlock at decision time */
  minDeadlineMarginBlocks: number;
  /** minimum (reward - worstCaseCost) margin to even consider */
  minNetMarginWei: bigint;
}

export interface MandateView {
  mandateId: string;
  templateId: string;
  target: string;
  rewardWei: bigint;
  executorBondWei: bigint;
  executionEndBlock: number;
  currentSourceBlock: number;
  estSourceGasWei: bigint;
  simulationOk: boolean;
  simulationReason: string;
}

export type GuardrailCode =
  | 'OK'
  | 'TEMPLATE_NOT_ALLOWED'
  | 'TARGET_NOT_ALLOWED'
  | 'BOND_TOO_HIGH'
  | 'REWARD_TOO_LOW'
  | 'GAS_TOO_HIGH'
  | 'DEADLINE_TOO_CLOSE'
  | 'NET_MARGIN_TOO_LOW'
  | 'SIMULATION_FAILED';

export interface GuardrailResult {
  code: GuardrailCode;
  pass: boolean;
  detail: string;
}

export function checkGuardrails(m: MandateView, p: AgentPolicy): GuardrailResult[] {
  const worstCaseCost = m.executorBondWei + m.estSourceGasWei;
  const net = m.rewardWei - worstCaseCost;
  const marginBlocks = m.executionEndBlock - m.currentSourceBlock;

  const checks: [GuardrailCode, boolean, string][] = [
    ['TEMPLATE_NOT_ALLOWED', p.allowedTemplateIds.includes(m.templateId.toLowerCase()), `template ${m.templateId}`],
    ['TARGET_NOT_ALLOWED', p.allowedTargets.map((t) => t.toLowerCase()).includes(m.target.toLowerCase()), `target ${m.target}`],
    ['BOND_TOO_HIGH', m.executorBondWei <= p.maxExecutorBondWei, `bond ${m.executorBondWei} > max ${p.maxExecutorBondWei}`],
    ['REWARD_TOO_LOW', m.rewardWei >= p.minRewardWei, `reward ${m.rewardWei} < min ${p.minRewardWei}`],
    ['GAS_TOO_HIGH', m.estSourceGasWei <= p.maxSourceGasWei, `est gas ${m.estSourceGasWei} > max ${p.maxSourceGasWei}`],
    ['DEADLINE_TOO_CLOSE', marginBlocks >= p.minDeadlineMarginBlocks, `${marginBlocks} blocks left, need ${p.minDeadlineMarginBlocks}`],
    ['NET_MARGIN_TOO_LOW', net >= p.minNetMarginWei, `net margin ${net} < min ${p.minNetMarginWei}`],
    ['SIMULATION_FAILED', m.simulationOk, m.simulationReason],
  ];

  return checks.map(([code, pass, detail]) => ({ code, pass, detail }));
}

export function guardrailsPass(results: GuardrailResult[]): boolean {
  return results.every((r) => r.pass);
}
