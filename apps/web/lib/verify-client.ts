'use client';
/**
 * Browser-side independent verification of a canonical setld mandate (PRD 12.11 / 23A.4).
 * Uses only public RPC + a bundled Attestcoin proof snapshot — no server, no wallet, no
 * proof-builder call at runtime. Re-runs verifySingle on the Creditcoin BlockProver
 * precompile, re-decodes the proven bytes via the deployed EvmV1Decoder, re-runs the
 * treasury-rebalance predicate, and checks value conservation from the settlement receipt.
 */
import { JsonRpcProvider, Contract, keccak256, solidityPacked, getAddress, AbiCoder, formatEther, toUtf8Bytes } from 'ethers';
import facts from '../data/submission-facts.json';
import decoderAbi from '../data/evmV1DecoderAbi.json';
import blockProverAbi from '../data/block_prover.json';
import correctProof from '../data/proofs/canonical-correct.json';
import wrongProof from '../data/proofs/canonical-wrong-cap.json';

const CC3_RPC = (facts as { networks: { creditcoin: { rpc: string; chainId: number } } }).networks.creditcoin.rpc;
const C = (facts as { contracts: { creditcoin: Record<string, string>; sepolia: Record<string, string> } }).contracts;
const DECODER = (facts as { attestcoin: Record<string, string> }).attestcoin.evmV1Decoder;
const BLOCK_PROVER = '0x0000000000000000000000000000000000000FD2';
const CHAIN_KEY = 1;
const abi = AbiCoder.defaultAbiCoder();

const PROOFS: Record<string, typeof correctProof> = {
  '0x907043a3e8db72db45e0fd737b69d8975a53570487ff1b4c47f3db3cc1fb9598': correctProof,
  '0xc28c59bac1c4ca108af0361c0cf27820a0455c57eff53ab05b3f9da3fe5e9360': wrongProof,
};
const SETTLE_TX: Record<string, string> = {
  '0x907043a3e8db72db45e0fd737b69d8975a53570487ff1b4c47f3db3cc1fb9598':
    '0x56f0addefd9ac86220f02dbb6c0f8fa72c7461a23727ce2b6ede0101030dad4b',
  '0xc28c59bac1c4ca108af0361c0cf27820a0455c57eff53ab05b3f9da3fe5e9360':
    '0x20f9e00ec36861521edeb410c1f3aa84cb5dec831026d463cd04842268841fc9',
};

const CORE_ABI = [
  'function getMandate(bytes32) view returns (tuple(address creator, bytes32 templateId, uint32 templateVersion, uint64 sourceChainKey, uint64 acceptanceDeadline, uint64 executionStartBlock, uint64 executionEndBlock, uint64 proofDeadline, address acceptedExecutor, bytes32 acceptedExecutorId, address acceptedSourceSender, bytes32 termsHash, bytes32 metadataHash, uint8 state, tuple(address rewardToken, uint256 rewardAmount, address bondToken, uint256 executorBond, uint256 creatorBond, uint256 relayerBudget) econ))',
  'function getTerms(bytes32) view returns (tuple(address router, address vault, address assetIn, address assetOut, uint256 maxAmountIn, uint256 minAmountOut, bytes4 selector, bytes32 routePolicyHash))',
  'event MandateSettled(bytes32 indexed mandateId, uint8 terminalState, uint8 evaluationCode, uint8 failedStep, bytes32 sourceTxKey, bytes32 settlementTraceHash)',
];
const VAULT_ABI = ['event Paid(bytes32 indexed mandateId, address indexed asset, address indexed to, uint256 amount, bytes32 reason)'];
const EVAL = ['FULFILLED','WRONG_SOURCE_CHAIN','BEFORE_EXECUTION_START','AFTER_EXECUTION_DEADLINE','SENDER_NOT_BOUND_EXECUTOR','WRONG_TARGET','WRONG_SELECTOR','WRONG_MANDATE_BINDING','WRONG_ASSET_IN','WRONG_ASSET_OUT','AMOUNT_IN_ZERO','AMOUNT_IN_OVER_CAP','MIN_OUT_BELOW_FLOOR','RECEIPT_REVERTED','EVENT_MISSING','EVENT_WRONG_EMITTER','EVENT_WRONG_MANDATE','EVENT_WRONG_EXECUTOR','EVENT_OUTPUT_BELOW_MIN','SOURCE_TX_ALREADY_CONSUMED'];
const STATE = ['NONE', 'OPEN', 'ACCEPTED', 'CANCELLED', 'RELEASED', 'FULFILLED', 'INVALID_ATTEMPT', 'EXECUTION_REVERTED', 'TIMED_OUT'];

