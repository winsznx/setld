import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { ABIS } from '@setld/contract-clients';

const ROOT = resolve(import.meta.dirname, '../../..');

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = { ...process.env } as Record<string, string>;
  try {
    for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && m[1] && !out[m[1]]) out[m[1]] = m[2] ?? '';
    }
  } catch {
    /* .env optional when vars already in process.env */
  }
  return out;
}

export const env = loadEnv();
export const deployments = JSON.parse(
  readFileSync(resolve(ROOT, 'evidence/deployments/addresses.json'), 'utf8'),
) as {
  creditcoin: { chainId: number; rpc: string; contracts: Record<string, string>; templateId: string; attestcoin: Record<string, string> };
  sepolia: { chainId: number; sourceChainKey: number; rpc: string; contracts: Record<string, string>; explorer: string };
};

export const CC3_RPC = env.CREDITCOIN_RPC_URL ?? deployments.creditcoin.rpc;
export const SEPOLIA_RPC = env.SEPOLIA_RPC_URL ?? deployments.sepolia.rpc;
export const PROOF_BUILDER = env.CREDITCOIN_PROOF_BUILDER_URL ?? deployments.creditcoin.attestcoin.proofBuilder;

export const cc3 = new JsonRpcProvider(CC3_RPC, deployments.creditcoin.chainId, { staticNetwork: true });
export const sepolia = new JsonRpcProvider(SEPOLIA_RPC, deployments.sepolia.chainId, { staticNetwork: true });

export function w(key: string, provider: JsonRpcProvider): Wallet {
  const pk = env[key];
  if (!pk) throw new Error(`missing ${key} in env`);
  return new Wallet(pk, provider);
}

export const signers = {
  cc3Deployer: () => w('CC3_DEPLOYER_KEY', cc3),
  cc3Executor: () => w('CC3_EXECUTOR_KEY', cc3),
  cc3Relayer: () => w('CC3_RELAYER_KEY', cc3),
  sepoliaExecutor: () => w('SEPOLIA_EXECUTOR_KEY', sepolia),
};

export function contract(name: keyof typeof ABIS, address: string, runner: unknown): Contract {
  return new Contract(address, ABIS[name] as never, runner as never);
}

export const C = deployments.creditcoin.contracts;
export const S = deployments.sepolia.contracts;
export const TEMPLATE_ID = deployments.creditcoin.templateId;
export const SOURCE_CHAIN_KEY = deployments.sepolia.sourceChainKey;
