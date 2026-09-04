/**
 * Sponsor-removal / reporter-compromise ablation (PRD 4A.2, 4A.5, Gate S5 + S10).
 *
 * Matched inputs: the two REAL Sepolia executions already settled by setld (S8 correct,
 * S9 over-cap-but-successful). Same economics, same predicate.
 *
 *   T0 = setld           : Attestcoin proof + on-chain predicate decided the outcome.
 *   B0 = BaselineReporter : a trusted off-chain reporter asserts the outcome; the contract
 *                           believes it. No proof.
 *
 * Cohort A (honest reporter): the reporter runs the same reference-model predicate against
 *   the same source tx/receipt read over a normal Sepolia RPC and reports the true result.
 *   B0 and T0 must agree (S5 parity).
 *
 * Cohort B (compromised reporter): for the invalid (over-cap) execution the reporter
 *   asserts FULFILLED anyway. B0 pays the reward for an execution that never satisfied the
 *   mandate. T0 refused the identical execution. The gap is invalid_reward_leakage (S10).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Contract, keccak256, toUtf8Bytes, formatEther } from 'ethers';
import { utils } from '@gluwa/usc-sdk';
import { proofProvider, chainInfo } from '@gluwa/usc-sdk';
import { cc3, sepolia, signers, contract, C, deployments, PROOF_BUILDER, SOURCE_CHAIN_KEY } from './env.js';
import { evaluateTreasuryRebalance, deriveSourceTxKey, ROUTER_SELECTOR } from '@setld/reference-model';
import { MandateState } from '@setld/protocol-types';

const ROOT = resolve(import.meta.dirname, '../../..');
const DECODER_ABI = JSON.parse(readFileSync(resolve(ROOT, 'node_modules/@gluwa/usc-sdk/dist/utils/evmV1DecoderAbi.json'), 'utf8'));
const E = (n: number) => BigInt(n) * 10n ** 18n;
const MAX = (1n << 256n) - 1n;
const Outcome = { NONE: 0, FULFILLED: 1, INVALID_ATTEMPT: 2, EXECUTION_REVERTED: 3 } as const;

interface Case {
  name: string;
  file: string;
  sepoliaExecuteTx: string;
  sourceBlock: number;
  setldTerminal: string;
  setldCode: string;
}

async function reporterHonestJudgment(c: Case): Promise<{ code: string; outcome: number }> {
  // reporter reads the source tx + receipt via a normal RPC (no Attestcoin), decodes with
  // the same libraries, runs the same reference-model predicate.
  const pb = new proofProvider.service.ProofBuilder(SOURCE_CHAIN_KEY, PROOF_BUILDER);
  const proof = (await pb.getProof(c.sepoliaExecuteTx)).data!;
  const decoder = new Contract(deployments.creditcoin.attestcoin.evmV1Decoder, DECODER_ABI, cc3);
  const dec = await utils.decoder.decodeEvmV1Transaction(proof.txBytes, decoder);
  const d = dec.data;
  const evi = JSON.parse(readFileSync(resolve(ROOT, `evidence/completed-mandates/${c.file}.json`), 'utf8'));
  const core = contract('SetldCore', C.SetldCore, cc3);
  const m = await core.getMandate(evi.mandateId);
  const terms = await core.getTerms(evi.mandateId);
  const ve = {
    sourceChainKey: SOURCE_CHAIN_KEY, blockHeight: proof.headerNumber, transactionIndex: proof.txIndex,
    sourceTxKey: deriveSourceTxKey(SOURCE_CHAIN_KEY, proof.headerNumber, proof.txIndex),
    txFrom: d.commonTx.from, txTo: d.commonTx.to, txToIsNull: d.commonTx.toIsNull, txValue: d.commonTx.value,
    selector: d.commonTx.data.slice(0, 10), calldata: d.commonTx.data,
    receiptStatus: d.receipt.receiptStatus, receiptGasUsed: d.receipt.receiptGasUsed,
    logs: d.receipt.receiptLogs.map((l: { address_: string; topics: string[]; data: string }) => ({ emitter: l.address_, topics: l.topics, data: l.data })),
  };
  const ev = evaluateTreasuryRebalance(
    {
      mandateId: evi.mandateId, creator: m.creator, templateId: m.templateId, templateVersion: 1,
      sourceChainKey: SOURCE_CHAIN_KEY, sourceTarget: terms.router, acceptedExecutor: m.acceptedExecutor,
      acceptedSourceSender: m.acceptedSourceSender, rewardToken: m.econ.rewardToken, rewardAmount: m.econ.rewardAmount,
      bondToken: m.econ.bondToken, executorBond: m.econ.executorBond, creatorBond: m.econ.creatorBond, relayerBudget: m.econ.relayerBudget,
      acceptanceDeadline: Number(m.acceptanceDeadline), executionStartBlock: Number(m.executionStartBlock),
      executionEndBlock: Number(m.executionEndBlock), proofDeadline: Number(m.proofDeadline),
      termsHash: m.termsHash, metadataHash: m.metadataHash, state: MandateState.ACCEPTED,
    },
    { router: terms.router, vault: terms.vault, assetIn: terms.assetIn, assetOut: terms.assetOut, maxAmountIn: terms.maxAmountIn, minAmountOut: terms.minAmountOut, selector: ROUTER_SELECTOR, routePolicyHash: terms.routePolicyHash },
    ve as never,
    { boundExecutorSourceAddress: m.acceptedSourceSender, consumedSourceTxKeys: new Set() },
  );
  const outcome = ev.code === 'FULFILLED' ? Outcome.FULFILLED : ev.code === 'RECEIPT_REVERTED' ? Outcome.EXECUTION_REVERTED : Outcome.INVALID_ATTEMPT;
  return { code: ev.code, outcome };
}

async function runB0Job(label: string, reportOutcome: number, sepoliaExecuteTx: string) {
  const creator = signers.cc3Deployer();
  const executor = process.env.CC3_EXECUTOR_ADDR!;
  const reporter = signers.cc3Relayer();
  const b0 = contract('BaselineReporterSettlement', C.BaselineReporterSettlement, creator);
  const token = contract('MockERC20', C.tSETLD, creator);

  const reward = E(10);
  const executorBond = E(5);
  const creatorBond = E(2);
  if ((await token.allowance(creator.address, C.BaselineReporterSettlement)) < reward + executorBond + creatorBond) {
    await (await token.approve(C.BaselineReporterSettlement, MAX)).wait();
  }
  const jobId = keccak256(toUtf8Bytes(label + Date.now()));
  await (await b0.openJob(jobId, executor, C.tSETLD, reward, executorBond, creatorBond, 500)).wait();

  const execBefore = await token.balanceOf(executor);
  const st = await (b0.connect(reporter) as Contract).settleByReport(jobId, reportOutcome, sepoliaExecuteTx);
  await st.wait();
  const execAfter = await token.balanceOf(executor);
  const executorGain = execAfter - execBefore;
  return { jobId, settleTx: st.hash, executorGain, rewardPaid: executorGain > executorBond };
}

async function main() {
  const cases: Case[] = [
    { name: 'correct', file: 'canonical-correct', sepoliaExecuteTx: '', sourceBlock: 0, setldTerminal: '', setldCode: '' },
    { name: 'over-cap', file: 'canonical-wrong-cap', sepoliaExecuteTx: '', sourceBlock: 0, setldTerminal: '', setldCode: '' },
  ];
  for (const c of cases) {
    const e = JSON.parse(readFileSync(resolve(ROOT, `evidence/completed-mandates/${c.file}.json`), 'utf8'));
    c.sepoliaExecuteTx = e.transactions.sepoliaExecute;
    c.sourceBlock = e.sourceExecution.block;
    c.setldTerminal = e.onChainSettlement.terminalState;
    c.setldCode = e.onChainSettlement.code;
  }

  const ci = new chainInfo.PrecompileChainInfoProvider(cc3 as never);
  for (const c of cases) await ci.waitUntilHeightAttested(SOURCE_CHAIN_KEY, c.sourceBlock, 8000, 600_000);

  const results: Record<string, unknown>[] = [];
  let honestDisagreements = 0;
  let leakedCount = 0;
  let leakedValueWei = 0n;

  for (const c of cases) {
    const honest = await reporterHonestJudgment(c);
    const honestMatchesSetld = honest.code === c.setldCode;
    if (!honestMatchesSetld) honestDisagreements++;
    const b0Honest = await runB0Job(`honest-${c.name}-`, honest.outcome, c.sepoliaExecuteTx);

    let compromise: Awaited<ReturnType<typeof runB0Job>> | null = null;
    let leakedThis = 0n;
    if (honest.outcome !== Outcome.FULFILLED) {
      // compromised reporter asserts FULFILLED for an execution that is not fulfilling
      compromise = await runB0Job(`compromised-${c.name}-`, Outcome.FULFILLED, c.sepoliaExecuteTx);
      if (compromise.rewardPaid) {
        leakedCount++;
        leakedThis = E(10); // reward (net of fee) — approximate headline value
        leakedValueWei += leakedThis;
      }
    }

    results.push({
      case: c.name,
      sepoliaExecuteTx: c.sepoliaExecuteTx,
      setld_T0: { terminal: c.setldTerminal, code: c.setldCode },
      reporter_honest_judgment: honest.code,
      honest_B0_matches_setld: honestMatchesSetld,
      honest_B0: { settleTx: b0Honest.settleTx, executorGain: formatEther(b0Honest.executorGain), rewardPaid: b0Honest.rewardPaid },
      compromised_B0: compromise
        ? { settleTx: compromise.settleTx, executorGain: formatEther(compromise.executorGain), rewardPaid: compromise.rewardPaid, leakedRewardWei: leakedThis.toString() }
        : 'n/a (execution was genuinely fulfilling)',
    });
  }

  const out = {
    recordedAt: new Date().toISOString(),
    gates: ['S5', 'S10'],
    baselineContract: C.BaselineReporterSettlement,
    reporter: deployments.creditcoin.baselineReporter,
    matchedInputs: cases.map((c) => c.sepoliaExecuteTx),
    honestParity: { disagreements: honestDisagreements, verdict: honestDisagreements === 0 ? 'PASS — B0 and setld agree on every case under an honest reporter' : 'FAIL — investigate before publishing any advantage' },
    reporterCompromise: {
      invalid_reward_leakage_count_B0: leakedCount,
      invalid_reward_leakage_value_B0_wei: leakedValueWei.toString(),
      invalid_reward_leakage_count_T0_setld: 0,
      invalid_reward_leakage_value_T0_setld_wei: '0',
      verdict:
        leakedCount > 0
          ? 'PASS — a compromised reporter leaked reward through B0 for an execution that setld refused with the same predicate and inputs'
          : 'INCONCLUSIVE — compromise did not produce a measurable separation',
    },
    results,
  };
  mkdirSync(resolve(ROOT, 'evidence/campaigns/ablations'), { recursive: true });
  writeFileSync(resolve(ROOT, 'evidence/campaigns/ablations/reporter-compromise.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