const ROUTER_SELECTOR = '0x' + keccak256(toUtf8Bytes('execute(bytes32,address,address,address,uint256,uint256)')).slice(2, 10);
const REBALANCE_SIG = keccak256(toUtf8Bytes('RebalanceExecuted(bytes32,address,address,address,uint256,uint256)'));
const eq = (a: string, b: string) => { try { return getAddress(a) === getAddress(b); } catch { return a?.toLowerCase() === b?.toLowerCase(); } };
const key = (h: number, i: number) => keccak256(solidityPacked(['uint64', 'uint64', 'uint32'], [CHAIN_KEY, h, i]));

export interface ClientCheck { name: string; pass: boolean; detail: string }
export interface ClientVerifyResult {
  mandateId: string;
  checks: ClientCheck[];
  result: 'match' | 'mismatch' | 'unavailable';
  evidence: Record<string, unknown>;
}

export async function verifyInBrowser(mandateId: string): Promise<ClientVerifyResult> {
  const id = mandateId.trim().toLowerCase();
  const checks: ClientCheck[] = [];
  const ok = (name: string, pass: boolean, detail = '') => checks.push({ name, pass, detail });
  const proof = PROOFS[id];
  const settleTx = SETTLE_TX[id];
  if (!proof || !settleTx) {
    return { mandateId, checks, result: 'unavailable', evidence: { note: 'This surface bundles the two canonical demo proofs. Run `pnpm verify:mandate` from the repo for any other mandate.' } };
  }

  const cc3 = new JsonRpcProvider(CC3_RPC, undefined, { staticNetwork: true });
  const core = new Contract(C.creditcoin.SetldCore, CORE_ABI, cc3);
  const m = await core.getMandate(id);
  const terms = await core.getTerms(id);
  ok('mandate is terminal', ['FULFILLED', 'INVALID_ATTEMPT', 'EXECUTION_REVERTED', 'TIMED_OUT'].includes(STATE[Number(m.state)]!), STATE[Number(m.state)]!);

  const settleRc = await cc3.getTransactionReceipt(settleTx);
  const settled = settleRc!.logs.map((l) => { try { return core.interface.parseLog(l); } catch { return null; } }).find((p) => p?.name === 'MandateSettled');
  const onChainCode = Number(settled!.args[2]);
  const onChainStep = Number(settled!.args[3]);
  const onChainKey = settled!.args[4] as string;

  // re-verify the Attestcoin proof on-chain (eth_call to the precompile)
  const prover = new Contract(BLOCK_PROVER, blockProverAbi as never, cc3);
  const mp = { root: proof.merkleProof.root, siblings: proof.merkleProof.siblings.map((s: { hash: string; isLeft: boolean }) => ({ hash: s.hash, isLeft: s.isLeft })) };
  const cp = { lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest, roots: proof.continuityProof.roots };
  const verified: boolean = await prover.getFunction('verify(uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))').staticCall(
    proof.chainKey, proof.headerNumber, proof.txBytes, mp, cp,
  );
  ok('Attestcoin proof re-verifies on the Creditcoin precompile', verified === true, `verify() = ${verified}`);

  const derived = key(proof.headerNumber, proof.txIndex);
  ok('sourceTxKey matches the settlement', derived.toLowerCase() === onChainKey.toLowerCase(), derived);

  // decode the proven bytes via the deployed EvmV1Decoder (eth_call)
  const decoder = new Contract(DECODER, decoderAbi as never, cc3);
  const common = await decoder.decodeCommonTxFields.staticCall(proof.txBytes);
  const receipt = await decoder.decodeReceiptFields.staticCall(proof.txBytes);
  const cd: string = common.data;
  const from: string = common.from;
  const to: string = common.to;
  const status = Number(receipt.receiptStatus);
  const logs = receipt.receiptLogs as { address_: string; topics: string[]; data: string }[];

  // inline predicate (mirrors reference model order)
  let refCode = 'FULFILLED';
  try {
    const [cMandate, , cIn, cOut, cAmt, cMinOut] = abi.decode(['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'], '0x' + cd.slice(10));
    const log = logs.find((l) => l.topics[0]?.toLowerCase() === REBALANCE_SIG.toLowerCase());
    if (proof.headerNumber < Number(m.executionStartBlock)) refCode = 'BEFORE_EXECUTION_START';
    else if (proof.headerNumber > Number(m.executionEndBlock)) refCode = 'AFTER_EXECUTION_DEADLINE';
    else if (!eq(from, m.acceptedSourceSender)) refCode = 'SENDER_NOT_BOUND_EXECUTOR';
    else if (!eq(to, terms.router)) refCode = 'WRONG_TARGET';
    else if (cd.slice(0, 10).toLowerCase() !== ROUTER_SELECTOR.toLowerCase()) refCode = 'WRONG_SELECTOR';
    else if (cMandate.toLowerCase() !== id) refCode = 'WRONG_MANDATE_BINDING';
    else if (!eq(cIn, terms.assetIn)) refCode = 'WRONG_ASSET_IN';
    else if (!eq(cOut, terms.assetOut)) refCode = 'WRONG_ASSET_OUT';
    else if (cAmt === 0n) refCode = 'AMOUNT_IN_ZERO';
    else if (cAmt > terms.maxAmountIn) refCode = 'AMOUNT_IN_OVER_CAP';
    else if (cMinOut < terms.minAmountOut) refCode = 'MIN_OUT_BELOW_FLOOR';
    else if (status !== 1) refCode = 'RECEIPT_REVERTED';
    else if (!log) refCode = 'EVENT_MISSING';
    else if (!eq(log.address_, terms.vault)) refCode = 'EVENT_WRONG_EMITTER';
    else {
      const [eM, eEx, , , , eOut] = abi.decode(['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'], log.data);
      if (eM.toLowerCase() !== id) refCode = 'EVENT_WRONG_MANDATE';
      else if (!eq(eEx, from)) refCode = 'EVENT_WRONG_EXECUTOR';
      else if (eOut < terms.minAmountOut) refCode = 'EVENT_OUTPUT_BELOW_MIN';
    }
  } catch {
    refCode = 'DECODE_FAILED';
  }
  ok('independent predicate matches the on-chain classification', refCode === EVAL[onChainCode], `independent=${refCode} on-chain=${EVAL[onChainCode]} (step ${onChainStep})`);

  const vault = new Contract(C.creditcoin.SetldVault, VAULT_ABI, cc3);
  let paid = 0n;
  for (const l of settleRc!.logs) {
    try {
      const p = vault.interface.parseLog(l);
      if (p && p.args[0].toLowerCase() === id) paid += p.args[3] as bigint;
    } catch { /* skip */ }
  }
  const escrow = m.econ.rewardAmount + m.econ.executorBond + m.econ.creatorBond + m.econ.relayerBudget;
  ok('settlement conserves the escrow', paid === escrow, `paid ${formatEther(paid)} == escrowed ${formatEther(escrow)}`);

  const allPass = checks.every((c) => c.pass);
  return {
    mandateId,
    checks,
    result: allPass ? 'match' : 'mismatch',
    evidence: {
      finalState: STATE[Number(m.state)],
      settlementTx: settleTx,
      sourceTx: proof.txHash,
      onChainClassification: EVAL[onChainCode],
      independentClassification: refCode,
      attestcoinProof: { header: proof.headerNumber, txIndex: proof.txIndex, verifySingle: verified },
      sourceTxKey: derived,
      escrowedWei: escrow.toString(),
      paidOutWei: paid.toString(),
    },
  };
}
