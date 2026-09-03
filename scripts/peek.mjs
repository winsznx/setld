import { JsonRpcProvider, Contract } from 'ethers';
import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync('evidence/deployments/addresses.json','utf8'));
const cc = new JsonRpcProvider(d.creditcoin.rpc, d.creditcoin.chainId, {staticNetwork:true});
const sep = new JsonRpcProvider(d.sepolia.rpc, d.sepolia.chainId, {staticNetwork:true});
console.log('cc3 head', await cc.getBlockNumber(), 'sepolia head', await sep.getBlockNumber());
const reg = new Contract(d.creditcoin.contracts.SetldExecutorRegistry, ['function executorIdOf(address) view returns (bytes32)','function boundExecutorOf(address) view returns (bytes32)'], cc);
console.log('executor id', await reg.executorIdOf('0xb3Fbde35DcA37D65F19f2b40BbC2e8E6Fef3956C'));
console.log('sepExec bound', await reg.boundExecutorOf('0xD76455eB2015591A239ef651518d0e9BEeF4787F'));
const core = new Contract(d.creditcoin.contracts.SetldCore, ['function mandateCount() view returns (uint256)'], cc);
console.log('mandateCount', (await core.mandateCount()).toString());
// latest attested sepolia height
const ci = new Contract('0x0000000000000000000000000000000000000fd3',['function get_latest_attestation_height_and_hash(uint64) view returns (uint64,bytes32,bool,bool)'],cc);
const [h] = await ci.get_latest_attestation_height_and_hash(1);
console.log('latest attested sepolia', h.toString());
