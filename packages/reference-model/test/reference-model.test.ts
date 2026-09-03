import { describe, it, expect } from 'vitest';
import { AbiCoder, keccak256, Wallet, zeroPadValue } from 'ethers';
import {
  evaluateTreasuryRebalance,
  settleFromProof,
  settleTimeout,
  conservationDelta,
  deriveSourceTxKey,
  decodeRebalanceEvent,
  REBALANCE_EXECUTED_TOPIC0,
  ROUTER_SELECTOR,
} from '../src/index.js';
import {
  type Mandate,
  type TreasuryRebalanceTerms,
  type VerifiedExecution,
  MandateState,
  EvaluationCode,
  TERMINAL_STATES,
} from '@setld/protocol-types';

const abi = AbiCoder.defaultAbiCoder();

const ADDR = {
  creator: '0x1111111111111111111111111111111111111111',
  executorCc: '0x2222222222222222222222222222222222222222',
  executorSrc: '0x3333333333333333333333333333333333333333',
  router: '0x4444444444444444444444444444444444444444',
  vault: '0x5555555555555555555555555555555555555555',
  assetIn: '0x6666666666666666666666666666666666666666',
  assetOut: '0x7777777777777777777777777777777777777777',
  rewardToken: '0x8888888888888888888888888888888888888888',
  feeRecipient: '0x9999999999999999999999999999999999999999',
  relayerA: '0xaaaA000000000000000000000000000000000001',
  relayerB: '0xBbbB000000000000000000000000000000000002',
};

const MANDATE_ID = keccak256(Buffer.from('mandate-1'));

function baseMandate(over: Partial<Mandate> = {}): Mandate {
  return {
    mandateId: MANDATE_ID,
    creator: ADDR.creator,
    templateId: keccak256(Buffer.from('treasury-rebalance')),
    templateVersion: 1,
    sourceChainKey: 1,
    sourceTarget: ADDR.router,
    acceptedExecutor: ADDR.executorCc,
    acceptedSourceSender: ADDR.executorSrc,
    rewardToken: ADDR.rewardToken,
    rewardAmount: 1_000n,
    bondToken: ADDR.rewardToken,
    executorBond: 500n,
    creatorBond: 200n,
    relayerBudget: 50n,
    acceptanceDeadline: 100,
    executionStartBlock: 1_000,
    executionEndBlock: 2_000,
    proofDeadline: 3_000,
    termsHash: keccak256(Buffer.from('terms')),
    metadataHash: keccak256(Buffer.from('meta')),
    state: MandateState.ACCEPTED,
    ...over,
  };
}

function baseTerms(over: Partial<TreasuryRebalanceTerms> = {}): TreasuryRebalanceTerms {
  return {
    router: ADDR.router,
    vault: ADDR.vault,
    assetIn: ADDR.assetIn,
    assetOut: ADDR.assetOut,
    maxAmountIn: 10_000n,
    minAmountOut: 9_000n,
    selector: ROUTER_SELECTOR,
    routePolicyHash: keccak256(Buffer.from('route')),
    ...over,
  };
}

function routerCalldata(o: {
  mandateId?: string;
  target?: string;
  assetIn?: string;
  assetOut?: string;
  amountIn?: bigint;
  minAmountOut?: bigint;
}): string {
  return (
    ROUTER_SELECTOR +
    abi
      .encode(
        ['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          o.mandateId ?? MANDATE_ID,
          o.target ?? ADDR.vault,
          o.assetIn ?? ADDR.assetIn,
          o.assetOut ?? ADDR.assetOut,
          o.amountIn ?? 5_000n,
          o.minAmountOut ?? 9_000n,
        ],
      )
      .slice(2)
  );
}

function rebalanceLog(o: {
  emitter?: string;
  mandateId?: string;
  executor?: string;
  assetIn?: string;
  assetOut?: string;
  amountIn?: bigint;
  amountOut?: bigint;
}) {
  return {
    emitter: o.emitter ?? ADDR.vault,
    topics: [REBALANCE_EXECUTED_TOPIC0],
    data: abi.encode(
      ['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'],
      [
        o.mandateId ?? MANDATE_ID,
        o.executor ?? ADDR.executorSrc,
        o.assetIn ?? ADDR.assetIn,
        o.assetOut ?? ADDR.assetOut,
        o.amountIn ?? 5_000n,
        o.amountOut ?? 9_500n,
      ],
    ),
  };
}

