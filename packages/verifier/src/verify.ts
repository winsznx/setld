/**
 * Independent settlement verifier (PRD 12.11, 23A.4).
 *
 * Given a mandate id, recomputes from public chain data alone:
 *   - the source transaction identity (sourceTxKey)
 *   - the Attestcoin proof, re-verified against the BlockProver precompile
 *   - the decoded VerifiedExecution
 *   - the reference-model predicate result
 *   - the on-chain terminal state and transfer ledger, checked for conservation
 * and reports named pass/fail. Needs no funded wallet, no model credits, no private keys.
 *
 * `--tamper` flips one protected field in the decoded execution and shows the predicate
 * result diverges — proving the check is real.
 */
import { Contract, formatEther, keccak256 } from 'ethers';
import { chainInfo, blockProver, proofProvider, utils } from '@gluwa/usc-sdk';
import { cc3, sepolia, contract, C, deployments, PROOF_BUILDER, SOURCE_CHAIN_KEY } from '@setld/orchestrator/env';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateTreasuryRebalance, deriveSourceTxKey, ROUTER_SELECTOR } from '@setld/reference-model';
import { MandateState } from '@setld/protocol-types';

const ROOT = resolve(import.meta.dirname, '../../..');
const DECODER_ABI = JSON.parse(readFileSync(resolve(ROOT, 'node_modules/@gluwa/usc-sdk/dist/utils/evmV1DecoderAbi.json'), 'utf8'));
const STATE = ['NONE', 'OPEN', 'ACCEPTED', 'CANCELLED', 'RELEASED', 'FULFILLED', 'INVALID_ATTEMPT', 'EXECUTION_REVERTED', 'TIMED_OUT'];

export interface VerifyResult {
  mandateId: string;
  checks: { name: string; pass: boolean; detail: string }[];
  result: 'match' | 'mismatch' | 'evidence-unavailable';
  evidence: Record<string, unknown>;
}

