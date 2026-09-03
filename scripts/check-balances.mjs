import { JsonRpcProvider, formatEther } from 'ethers';
const CC = new JsonRpcProvider(process.env.CREDITCOIN_RPC_URL ?? 'https://rpc.cc3-testnet.creditcoin.network/rpc');
const SEP = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com');
const targets = [
  ['CC3_DEPLOYER', '0xA629431b12fcf2EF838966b79cD2ba0Ea452d738', CC],
  ['CC3_EXECUTOR', '0xb3Fbde35DcA37D65F19f2b40BbC2e8E6Fef3956C', CC],
  ['CC3_RELAYER',  '0x03D9bd775aE2D7757e79B9CC6B9abDaE85D27b66', CC],
  ['SEPOLIA_DEPLOYER', '0xe1DCA061c96CD8a1464416FEBF6Ee0824c24F884', SEP],
  ['SEPOLIA_EXECUTOR', '0xD76455eB2015591A239ef651518d0e9BEeF4787F', SEP],
];
const ccBlock = await CC.getBlockNumber();
const sepBlock = await SEP.getBlockNumber();
const out = { checkedAt: new Date().toISOString(), creditcoinBlock: ccBlock, sepoliaBlock: sepBlock, balances: {} };
for (const [name, addr, p] of targets) {
  const bal = await p.getBalance(addr);
  out.balances[name] = { address: addr, wei: bal.toString(), formatted: formatEther(bal) };
  console.log(`${name.padEnd(17)} ${addr}  ${formatEther(bal)}`);
}
console.log('\ncreditcoin block', ccBlock, ' sepolia block', sepBlock);
process.stdout.write('\n' + JSON.stringify(out, null, 2) + '\n');
