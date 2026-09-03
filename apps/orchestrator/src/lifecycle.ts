/**
 * One complete public setld lifecycle:
 *   real Creditcoin mandate -> real executor acceptance + bond -> real Sepolia execution
 *   -> real Attestcoin proof -> real Creditcoin settlement.
 *
 * Used for Gate S8 (correct -> FULFILLED) and Gate S9 (over-cap -> INVALID_ATTEMPT with a
 * genuinely successful, Attestcoin-verifiable source transaction).
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AbiCoder,
  Contract,
  keccak256,
  toUtf8Bytes,
  EventLog,
} from 'ethers';
import { chainInfo, proofProvider, utils } from '@gluwa/usc-sdk';
import {
  cc3,
  sepolia,
  signers,
  contract,
  C,
  S,
  TEMPLATE_ID,
  SOURCE_CHAIN_KEY,
  PROOF_BUILDER,
  deployments,
} from './env.js';
import {
  evaluateTreasuryRebalance,
  settleFromProof,
  deriveSourceTxKey,
  ROUTER_SELECTOR,
} from '@setld/reference-model';
import { MandateState } from '@setld/protocol-types';

const abi = AbiCoder.defaultAbiCoder();
const ROOT = resolve(import.meta.dirname, '../../..');
const DECODER_ABI = JSON.parse(
  readFileSync(resolve(ROOT, 'node_modules/@gluwa/usc-sdk/dist/utils/evmV1DecoderAbi.json'), 'utf8'),
);

const STATE_NAMES = [
  'NONE',
  'OPEN',
  'ACCEPTED',
  'CANCELLED',
  'RELEASED',
  'FULFILLED',
  'INVALID_ATTEMPT',
  'EXECUTION_REVERTED',
  'TIMED_OUT',
];
const EVAL_NAMES = [
  'FULFILLED',
  'WRONG_SOURCE_CHAIN',
  'BEFORE_EXECUTION_START',
  'AFTER_EXECUTION_DEADLINE',
  'SENDER_NOT_BOUND_EXECUTOR',
  'WRONG_TARGET',
  'WRONG_SELECTOR',
  'WRONG_MANDATE_BINDING',
  'WRONG_ASSET_IN',
  'WRONG_ASSET_OUT',
  'AMOUNT_IN_ZERO',
  'AMOUNT_IN_OVER_CAP',
  'MIN_OUT_BELOW_FLOOR',
  'RECEIPT_REVERTED',
  'EVENT_MISSING',
  'EVENT_WRONG_EMITTER',
  'EVENT_WRONG_MANDATE',
  'EVENT_WRONG_EXECUTOR',
  'EVENT_OUTPUT_BELOW_MIN',
  'SOURCE_TX_ALREADY_CONSUMED',
];

const MAX_UINT = (1n << 256n) - 1n;
const j = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x), 2);

export interface LifecycleParams {
  label: string;
  rewardAmount: bigint;
  executorBond: bigint;
  creatorBond: bigint;
  relayerBudget: bigint;
  maxAmountIn: bigint;
  minAmountOut: bigint;
  /** actual amount the executor puts in the Sepolia call */
  execAmountIn: bigint;
  execMinOut: bigint;
  expectTerminal: keyof typeof MandateState;
  /** reuse a prior mandateId to prove replay rejection */
  replayProofFrom?: string;
}

