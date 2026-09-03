/**
 * Canonical setld protocol type definitions.
 *
 * These types are the shared contract between the Solidity contracts, the executable
 * reference model, the reporter baseline, the agent SDK, the relayer and the web product.
 * Field names mirror PRD section 14 (canonical data structures). Where the PRD names a
 * "logical field, not an assumed ABI", the concrete shape here is pinned against the
 * S0/S1 evidence in `evidence/manifests/environment.json`.
 */

export const CREDITCOIN_CC3_CHAIN_ID = 102031; // D4: live-discovered, 0x18e8f
export const SEPOLIA_CHAIN_KEY = 1; // S0: get_supported_chains()
export const ETHEREUM_CHAIN_KEY = 3;
export const EVM_V1_DECODER_CC3 = '0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f';
export const BLOCK_PROVER_PRECOMPILE = '0x0000000000000000000000000000000000000FD2';
export const CHAIN_INFO_PRECOMPILE = '0x0000000000000000000000000000000000000fd3';

/** PRD 15.1 mandate state machine. */
export enum MandateState {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  ACCEPTED = 'ACCEPTED',
  CANCELLED = 'CANCELLED',
  RELEASED = 'RELEASED',
  FULFILLED = 'FULFILLED',
  INVALID_ATTEMPT = 'INVALID_ATTEMPT',
  EXECUTION_REVERTED = 'EXECUTION_REVERTED',
  TIMED_OUT = 'TIMED_OUT',
  INVALIDATED = 'INVALIDATED',
}

export const TERMINAL_STATES: ReadonlySet<MandateState> = new Set([
  MandateState.CANCELLED,
  MandateState.RELEASED,
  MandateState.FULFILLED,
  MandateState.INVALID_ATTEMPT,
  MandateState.EXECUTION_REVERTED,
  MandateState.TIMED_OUT,
  MandateState.INVALIDATED,
]);

/** PRD 12.9 — structured predicate result codes. Not a boolean (PRD 12.9 last line). */
export enum EvaluationCode {
  FULFILLED = 'FULFILLED',
  WRONG_SOURCE_CHAIN = 'WRONG_SOURCE_CHAIN',
  BEFORE_EXECUTION_START = 'BEFORE_EXECUTION_START',
  AFTER_EXECUTION_DEADLINE = 'AFTER_EXECUTION_DEADLINE',
  SENDER_NOT_BOUND_EXECUTOR = 'SENDER_NOT_BOUND_EXECUTOR',
  WRONG_TARGET = 'WRONG_TARGET',
  WRONG_SELECTOR = 'WRONG_SELECTOR',
  WRONG_MANDATE_BINDING = 'WRONG_MANDATE_BINDING',
  WRONG_ASSET_IN = 'WRONG_ASSET_IN',
  WRONG_ASSET_OUT = 'WRONG_ASSET_OUT',
  AMOUNT_IN_ZERO = 'AMOUNT_IN_ZERO',
  AMOUNT_IN_OVER_CAP = 'AMOUNT_IN_OVER_CAP',
  MIN_OUT_BELOW_FLOOR = 'MIN_OUT_BELOW_FLOOR',
  RECEIPT_REVERTED = 'RECEIPT_REVERTED',
  EVENT_MISSING = 'EVENT_MISSING',
  EVENT_WRONG_EMITTER = 'EVENT_WRONG_EMITTER',
  EVENT_WRONG_MANDATE = 'EVENT_WRONG_MANDATE',
  EVENT_WRONG_EXECUTOR = 'EVENT_WRONG_EXECUTOR',
  EVENT_OUTPUT_BELOW_MIN = 'EVENT_OUTPUT_BELOW_MIN',
  SOURCE_TX_ALREADY_CONSUMED = 'SOURCE_TX_ALREADY_CONSUMED',
}

/** Which terminal state a given evaluation code drives (PRD 12.10). */
export function outcomeForEvaluation(code: EvaluationCode): MandateState {
  if (code === EvaluationCode.FULFILLED) return MandateState.FULFILLED;
  if (code === EvaluationCode.RECEIPT_REVERTED) return MandateState.EXECUTION_REVERTED;
  return MandateState.INVALID_ATTEMPT;
}

/** PRD 14.1 */
export interface Mandate {
  mandateId: string;
  creator: string;
  templateId: string;
  templateVersion: number;
  sourceChainKey: number;
  sourceTarget: string;
  acceptedExecutor: string | null;
  acceptedSourceSender: string | null;
  rewardToken: string;
  rewardAmount: bigint;
  bondToken: string;
  executorBond: bigint;
  creatorBond: bigint;
  relayerBudget: bigint;
  acceptanceDeadline: number;
  executionStartBlock: number;
  executionEndBlock: number;
  proofDeadline: number;
  termsHash: string;
  metadataHash: string;
  state: MandateState;
}

/** PRD 14.2 */
export interface TreasuryRebalanceTerms {
  router: string;
  vault: string;
  assetIn: string;
  assetOut: string;
  maxAmountIn: bigint;
  minAmountOut: bigint;
  selector: string; // bytes4
  routePolicyHash: string;
}

/** PRD 14.3 — shape pinned to the S0/S1 decoder output (D2). */
export interface VerifiedLog {
  emitter: string;
  topics: string[];
  data: string;
}

export interface VerifiedExecution {
  sourceChainKey: number;
  blockHeight: number;
  transactionIndex: number;
  sourceTxKey: string; // keccak256(abi.encodePacked(uint64,uint64,uint32))
  txFrom: string;
  txTo: string;
  txToIsNull: boolean;
  txValue: bigint;
  selector: string; // bytes4, data[0:4]
  calldata: string; // full data
  receiptStatus: number; // 0 | 1
  receiptGasUsed: bigint;
  logs: VerifiedLog[];
}

/** PRD 14.4 */
export interface Evaluation {
  code: EvaluationCode;
  traceHash: string;
  observedAmountIn: bigint;
  observedAmountOut: bigint;
  matchedLogHash: string;
  /** Ordered per-condition trace. PRD 12.9: "must not return only a boolean." */
  trace: EvaluationStep[];
}

export interface EvaluationStep {
  check: string;
  pass: boolean;
  expected?: string;
  observed?: string;
}

/** Settlement transfer ledger entry produced by the reference model and the settlement engine. */
export interface Transfer {
  asset: string;
  from: string;
  to: string;
  amount: bigint;
  reason:
    | 'reward'
    | 'executor-bond-return'
    | 'executor-bond-penalty'
    | 'creator-bond-return'
    | 'reward-refund'
    | 'relayer-reimbursement'
    | 'protocol-fee'
    | 'creation-fee'
    | 'reservation-penalty';
}

export interface SettlementResult {
  mandateId: string;
  priorState: MandateState;
  terminalState: MandateState;
  evaluation: Evaluation | null;
  transfers: Transfer[];
  sourceTxKeyConsumed: string | null;
  settlementTraceHash: string;
}

/** PRD 16.4 default first-template penalty schedule (bps of executor bond). Gate S7 may tune. */
export const PENALTY_BPS = {
  FULFILLED: 0,
  INVALID_ATTEMPT: 10_000,
  EXECUTION_REVERTED: 2_500,
  TIMED_OUT: 5_000,
  RELEASED: 1_000,
} as const;
