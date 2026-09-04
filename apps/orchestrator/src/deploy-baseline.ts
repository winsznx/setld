/**
 * Deploys BaselineReporterSettlement (B0) on CC3. The reporter is the CC3 relayer address
 * (a competent off-chain observer). Records into evidence/deployments/addresses.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ContractFactory, Contract } from 'ethers';
import { cc3, signers, deployments } from './env.js';

const ROOT = resolve(import.meta.dirname, '../../..');

async function main() {
  const deployer = signers.cc3Deployer();
  const reporter = process.env.CC3_RELAYER_ADDR!;
  const a = JSON.parse(readFileSync(resolve(ROOT, 'contracts/out/BaselineReporterSettlement.sol/BaselineReporterSettlement.json'), 'utf8'));
  const f = new ContractFactory(a.abi, a.bytecode.object, deployer);
  const c = await f.deploy(reporter, deployer.address);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log(`BaselineReporterSettlement ${addr}  reporter=${reporter}`);

  const updated = JSON.parse(JSON.stringify(deployments));
  updated.creditcoin.contracts.BaselineReporterSettlement = addr;
  updated.creditcoin.baselineReporter = reporter;
  writeFileSync(resolve(ROOT, 'evidence/deployments/addresses.json'), JSON.stringify(updated, null, 2) + '\n');
  void Contract;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
