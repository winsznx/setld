/**
 * The autonomous agent loop (PRD 18.4A):
 *   OBSERVE -> ANALYZE -> DECIDE -> AUTHORIZE -> EXECUTE -> RECONCILE -> FEEDBACK
 *
 * The model (decider.ts) only makes the ACCEPT/ABSTAIN call and picks an approved route.
 * Everything that moves value or asserts truth is deterministic: guardrails gate the
 * decision, the isolated signer submits the transaction, and Attestcoin + the setld
 * predicate — never the agent — decide whether the work was correct and paid.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Contract, formatEther, keccak256, toUtf8Bytes } from 'ethers';
import { cc3, sepolia, signers, contract, C, S, deployments } from '@setld/orchestrator/env';
import { checkGuardrails, guardrailsPass, type AgentPolicy, type MandateView } from './policy.js';
import { decide, type DecisionInput } from './decider.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const APPROVED_ROUTE = 'direct-vault-rebalance';

const STATE_NAMES = ['NONE', 'OPEN', 'ACCEPTED', 'CANCELLED', 'RELEASED', 'FULFILLED', 'INVALID_ATTEMPT', 'EXECUTION_REVERTED', 'TIMED_OUT'];

const policy: AgentPolicy = {
  allowedTemplateIds: [deployments.creditcoin.templateId.toLowerCase()],
  allowedTargets: [S.DemoTreasuryVault.toLowerCase(), S.SetldExecutionRouter.toLowerCase()],
  maxExecutorBondWei: 10n * 10n ** 18n,
  minRewardWei: 1n * 10n ** 18n,
  maxSourceGasWei: 5n * 10n ** 16n,
  minDeadlineMarginBlocks: 20,
  minNetMarginWei: 5n * 10n ** 15n, // 0.005 tSETLD
};

interface DecisionRecord {
  step: 'OBSERVE' | 'ANALYZE' | 'DECIDE' | 'AUTHORIZE' | 'EXECUTE' | 'RECONCILE' | 'FEEDBACK';
  mandateId: string;
  at: string;
  data: unknown;
}

export async function runLoop(): Promise<void> {
  const executor = signers.cc3Executor();
  const sepExec = signers.sepoliaExecutor();
  const core = contract('SetldCore', C.SetldCore, executor);
  const router = contract('SetldExecutionRouter', S.SetldExecutionRouter, sepExec);
  const log: DecisionRecord[] = [];
  const rec = (step: DecisionRecord['step'], mandateId: string, data: unknown) => {
    const entry = { step, mandateId, at: new Date().toISOString(), data };
    log.push(entry);
    console.log(`[${step}] ${mandateId.slice(0, 10)}  ${JSON.stringify(data).slice(0, 160)}`);
  };

  // OBSERVE: open mandates from chain events
  const head = await cc3.getBlockNumber();
  const created = await core.queryFilter(core.filters.MandateCreated(), Math.max(0, head - 20_000), head);
  const sepHead = await sepolia.getBlockNumber();
  rec('OBSERVE', '-', { openCandidates: created.length, cc3Head: head, sepoliaHead: sepHead });

  const outcomes: { mandateId: string; decision: string; rationale: string; finalState?: string }[] = [];

  for (const ev of created) {
    const mandateId: string = (ev as { args: string[] }).args[0]!;
    const m = await core.getMandate(mandateId).catch(() => null);
    if (!m || STATE_NAMES[Number(m.state)] !== 'OPEN') continue;
    const terms = await core.getTerms(mandateId);

    // ANALYZE
    let simOk = true;
    let simReason = 'ok';
    let estGas = 3n * 10n ** 14n;
    try {
      const g = await router.execute.estimateGas(
        mandateId,
        S.DemoTreasuryVault,
        S.assetIn,
        S.assetOut,
        terms.maxAmountIn / 2n,
        terms.minAmountOut,
        { from: sepExec.address },
      );
      const fee = (await sepolia.getFeeData()).maxFeePerGas ?? 2_000_000_000n;
      estGas = g * fee;
    } catch (e) {
      simOk = false;
      simReason = (e as Error).message.slice(0, 120);
    }

    const view: MandateView = {
      mandateId,
      templateId: m.templateId,
      target: terms.router,
      rewardWei: m.econ.rewardAmount,
      executorBondWei: m.econ.executorBond,
      executionEndBlock: Number(m.executionEndBlock),
      currentSourceBlock: sepHead,
      estSourceGasWei: estGas,
      simulationOk: simOk,
      simulationReason: simReason,
    };
    const guardrails = checkGuardrails(view, policy);
    const worstCost = view.executorBondWei + view.estSourceGasWei;
    rec('ANALYZE', mandateId, {
      reward: formatEther(view.rewardWei),
      bond: formatEther(view.executorBondWei),
      estGas: formatEther(view.estSourceGasWei),
      netMargin: formatEther(view.rewardWei - worstCost),
      deadlineMarginBlocks: view.executionEndBlock - sepHead,
      guardrails: guardrails.map((g) => `${g.code}:${g.pass ? 'pass' : 'FAIL'}`),
    });

    if (!guardrailsPass(guardrails)) {
      const failed = guardrails.filter((g) => !g.pass).map((g) => g.code);
      rec('DECIDE', mandateId, { decision: 'ABSTAIN', by: 'guardrail', failed });
      outcomes.push({ mandateId, decision: 'ABSTAIN', rationale: `guardrail: ${failed.join(', ')}` });
      continue;
    }

    // DECIDE (model)
    const input: DecisionInput = {
      mandateId,
      rewardWei: view.rewardWei.toString(),
      executorBondWei: view.executorBondWei.toString(),
      estSourceGasWei: view.estSourceGasWei.toString(),
      netMarginWei: (view.rewardWei - worstCost).toString(),
      deadlineMarginBlocks: view.executionEndBlock - sepHead,
      approvedRoutes: [APPROVED_ROUTE],
      simulation: { ok: simOk, reason: simReason },
      guardrails: guardrails.map((g) => ({ code: g.code, pass: g.pass, detail: g.detail })),
    };
    const decision = await decide(input);
    rec('DECIDE', mandateId, { decision: decision.decision, route: decision.route, rationale: decision.rationale, model: decision.model });

    if (decision.decision === 'ABSTAIN') {
      outcomes.push({ mandateId, decision: 'ABSTAIN', rationale: decision.rationale });
      continue;
    }

    // AUTHORIZE: deterministic re-check right before acting
    const reGuard = checkGuardrails({ ...view, currentSourceBlock: await sepolia.getBlockNumber() }, policy);
    if (!guardrailsPass(reGuard)) {
      rec('AUTHORIZE', mandateId, { blocked: reGuard.filter((g) => !g.pass).map((g) => g.code) });
      outcomes.push({ mandateId, decision: 'ABSTAIN', rationale: 'POLICY_BLOCKED at authorize' });
      continue;
    }
    rec('AUTHORIZE', mandateId, { route: APPROVED_ROUTE, bondAtRisk: formatEther(view.executorBondWei) });

    // EXECUTE
    const token = contract('MockERC20', C.tSETLD, executor);
    if ((await token.allowance(executor.address, C.SetldVault)) < view.executorBondWei) {
      await (await token.approve(C.SetldVault, (1n << 256n) - 1n)).wait();
    }
    const acc = await core.acceptMandate(mandateId);
    await acc.wait();
    const amountIn = terms.maxAmountIn / 2n;
    const exec = await router.execute(mandateId, S.DemoTreasuryVault, S.assetIn, S.assetOut, amountIn, terms.minAmountOut);
    const execRc = await exec.wait();
    rec('EXECUTE', mandateId, { acceptTx: acc.hash, sepoliaExecuteTx: exec.hash, sourceBlock: execRc!.blockNumber, receiptStatus: execRc!.status });

    // RECONCILE (deferred to the relayer + a later settlement check)
    rec('RECONCILE', mandateId, { note: 'source tx broadcast; Attestcoin proof + setld settlement decide the outcome, not the agent', sepoliaExecuteTx: exec.hash });
    outcomes.push({ mandateId, decision: 'ACCEPT', rationale: decision.rationale, finalState: 'awaiting-settlement' });
  }

  // FEEDBACK
  rec('FEEDBACK', '-', { decisions: outcomes });

  mkdirSync(resolve(ROOT, 'evidence/agent'), { recursive: true });
  const out = {
    recordedAt: new Date().toISOString(),
    policy: JSON.parse(JSON.stringify(policy, (_, v) => (typeof v === 'bigint' ? v.toString() : v))),
    approvedRoutes: [APPROVED_ROUTE],
    guardrailAuthority: 'deterministic — the model cannot bypass, mark success, or choose payout',
    log,
    outcomes,
  };
  writeFileSync(resolve(ROOT, 'evidence/agent/decision-log.json'), JSON.stringify(out, null, 2) + '\n');
  const accepts = outcomes.filter((o) => o.decision === 'ACCEPT').length;
  const abstains = outcomes.filter((o) => o.decision === 'ABSTAIN').length;
  console.log(`\n${accepts} ACCEPT, ${abstains} ABSTAIN -> evidence/agent/decision-log.json`);
  void readFileSync;
  void keccak256;
  void toUtf8Bytes;
}
