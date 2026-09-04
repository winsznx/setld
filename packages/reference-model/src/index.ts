/**
 * setld executable reference model (PRD 4A.2, 23.1, Gate S4).
 *
 * A dependency-light, deterministic implementation of mandate evaluation and settlement
 * accounting. It receives normalized `VerifiedExecution` objects and proves the correctness
 * of the contract logic and its edge cases. It is NOT competitive proof by itself.
 *
 * Properties enforced by the test suite:
 *  - asset conservation (no value created or destroyed)
 *  - exactly one terminal state per mandate
 *  - one source receipt consumed at most once
 *  - proof-submitter independence (submitter address never appears in accounting)
 *  - exact deadline boundaries (inclusive start, inclusive end block)
 *  - no reward on non-fulfilment
 *  - no executor penalty without an accepted mandate
 */
import { AbiCoder, keccak256, getAddress, solidityPacked } from 'ethers';
import {
  type Mandate,
  type TreasuryRebalanceTerms,
  type VerifiedExecution,
  type Evaluation,
  type EvaluationStep,
  type SettlementResult,
  type Transfer,
  EvaluationCode,
  MandateState,
  outcomeForEvaluation,
  PENALTY_BPS,
} from '@setld/protocol-types';

const abi = AbiCoder.defaultAbiCoder();

export function deriveSourceTxKey(chainKey: number, blockHeight: number, txIndex: number): string {
  // MUST match SetldAttestcoinAdapter.deriveSourceTxKey:
  //   keccak256(abi.encodePacked(uint64 chainKey, uint64 height, uint32 txIndex))
  return keccak256(solidityPacked(['uint64', 'uint64', 'uint32'], [chainKey, blockHeight, txIndex]));
}

