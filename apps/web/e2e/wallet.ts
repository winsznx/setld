/**
 * Headless EIP-1193 wallet for Playwright. Private keys stay in the Node test process;
 * the page gets a thin provider that forwards every RPC call to an exposed function.
 * Backed by the disposable executor/creator keys in the repo .env.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JsonRpcProvider, Wallet, Transaction, TypedDataEncoder } from 'ethers';
import type { Page } from '@playwright/test';

const ROOT = resolve(import.meta.dirname, '../../..');
function envKey(name: string): string {
  const env = readFileSync(resolve(ROOT, '.env'), 'utf8');
  const m = env.match(new RegExp(`^${name}=(0x[0-9a-fA-F]{64})`, 'm'));
  if (!m) throw new Error(`${name} not in .env — fund the disposable keys and re-run`);
  return m[1]!;
}

const RPC = {
  102031: 'https://rpc.cc3-testnet.creditcoin.network/rpc',
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
} as const;

export interface HeadlessWalletOpts {
  /** which repo key funds this session, e.g. CC3_EXECUTOR (uses CC3_EXECUTOR_KEY on cc3 and SEPOLIA_EXECUTOR_KEY on sepolia) */
  role: 'executor' | 'creator';
}

export async function installHeadlessWallet(page: Page, opts: HeadlessWalletOpts) {
  const cc3Key = envKey(opts.role === 'creator' ? 'CC3_DEPLOYER_KEY' : 'CC3_EXECUTOR_KEY');
  const sepKey = envKey(opts.role === 'creator' ? 'SEPOLIA_DEPLOYER_KEY' : 'SEPOLIA_EXECUTOR_KEY');
  const providers: Record<number, JsonRpcProvider> = {
    102031: new JsonRpcProvider(RPC[102031], 102031, { staticNetwork: true }),
    11155111: new JsonRpcProvider(RPC[11155111], 11155111, { staticNetwork: true }),
  };
  const wallets: Record<number, Wallet> = {
    102031: new Wallet(cc3Key, providers[102031]),
    11155111: new Wallet(sepKey, providers[11155111]),
  };
  let chainId = 102031;

  await page.exposeFunction('__setldRpc', async (method: string, params: unknown[]) => {
    const w = wallets[chainId]!;
    const p = providers[chainId]!;
    switch (method) {
      case 'eth_chainId':
        return '0x' + chainId.toString(16);
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return [w.address];
      case 'wallet_switchEthereumChain': {
        const target = parseInt((params[0] as { chainId: string }).chainId, 16);
        if (providers[target]) chainId = target;
        return null;
      }
      case 'wallet_addEthereumChain':
        return null;
      case 'personal_sign':
        return w.signMessage(typeof params[0] === 'string' ? params[0] : '');
      case 'eth_signTypedData_v4': {
        const data = JSON.parse(params[1] as string);
        const { EIP712Domain, ...types } = data.types;
        void EIP712Domain;
        return w.signTypedData(data.domain, types, data.message);
      }
      case 'eth_sendTransaction': {
        const t = params[0] as { to?: string; data?: string; value?: string; from?: string };
        const tx = await w.sendTransaction({ to: t.to, data: t.data, value: t.value ? BigInt(t.value) : undefined });
        return tx.hash;
      }
      default:
        return p.send(method, (params as never[]) ?? []);
    }
  });

  await page.addInitScript(() => {
    const listeners: Record<string, ((...a: unknown[]) => void)[]> = {};
    (window as unknown as { __setldE2E: unknown }).__setldE2E = {
      isMetaMask: true,
      request: ({ method, params }: { method: string; params?: unknown[] }) =>
        (window as unknown as { __setldRpc: (m: string, p: unknown[]) => Promise<unknown> }).__setldRpc(method, params ?? []),
      on: (e: string, cb: (...a: unknown[]) => void) => {
        (listeners[e] ??= []).push(cb);
      },
      removeListener: (e: string, cb: (...a: unknown[]) => void) => {
        listeners[e] = (listeners[e] ?? []).filter((f) => f !== cb);
      },
    };
  });

  return { executorAddress: wallets[102031].address, sepoliaAddress: wallets[11155111].address };
}

void Transaction;
void TypedDataEncoder;
