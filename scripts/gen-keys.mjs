import { Wallet } from 'ethers';
import { readFileSync, writeFileSync } from 'node:fs';
const roles = ['CC3_DEPLOYER','CC3_EXECUTOR','CC3_RELAYER','SEPOLIA_DEPLOYER','SEPOLIA_EXECUTOR'];
let env = ''; try { env = readFileSync('.env','utf8'); } catch {}
const pub = {};
for (const r of roles) {
  const k = `${r}_KEY`;
  if (env.includes(k+'=') && env.match(new RegExp(k+'=0x[0-9a-fA-F]{64}'))) {
    pub[r] = new Wallet(env.match(new RegExp(k+'=(0x[0-9a-fA-F]{64})'))[1]).address + ' (existing)';
    continue;
  }
  const w = Wallet.createRandom();
  env += (env && !env.endsWith('\n') ? '\n' : '') + `${k}=${w.privateKey}\n`;
  pub[r] = w.address;
}
writeFileSync('.env', env);
console.log(JSON.stringify(pub, null, 2));
