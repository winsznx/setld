/**
 * Self-contained settlement verifier for the deployed web surface (mirrors
 * packages/verifier — PRD 12.11 / 23A.4). Uses only npm deps (ethers + @gluwa/usc-sdk)
 * so apps/web deploys without the workspace.
 */
import { JsonRpcProvider, Contract, keccak256, solidityPacked, getAddress, formatEther, AbiCoder } from 'ethers';
import { chainInfo, blockProver, proofProvider, utils } from '@gluwa/usc-sdk';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const facts = JSON.parse(
  readFileSync(
    existsSync(resolve(process.cwd(), 'data/submission-facts.json'))
      ? resolve(process.cwd(), 'data/submission-facts.json')
      : resolve(process.cwd(), '../../evidence/submission-facts.json'),
    'utf8',
  ),
);
const DECODER_ABI = JSON.parse(
  readFileSync(resolve(process.cwd(), 'node_modules/@gluwa/usc-sdk/dist/utils/evmV1DecoderAbi.json'), 'utf8'),
);

const CC3_RPC = facts.networks.creditcoin.rpc;
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const PROOF_BUILDER = facts.attestcoin.proofBuilder;
const CHAIN_KEY = 1;
const abi = AbiCoder.defaultAbiCoder();

const CORE_ABI = [
  'function getMandate(bytes32) view returns (tuple(address creator, bytes32 templateId, uint32 templateVersion, uint64 sourceChainKey, uint64 acceptanceDeadline, uint64 executionStartBlock, uint64 executionEndBlock, uint64 proofDeadline, address acceptedExecutor, bytes32 acceptedExecutorId, address acceptedSourceSender, bytes32 termsHash, bytes32 metadataHash, uint8 state, tuple(address rewardToken, uint256 rewardAmount, address bondToken, uint256 executorBond, uint256 creatorBond, uint256 relayerBudget) econ))',
  'function getTerms(bytes32) view returns (tuple(address router, address vault, address assetIn, address assetOut, uint256 maxAmountIn, uint256 minAmountOut, bytes4 selector, bytes32 routePolicyHash))',
  'event MandateSettled(bytes32 indexed mandateId, uint8 terminalState, uint8 evaluationCode, uint8 failedStep, bytes32 sourceTxKey, bytes32 settlementTraceHash)',
];
const VAULT_ABI = ['event Paid(bytes32 indexed mandateId, address indexed asset, address indexed to, uint256 amount, bytes32 reason)'];
const STATE = ['NONE', 'OPEN', 'ACCEPTED', 'CANCELLED', 'RELEASED', 'FULFILLED', 'INVALID_ATTEMPT', 'EXECUTION_REVERTED', 'TIMED_OUT'];
const EVAL = ['FULFILLED','WRONG_SOURCE_CHAIN','BEFORE_EXECUTION_START','AFTER_EXECUTION_DEADLINE','SENDER_NOT_BOUND_EXECUTOR','WRONG_TARGET','WRONG_SELECTOR','WRONG_MANDATE_BINDING','WRONG_ASSET_IN','WRONG_ASSET_OUT','AMOUNT_IN_ZERO','AMOUNT_IN_OVER_CAP','MIN_OUT_BELOW_FLOOR','RECEIPT_REVERTED','EVENT_MISSING','EVENT_WRONG_EMITTER','EVENT_WRONG_MANDATE','EVENT_WRONG_EXECUTOR','EVENT_OUTPUT_BELOW_MIN','SOURCE_TX_ALREADY_CONSUMED'];

const ROUTER_SELECTOR = '0x' + keccak256(Buffer.from('execute(bytes32,address,address,address,uint256,uint256)')).slice(2, 10);
const REBALANCE_SIG = keccak256(Buffer.from('RebalanceExecuted(bytes32,address,address,address,uint256,uint256)'));
const eq = (a: string, b: string) => { try { return getAddress(a) === getAddress(b); } catch { return a?.toLowerCase() === b?.toLowerCase(); } };
const key = (h: number, i: number) => keccak256(solidityPacked(['uint64', 'uint64', 'uint32'], [CHAIN_KEY, h, i]));

