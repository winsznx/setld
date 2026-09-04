'use client';
import { useCallback, useEffect, useState } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import { CC3, SEPOLIA, C, ABI, injected, connect, ensureChain } from './chain';
import { Contract } from 'ethers';

export interface WalletState {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  tctc: string | null;
  tsetld: string | null;
}

export function useWallet() {
  const [s, setS] = useState<WalletState>({ address: null, chainId: null, connecting: false, error: null, tctc: null, tsetld: null });

  const refresh = useCallback(async (addr: string) => {
    try {
      const p = new BrowserProvider(injected()!);
      const net = await p.getNetwork();
      const bal = await p.getBalance(addr).catch(() => 0n);
      let tsetld: string | null = null;
      if (Number(net.chainId) === CC3.chainId) {
        try {
          const t = new Contract(C.tSETLD, ABI.erc20 as never, p);
          tsetld = formatEther(await t.balanceOf(addr));
        } catch { /* not on cc3 */ }
      }
      setS((v) => ({ ...v, address: addr, chainId: Number(net.chainId), tctc: formatEther(bal), tsetld }));
    } catch (e) {
      setS((v) => ({ ...v, error: (e as Error).message }));
    }
  }, []);

  const doConnect = useCallback(async () => {
    setS((v) => ({ ...v, connecting: true, error: null }));
    try {
      const { address, chainId } = await connect();
      setS((v) => ({ ...v, address, chainId, connecting: false }));
      await refresh(address);
    } catch (e) {
      setS((v) => ({ ...v, connecting: false, error: (e as Error).message }));
    }
  }, [refresh]);

  const switchTo = useCallback(
    async (target: typeof CC3 | typeof SEPOLIA) => {
      const eip = injected();
      if (!eip) return;
      await ensureChain(eip, target);
      const cur = (await eip.request({ method: 'eth_chainId' })) as string;
      setS((v) => ({ ...v, chainId: parseInt(cur, 16) }));
      if (s.address) await refresh(s.address);
    },
    [s.address, refresh],
  );

  useEffect(() => {
    const eip = injected();
    if (!eip || !('on' in eip)) return;
    const onAccounts = (a: string[]) => {
      if (a.length === 0) setS({ address: null, chainId: null, connecting: false, error: null, tctc: null, tsetld: null });
      else void refresh(a[0]!);
    };
    const onChain = (cid: string) => setS((v) => ({ ...v, chainId: parseInt(cid, 16) }));
    (eip as { on: (e: string, cb: (...a: never[]) => void) => void }).on('accountsChanged', onAccounts as never);
    (eip as { on: (e: string, cb: (...a: never[]) => void) => void }).on('chainChanged', onChain as never);
    return () => {
      const off = (eip as { removeListener?: (e: string, cb: (...a: never[]) => void) => void }).removeListener;
      off?.('accountsChanged', onAccounts as never);
      off?.('chainChanged', onChain as never);
    };
  }, [refresh]);

  const signer = useCallback(async () => {
    const p = new BrowserProvider(injected()!);
    return p.getSigner();
  }, []);

  return { ...s, connect: doConnect, switchTo, refresh, signer, onCC3: s.chainId === CC3.chainId, onSepolia: s.chainId === SEPOLIA.chainId };
}
