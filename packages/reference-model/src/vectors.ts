/**
 * Canonical differential-parity vectors (PRD 4A.6 controls + every EvaluationCode).
 *
 * One normalized execution per outcome class. The same vector is fed to:
 *   - the TS reference model (`evaluateTreasuryRebalance` + `settleFromProof`)
 *   - the Solidity `TreasuryRebalancePredicateV1.evaluate`
 *   - the `SetldCore` settlement path (via a mock adapter that returns the vector's VE)
 * All three must agree on classification and economics. Disagreement is a blocking
 * correctness incident (GATES S4/S6).
 */
import { AbiCoder, keccak256 } from 'ethers';
import {
  type Mandate,
  type TreasuryRebalanceTerms,
  type VerifiedExecution,
  MandateState,
  EvaluationCode,
} from '@setld/protocol-types';
import { ROUTER_SELECTOR, REBALANCE_EXECUTED_TOPIC0, deriveSourceTxKey } from './index.js';

const abi = AbiCoder.defaultAbiCoder();

export const PARITY_ADDRESSES = {
  creator: '0x00000000000000000000000000000000000C0001',
  executorCc: '0x00000000000000000000000000000000000C0002',
  executorSrc: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // anvil #1; privkey used only in Foundry parity tests
  router: '0x00000000000000000000000000000000000C0004',
  vault: '0x00000000000000000000000000000000000C0005',
  assetIn: '0x00000000000000000000000000000000000C0006',
  assetOut: '0x00000000000000000000000000000000000C0007',
  token: '0x00000000000000000000000000000000000C0008',
  feeRecipient: '0x00000000000000000000000000000000000C0009',
  submitter: '0x00000000000000000000000000000000000C000A',
} as const;

export const PARITY_MANDATE_ID = keccak256(Buffer.from('parity-mandate'));
export const PARITY_ECON = {
  rewardAmount: 1_000_000n,
  executorBond: 500_000n,
  creatorBond: 200_000n,
  relayerBudget: 40_000n,
  protocolFeeBps: 500,
};
export const PARITY_WINDOW = { start: 1_000, end: 2_000, proofDeadline: 3_000 };

