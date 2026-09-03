/**
 * Emits evidence/parity/vectors.json — the shared differential-parity corpus consumed by
 * the TS reference-model parity test and the Foundry predicate/settlement parity tests.
 * The TS reference model is the oracle; Solidity must match its classification + economics.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AbiCoder, keccak256 } from 'ethers';
import {
  parityVectors,
  encodeVE,
  PARITY_ADDRESSES,
  PARITY_MANDATE_ID,
  PARITY_ECON,
  PARITY_WINDOW,
} from '../packages/reference-model/src/vectors.js';
import { evaluateTreasuryRebalance, settleFromProof, ROUTER_SELECTOR } from '../packages/reference-model/src/index.js';
import { type Mandate, type TreasuryRebalanceTerms, MandateState, EvaluationCode } from '../packages/protocol-types/src/index.js';

const ENUM_ORDER: EvaluationCode[] = [
  EvaluationCode.FULFILLED,
  EvaluationCode.WRONG_SOURCE_CHAIN,
  EvaluationCode.BEFORE_EXECUTION_START,
  EvaluationCode.AFTER_EXECUTION_DEADLINE,
  EvaluationCode.SENDER_NOT_BOUND_EXECUTOR,
  EvaluationCode.WRONG_TARGET,
  EvaluationCode.WRONG_SELECTOR,
  EvaluationCode.WRONG_MANDATE_BINDING,
  EvaluationCode.WRONG_ASSET_IN,
  EvaluationCode.WRONG_ASSET_OUT,
  EvaluationCode.AMOUNT_IN_ZERO,
  EvaluationCode.AMOUNT_IN_OVER_CAP,
  EvaluationCode.MIN_OUT_BELOW_FLOOR,
  EvaluationCode.RECEIPT_REVERTED,
  EvaluationCode.EVENT_MISSING,
  EvaluationCode.EVENT_WRONG_EMITTER,
  EvaluationCode.EVENT_WRONG_MANDATE,
  EvaluationCode.EVENT_WRONG_EXECUTOR,
  EvaluationCode.EVENT_OUTPUT_BELOW_MIN,
  EvaluationCode.SOURCE_TX_ALREADY_CONSUMED,
];

const mandate: Mandate = {
  mandateId: PARITY_MANDATE_ID,
  creator: PARITY_ADDRESSES.creator,
  templateId: keccak256(Buffer.from('treasury-rebalance-v1')),
  templateVersion: 1,
  sourceChainKey: 1,
  sourceTarget: PARITY_ADDRESSES.router,
  acceptedExecutor: PARITY_ADDRESSES.executorCc,
  acceptedSourceSender: PARITY_ADDRESSES.executorSrc,
  rewardToken: PARITY_ADDRESSES.token,
  rewardAmount: PARITY_ECON.rewardAmount,
  bondToken: PARITY_ADDRESSES.token,
  executorBond: PARITY_ECON.executorBond,
  creatorBond: PARITY_ECON.creatorBond,
  relayerBudget: PARITY_ECON.relayerBudget,
  acceptanceDeadline: 10_000_000_000,
  executionStartBlock: PARITY_WINDOW.start,
  executionEndBlock: PARITY_WINDOW.end,
  proofDeadline: PARITY_WINDOW.proofDeadline,
  termsHash: keccak256(Buffer.from('terms')),
  metadataHash: keccak256(Buffer.from('meta')),
  state: MandateState.ACCEPTED,
};

const terms: TreasuryRebalanceTerms = {
  router: PARITY_ADDRESSES.router,
  vault: PARITY_ADDRESSES.vault,
  assetIn: PARITY_ADDRESSES.assetIn,
  assetOut: PARITY_ADDRESSES.assetOut,
  maxAmountIn: 100_000n,
  minAmountOut: 90_000n,
  selector: ROUTER_SELECTOR,
  routePolicyHash: keccak256(Buffer.from('route')),
};

const settleOpts = {
  relayerReimbursement: PARITY_ECON.relayerBudget,
  protocolFeeBps: PARITY_ECON.protocolFeeBps,
  vaultAddress: PARITY_ADDRESSES.vault,
  feeRecipient: PARITY_ADDRESSES.feeRecipient,
  submitter: PARITY_ADDRESSES.submitter,
};

let fail = false;
const vectors = parityVectors().map((v) => {
  const evaluation = evaluateTreasuryRebalance(mandate, terms, v.verifiedExecution, {
    boundExecutorSourceAddress: PARITY_ADDRESSES.executorSrc,
    consumedSourceTxKeys: new Set(v.consumedSourceTxKeys),
  });
  const codeMatches = evaluation.code === v.expectedCode;
  if (!codeMatches) fail = true;

  let transfers: { asset: string; to: string; amount: string; reason: string }[] = [];
  if (
    codeMatches &&
    (v.expectedTerminal === MandateState.FULFILLED ||
      v.expectedTerminal === MandateState.INVALID_ATTEMPT ||
      v.expectedTerminal === MandateState.EXECUTION_REVERTED) &&
    v.klass !== 'replay'
  ) {
    const res = settleFromProof(mandate, evaluation, settleOpts);
    transfers = res.transfers.map((t) => ({
      asset: t.asset,
      to: t.to,
      amount: t.amount.toString(),
      reason: t.reason,
    }));
  }

  return {
    name: v.name,
    klass: v.klass,
    veAbiHex: encodeVE(v.verifiedExecution),
    consumedSourceTxKeys: v.consumedSourceTxKeys,
    expected: {
      code: v.expectedCode,
      codeIndex: ENUM_ORDER.indexOf(v.expectedCode),
      failedStep: v.expectedFailedStep,
      terminalState: v.expectedTerminal,
    },
    referenceModel: { code: evaluation.code, terminalState: v.expectedTerminal, transfers },
  };
});

const dir = resolve('evidence/parity');
mkdirSync(dir, { recursive: true });
writeFileSync(
  resolve(dir, 'vectors.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: 'Shared differential-parity corpus. TS reference model is the oracle; Solidity predicate + SetldCore settlement must match classification and economics.',
      enumOrder: ENUM_ORDER,
      mandate: {
        mandateId: mandate.mandateId,
        executionStartBlock: mandate.executionStartBlock,
        executionEndBlock: mandate.executionEndBlock,
        sourceChainKey: mandate.sourceChainKey,
        acceptedSourceSender: mandate.acceptedSourceSender,
        econ: {
          rewardAmount: mandate.rewardAmount.toString(),
          executorBond: mandate.executorBond.toString(),
          creatorBond: mandate.creatorBond.toString(),
          relayerBudget: mandate.relayerBudget.toString(),
          protocolFeeBps: PARITY_ECON.protocolFeeBps,
        },
      },
      terms: { ...terms, maxAmountIn: terms.maxAmountIn.toString(), minAmountOut: terms.minAmountOut.toString() },
      addresses: PARITY_ADDRESSES,
      vectors,
    },
    null,
    2,
  ) + '\n',
);

console.log(`wrote ${vectors.length} parity vectors -> evidence/parity/vectors.json`);
for (const v of vectors) {
  const ok = v.referenceModel.code === v.expected.code;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${v.name.padEnd(36)} ${v.referenceModel.code}`);
}
if (fail) {
  console.error('reference model disagreed with an expected vector code');
  process.exit(1);
}
void AbiCoder;