const eq = (a: string, b: string) => {
  try {
    return getAddress(a) === getAddress(b);
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
};

/** Selector for RebalanceExecuted(bytes32 mandateId, address executor, address assetIn, address assetOut, uint256 amountIn, uint256 amountOut) */
export const REBALANCE_EXECUTED_TOPIC0 =
  keccak256(Buffer.from('RebalanceExecuted(bytes32,address,address,address,uint256,uint256)'));

export interface EvalContext {
  boundExecutorSourceAddress: string;
  consumedSourceTxKeys: ReadonlySet<string>;
}

interface DecodedRouterCall {
  mandateId: string;
  assetIn: string;
  assetOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  target: string;
}

/**
 * Decodes the canonical SetldExecutionRouter.execute call.
 * execute(bytes32 mandateId, address target, address assetIn, address assetOut, uint256 amountIn, uint256 minAmountOut)
 * selector 0x... computed at call time to avoid a stale constant.
 */
export function decodeRouterCall(calldata: string): DecodedRouterCall | null {
  const body = calldata.startsWith('0x') ? calldata.slice(10) : calldata.slice(8);
  try {
    const [mandateId, target, assetIn, assetOut, amountIn, minAmountOut] = abi.decode(
      ['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'],
      '0x' + body,
    );
    return { mandateId, target, assetIn, assetOut, amountIn, minAmountOut };
  } catch {
    return null;
  }
}

interface DecodedRebalanceEvent {
  mandateId: string;
  executor: string;
  assetIn: string;
  assetOut: string;
  amountIn: bigint;
  amountOut: bigint;
}

export function decodeRebalanceEvent(
  log: { emitter: string; topics: string[]; data: string },
): DecodedRebalanceEvent | null {
  if (log.topics[0]?.toLowerCase() !== REBALANCE_EXECUTED_TOPIC0.toLowerCase()) return null;
  try {
    const [mandateId, executor, assetIn, assetOut, amountIn, amountOut] = abi.decode(
      ['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'],
      log.data,
    );
    return { mandateId, executor, assetIn, assetOut, amountIn, amountOut };
  } catch {
    return null;
  }
}

export const ROUTER_SELECTOR = '0x' +
  keccak256(Buffer.from('execute(bytes32,address,address,address,uint256,uint256)')).slice(2, 10);

/**
 * PRD 12.9 — evaluate the treasury-rebalance predicate in the exact committed order.
 * Returns a structured code plus an ordered trace; never a bare boolean.
 */
export function evaluateTreasuryRebalance(
  mandate: Mandate,
  terms: TreasuryRebalanceTerms,
  ve: VerifiedExecution,
  ctx: EvalContext,
): Evaluation {
  const trace: EvaluationStep[] = [];
  const step = (check: string, pass: boolean, expected?: string, observed?: string): boolean => {
    trace.push({ check, pass, expected, observed });
    return pass;
  };

  let code: EvaluationCode = EvaluationCode.FULFILLED;
  const call = decodeRouterCall(ve.calldata);
  const evLog = ve.logs.map(decodeRebalanceEvent).find((e): e is DecodedRebalanceEvent => e !== null) ?? null;
  const matchedLog =
    ve.logs.find((l) => decodeRebalanceEvent(l) !== null) ?? null;

  const fail = (c: EvaluationCode): Evaluation => ({
    code: c,
    traceHash: keccak256(Buffer.from(JSON.stringify(trace))),
    observedAmountIn: call?.amountIn ?? 0n,
    observedAmountOut: evLog?.amountOut ?? 0n,
    matchedLogHash: matchedLog ? keccak256(Buffer.from(JSON.stringify(matchedLog))) : keccak256('0x'),
    trace,
  });

  if (!step('source chain key', ve.sourceChainKey === mandate.sourceChainKey, String(mandate.sourceChainKey), String(ve.sourceChainKey)))
    return fail(EvaluationCode.WRONG_SOURCE_CHAIN);
  if (!step('block >= executionStartBlock', ve.blockHeight >= mandate.executionStartBlock, `>=${mandate.executionStartBlock}`, String(ve.blockHeight)))
    return fail(EvaluationCode.BEFORE_EXECUTION_START);
  if (!step('block <= executionEndBlock', ve.blockHeight <= mandate.executionEndBlock, `<=${mandate.executionEndBlock}`, String(ve.blockHeight)))
    return fail(EvaluationCode.AFTER_EXECUTION_DEADLINE);
  if (!step('sender == bound executor source address', eq(ve.txFrom, ctx.boundExecutorSourceAddress), ctx.boundExecutorSourceAddress, ve.txFrom))
    return fail(EvaluationCode.SENDER_NOT_BOUND_EXECUTOR);
  if (!step('target == router', eq(ve.txTo, terms.router), terms.router, ve.txTo))
    return fail(EvaluationCode.WRONG_TARGET);
  if (!step('selector == router.execute', ve.selector.toLowerCase() === ROUTER_SELECTOR.toLowerCase(), ROUTER_SELECTOR, ve.selector))
    return fail(EvaluationCode.WRONG_SELECTOR);
  if (!step('calldata mandateId == mandate', call !== null && call.mandateId.toLowerCase() === mandate.mandateId.toLowerCase(), mandate.mandateId, call?.mandateId))
    return fail(EvaluationCode.WRONG_MANDATE_BINDING);
  if (!step('calldata assetIn == terms.assetIn', eq(call!.assetIn, terms.assetIn), terms.assetIn, call!.assetIn))
    return fail(EvaluationCode.WRONG_ASSET_IN);
  if (!step('calldata assetOut == terms.assetOut', eq(call!.assetOut, terms.assetOut), terms.assetOut, call!.assetOut))
    return fail(EvaluationCode.WRONG_ASSET_OUT);
  if (!step('amountIn > 0', call!.amountIn > 0n, '>0', String(call!.amountIn)))
    return fail(EvaluationCode.AMOUNT_IN_ZERO);
  if (!step('amountIn <= maxAmountIn', call!.amountIn <= terms.maxAmountIn, `<=${terms.maxAmountIn}`, String(call!.amountIn)))
    return fail(EvaluationCode.AMOUNT_IN_OVER_CAP);
  if (!step('calldata minAmountOut >= terms.minAmountOut', call!.minAmountOut >= terms.minAmountOut, `>=${terms.minAmountOut}`, String(call!.minAmountOut)))
    return fail(EvaluationCode.MIN_OUT_BELOW_FLOOR);
  // Receipt status is checked AFTER call-shape so a reverted-but-well-formed attempt is
  // classified EXECUTION_REVERTED, not INVALID_ATTEMPT (PRD 12.10).
  if (!step('receipt status == success', ve.receiptStatus === 1, '1', String(ve.receiptStatus)))
    return fail(EvaluationCode.RECEIPT_REVERTED);
  if (!step('RebalanceExecuted event present', evLog !== null))
    return fail(EvaluationCode.EVENT_MISSING);
  if (!step('event emitter == terms.vault', eq(matchedLog!.emitter, terms.vault), terms.vault, matchedLog!.emitter))
    return fail(EvaluationCode.EVENT_WRONG_EMITTER);
  if (!step('event mandateId == mandate', evLog!.mandateId.toLowerCase() === mandate.mandateId.toLowerCase(), mandate.mandateId, evLog!.mandateId))
    return fail(EvaluationCode.EVENT_WRONG_MANDATE);
  if (!step('event executor == source sender', eq(evLog!.executor, ve.txFrom), ve.txFrom, evLog!.executor))
    return fail(EvaluationCode.EVENT_WRONG_EXECUTOR);
  if (!step('event amountOut >= terms.minAmountOut', evLog!.amountOut >= terms.minAmountOut, `>=${terms.minAmountOut}`, String(evLog!.amountOut)))
    return fail(EvaluationCode.EVENT_OUTPUT_BELOW_MIN);
  if (!step('source tx key unused', !ctx.consumedSourceTxKeys.has(ve.sourceTxKey), 'unused', ve.sourceTxKey))
    return fail(EvaluationCode.SOURCE_TX_ALREADY_CONSUMED);

  code = EvaluationCode.FULFILLED;
  return {
    code,
    traceHash: keccak256(Buffer.from(JSON.stringify(trace))),
    observedAmountIn: call!.amountIn,
    observedAmountOut: evLog!.amountOut,
    matchedLogHash: keccak256(Buffer.from(JSON.stringify(matchedLog))),
    trace,
  };
}

const applyPenalty = (bond: bigint, bps: number) => (bond * BigInt(bps)) / 10_000n;

/**
 * PRD 12.10 — deterministic settlement accounting. `submitter` is accepted only to prove
 * it never influences the ledger (PRD 4A.6 neutral control).
 */
export function settleFromProof(
  mandate: Mandate,
  evaluation: Evaluation,
  opts: { relayerReimbursement: bigint; protocolFeeBps: number; vaultAddress: string; feeRecipient: string; submitter: string },
): SettlementResult {
  if (mandate.state !== MandateState.ACCEPTED) {
    throw new Error(`settleFromProof requires ACCEPTED mandate, got ${mandate.state}`);
  }
  if (!mandate.acceptedExecutor) throw new Error('accepted mandate missing executor');

  const terminalState = outcomeForEvaluation(evaluation.code);
  const transfers: Transfer[] = [];
  const v = opts.vaultAddress;
  const exec = mandate.acceptedExecutor;
  const creator = mandate.creator;

  const push = (t: Transfer) => transfers.push(t);

  // Relayer reimbursement: paid for any valid proof that reaches evaluation, pass or fail,
  // capped, to whoever submitted — but the amount is fixed by the mandate, not the identity.
  if (opts.relayerReimbursement > 0n) {
    push({ asset: mandate.bondToken, from: v, to: opts.submitter, amount: opts.relayerReimbursement, reason: 'relayer-reimbursement' });
  }

  if (terminalState === MandateState.FULFILLED) {
    const fee = (mandate.rewardAmount * BigInt(opts.protocolFeeBps)) / 10_000n;
    push({ asset: mandate.rewardToken, from: v, to: exec, amount: mandate.rewardAmount - fee, reason: 'reward' });
    if (fee > 0n) push({ asset: mandate.rewardToken, from: v, to: opts.feeRecipient, amount: fee, reason: 'protocol-fee' });
    push({ asset: mandate.bondToken, from: v, to: exec, amount: mandate.executorBond, reason: 'executor-bond-return' });
    push({ asset: mandate.bondToken, from: v, to: creator, amount: mandate.creatorBond, reason: 'creator-bond-return' });
  } else {
    // INVALID_ATTEMPT or EXECUTION_REVERTED — reward refunded, penalty per schedule.
    const bps =
      terminalState === MandateState.EXECUTION_REVERTED ? PENALTY_BPS.EXECUTION_REVERTED : PENALTY_BPS.INVALID_ATTEMPT;
    const penalty = applyPenalty(mandate.executorBond, bps);
    push({ asset: mandate.rewardToken, from: v, to: creator, amount: mandate.rewardAmount, reason: 'reward-refund' });
    if (penalty > 0n) push({ asset: mandate.bondToken, from: v, to: creator, amount: penalty, reason: 'executor-bond-penalty' });
    if (mandate.executorBond - penalty > 0n)
      push({ asset: mandate.bondToken, from: v, to: exec, amount: mandate.executorBond - penalty, reason: 'executor-bond-return' });
    push({ asset: mandate.bondToken, from: v, to: creator, amount: mandate.creatorBond, reason: 'creator-bond-return' });
  }

  return {
    mandateId: mandate.mandateId,
    priorState: mandate.state,
    terminalState,
    evaluation,
    transfers,
    sourceTxKeyConsumed: null, // set by caller against the VerifiedExecution
    settlementTraceHash: keccak256(
      Buffer.from(JSON.stringify({ id: mandate.mandateId, code: evaluation.code, transfers: transfers.map(serializeTransfer) })),
    ),
  };
}

/** PRD 12.10 TIMED_OUT — permissionless finalize, no proof. */
export function settleTimeout(
  mandate: Mandate,
  opts: { vaultAddress: string },
): SettlementResult {
  if (mandate.state !== MandateState.ACCEPTED) throw new Error('timeout requires ACCEPTED');
  if (!mandate.acceptedExecutor) throw new Error('missing executor');
  const v = opts.vaultAddress;
  const penalty = applyPenalty(mandate.executorBond, PENALTY_BPS.TIMED_OUT);
  const transfers: Transfer[] = [
    { asset: mandate.rewardToken, from: v, to: mandate.creator, amount: mandate.rewardAmount, reason: 'reward-refund' },
    { asset: mandate.bondToken, from: v, to: mandate.creator, amount: penalty, reason: 'executor-bond-penalty' },
    { asset: mandate.bondToken, from: v, to: mandate.acceptedExecutor, amount: mandate.executorBond - penalty, reason: 'executor-bond-return' },
    { asset: mandate.bondToken, from: v, to: mandate.creator, amount: mandate.creatorBond, reason: 'creator-bond-return' },
  ].filter((t) => t.amount > 0n);
  return {
    mandateId: mandate.mandateId,
    priorState: mandate.state,
    terminalState: MandateState.TIMED_OUT,
    evaluation: null,
    transfers,
    sourceTxKeyConsumed: null,
    settlementTraceHash: keccak256(Buffer.from(JSON.stringify({ id: mandate.mandateId, to: 'TIMED_OUT' }))),
  };
}

function serializeTransfer(t: Transfer) {
  return { ...t, amount: t.amount.toString() };
}

/**
 * Asset conservation check (PRD 23.1). For each asset, sum of outflows from the vault must
 * equal the funds the vault held for this mandate: reward + executorBond + creatorBond +
 * relayerBudget consumed. Returns the per-asset delta; all zero means conserved.
 */
export function conservationDelta(
  mandate: Mandate,
  result: SettlementResult,
  relayerReimbursement: bigint,
): Record<string, bigint> {
  const held: Record<string, bigint> = {};
  const add = (a: string, n: bigint) => (held[a] = (held[a] ?? 0n) + n);
  add(mandate.rewardToken, mandate.rewardAmount);
  add(mandate.bondToken, mandate.executorBond + mandate.creatorBond);
  add(mandate.bondToken, relayerReimbursement);

  const paid: Record<string, bigint> = {};
  for (const t of result.transfers) paid[t.asset] = (paid[t.asset] ?? 0n) + t.amount;

  const delta: Record<string, bigint> = {};
  for (const asset of new Set([...Object.keys(held), ...Object.keys(paid)])) {
    delta[asset] = (held[asset] ?? 0n) - (paid[asset] ?? 0n);
  }
  return delta;
}
