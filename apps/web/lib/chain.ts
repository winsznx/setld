'use client';
import { BrowserProvider, JsonRpcProvider, Contract, type Eip1193Provider } from 'ethers';
import facts from '../data/submission-facts.json';
import CORE_ABI from '../data/abi/SetldCore.json';
import VAULT_ABI from '../data/abi/SetldVault.json';
import REG_ABI from '../data/abi/SetldExecutorRegistry.json';
import ROUTER_ABI from '../data/abi/SetldExecutionRouter.json';
import ERC20_ABI from '../data/abi/MockERC20.json';

const f = facts as unknown as {
  networks: { creditcoin: { chainId: number; rpc: string }; sourceChain: { chainId: number } };
  contracts: { creditcoin: Record<string, string>; sepolia: Record<string, string> };
  templateId: string;
};

export const CC3 = {
  chainId: f.networks.creditcoin.chainId,
  chainIdHex: '0x' + f.networks.creditcoin.chainId.toString(16),
  rpc: f.networks.creditcoin.rpc,
  name: 'Creditcoin CC3 Testnet',
  explorer: 'https://dashboard.cc3-testnet.creditcoin.network',
  nativeCurrency: { name: 'tCTC', symbol: 'tCTC', decimals: 18 },
};
export const SEPOLIA = {
  chainId: 11155111,
  chainIdHex: '0xaa36a7',
  rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
  name: 'Ethereum Sepolia',
  explorer: 'https://sepolia.etherscan.io',
};
export const C = f.contracts.creditcoin;
export const S = f.contracts.sepolia;
export const TEMPLATE_ID = f.templateId;
export const ABI = { core: CORE_ABI, vault: VAULT_ABI, registry: REG_ABI, router: ROUTER_ABI, erc20: ERC20_ABI };

export const cc3Read = () => new JsonRpcProvider(CC3.rpc, CC3.chainId, { staticNetwork: true });
export const sepoliaRead = () => new JsonRpcProvider(SEPOLIA.rpc, SEPOLIA.chainId, { staticNetwork: true });

/** The injected EIP-1193 provider. A headless test provider registers under window.__setldE2E. */
export function injected(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __setldE2E?: Eip1193Provider; ethereum?: Eip1193Provider };
  return w.__setldE2E ?? w.ethereum ?? null;
}

export async function connect(): Promise<{ provider: BrowserProvider; address: string; chainId: number }> {
  const eip = injected();
  if (!eip) throw new Error('No wallet found. Install a browser wallet or use the read-only proof pages.');
  const provider = new BrowserProvider(eip);
  const accounts = (await eip.request({ method: 'eth_requestAccounts' })) as string[];
  const net = await provider.getNetwork();
  return { provider, address: accounts[0]!, chainId: Number(net.chainId) };
}

export async function ensureChain(eip: Eip1193Provider, target: typeof CC3 | typeof SEPOLIA): Promise<void> {
  const current = (await eip.request({ method: 'eth_chainId' })) as string;
  if (parseInt(current, 16) === target.chainId) return;
  try {
    await eip.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: target.chainIdHex }] });
  } catch (e) {
    if ((e as { code?: number }).code === 4902) {
      await eip.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: target.chainIdHex,
            chainName: target.name,
            rpcUrls: [target.rpc],
            nativeCurrency: 'nativeCurrency' in target ? target.nativeCurrency : { name: 'ETH', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: [target.explorer],
          },
        ],
      });
    } else {
      throw e;
    }
  }
}

export function coreRead() {
  return new Contract(C.SetldCore, ABI.core as never, cc3Read());
}

export const MANDATE_STATE = ['NONE', 'OPEN', 'ACCEPTED', 'CANCELLED', 'RELEASED', 'FULFILLED', 'INVALID_ATTEMPT', 'EXECUTION_REVERTED', 'TIMED_OUT'];
export const EVAL_NAMES = ['FULFILLED','WRONG_SOURCE_CHAIN','BEFORE_EXECUTION_START','AFTER_EXECUTION_DEADLINE','SENDER_NOT_BOUND_EXECUTOR','WRONG_TARGET','WRONG_SELECTOR','WRONG_MANDATE_BINDING','WRONG_ASSET_IN','WRONG_ASSET_OUT','AMOUNT_IN_ZERO','AMOUNT_IN_OVER_CAP','MIN_OUT_BELOW_FLOOR','RECEIPT_REVERTED','EVENT_MISSING','EVENT_WRONG_EMITTER','EVENT_WRONG_MANDATE','EVENT_WRONG_EXECUTOR','EVENT_OUTPUT_BELOW_MIN','SOURCE_TX_ALREADY_CONSUMED'];

export const ROUTER_SELECTOR = '0xc85bcd18'; // execute(bytes32,address,address,address,uint256,uint256)
