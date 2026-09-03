import { JsonRpcProvider, Contract } from 'ethers';
import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync('evidence/deployments/addresses.json','utf8'));
const cc = new JsonRpcProvider(d.creditcoin.rpc, d.creditcoin.chainId, {staticNetwork:true});
const sep = new JsonRpcProvider(d.sepolia.rpc, d.sepolia.chainId, {staticNetwork:true});
const ci = new Contract('0x0000000000000000000000000000000000000fd3',['function get_latest_attestation_height_and_hash(uint64) view returns (uint64,bytes32,bool,bool)'],cc);
const [h] = await ci.get_latest_attestation_height_and_hash(1);
console.log('latest attested sepolia', h.toString(), ' sepolia head', await sep.getBlockNumber());
// sepolia executor recent txs
const bal = await sep.getBalance('0xD76455eB2015591A239ef651518d0e9BEeF4787F');
console.log('sepolia executor bal', bal.toString());
const nonce = await sep.getTransactionCount('0xD76455eB2015591A239ef651518d0e9BEeF4787F');
console.log('sepolia executor nonce', nonce);
// find the execute tx by scanning router events last 200 blocks
const head = await sep.getBlockNumber();
const logs = await sep.getLogs({ address: d.sepolia.contracts.SetldExecutionRouter, fromBlock: head-300, toBlock: head });
console.log('router logs in last 300 blk:', logs.length);
for (const l of logs.slice(-4)) console.log(' ', l.transactionHash, 'blk', l.blockNumber, 'topic0', l.topics[0].slice(0,10));