interface Check { name: string; pass: boolean; detail: string }

const DEMOS: Record<string, { sepoliaExecute: string; settle: string }> = {};
for (const v of Object.values(facts.canonicalDemoTransactions) as { mandateId?: string; sepoliaExecute?: string; creditcoinSettle?: string }[]) {
  if (v.mandateId && v.sepoliaExecute && v.creditcoinSettle) DEMOS[v.mandateId.toLowerCase()] = { sepoliaExecute: v.sepoliaExecute, settle: v.creditcoinSettle };
}

export async function verifyStandalone(mandateId: string) {
  const checks: Check[] = [];
  const ok = (name: string, pass: boolean, detail = '') => checks.push({ name, pass, detail });
  const cc3 = new JsonRpcProvider(CC3_RPC, facts.networks.creditcoin.chainId, { staticNetwork: true });
  const sep = new JsonRpcProvider(SEPOLIA_RPC, 11155111, { staticNetwork: true });
  const core = new Contract(facts.contracts.creditcoin.SetldCore, CORE_ABI, cc3);

  const m = await core.getMandate(mandateId);
  const terms = await core.getTerms(mandateId);
  const finalState = STATE[Number(m.state)]!;
  ok('mandate is terminal', ['FULFILLED', 'INVALID_ATTEMPT', 'EXECUTION_REVERTED', 'TIMED_OUT', 'CANCELLED', 'RELEASED'].includes(finalState), finalState);

  const demo = DEMOS[mandateId.toLowerCase()];
  if (!demo) return { mandateId, checks, result: 'evidence-unavailable' as const, evidence: { finalState, note: 'source/settlement tx not known for this mandate on the deployed surface' } };

  const settleRc = await cc3.getTransactionReceipt(demo.settle);
  const settled = settleRc!.logs.map((l) => { try { return core.interface.parseLog(l); } catch { return null; } }).find((p) => p?.name === 'MandateSettled');
  const onChainCode = Number(settled!.args[2]);
  const onChainStep = Number(settled!.args[3]);
  const onChainKey = settled!.args[4] as string;

  const ci = new chainInfo.PrecompileChainInfoProvider(cc3 as never);
  const latest = await ci.getLatestAttestedHeightAndHash(CHAIN_KEY);
  const sepRc = await sep.getTransactionReceipt(demo.sepoliaExecute);
  ok('source block within attested range', Number(latest.height) >= (sepRc?.blockNumber ?? 0), `block ${sepRc?.blockNumber} <= ${latest.height}`);

  const pb = new proofProvider.service.ProofBuilder(CHAIN_KEY, PROOF_BUILDER);
  const pr = await pb.getProof(demo.sepoliaExecute);
  if (!pr.success || !pr.data) return { mandateId, checks, result: 'evidence-unavailable' as const, evidence: { finalState, note: `proof builder: ${pr.error}` } };
  const proof = pr.data;

  const prover = new blockProver.PrecompileBlockProver(cc3 as never);
  const verified = await prover.verifySingle(proof.chainKey, proof.headerNumber, proof.txBytes, proof.merkleProof, proof.continuityProof);
  ok('Attestcoin proof re-verifies on-chain', verified === true, `verifySingle=${verified}`);

  const derived = key(proof.headerNumber, proof.txIndex);
  ok('sourceTxKey matches settlement', derived.toLowerCase() === onChainKey.toLowerCase(), derived);

  const decoder = new Contract(facts.attestcoin.evmV1Decoder, DECODER_ABI, cc3);
  const dec = await utils.decoder.decodeEvmV1Transaction(proof.txBytes, decoder);
  const d = dec.data;

  // inline treasury-rebalance predicate (mirrors reference model order)
  const cd = d.commonTx.data as string;
  const body = '0x' + cd.slice(10);
  let refCode = 'FULFILLED';
  try {
    const [cMandate, , cIn, cOut, cAmt, cMinOut] = abi.decode(['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'], body);
    const log = d.receipt.receiptLogs.find((l: { topics: string[] }) => l.topics[0]?.toLowerCase() === REBALANCE_SIG.toLowerCase());
    const startB = Number(m.executionStartBlock);
    const endB = Number(m.executionEndBlock);
    if (proof.headerNumber < startB) refCode = 'BEFORE_EXECUTION_START';
    else if (proof.headerNumber > endB) refCode = 'AFTER_EXECUTION_DEADLINE';
    else if (!eq(d.commonTx.from, m.acceptedSourceSender)) refCode = 'SENDER_NOT_BOUND_EXECUTOR';
    else if (!eq(d.commonTx.to, terms.router)) refCode = 'WRONG_TARGET';
    else if (cd.slice(0, 10).toLowerCase() !== ROUTER_SELECTOR.toLowerCase()) refCode = 'WRONG_SELECTOR';
    else if (cMandate.toLowerCase() !== mandateId.toLowerCase()) refCode = 'WRONG_MANDATE_BINDING';
    else if (!eq(cIn, terms.assetIn)) refCode = 'WRONG_ASSET_IN';
    else if (!eq(cOut, terms.assetOut)) refCode = 'WRONG_ASSET_OUT';
    else if (cAmt === 0n) refCode = 'AMOUNT_IN_ZERO';
    else if (cAmt > terms.maxAmountIn) refCode = 'AMOUNT_IN_OVER_CAP';
    else if (cMinOut < terms.minAmountOut) refCode = 'MIN_OUT_BELOW_FLOOR';
    else if (d.receipt.receiptStatus !== 1) refCode = 'RECEIPT_REVERTED';
    else if (!log) refCode = 'EVENT_MISSING';
    else if (!eq(log.address_, terms.vault)) refCode = 'EVENT_WRONG_EMITTER';
    else {
      const [eM, eEx, , , , eOut] = abi.decode(['bytes32', 'address', 'address', 'address', 'uint256', 'uint256'], log.data);
      if (eM.toLowerCase() !== mandateId.toLowerCase()) refCode = 'EVENT_WRONG_MANDATE';
      else if (!eq(eEx, d.commonTx.from)) refCode = 'EVENT_WRONG_EXECUTOR';
      else if (eOut < terms.minAmountOut) refCode = 'EVENT_OUTPUT_BELOW_MIN';
    }
  } catch {
    refCode = 'WRONG_MANDATE_BINDING';
  }
  ok('independent predicate matches on-chain classification', refCode === EVAL[onChainCode], `independent=${refCode} on-chain=${EVAL[onChainCode]} (step ${onChainStep})`);

  const vault = new Contract(facts.contracts.creditcoin.SetldVault, VAULT_ABI, cc3);
  let paid = 0n;
  for (const l of settleRc!.logs) {
    try {
      const p = vault.interface.parseLog(l);
      if (p && p.args[0].toLowerCase() === mandateId.toLowerCase()) paid += p.args[3] as bigint;
    } catch { /* skip */ }
  }
  const escrow = m.econ.rewardAmount + m.econ.executorBond + m.econ.creatorBond + m.econ.relayerBudget;
  ok('settlement conserves escrow', paid === escrow, `paid ${formatEther(paid)} == escrowed ${formatEther(escrow)}`);

  const allPass = checks.every((c) => c.pass);
  return {
    mandateId,
    checks,
    result: (allPass ? 'match' : 'mismatch') as 'match' | 'mismatch',
    evidence: {
      finalState,
      settlementTx: demo.settle,
      sourceTx: demo.sepoliaExecute,
      onChainClassification: EVAL[onChainCode],
      independentClassification: refCode,
      attestcoinProof: { header: proof.headerNumber, txIndex: proof.txIndex, verifySingle: verified },
      sourceTxKey: derived,
      escrowedWei: escrow.toString(),
      paidOutWei: paid.toString(),
    },
  };
}
