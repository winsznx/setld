import { Wallet } from 'ethers';
import { readFileSync } from 'node:fs';
const env = readFileSync('.env','utf8');
const get = (k) => env.match(new RegExp('^'+k+'=(0x[0-9a-fA-F]{64})','m'))?.[1];
for (const r of ['CC3_DEPLOYER','CC3_EXECUTOR','CC3_RELAYER','SEPOLIA_DEPLOYER','SEPOLIA_EXECUTOR']) {
  console.log(`${r}_ADDR=${new Wallet(get(r+'_KEY')).address}`);
}
