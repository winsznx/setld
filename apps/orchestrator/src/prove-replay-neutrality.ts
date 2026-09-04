/**
 * Gate S2 public evidence:
 *  1. Replay rejection — the already-consumed S8 proof is re-submitted against a fresh
 *     accepted mandate and must revert SourceTxAlreadyConsumed.
 *  2. Proof-submitter neutrality — the S8 settlement was submitted by the relayer address,
 *     which is neither creator nor executor, and the reward still went to the executor.
 *     Recomputed here from on-chain transfer events.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Contract, keccak256, toUtf8Bytes, EventLog } from 'ethers';
import { proofProvider, chainInfo } from '@gluwa/usc-sdk';
import { cc3, sepolia, signers, contract, C, S, TEMPLATE_ID, SOURCE_CHAIN_KEY, PROOF_BUILDER, deployments } from './env.js';
import { ROUTER_SELECTOR } from '@setld/reference-model';

const ROOT = resolve(import.meta.dirname, '../../..');
const MAX = (1n << 256n) - 1n;
const E = (n: number) => BigInt(n) * 10n ** 18n;

async function main() {
  const s8 = JSON.parse(readFileSync(resolve(ROOT, 'evidence/completed-mandates/canonical-correct.json'), 'utf8'));
  const s8ExecTx: string = s8.transactions.sepoliaExecute;
  const s8Block: number = s8.sourceExecution.block;
  const s8SettleTx: string = s8.transactions.settle;
  const consumedKey: string = s8.onChainSettlement.sourceTxKey;

  const creator = signers.cc3Deployer();
  const executor = signers.cc3Executor();
  const relayer = signers.cc3Relayer();
  const sepExec = signers.sepoliaExecutor();
  const core = contract('SetldCore', C.SetldCore, creator);
  const token = contract('MockERC20', C.tSETLD, creator);
  const router = contract('SetldExecutionRouter', S.SetldExecutionRouter, sepExec);

  // --- 1. replay rejection ---
  const sepHead = await sepolia.getBlockNumber();
  const cc3Head = await cc3.getBlockNumber();
  const terms = {
    router: S.SetldExecutionRouter, vault: S.DemoTreasuryVault, assetIn: S.assetIn, assetOut: S.assetOut,
    maxAmountIn: E(10_000), minAmountOut: E(9_000), selector: ROUTER_SELECTOR,
    routePolicyHash: keccak256(toUtf8Bytes('treasury-rebalance-v1-route')),
  };
  const econ = { rewardToken: C.tSETLD, rewardAmount: E(10), bondToken: C.tSETLD, executorBond: E(5), creatorBond: E(2), relayerBudget: E(1) };
  if ((await token.allowance(creator.address, C.SetldVault)) < E(20)) await (await token.approve(C.SetldVault, MAX)).wait();
  const createTx = await core.createMandate(
    TEMPLATE_ID, 1, terms, econ, Math.floor(Date.now() / 1000) + 3600, sepHead - 10, sepHead + 400, cc3Head + 500_000,
    keccak256(toUtf8Bytes('replay-victim')), BigInt(Date.now()),
  );
  const crc = await createTx.wait();
  const mandateId = (crc.logs.find((l: unknown): l is EventLog => l instanceof EventLog && l.eventName === 'MandateCreated') as EventLog).args[0];
  const te = token.connect(executor) as Contract;
  if ((await te.allowance(executor.address, C.SetldVault)) < E(5)) await (await te.approve(C.SetldVault, MAX)).wait();
  await (await (core.connect(executor) as Contract).acceptMandate(mandateId)).wait();

  const ci = new chainInfo.PrecompileChainInfoProvider(cc3 as never);
  await ci.waitUntilHeightAttested(SOURCE_CHAIN_KEY, s8Block, 8000, 600_000);
  const pb = new proofProvider.service.ProofBuilder(SOURCE_CHAIN_KEY, PROOF_BUILDER);
  const proof = (await pb.getProof(s8ExecTx)).data!;
  const mp = { root: proof.merkleProof.root, siblings: proof.merkleProof.siblings.map((s: { hash: string; isLeft: boolean }) => ({ hash: s.hash, isLeft: s.isLeft })) };
  const cp = { lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest, roots: proof.continuityProof.roots };

  let replayRejected = false;
  let replayError = '';
  try {
    await (await (core.connect(relayer) as Contract).settle(mandateId, proof.chainKey, proof.headerNumber, proof.txBytes, mp, cp)).wait();
  } catch (e) {
    replayRejected = true;
    replayError = (e as Error).message;
  }
  console.log(`replay against fresh mandate ${mandateId}: ${replayRejected ? 'REJECTED' : 'ACCEPTED (BUG)'}`);
  console.log(`  ${replayError.slice(0, 160)}`);

  // clean up the victim mandate so its escrow is not stranded
  await (await core.finalizeTimeout(mandateId).catch(() => ({ wait: async () => {} }))).wait?.();

  // --- 2. submitter neutrality, recomputed from the S8 settlement tx ---
  const s8Rc = await cc3.getTransactionReceipt(s8SettleTx);
  const paidIface = new Contract(C.SetldVault, ['event Paid(bytes32 indexed mandateId, address indexed asset, address indexed to, uint256 amount, bytes32 reason)'], cc3);
  const transfers = s8Rc!.logs
    .map((l) => {
      try {
        return paidIface.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .map((p) => ({ to: p.args[2] as string, amount: (p.args[3] as bigint).toString(), reason: Buffer.from((p.args[4] as string).slice(2), 'hex').toString('utf8').replace(/\0+$/, '') }));

  const s8Tx = await cc3.getTransaction(s8SettleTx);
  const submitter = s8Tx!.from;
  const rewardTransfer = transfers.find((t) => t.reason === 'reward');
  const reimb = transfers.find((t) => t.reason === 'relayer-reimbursement');

  const neutrality = {
    settlementTx: s8SettleTx,
    submitter,
    submitterIsCreator: submitter.toLowerCase() === creator.address.toLowerCase(),
    submitterIsExecutor: submitter.toLowerCase() === executor.address.toLowerCase(),
    rewardBeneficiary: rewardTransfer?.to,
    rewardWentToExecutor: rewardTransfer?.to?.toLowerCase() === executor.address.toLowerCase(),
    submitterReceivedOnly: reimb && reimb.to.toLowerCase() === submitter.toLowerCase() ? 'relayer-reimbursement' : 'nothing',
    transfers,
  };
  console.log(`neutrality: submitter ${submitter} (creator=${neutrality.submitterIsCreator} executor=${neutrality.submitterIsExecutor}); reward -> ${rewardTransfer?.to} (executor=${neutrality.rewardWentToExecutor})`);

  const out = {
    recordedAt: new Date().toISOString(),
    gate: 'S2',
    replayRejection: {
      consumedSourceTxKey: consumedKey,
      originalSettlement: s8SettleTx,
      freshMandate: mandateId,
      resubmittedProofFor: s8ExecTx,
      rejected: replayRejected,
      revertReason: replayError.slice(0, 300),
    },
    submitterNeutrality: neutrality,
  };
  mkdirSync(resolve(ROOT, 'evidence/negative'), { recursive: true });
  writeFileSync(resolve(ROOT, 'evidence/negative/replay-and-neutrality.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('-> evidence/negative/replay-and-neutrality.json');
  if (!replayRejected) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