async function ensureExecutorBound() {
  const exec = signers.cc3Executor();
  const registry = contract('SetldExecutorRegistry', C.SetldExecutorRegistry, exec);
  const sepExec = signers.sepoliaExecutor();

  let executorId: string = await registry.executorIdOf(exec.address);
  if (executorId === '0x' + '0'.repeat(64)) {
    const tx = await registry.register();
    await tx.wait();
    executorId = await registry.executorIdOf(exec.address);
    console.log(`  registered executor ${executorId}`);
  }

  const boundTo: string = await registry.boundExecutorOf(sepExec.address);
  if (boundTo === '0x' + '0'.repeat(64)) {
    const nonce: bigint = await registry.nonces(executorId);
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const domain = {
      name: 'setld',
      version: '1',
      chainId: deployments.creditcoin.chainId,
      verifyingContract: C.SetldExecutorRegistry,
    };
    const types = {
      SourceAddressBinding: [
        { name: 'executorId', type: 'bytes32' },
        { name: 'creditcoinAccount', type: 'address' },
        { name: 'sepoliaChainId', type: 'uint256' },
        { name: 'sourceAddress', type: 'address' },
        { name: 'deployment', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
      ],
    };
    const value = {
      executorId,
      creditcoinAccount: exec.address,
      sepoliaChainId: 11155111,
      sourceAddress: sepExec.address,
      deployment: C.SetldExecutorRegistry,
      nonce,
      expiry,
    };
    const sig = await sepExec.signTypedData(domain, types, value);
    const tx = await registry.bindSourceAddress(sepExec.address, nonce, expiry, sig);
    await tx.wait();
    console.log(`  bound Sepolia source ${sepExec.address}`);
  }
  return executorId;
}

async function run(p: LifecycleParams) {
  console.log(`\n=== lifecycle: ${p.label} ===`);
  const creator = signers.cc3Deployer();
  const executor = signers.cc3Executor();
  const relayer = signers.cc3Relayer();
  const sepExec = signers.sepoliaExecutor();

  const core = contract('SetldCore', C.SetldCore, creator);
  const token = contract('MockERC20', C.tSETLD, creator);
  const router = contract('SetldExecutionRouter', S.SetldExecutionRouter, sepExec);

  await ensureExecutorBound();

  // 1. create mandate
  const sepHead = await sepolia.getBlockNumber();
  const cc3Head = await cc3.getBlockNumber();
  const terms = {
    router: S.SetldExecutionRouter,
    vault: S.DemoTreasuryVault,
    assetIn: S.assetIn,
    assetOut: S.assetOut,
    maxAmountIn: p.maxAmountIn,
    minAmountOut: p.minAmountOut,
    selector: ROUTER_SELECTOR,
    routePolicyHash: keccak256(toUtf8Bytes('treasury-rebalance-v1-route')),
  };
  const econ = {
    rewardToken: C.tSETLD,
    rewardAmount: p.rewardAmount,
    bondToken: C.tSETLD,
    executorBond: p.executorBond,
    creatorBond: p.creatorBond,
    relayerBudget: p.relayerBudget,
  };
  const execStart = sepHead - 10;
  const execEnd = sepHead + 300;
  const proofDeadline = cc3Head + 500_000;
  const acceptanceDeadline = Math.floor(Date.now() / 1000) + 3600;
  const salt = BigInt(Date.now());

  if ((await token.allowance(creator.address, C.SetldVault)) < p.rewardAmount + p.creatorBond + p.relayerBudget) {
    await (await token.approve(C.SetldVault, MAX_UINT)).wait();
  }
  const createTx = await core.createMandate(
    TEMPLATE_ID,
    1,
    terms,
    econ,
    acceptanceDeadline,
    execStart,
    execEnd,
    proofDeadline,
    keccak256(toUtf8Bytes(p.label)),
    salt,
  );
  const createRc = await createTx.wait();
  const createdEv = createRc!.logs.find(
    (l: unknown): l is EventLog => l instanceof EventLog && (l as EventLog).eventName === 'MandateCreated',
  );
  const mandateId: string = createdEv!.args[0];
  console.log(`  mandate ${mandateId}  (createTx ${createTx.hash})`);

  // 2. accept + bond
  const tokenExec = token.connect(executor) as Contract;
  if ((await tokenExec.allowance(executor.address, C.SetldVault)) < p.executorBond) {
    await (await tokenExec.approve(C.SetldVault, MAX_UINT)).wait();
  }
  const acceptTx = await (core.connect(executor) as Contract).acceptMandate(mandateId);
  await acceptTx.wait();
  console.log(`  accepted + bonded (acceptTx ${acceptTx.hash})`);

  // 3. execute on Sepolia
  const execTx = await router.execute(
    mandateId,
    S.DemoTreasuryVault,
    S.assetIn,
    S.assetOut,
    p.execAmountIn,
    p.execMinOut,
  );
  const execRc = await execTx.wait();
  const sourceBlock = execRc!.blockNumber;
  console.log(
    `  Sepolia execute tx ${execTx.hash}  block ${sourceBlock}  status ${execRc!.status}  ` +
      `${deployments.sepolia.explorer}/tx/${execTx.hash}`,
  );

  // 4. Attestcoin proof
  const ci = new chainInfo.PrecompileChainInfoProvider(cc3 as never);
  console.log(`  waiting for Attestcoin to attest Sepolia block ${sourceBlock} ...`);
  await ci.waitUntilHeightAttested(SOURCE_CHAIN_KEY, sourceBlock, 5000, 600_000);
  const pb = new proofProvider.service.ProofBuilder(SOURCE_CHAIN_KEY, PROOF_BUILDER);
  const pr = await pb.getProof(execTx.hash);
  if (!pr.success || !pr.data) throw new Error(`proof failed: ${pr.error}`);
  const proof = pr.data;
  console.log(`  proof ready: header ${proof.headerNumber} txIndex ${proof.txIndex} cached ${proof.cached}`);

  // 5. decode VE + independent reference-model expectation
  const decoder = new Contract(deployments.creditcoin.attestcoin.evmV1Decoder, DECODER_ABI, cc3);
  const dec = await utils.decoder.decodeEvmV1Transaction(proof.txBytes, decoder);
  const d = dec.data;
  const ve = {
    sourceChainKey: SOURCE_CHAIN_KEY,
    blockHeight: proof.headerNumber,
    transactionIndex: proof.txIndex,
    sourceTxKey: deriveSourceTxKey(SOURCE_CHAIN_KEY, proof.headerNumber, proof.txIndex),
    txFrom: d.commonTx.from,
    txTo: d.commonTx.to,
    txToIsNull: d.commonTx.toIsNull,
    txValue: d.commonTx.value,
    selector: d.commonTx.data.slice(0, 10),
    calldata: d.commonTx.data,
    receiptStatus: d.receipt.receiptStatus,
    receiptGasUsed: d.receipt.receiptGasUsed,
    logs: d.receipt.receiptLogs.map((l: { address_: string; topics: string[]; data: string }) => ({
      emitter: l.address_,
      topics: l.topics,
      data: l.data,
    })),
  };
  const mandateOnChain = await (core.connect(relayer) as Contract).getMandate(mandateId);
  const refEval = evaluateTreasuryRebalance(
    {
      mandateId,
      creator: creator.address,
      templateId: TEMPLATE_ID,
      templateVersion: 1,
      sourceChainKey: SOURCE_CHAIN_KEY,
      sourceTarget: S.SetldExecutionRouter,
      acceptedExecutor: executor.address,
      acceptedSourceSender: sepExec.address,
      rewardToken: C.tSETLD,
      rewardAmount: p.rewardAmount,
      bondToken: C.tSETLD,
      executorBond: p.executorBond,
      creatorBond: p.creatorBond,
      relayerBudget: p.relayerBudget,
      acceptanceDeadline,
      executionStartBlock: Number(mandateOnChain.executionStartBlock),
      executionEndBlock: Number(mandateOnChain.executionEndBlock),
      proofDeadline,
      termsHash: mandateOnChain.termsHash,
      metadataHash: mandateOnChain.metadataHash,
      state: MandateState.ACCEPTED,
    },
    { ...terms },
    ve as never,
    { boundExecutorSourceAddress: sepExec.address, consumedSourceTxKeys: new Set(p.replayProofFrom ? [ve.sourceTxKey] : []) },
  );
  console.log(`  reference model predicts: ${refEval.code}`);

  // 6. settle from the relayer (distinct address -> proves neutrality)
  const mp = {
    root: proof.merkleProof.root,
    siblings: proof.merkleProof.siblings.map((s: { hash: string; isLeft: boolean }) => ({
      hash: s.hash,
      isLeft: s.isLeft,
    })),
  };
  const cp = {
    lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest,
    roots: proof.continuityProof.roots,
  };

  let settleTx;
  let settleRc;
  let settledEvent: { code: string; failedStep: number; terminalState: string; sourceTxKey: string } | null = null;
  let settleError: string | null = null;
  try {
    settleTx = await (core.connect(relayer) as Contract).settle(
      mandateId,
      proof.chainKey,
      proof.headerNumber,
      proof.txBytes,
      mp,
      cp,
    );
    settleRc = await settleTx.wait();
    const ev = settleRc!.logs.find(
      (l: unknown): l is EventLog => l instanceof EventLog && (l as EventLog).eventName === 'MandateSettled',
    );
    settledEvent = {
      code: EVAL_NAMES[Number(ev!.args[2])] ?? String(ev!.args[2]),
      failedStep: Number(ev!.args[3]),
      terminalState: STATE_NAMES[Number(ev!.args[1])] ?? String(ev!.args[1]),
      sourceTxKey: ev!.args[4],
    };
    console.log(
      `  settled: ${settledEvent.terminalState} (${settledEvent.code}, step ${settledEvent.failedStep})  ` +
        `settleTx ${settleTx.hash}`,
    );
  } catch (e) {
    settleError = (e as Error).message;
    console.log(`  settle reverted: ${settleError}`);
  }

  const finalMandate = await (core.connect(relayer) as Contract).getMandate(mandateId);
  const finalStateName = STATE_NAMES[Number(finalMandate.state)];

  // 7. record evidence
  const evidence = {
    label: p.label,
    recordedAt: new Date().toISOString(),
    network: { creditcoin: deployments.creditcoin.chainId, sepolia: deployments.sepolia.chainId },
    mandateId,
    params: j(p),
    transactions: {
      createMandate: createTx.hash,
      acceptAndBond: acceptTx.hash,
      sepoliaExecute: execTx.hash,
      sepoliaExecuteExplorer: `${deployments.sepolia.explorer}/tx/${execTx.hash}`,
      settle: settleTx?.hash ?? null,
    },
    sourceExecution: {
      block: sourceBlock,
      receiptStatus: execRc!.status,
      note: execRc!.status === 1 ? 'Ethereum transaction SUCCEEDED' : 'Ethereum transaction REVERTED',
    },
    attestcoinProof: {
      chainKey: proof.chainKey,
      headerNumber: proof.headerNumber,
      transactionIndex: proof.txIndex,
      txHash: proof.txHash,
      cached: proof.cached,
      generatedAt: proof.generatedAt,
      merkleRoot: proof.merkleProof.root,
      continuityRoots: proof.continuityProof.roots.length,
    },
    verifiedExecution: JSON.parse(j(ve)),
    referenceModelPrediction: refEval.code,
    onChainSettlement: settledEvent,
    settleError,
    finalState: finalStateName,
    expectedTerminal: p.expectTerminal,
    match: settleError
      ? p.expectTerminal === 'INVALID_ATTEMPT' && p.replayProofFrom
        ? 'replay-rejected-as-expected'
        : 'unexpected-revert'
      : settledEvent?.terminalState === p.expectTerminal && refEval.code === settledEvent?.code
        ? 'PASS'
        : 'MISMATCH',
  };

  mkdirSync(resolve(ROOT, 'evidence/completed-mandates'), { recursive: true });
  writeFileSync(
    resolve(ROOT, `evidence/completed-mandates/${p.label}.json`),
    JSON.stringify(evidence, null, 2) + '\n',
  );
  console.log(`  -> evidence/completed-mandates/${p.label}.json  [${evidence.match}]`);
  return evidence;
}

export { run };
