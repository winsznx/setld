const RPCS = {
  'CC3 testnet': 'https://rpc.cc3-testnet.creditcoin.network/rpc',
  'Sepolia': 'https://ethereum-sepolia-rpc.publicnode.com',
};
for (const [name, rpc] of Object.entries(RPCS)) {
  const r = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['latest', false] }) });
  const b = (await r.json()).result;
  console.log(`${name}: mixHash=${b.mixHash ?? 'ABSENT'} difficulty=${b.difficulty ?? 'ABSENT'} baseFeePerGas=${b.baseFeePerGas ?? 'ABSENT'}`);
}