function mandate(): Mandate {
  return {
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
}

function terms(over: Partial<TreasuryRebalanceTerms> = {}): TreasuryRebalanceTerms {
  return {
    router: PARITY_ADDRESSES.router,
    vault: PARITY_ADDRESSES.vault,
    assetIn: PARITY_ADDRESSES.assetIn,
    assetOut: PARITY_ADDRESSES.assetOut,
    maxAmountIn: 100_000n,
    minAmountOut: 90_000n,
    selector: ROUTER_SELECTOR,
    routePolicyHash: keccak256(Buffer.from('route')),
    ...over,
  };
}

function calldata(o: Partial<{ mandateId: string; assetIn: string; assetOut: string; amountIn: bigint; minOut: bigint }>) {
  return (
    ROUTER_SELECTOR +
    abi
      .encode(
        ['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          o.mandateId ?? PARITY_MANDATE_ID,
          PARITY_ADDRESSES.vault,
          o.assetIn ?? PARITY_ADDRESSES.assetIn,
          o.assetOut ?? PARITY_ADDRESSES.assetOut,
          o.amountIn ?? 50_000n,
          o.minOut ?? 90_000n,
        ],
      )
      .slice(2)
  );
}

function evLog(o: Partial<{ emitter: string; mandateId: string; executor: string; assetOut: string; amountOut: bigint }>) {
  return {
    emitter: o.emitter ?? PARITY_ADDRESSES.vault,
    topics: [REBALANCE_EXECUTED_TOPIC0],
    data: abi.encode(
      ['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'],
      [
        o.mandateId ?? PARITY_MANDATE_ID,
        o.executor ?? PARITY_ADDRESSES.executorSrc,
        PARITY_ADDRESSES.assetIn,
        o.assetOut ?? PARITY_ADDRESSES.assetOut,
        50_000n,
        o.amountOut ?? 95_000n,
      ],
    ),
  };
}

function ve(over: Partial<VerifiedExecution> = {}): VerifiedExecution {
  const blockHeight = over.blockHeight ?? 1_500;
  const transactionIndex = over.transactionIndex ?? 3;
  return {
    sourceChainKey: 1,
    blockHeight,
    transactionIndex,
    sourceTxKey: deriveSourceTxKey(1, blockHeight, transactionIndex),
    txFrom: PARITY_ADDRESSES.executorSrc,
    txTo: PARITY_ADDRESSES.router,
    txToIsNull: false,
    txValue: 0n,
    selector: ROUTER_SELECTOR,
    calldata: calldata({}),
    receiptStatus: 1,
    receiptGasUsed: 120_000n,
    logs: [evLog({})],
    ...over,
  };
}

export interface ParityVector {
  name: string;
  klass: 'valid' | 'wrong-param' | 'wrong-sender' | 'reverted' | 'after-deadline' | 'replay';
  verifiedExecution: VerifiedExecution;
  consumedSourceTxKeys: string[];
  expectedCode: EvaluationCode;
  expectedFailedStep: number;
  expectedTerminal: MandateState;
}

export function parityVectors(): ParityVector[] {
  const v: ParityVector[] = [];
  const add = (
    name: string,
    klass: ParityVector['klass'],
    over: Partial<VerifiedExecution>,
    expectedCode: EvaluationCode,
    expectedFailedStep: number,
    expectedTerminal: MandateState,
    consumed: string[] = [],
  ) => {
    // give every vector a distinct source tx identity so the global consumed-key map in
    // SetldCore does not collide across the per-vector mandates in the settlement parity test
    const txIndex = v.length + 1;
    const height = (over.blockHeight ?? 1_500) as number;
    const chainKey = (over.sourceChainKey ?? 1) as number;
    const merged: Partial<VerifiedExecution> = {
      transactionIndex: txIndex,
      sourceTxKey: deriveSourceTxKey(chainKey, height, txIndex),
      ...over,
    };
    v.push({
      name,
      klass,
      verifiedExecution: ve(merged),
      consumedSourceTxKeys: consumed,
      expectedCode,
      expectedFailedStep,
      expectedTerminal,
    });
  };

  add('exact-valid', 'valid', {}, EvaluationCode.FULFILLED, 0, MandateState.FULFILLED);
  add('valid-at-end-block', 'valid', { blockHeight: 2_000 }, EvaluationCode.FULFILLED, 0, MandateState.FULFILLED);
  add('before-start', 'after-deadline', { blockHeight: 999 }, EvaluationCode.BEFORE_EXECUTION_START, 2, MandateState.INVALID_ATTEMPT);
  add('after-deadline', 'after-deadline', { blockHeight: 2_001 }, EvaluationCode.AFTER_EXECUTION_DEADLINE, 3, MandateState.INVALID_ATTEMPT);
  add('wrong-source-chain', 'wrong-param', { sourceChainKey: 3 }, EvaluationCode.WRONG_SOURCE_CHAIN, 1, MandateState.INVALID_ATTEMPT);
  add('wrong-sender', 'wrong-sender', { txFrom: '0x000000000000000000000000000000000000dEaD' }, EvaluationCode.SENDER_NOT_BOUND_EXECUTOR, 4, MandateState.INVALID_ATTEMPT);
  add('wrong-target', 'wrong-param', { txTo: '0x000000000000000000000000000000000000BEEF' }, EvaluationCode.WRONG_TARGET, 5, MandateState.INVALID_ATTEMPT);
  add('wrong-mandate-binding', 'wrong-param', { calldata: calldata({ mandateId: keccak256(Buffer.from('other')) }) }, EvaluationCode.WRONG_MANDATE_BINDING, 7, MandateState.INVALID_ATTEMPT);
  add('wrong-asset-out', 'wrong-param', { calldata: calldata({ assetOut: PARITY_ADDRESSES.assetIn }), logs: [evLog({ assetOut: PARITY_ADDRESSES.assetIn })] }, EvaluationCode.WRONG_ASSET_OUT, 9, MandateState.INVALID_ATTEMPT);
  add('amount-over-cap-but-tx-succeeds', 'wrong-param', { calldata: calldata({ amountIn: 200_000n }) }, EvaluationCode.AMOUNT_IN_OVER_CAP, 11, MandateState.INVALID_ATTEMPT);
  add('min-out-below-floor', 'wrong-param', { calldata: calldata({ minOut: 1n }) }, EvaluationCode.MIN_OUT_BELOW_FLOOR, 12, MandateState.INVALID_ATTEMPT);
  add('well-formed-but-reverted', 'reverted', { receiptStatus: 0, logs: [] }, EvaluationCode.RECEIPT_REVERTED, 13, MandateState.EXECUTION_REVERTED);
  add('event-missing', 'wrong-param', { logs: [] }, EvaluationCode.EVENT_MISSING, 14, MandateState.INVALID_ATTEMPT);
  add('event-wrong-emitter', 'wrong-param', { logs: [evLog({ emitter: '0x000000000000000000000000000000000000FEED' })] }, EvaluationCode.EVENT_WRONG_EMITTER, 15, MandateState.INVALID_ATTEMPT);
  add('event-output-below-min', 'wrong-param', { logs: [evLog({ amountOut: 1n })] }, EvaluationCode.EVENT_OUTPUT_BELOW_MIN, 17, MandateState.INVALID_ATTEMPT);
  add('replay-consumed-key', 'replay', {}, EvaluationCode.SOURCE_TX_ALREADY_CONSUMED, 17, MandateState.INVALID_ATTEMPT);
  // the replay vector's "already consumed" key is its own source tx key
  const replay = v[v.length - 1]!;
  replay.consumedSourceTxKeys = [replay.verifiedExecution.sourceTxKey];
  return v;
}

/** ABI encoding of a VerifiedExecution for Foundry `abi.decode` in the parity test. */
export const VE_ABI_TUPLE =
  '(uint64,uint64,uint32,bytes32,address,address,bool,uint256,bytes4,bytes,uint8,uint64,(address,bytes32[],bytes)[])';

export function encodeVE(e: VerifiedExecution): string {
  return abi.encode(
    [VE_ABI_TUPLE],
    [
      [
        e.sourceChainKey,
        e.blockHeight,
        e.transactionIndex,
        e.sourceTxKey,
        e.txFrom,
        e.txTo,
        e.txToIsNull,
        e.txValue,
        e.selector,
        e.calldata,
        e.receiptStatus,
        e.receiptGasUsed,
        e.logs.map((l) => [l.emitter, l.topics, l.data]),
      ],
    ],
  );
}