function baseVE(over: Partial<VerifiedExecution> = {}): VerifiedExecution {
  const blockHeight = over.blockHeight ?? 1_500;
  const transactionIndex = over.transactionIndex ?? 3;
  return {
    sourceChainKey: 1,
    blockHeight,
    transactionIndex,
    sourceTxKey: deriveSourceTxKey(1, blockHeight, transactionIndex),
    txFrom: ADDR.executorSrc,
    txTo: ADDR.router,
    txToIsNull: false,
    txValue: 0n,
    selector: ROUTER_SELECTOR,
    calldata: routerCalldata({}),
    receiptStatus: 1,
    receiptGasUsed: 120_000n,
    logs: [rebalanceLog({})],
    ...over,
  };
}

const ctx = (consumed: string[] = []) => ({
  boundExecutorSourceAddress: ADDR.executorSrc,
  consumedSourceTxKeys: new Set(consumed),
});

const settleOpts = {
  relayerReimbursement: 50n,
  protocolFeeBps: 500,
  vaultAddress: ADDR.vault,
  feeRecipient: ADDR.feeRecipient,
  submitter: ADDR.relayerA,
};

describe('positive control', () => {
  it('exact valid execution settles FULFILLED and conserves value', () => {
    const m = baseMandate();
    const ev = evaluateTreasuryRebalance(m, baseTerms(), baseVE(), ctx());
    expect(ev.code).toBe(EvaluationCode.FULFILLED);
    expect(ev.trace.every((s) => s.pass)).toBe(true);

    const res = settleFromProof(m, ev, settleOpts);
    expect(res.terminalState).toBe(MandateState.FULFILLED);
    const delta = conservationDelta(m, res, settleOpts.relayerReimbursement);
    for (const d of Object.values(delta)) expect(d).toBe(0n);

    const reward = res.transfers.find((t) => t.reason === 'reward')!;
    const fee = res.transfers.find((t) => t.reason === 'protocol-fee')!;
    expect(reward.amount + fee.amount).toBe(m.rewardAmount);
    expect(reward.to).toBe(ADDR.executorCc);
  });
});

describe('negative control (verified but wrong)', () => {
  it('amount over cap: valid receipt, still refused, no reward', () => {
    const m = baseMandate();
    const ve = baseVE({
      calldata: routerCalldata({ amountIn: 20_000n }),
      logs: [rebalanceLog({ amountIn: 20_000n })],
    });
    const ev = evaluateTreasuryRebalance(m, baseTerms(), ve, ctx());
    expect(ev.code).toBe(EvaluationCode.AMOUNT_IN_OVER_CAP);
    const res = settleFromProof(m, ev, settleOpts);
    expect(res.terminalState).toBe(MandateState.INVALID_ATTEMPT);
    expect(res.transfers.some((t) => t.reason === 'reward')).toBe(false);
    expect(res.transfers.find((t) => t.reason === 'reward-refund')!.to).toBe(ADDR.creator);
    expect(res.transfers.find((t) => t.reason === 'executor-bond-penalty')!.amount).toBe(500n);
    for (const d of Object.values(conservationDelta(m, res, settleOpts.relayerReimbursement))) expect(d).toBe(0n);
  });

  it('wrong destination asset: refused', () => {
    const m = baseMandate();
    const ve = baseVE({
      calldata: routerCalldata({ assetOut: ADDR.assetIn }),
      logs: [rebalanceLog({ assetOut: ADDR.assetIn })],
    });
    const ev = evaluateTreasuryRebalance(m, baseTerms(), ve, ctx());
    expect(ev.code).toBe(EvaluationCode.WRONG_ASSET_OUT);
  });
});

describe('reverted vs invalid classification (PRD 12.10)', () => {
  it('well-formed call that reverts is EXECUTION_REVERTED with lower penalty', () => {
    const m = baseMandate();
    const ve = baseVE({ receiptStatus: 0, logs: [] });
    const ev = evaluateTreasuryRebalance(m, baseTerms(), ve, ctx());
    expect(ev.code).toBe(EvaluationCode.RECEIPT_REVERTED);
    const res = settleFromProof(m, ev, settleOpts);
    expect(res.terminalState).toBe(MandateState.EXECUTION_REVERTED);
    expect(res.transfers.find((t) => t.reason === 'executor-bond-penalty')!.amount).toBe(125n); // 25%
  });

  it('wrong parameter takes priority over revert', () => {
    const m = baseMandate();
    const ve = baseVE({ receiptStatus: 0, calldata: routerCalldata({ amountIn: 20_000n }), logs: [] });
    const ev = evaluateTreasuryRebalance(m, baseTerms(), ve, ctx());
    expect(ev.code).toBe(EvaluationCode.AMOUNT_IN_OVER_CAP);
  });
});

