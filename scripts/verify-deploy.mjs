import { JsonRpcProvider, Contract, formatEther } from 'ethers';
const CC = new JsonRpcProvider('https://rpc.cc3-testnet.creditcoin.network/rpc');
const core = '0x2d069f379B8C67c89DBF2e7dd2EFA2B4D7F17fC7';
const tid = '0x22ab9b097675d9b6da95abf9fa499d73091ba2c6c7406d230ad33321976ba0c3';
const abi = [
  'function templates(bytes32) view returns (address adapter, uint64 sourceChainKey, uint256 minDeadlineBlocks, uint256 maxDeadlineBlocks, bool active)',
  'function operator() view returns (address)',
  'function vault() view returns (address)',
  'function executors() view returns (address)',
  'function protocolFeeBps() view returns (uint16)',
];
const c = new Contract(core, abi, CC);
console.log('operator', await c.operator());
console.log('vault', await c.vault());
console.log('executors', await c.executors());
console.log('feeBps', await c.protocolFeeBps());
const t = await c.templates(tid);
console.log('template:', { adapter: t[0], sourceChainKey: t[1].toString(), active: t[4] });
for (const [n,a] of [['deployer','0xA629431b12fcf2EF838966b79cD2ba0Ea452d738'],['executor','0xb3Fbde35DcA37D65F19f2b40BbC2e8E6Fef3956C'],['relayer','0x03D9bd775aE2D7757e79B9CC6B9abDaE85D27b66']]) {
  console.log(n, formatEther(await CC.getBalance(a)), 'tCTC');
}
const tokenAbi = ['function balanceOf(address) view returns (uint256)'];
const tok = new Contract('0x4872F02B2FD1104F66784a27a08822354AdCA5f2', tokenAbi, CC);
console.log('tSETLD deployer', formatEther(await tok.balanceOf('0xA629431b12fcf2EF838966b79cD2ba0Ea452d738')));
console.log('tSETLD executor', formatEther(await tok.balanceOf('0xb3Fbde35DcA37D65F19f2b40BbC2e8E6Fef3956C')));
