'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Contract, parseEther, EventLog } from 'ethers';
import { C, S, ABI, CC3, SEPOLIA, cc3Read, sepoliaRead, MANDATE_STATE, EVAL_NAMES } from '@/lib/chain';
import { useWallet } from '@/lib/useWallet';
import { WalletStrip } from '@/components/app/AppShell';
import { attestedHeight, proofByTx } from '@/lib/proofBuilder';

const MAX = (1n << 256n) - 1n;
const BINDING_TYPES = {
  SourceAddressBinding: [
    { name: 'executorId', type: 'bytes32' },
    { name: 'creditcoinAccount', type: 'address' },
    { name: 'sepoliaChainId', type: 'uint256' },
    { name: 'sourceAddress', type: 'address' },
    { name: 'deployment', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
};

type Step = 'connect' | 'bind' | 'accept' | 'execute' | 'waiting' | 'settle' | 'done' | 'error';

function ExecInner() {
  const id = useSearchParams().get('id') ?? '';
  const w = useWallet();
  const [step, setStep] = useState<Step>('connect');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [srcTx, setSrcTx] = useState<string | null>(null);
  const [srcBlock, setSrcBlock] = useState<number | null>(null);
  const [settleResult, setSettleResult] = useState<{ code: string; step: number; state: string; tx: string } | null>(null);
  const [mandate, setMandate] = useState<Record<string, unknown> | null>(null);

  const loadMandate = useCallback(async () => {
    const core = new Contract(C.SetldCore, ABI.core as never, cc3Read());
    const m = await core.getMandate(id);
    setMandate({
      state: MANDATE_STATE[Number(m.state)],
      reward: (m.econ.rewardAmount / 10n ** 18n).toString(),
      bond: (m.econ.executorBond / 10n ** 18n).toString(),
      bondWei: m.econ.executorBond as bigint,
      maxAmountIn: m.termsHash ? null : null,
    });
    return m;
  }, [id]);

  useEffect(() => {
    if (/^0x[0-9a-fA-F]{64}$/.test(id)) void loadMandate().catch((e) => setErr((e as Error).message));
    else setErr('Provide ?id=<0x…32 bytes>');
  }, [id, loadMandate]);

  async function ensureBound(): Promise<string> {
    setMsg('checking executor registration on Creditcoin…');
    const signer = await w.signer();
    const me = await signer.getAddress();
    const reg = new Contract(C.SetldExecutorRegistry, ABI.registry as never, signer);
    let executorId: string = await reg.executorIdOf(me);
    if (executorId === '0x' + '0'.repeat(64)) {
      setMsg('registering executor identity…');
      await (await reg.register()).wait();
      executorId = await reg.executorIdOf(me);
    }
    const bound: string = await reg.boundExecutorOf(S.assetIn); // dummy read to warm
    void bound;
    const already: string = await reg.activeSourceAddress(executorId).catch(() => '0x' + '0'.repeat(40));
    if (already !== '0x' + '0'.repeat(40) && already.length === 42) {
      return already;
    }
    // bind: sign with the SAME wallet on Sepolia, then submit on Creditcoin
    setMsg('switch your wallet to Sepolia to prove the source address…');
    await w.switchTo(SEPOLIA);
    const sepSigner = await w.signer();
    const sourceAddress = await sepSigner.getAddress();
    const nonce: bigint = await reg.nonces(executorId);
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const domain = { name: 'setld', version: '1', chainId: CC3.chainId, verifyingContract: C.SetldExecutorRegistry };
    const value = { executorId, creditcoinAccount: me, sepoliaChainId: 11155111, sourceAddress, deployment: C.SetldExecutorRegistry, nonce, expiry };
    setMsg('sign the binding challenge (no transaction)…');
    const sig = await sepSigner.signTypedData(domain, BINDING_TYPES, value);
    setMsg('switch back to Creditcoin Testnet to submit the binding…');
    await w.switchTo(CC3);
    const regCc = new Contract(C.SetldExecutorRegistry, ABI.registry as never, await w.signer());
    await (await regCc.bindSourceAddress(sourceAddress, nonce, expiry, sig)).wait();
    return sourceAddress;
  }

  async function runFullFlow() {
    setErr(null);
    try {
      setStep('bind');
      const sourceAddress = await ensureBound();

      setStep('accept');
      setMsg('approve bond + accept mandate…');
      await w.switchTo(CC3);
      const signer = await w.signer();
      const me = await signer.getAddress();
      const token = new Contract(C.tSETLD, ABI.erc20 as never, signer);
      const core = new Contract(C.SetldCore, ABI.core as never, signer);
      const m = await core.getMandate(id);
      if ((await token.allowance(me, C.SetldVault)) < m.econ.executorBond) {
        await (await token.approve(C.SetldVault, MAX)).wait();
      }
      await (await core.acceptMandate(id)).wait();
      await w.refresh(me);

      setStep('execute');
      setMsg('switch to Sepolia and execute the source transaction…');
      await w.switchTo(SEPOLIA);
      const terms = await core.getTerms(id);
      const router = new Contract(S.SetldExecutionRouter, ABI.router as never, await w.signer());
      const amountIn = terms.maxAmountIn / 2n;
      const exec = await router.execute(id, S.DemoTreasuryVault, S.assetIn, S.assetOut, amountIn, terms.minAmountOut);
      const rc = await exec.wait();
      setSrcTx(exec.hash);
      setSrcBlock(rc!.blockNumber);
      setStep('waiting');
      void sourceAddress;
    } catch (e) {
      setErr((e as Error).message);
      setStep('error');
    }
  }

  // poll Attestcoin attestation once we have a source block
  useEffect(() => {
    if (step !== 'waiting' || srcBlock == null) return;
    let live = true;
    const t = setInterval(async () => {
      try {
        const h = await attestedHeight(1);
        if (!live) return;
        setMsg(`Attestcoin attested Sepolia block ${h} / ${srcBlock}`);
        if (h >= srcBlock) {
          clearInterval(t);
          setStep('settle');
        }
      } catch {
        /* transient */
      }
    }, 12_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [step, srcBlock]);

  async function submitProofAndSettle() {
    setErr(null);
    try {
      setMsg('fetching the Attestcoin proof…');
      const p = await proofByTx(srcTx!, 1);
      await w.switchTo(CC3);
      const core = new Contract(C.SetldCore, ABI.core as never, await w.signer());
      const mp = { root: p.merkleProof.root, siblings: p.merkleProof.siblings.map((s) => ({ hash: s.hash, isLeft: s.isLeft })) };
      const cp = { lowerEndpointDigest: p.continuityProof.lowerEndpointDigest, roots: p.continuityProof.roots };
      setMsg('submitting proof + settling on Creditcoin…');
      const tx = await core.settle(id, p.chainKey, p.headerNumber, p.txBytes, mp, cp);
      const rc = await tx.wait();
      const ev = rc!.logs.find(
        (l: unknown): l is EventLog => l instanceof EventLog && (l as EventLog).eventName === 'MandateSettled',
      );
      setSettleResult({
        code: EVAL_NAMES[Number(ev!.args[2])] ?? String(ev!.args[2]),
        step: Number(ev!.args[3]),
        state: MANDATE_STATE[Number(ev!.args[1])] ?? String(ev!.args[1]),
        tx: tx.hash,
      });
      setStep('done');
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (err && step === 'error') {
    return (
      <main className="page reading">
        <h1>Execution</h1>
        <p className="note">{err}</p>
        <button className="btn secondary" onClick={() => { setStep('connect'); setErr(null); }}>Try again</button>
      </main>
    );
  }

  return (
    <main className="page reading">
      <h1>Bond and execute</h1>
      <p className="mono-sm">{id}</p>
      <WalletStrip w={w} />
      {mandate && (
        <div className="rows" style={{ marginTop: 12 }}>
          <div className="row"><span className="k">State</span><span className="v">{mandate.state as string}</span></div>
          <div className="row"><span className="k">Reward / bond at risk</span><span className="v fig">{mandate.reward as string} / {mandate.bond as string} tSETLD</span></div>
        </div>
      )}

      {step === 'connect' && (
        <button className="btn" style={{ marginTop: 16 }} disabled={!w.address} onClick={runFullFlow}>
          {w.address ? 'Bind source · accept · execute' : 'Connect a wallet first'}
        </button>
      )}
      {['bind', 'accept', 'execute'].includes(step) && <p className="note" style={{ marginTop: 16 }}>{msg}</p>}

      {step === 'waiting' && (
        <div style={{ marginTop: 16 }}>
          <p>Source transaction broadcast. Broadcast is not completion — waiting for the verified receipt.</p>
          <p className="mono-sm">{srcTx} · Sepolia block {srcBlock}</p>
          <p className="note">{msg || 'waiting for Attestcoin to attest the source block…'}</p>
        </div>
      )}

      {step === 'settle' && (
        <div style={{ marginTop: 16 }}>
          <p>The source block is attested. Submit the proof to settle.</p>
          <button className="btn" onClick={submitProofAndSettle}>Submit proof and settle</button>
          {msg && <p className="note" style={{ marginTop: 8 }}>{msg}</p>}
          {err && <p className="note" style={{ marginTop: 8 }}>{err}</p>}
        </div>
      )}

      {step === 'done' && settleResult && (
        <div className={`cert ${settleResult.state === 'FULFILLED' ? 'affirm' : 'refuse'}`} style={{ marginTop: 20 }}>
          <div className="hd"><span className="tmpl">Settlement · {settleResult.state}</span></div>
          <div className="body">
            <div className="rows" style={{ borderTop: 0 }}>
              <div className="row"><span className="k">Predicate</span><span className="v">{settleResult.state === 'FULFILLED' ? '▪ every field satisfied' : `▫ ${settleResult.code} (step ${settleResult.step})`}</span></div>
              <div className="row"><span className="k">Source tx</span><span className="v mono-sm"><a href={`${SEPOLIA.explorer}/tx/${srcTx}`} target="_blank" rel="noreferrer">{srcTx?.slice(0, 14)}… ↗</a></span></div>
              <div className="row"><span className="k">Settlement tx</span><span className="v mono-sm"><a href={`${CC3.explorer}/tx/${settleResult.tx}`} target="_blank" rel="noreferrer">{settleResult.tx.slice(0, 14)}… ↗</a></span></div>
            </div>
            <p style={{ marginTop: 12 }}><a className="btn secondary" href={`/app/mandate/?id=${id}`}>Open the mandate record</a></p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ExecutionPage() {
  return (
    <Suspense fallback={<main className="page reading"><h1>Execution</h1><p>Loading…</p></main>}>
      <ExecInner />
    </Suspense>
  );
}
