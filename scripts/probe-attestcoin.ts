/**
 * Gate S0/S1 executable probe.
 * Records live Creditcoin CC3 testnet + Attestcoin environment and proves that
 * every field required by TreasuryRebalancePredicateV1 is derivable on-chain
 * from the authoritative Attestcoin proof path (no RPC fallback for settlement input).
 *
 * Usage: pnpm tsx scripts/probe-attestcoin.ts [sepoliaTxHash]
 * Writes: evidence/manifests/environment.json
 */
import { chainInfo, blockProver, proofProvider, utils } from '@gluwa/usc-sdk';
import { JsonRpcProvider, Contract } from 'ethers';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const CREDITCOIN_RPC = process.env.CREDITCOIN_RPC_URL ?? 'https://rpc.cc3-testnet.creditcoin.network/rpc';
const PROOF_BUILDER = process.env.CREDITCOIN_PROOF_BUILDER_URL ?? 'https://proof-gen-api.cc3-testnet.creditcoin.network';
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const EVM_V1_DECODER = process.env.EVM_V1_DECODER ?? '0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f';
const SEPOLIA_CHAIN_KEY = 1;

const j = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x), 2);

async function main() {
  const cc = new JsonRpcProvider(CREDITCOIN_RPC);
  const sep = new JsonRpcProvider(SEPOLIA_RPC);
  const ci = new chainInfo.PrecompileChainInfoProvider(cc);
  const prover = new blockProver.PrecompileBlockProver(cc);

  const ccNet = await cc.getNetwork();
  const ccHead = await cc.getBlockNumber();
  const chains = await ci.getSupportedChains();
  const sepInfo = chains.find((c) => c.chainKey === SEPOLIA_CHAIN_KEY)!;
  const sepAttested = await ci.getLatestAttestedHeightAndHash(SEPOLIA_CHAIN_KEY);
  const sepGenesis = await ci.getAttestationGenesisHeight(SEPOLIA_CHAIN_KEY);

  // Pick a proven-attested Sepolia contract call with >=1 log if no tx supplied.
  let txHash = process.argv[2];
  if (!txHash) {
    const target = Number(sepAttested.height) - 400;
    const blk = await sep.send('eth_getBlockByNumber', ['0x' + target.toString(16), false]);
    const receipts: any[] = await sep.send('eth_getBlockReceipts', [blk.hash]);
    const rich = receipts.find(
      (r) => r.to && r.status === '0x1' && r.logs?.length >= 1 && r.logs.length <= 4 && r.logs[0].topics.length >= 2,
    );
    txHash = rich.transactionHash;
  }

  const pb = new proofProvider.service.ProofBuilder(SEPOLIA_CHAIN_KEY, PROOF_BUILDER);
  const t0 = Date.now();
  const pr = await pb.getProof(txHash);
  const proofMs = Date.now() - t0;
  if (!pr.success || !pr.data) throw new Error('proof generation failed: ' + pr.error);
  const p = pr.data;

  const tv0 = Date.now();
  const verified = await prover.verifySingle(p.chainKey, p.headerNumber, p.txBytes, p.merkleProof, p.continuityProof);
  const verifyMs = Date.now() - tv0;
  const txIndexOnChain = await prover.computeTransactionIndex(p.merkleProof);

  const decoderAbi = JSON.parse(
    readFileSync(resolve('node_modules/@gluwa/usc-sdk/dist/utils/evmV1DecoderAbi.json'), 'utf8'),
  );
  const decoder = new Contract(EVM_V1_DECODER, decoderAbi, cc);
  const decoded = await utils.decoder.decodeEvmV1Transaction(p.txBytes, decoder);
  const d = decoded.data;

  const fieldMatrix = {
    sourceChainKey: p.chainKey,
    sourceBlockHeight: p.headerNumber,
    transactionIndex: Number(txIndexOnChain),
    txFrom: d.commonTx.from,
    txTo: d.commonTx.to,
    txToIsNull: d.commonTx.toIsNull,
    txValue: d.commonTx.value.toString(),
    functionSelector: d.commonTx.data.slice(0, 10),
    calldataLength: d.commonTx.data.length,
    receiptStatus: d.receipt.receiptStatus,
    receiptGasUsed: d.receipt.receiptGasUsed.toString(),
    logCount: d.receipt.receiptLogs.length,
    logs: d.receipt.receiptLogs.map((l: any) => ({
      emitter: l.address_,
      topic0: l.topics[0],
      topicCount: l.topics.length,
      dataLength: l.data.length,
    })),
  };

  const missing = Object.entries({
    sender: fieldMatrix.txFrom,
    target: fieldMatrix.txTo,
    selector: fieldMatrix.functionSelector,
    receiptStatus: fieldMatrix.receiptStatus,
  }).filter(([, v]) => v === undefined || v === null || v === '');

  const manifest = {
    probeTimestamp: new Date().toISOString(),
    gate: 'S0+S1',
    creditcoin: {
      rpc: CREDITCOIN_RPC,
      evmChainId: Number(ccNet.chainId),
      evmChainIdHex: '0x' + ccNet.chainId.toString(16),
      headBlock: ccHead,
      blockProverPrecompile: blockProver.BLOCK_PROVER_PRECOMPILE_ADDRESS,
      chainInfoPrecompile: chainInfo.CHAIN_INFO_PRECOMPILE_ADDRESS,
      evmV1Decoder: EVM_V1_DECODER,
    },
    proofBuilder: { url: PROOF_BUILDER, proofLatencyMs: proofMs, cached: p.cached, generatedAt: p.generatedAt },
    sourceChain: {
      chainKey: sepInfo.chainKey,
      chainId: sepInfo.chainId,
      chainName: Buffer.from(sepInfo.chainName.replace(/^0x/, ''), 'hex').toString('utf8'),
      chainEncoding: sepInfo.chainEncoding,
      attestationGenesisHeight: Number(sepGenesis),
      latestAttested: j(sepAttested),
    },
    packages: {
      '@gluwa/usc-sdk': '0.18.0',
      '@gluwa/usc-contracts': '0.2.0',
    },
    proofSample: {
      sepoliaTxHash: txHash,
      headerNumber: p.headerNumber,
      txIndexFromProof: p.txIndex,
      txIndexComputedOnChain: Number(txIndexOnChain),
      txBytesLength: p.txBytes.length,
      verifySingleOnChain: verified,
      verifyLatencyMs: verifyMs,
    },
    requiredFieldMatrix: fieldMatrix,
    missingRequiredFields: missing.map(([k]) => k),
    sourceTxKeyFormula: 'keccak256(abi.encodePacked(uint64 sourceChainKey, uint64 blockHeight, uint32 transactionIndex))',
  };

  const out = resolve('evidence/manifests/environment.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest, null, 2));
  if (!verified) throw new Error('S1 STOP CONDITION: on-chain proof verification returned false');
  if (missing.length) throw new Error('S1 STOP CONDITION: missing required fields: ' + missing.map(([k]) => k).join(', '));
  console.log('\nS0+S1: PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