describe('boundary control (PRD 4A.6)', () => {
  it('execution at the exact end block is accepted, one block later refused', () => {
    const m = baseMandate();
    const okVe = baseVE({ blockHeight: 2_000 });
    expect(evaluateTreasuryRebalance(m, baseTerms(), okVe, ctx()).code).toBe(EvaluationCode.FULFILLED);
    const lateVe = baseVE({ blockHeight: 2_001 });
    expect(evaluateTreasuryRebalance(m, baseTerms(), lateVe, ctx()).code).toBe(
      EvaluationCode.AFTER_EXECUTION_DEADLINE,
    );
  });
  it('execution one block before start is refused', () => {
    const m = baseMandate();
    expect(evaluateTreasuryRebalance(m, baseTerms(), baseVE({ blockHeight: 999 }), ctx()).code).toBe(
      EvaluationCode.BEFORE_EXECUTION_START,
    );
  });
});

describe('replay + source identity (Gate S2)', () => {
  it('consumed source tx key is rejected', () => {
    const m = baseMandate();
    const ve = baseVE();
    const ev = evaluateTreasuryRebalance(m, baseTerms(), ve, ctx([ve.sourceTxKey]));
    expect(ev.code).toBe(EvaluationCode.SOURCE_TX_ALREADY_CONSUMED);
  });
  it('wrong bound source sender is rejected before economics', () => {
    const m = baseMandate();
    const ve = baseVE({ txFrom: '0xdead00000000000000000000000000000000dead' });
    const ev = evaluateTreasuryRebalance(m, baseTerms(), ve, {
      boundExecutorSourceAddress: ADDR.executorSrc,
      consumedSourceTxKeys: new Set(),
    });
    expect(ev.code).toBe(EvaluationCode.SENDER_NOT_BOUND_EXECUTOR);
  });
});

describe('neutral control: proof submitter independence (PRD 4A.6)', () => {
  it('different submitters produce identical ledgers except the reimbursement recipient', () => {
    const m = baseMandate();
    const ev = evaluateTreasuryRebalance(m, baseTerms(), baseVE(), ctx());
    const a = settleFromProof(m, ev, { ...settleOpts, submitter: ADDR.relayerA });
    const b = settleFromProof(m, ev, { ...settleOpts, submitter: ADDR.relayerB });
    const strip = (r: typeof a) => r.transfers.filter((t) => t.reason !== 'relayer-reimbursement');
    expect(JSON.stringify(strip(a), bi)).toBe(JSON.stringify(strip(b), bi));
    expect(a.transfers.find((t) => t.reason === 'relayer-reimbursement')!.to).toBe(ADDR.relayerA);
    expect(b.transfers.find((t) => t.reason === 'relayer-reimbursement')!.to).toBe(ADDR.relayerB);
    // reward beneficiary never depends on submitter
    expect(a.transfers.find((t) => t.reason === 'reward')!.to).toBe(
      b.transfers.find((t) => t.reason === 'reward')!.to,
    );
  });
});

describe('state guard', () => {
  it('settleFromProof refuses a non-ACCEPTED mandate', () => {
    const m = baseMandate({ state: MandateState.OPEN });
    const ev = evaluateTreasuryRebalance(baseMandate(), baseTerms(), baseVE(), ctx());
    expect(() => settleFromProof(m, ev, settleOpts)).toThrow();
  });
  it('every settlement lands in exactly one terminal state', () => {
    const m = baseMandate();
    const ev = evaluateTreasuryRebalance(m, baseTerms(), baseVE(), ctx());
    const res = settleFromProof(m, ev, settleOpts);
    expect(TERMINAL_STATES.has(res.terminalState)).toBe(true);
  });
});

describe('timeout', () => {
  it('TIMED_OUT refunds reward, applies 50% penalty, conserves', () => {
    const m = baseMandate();
    const res = settleTimeout(m, { vaultAddress: ADDR.vault });
    expect(res.terminalState).toBe(MandateState.TIMED_OUT);
    const delta = conservationDelta(m, res, 0n);
    for (const d of Object.values(delta)) expect(d).toBe(0n);
    expect(res.transfers.find((t) => t.reason === 'executor-bond-penalty')!.amount).toBe(250n);
  });
});

describe('event decoding round-trip', () => {
  it('decodes a RebalanceExecuted log', () => {
    const log = rebalanceLog({ amountOut: 12_345n });
    const d = decodeRebalanceEvent(log)!;
    expect(d.amountOut).toBe(12_345n);
    expect(d.mandateId.toLowerCase()).toBe(MANDATE_ID.toLowerCase());
  });
});

function bi(_k: string, v: unknown) {
  return typeof v === 'bigint' ? v.toString() : v;
}
// touch imports to keep them referenced across tsconfig strictness
void Wallet;
void zeroPadValue;
