import { JsonRpcProvider, Contract } from 'ethers';
import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync('evidence/deployments/addresses.json','utf8'));
const cc = new JsonRpcProvider(d.creditcoin.rpc, d.creditcoin.chainId, {staticNetwork:true});
const core = new Contract(d.creditcoin.contracts.SetldCore, [
  'event MandateCreated(bytes32 indexed mandateId, address indexed creator, bytes32 indexed templateId, bytes32 termsHash)',
  'function getMandate(bytes32) view returns (tuple(address creator, bytes32 templateId, uint32 templateVersion, uint64 sourceChainKey, uint64 acceptanceDeadline, uint64 executionStartBlock, uint64 executionEndBlock, uint64 proofDeadline, address acceptedExecutor, bytes32 acceptedExecutorId, address acceptedSourceSender, bytes32 termsHash, bytes32 metadataHash, uint8 state, tuple(address rewardToken, uint256 rewardAmount, address bondToken, uint256 executorBond, uint256 creatorBond, uint256 relayerBudget) econ))',
], cc);
const head = await cc.getBlockNumber();
const logs = await core.queryFilter(core.filters.MandateCreated(), head - 5000, head);
for (const l of logs) {
  const m = await core.getMandate(l.args.mandateId);
  console.log('mandate', l.args.mandateId, 'state', m.state.toString(), 'executor', m.acceptedExecutor, 'source', m.acceptedSourceSender);
}
// also latest attested
const ci = new Contract('0x0000000000000000000000000000000000000fd3',['function get_latest_attestation_height_and_hash(uint64) view returns (uint64,bytes32,bool,bool)'],cc);
console.log('latest attested sepolia', (await ci.get_latest_attestation_height_and_hash(1))[0].toString());