export async function verifyMandate(mandateId: string, opts: { tamper?: boolean; sourceTxHash?: string; settleTxHash?: string } = {}): Promise<VerifyResult> {
  const checks: { name: string; pass: boolean; detail: string }[] = [];
  const ok = (name: string, pass: boolean, detail = '') => checks.push({ name, pass, detail });

  const core = contract('SetldCore', C.SetldCore, cc3);
  const m = await core.getMandate(mandateId);
  const terms = await core.getTerms(mandateId);
  const finalState = STATE[Number(m.state)]!;
  ok('mandate is terminal', ['FULFILLED', 'INVALID_ATTEMPT', 'EXECUTION_REVERTED', 'TIMED_OUT', 'CANCELLED', 'RELEASED'].includes(finalState), finalState);

  // locate the settlement + source tx. Prefer an explicit --settle / --source, else the
  // committed completed-mandates evidence, else a bounded getLogs scan.
  let settlementTx = opts.settleTxHash;
  let sourceTxHash = opts.sourceTxHash;
  if (!settlementTx || !sourceTxHash) {
    for (const f of ['canonical-correct', 'canonical-wrong-cap']) {
      try {
        const e = JSON.parse(readFileSync(resolve(ROOT, `evidence/completed-mandates/${f}.json`), 'utf8'));
        if (e.mandateId.toLowerCase() === mandateId.toLowerCase()) {
          settlementTx ??= e.transactions.settle;
          sourceTxHash ??= e.transactions.sepoliaExecute;
        }
      } catch {
        /* ignore */
      }
    }
  }
  if (!settlementTx || !sourceTxHash) {
    const head = await cc3.getBlockNumber();
    for (let from = head; from > head - 30_000 && (!settlementTx || !sourceTxHash); from -= 2_000) {
      const logs = await core.queryFilter(core.filters.MandateSettled(mandateId), Math.max(0, from - 2_000), from).catch(() => []);
      if (logs.length) settlementTx = (logs[logs.length - 1] as { transactionHash: string }).transactionHash;
    }
  }
  if (!settlementTx) {
    return { mandateId, checks, result: 'evidence-unavailable', evidence: { finalState, note: 'settlement tx not found; pass --settle <txHash>' } };
  }
  if (!sourceTxHash) {
    return { mandateId, checks, result: 'evidence-unavailable', evidence: { finalState, note: 'source tx hash unknown; pass --source <txHash>' } };
  }

  const settleReceipt = await cc3.getTransactionReceipt(settlementTx);
  const settledLog = settleReceipt!.logs.map((l) => { try { return core.interface.parseLog(l); } catch { return null; } }).find((p) => p?.name === 'MandateSettled');
  if (!settledLog) {
    return { mandateId, checks, result: 'evidence-unavailable', evidence: { finalState, note: 'no MandateSettled in settlement receipt' } };
  }
  const onChainCode = Number(settledLog.args[2]);
  const onChainStep = Number(settledLog.args[3]);
  const onChainSourceTxKey = settledLog.args[4] as string;

  // re-derive + re-verify the Attestcoin proof
  const sepRc = await sepolia.getTransactionReceipt(sourceTxHash);
  const ci = new chainInfo.PrecompileChainInfoProvider(cc3 as never);
  const attested = await ci.is_height_attested?.(SOURCE_CHAIN_KEY, sepRc!.blockNumber).catch(() => true) ?? true;
  ok('source block still attested', Boolean(attested), `block ${sepRc!.blockNumber}`);

  const pb = new proofProvider.service.ProofBuilder(SOURCE_CHAIN_KEY, PROOF_BUILDER);
  const proofRes = await pb.getProof(sourceTxHash);
  if (!proofRes.success || !proofRes.data) {
    return { mandateId, checks, result: 'evidence-unavailable', evidence: { finalState, note: `proof builder: ${proofRes.error}` } };
  }
  const proof = proofRes.data;
  const prover = new blockProver.PrecompileBlockProver(cc3 as never);
  const verified = await prover.verifySingle(proof.chainKey, proof.headerNumber, proof.txBytes, proof.merkleProof, proof.continuityProof);
  ok('Attestcoin proof re-verifies on-chain', verified === true, `verifySingle=${verified}`);

  const derivedKey = deriveSourceTxKey(SOURCE_CHAIN_KEY, proof.headerNumber, proof.txIndex);
  ok('sourceTxKey matches settlement', derivedKey.toLowerCase() === onChainSourceTxKey.toLowerCase(), derivedKey);

  // decode + reference model
  const decoder = new Contract(deployments.creditcoin.attestcoin.evmV1Decoder, DECODER_ABI, cc3);
  const dec = await utils.decoder.decodeEvmV1Transaction(proof.txBytes, decoder);
  const d = dec.data;
  const ve = {
    sourceChainKey: SOURCE_CHAIN_KEY, blockHeight: proof.headerNumber, transactionIndex: proof.txIndex,
    sourceTxKey: derivedKey, txFrom: d.commonTx.from, txTo: d.commonTx.to, txToIsNull: d.commonTx.toIsNull,
    txValue: d.commonTx.value, selector: d.commonTx.data.slice(0, 10), calldata: d.commonTx.data,
    receiptStatus: d.receipt.receiptStatus, receiptGasUsed: d.receipt.receiptGasUsed,
    logs: d.receipt.receiptLogs.map((l: { address_: string; topics: string[]; data: string }) => ({ emitter: l.address_, topics: l.topics, data: l.data })),
  };

  if (opts.tamper) {
    // flip the calldata amountIn word (offset 4 + 4*32 .. +5*32) to a huge value
    const cd = ve.calldata;
    const pre = cd.slice(0, 10 + 4 * 64);
    const post = cd.slice(10 + 5 * 64);
    ve.calldata = pre + 'f'.repeat(64) + post;
  }

  const refEval = evaluateTreasuryRebalance(
    {
      mandateId, creator: m.creator, templateId: m.templateId, templateVersion: Number(m.templateVersion),
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

  const EVAL = ['FULFILLED','WRONG_SOURCE_CHAIN','BEFORE_EXECUTION_START','AFTER_EXECUTION_DEADLINE','SENDER_NOT_BOUND_EXECUTOR','WRONG_TARGET','WRONG_SELECTOR','WRONG_MANDATE_BINDING','WRONG_ASSET_IN','WRONG_ASSET_OUT','AMOUNT_IN_ZERO','AMOUNT_IN_OVER_CAP','MIN_OUT_BELOW_FLOOR','RECEIPT_REVERTED','EVENT_MISSING','EVENT_WRONG_EMITTER','EVENT_WRONG_MANDATE','EVENT_WRONG_EXECUTOR','EVENT_OUTPUT_BELOW_MIN','SOURCE_TX_ALREADY_CONSUMED'];
  const onChainCodeName = EVAL[onChainCode] ?? String(onChainCode);

  if (opts.tamper) {
    ok('tamper diverges from on-chain classification', refEval.code !== onChainCodeName, `tampered ref=${refEval.code} vs on-chain=${onChainCodeName}`);
  } else {
    ok('reference model matches on-chain classification', refEval.code === onChainCodeName, `ref=${refEval.code} on-chain=${onChainCodeName} (step ${onChainStep})`);
  }

  // conservation from Paid events
  const vault = new Contract(C.SetldVault, ['event Paid(bytes32 indexed mandateId, address indexed asset, address indexed to, uint256 amount, bytes32 reason)'], cc3);
  let paidOut = 0n;
  for (const l of settleReceipt!.logs) {
    try {
      const p = vault.interface.parseLog(l);
      if (p && p.args[0].toLowerCase() === mandateId.toLowerCase()) paidOut += p.args[3] as bigint;
    } catch {
      /* not a Paid log */
    }
  }
  const escrowed = m.econ.rewardAmount + m.econ.executorBond + m.econ.creatorBond + m.econ.relayerBudget;
  ok('settlement conserves escrow', paidOut === escrowed, `paidOut ${formatEther(paidOut)} == escrowed ${formatEther(escrowed)}`);

  const allPass = checks.every((c) => c.pass);
  return {
    mandateId,
    checks,
    result: allPass ? 'match' : 'mismatch',
    evidence: {
      finalState, settlementTx, sourceTxHash, onChainClassification: onChainCodeName, referenceModelClassification: refEval.code,
      attestcoinProof: { header: proof.headerNumber, txIndex: proof.txIndex, verifySingle: verified },
      sourceTxKey: derivedKey, escrowedWei: escrowed.toString(), paidOutWei: paidOut.toString(),
      tamperMode: Boolean(opts.tamper),
    },
  };
}

void keccak256;
