/**
 * Deploys the Creditcoin CC3 core with ethers (foundry's block polling is incompatible
 * with the CC3 RPC — see DECISIONS.md D7). Writes evidence/deployments/addresses.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Contract, ContractFactory, getCreateAddress, keccak256, toUtf8Bytes, formatEther } from 'ethers';
import { cc3, signers, deployments } from './env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const artifact = (name: string) =>
  JSON.parse(readFileSync(resolve(ROOT, `contracts/out/${name}.sol/${name}.json`), 'utf8'));

const BLOCK_PROVER = '0x0000000000000000000000000000000000000FD2';
const CHAIN_INFO = '0x0000000000000000000000000000000000000fd3';
const EVM_V1_DECODER = '0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f';
const SEPOLIA_CHAIN_KEY = 1;
const FEE_BPS = 500;

async function deploy(name: string, deployer: ReturnType<typeof signers.cc3Deployer>, args: unknown[]) {
  const a = artifact(name);
  const f = new ContractFactory(a.abi, a.bytecode.object, deployer);
  const c = await f.deploy(...args);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log(`  ${name.padEnd(24)} ${addr}`);
  return { addr, abi: a.abi as unknown[], contract: new Contract(addr, a.abi, deployer) };
}

async function main() {
  const deployer = signers.cc3Deployer();
  console.log(`deployer ${deployer.address}  balance ${formatEther(await cc3.getBalance(deployer.address))} tCTC`);

  const executorAddr = process.env.CC3_EXECUTOR_ADDR!;
  const relayerAddr = process.env.CC3_RELAYER_ADDR!;

  const token = await deploy('MockERC20', deployer, ['setld test settlement token', 'tSETLD']);
  const adapter = await deploy('SetldAttestcoinAdapter', deployer, [BLOCK_PROVER, CHAIN_INFO, EVM_V1_DECODER]);

  const startNonce = await cc3.getTransactionCount(deployer.address);
  const predictedCore = getCreateAddress({ from: deployer.address, nonce: startNonce + 2 });
  console.log(`  predicted core ${predictedCore} (nonce ${startNonce + 2})`);

  const vault = await deploy('SetldVault', deployer, [predictedCore, deployer.address]);
  const registry = await deploy('SetldExecutorRegistry', deployer, [predictedCore]);
  const core = await deploy('SetldCore', deployer, [
    vault.addr,
    registry.addr,
    deployer.address,
    deployer.address,
    FEE_BPS,
    0,
  ]);
  if (core.addr.toLowerCase() !== predictedCore.toLowerCase()) {
    throw new Error(`core address prediction failed: ${core.addr} != ${predictedCore}`);
  }

  const templateId = keccak256(toUtf8Bytes('treasury-rebalance-v1'));
  const regTx = await (core.contract as unknown as { registerTemplate: (...a: unknown[]) => Promise<{ hash: string; wait: () => Promise<unknown> }> }).registerTemplate(
    templateId,
    1,
    { adapter: adapter.addr, sourceChainKey: SEPOLIA_CHAIN_KEY, minDeadlineBlocks: 1, maxDeadlineBlocks: 5_000_000, active: true },
  );
  await regTx.wait();
  console.log(`  template registered ${regTx.hash}`);

  const mint = token.contract as unknown as { mint: (a: string, n: bigint) => Promise<{ hash: string; wait: () => Promise<unknown> }> };
  const mintA = await mint.mint(deployer.address, 10n ** 27n);
  await mintA.wait();
  const mintB = await mint.mint(executorAddr, 10n ** 27n);
  await mintB.wait();

  for (const [name, addr] of [
    ['executor', executorAddr],
    ['relayer', relayerAddr],
  ] as const) {
    const bal = await cc3.getBalance(addr);
    if (bal < 500n * 10n ** 18n) {
      const tx = await deployer.sendTransaction({ to: addr, value: 1500n * 10n ** 18n });
      await tx.wait();
      console.log(`  funded ${name} ${addr} with 1500 tCTC (${tx.hash})`);
    } else {
      console.log(`  ${name} already funded (${formatEther(bal)} tCTC)`);
    }
  }

  const head = await cc3.getBlockNumber();
  const updated = {
    ...deployments,
    creditcoin: {
      ...deployments.creditcoin,
      blockAtRecord: head,
      redeployedAt: new Date().toISOString(),
      contracts: {
        SetldCore: core.addr,
        SetldVault: vault.addr,
        SetldExecutorRegistry: registry.addr,
        SetldAttestcoinAdapter: adapter.addr,
        tSETLD: token.addr,
      },
      templateId,
      templateRegisteredTx: regTx.hash,
    },
  };
  writeFileSync(resolve(ROOT, 'evidence/deployments/addresses.json'), JSON.stringify(updated, null, 2) + '\n');
  console.log('\nwrote evidence/deployments/addresses.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
