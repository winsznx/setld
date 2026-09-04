'use client';
import { useState } from 'react';
import { Contract, parseEther, keccak256, toUtf8Bytes, EventLog } from 'ethers';
import { useWallet } from '@/lib/useWallet';
import { WalletStrip, Field } from '@/components/app/AppShell';
import { C, S, ABI, TEMPLATE_ID, ROUTER_SELECTOR, cc3Read, sepoliaRead } from '@/lib/chain';

const MAX = (1n << 256n) - 1n;

export default function CreateMandate() {
  const w = useWallet();
  const [reward, setReward] = useState('4');
  const [execBond, setExecBond] = useState('2');
  const [creatorBond, setCreatorBond] = useState('1');
  const [maxIn, setMaxIn] = useState('10000');
  const [minOut, setMinOut] = useState('9000');
  const [windowBlocks, setWindowBlocks] = useState('600');
  const [phase, setPhase] = useState<'compose' | 'review' | 'signing' | 'publishing' | 'done'>('compose');
  const [understood, setUnderstood] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const numOk = [reward, execBond, creatorBond, maxIn, minOut].every((v) => Number(v) > 0) && Number(minOut) <= Number(maxIn) * 2;

  async function publish() {
    setErr(null);
    if (!w.onCC3) {
      setErr('Connect to Creditcoin Testnet to publish.');
      return;
    }
    try {
      setPhase('signing');
      const signer = await w.signer();
      const me = await signer.getAddress();
      const token = new Contract(C.tSETLD, ABI.erc20 as never, signer);
      const core = new Contract(C.SetldCore, ABI.core as never, signer);

      const rewardWei = parseEther(reward);
      const eBondWei = parseEther(execBond);
      const cBondWei = parseEther(creatorBond);
      const relayerWei = parseEther('1');
      const need = rewardWei + cBondWei + relayerWei;
      if ((await token.allowance(me, C.SetldVault)) < need) {
        const a = await token.approve(C.SetldVault, MAX);
        await a.wait();
      }

      const sepHead = await sepoliaRead().getBlockNumber();
      const cc3Head = await cc3Read().getBlockNumber();
      const terms = {
        router: S.SetldExecutionRouter,
        vault: S.DemoTreasuryVault,
        assetIn: S.assetIn,
        assetOut: S.assetOut,
        maxAmountIn: parseEther(maxIn),
        minAmountOut: parseEther(minOut),
        selector: ROUTER_SELECTOR,
        routePolicyHash: keccak256(toUtf8Bytes('treasury-rebalance-v1-route')),
      };
      const econ = {
        rewardToken: C.tSETLD,
        rewardAmount: rewardWei,
        bondToken: C.tSETLD,
        executorBond: eBondWei,
        creatorBond: cBondWei,
        relayerBudget: relayerWei,
      };
      setPhase('publishing');
      const tx = await core.createMandate(
        TEMPLATE_ID,
        1,
        terms,
        econ,
        Math.floor(Date.now() / 1000) + 3600,
        sepHead - 10,
        sepHead + Number(windowBlocks),
        cc3Head + 500_000,
        keccak256(toUtf8Bytes('web-' + Date.now())),
        BigInt(Date.now()),
      );
      setTxHash(tx.hash);
      const rc = await tx.wait();
      const ev = rc!.logs.find(
        (l: unknown): l is EventLog => l instanceof EventLog && (l as EventLog).eventName === 'MandateCreated',
      );
      const id = ev!.args[0] as string;
      setMandateId(id);
      setPhase('done');
      await w.refresh(me);
    } catch (e) {
      setErr((e as Error).message);
      setPhase('review');
    }
  }

  if (phase === 'done' && mandateId) {
    return (
      <main className="page reading">
        <h1>Mandate published</h1>
        <p style={{ marginTop: 8 }}>Reward and bonds are escrowed. An executor can now bond and execute it.</p>
        <div className="rows" style={{ marginTop: 16 }}>
          <div className="row"><span className="k">Mandate id</span><span className="v mono-sm">{mandateId}</span></div>
          <div className="row"><span className="k">Publish tx</span><span className="v mono-sm">{txHash}</span></div>
        </div>
        <p style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <a className="btn" href={`/app/mandate/?id=${mandateId}`}>Open the mandate record</a>
          <a className="btn secondary" href="/app/create/">Create another</a>
        </p>
      </main>
    );
  }

  return (
    <main className="page reading">
      <h1>Create a mandate</h1>
      <p style={{ marginTop: 8 }}>Treasury rebalance template. Define the execution, fund the reward, and let the verified receipt decide settlement.</p>
      <WalletStrip w={w} need="cc3" />

      {phase === 'compose' && (
        <>
          <h3 style={{ marginTop: 24, borderTop: '1px solid var(--rule)', paddingTop: 12 }}>Acceptable bounds</h3>
          <Field label="Maximum amount in (asset units)" value={maxIn} onChange={setMaxIn} hint="the executor may rebalance up to this; more is refused as AMOUNT_IN_OVER_CAP" />
          <Field label="Minimum output (asset units)" value={minOut} onChange={setMinOut} />
          <h3 style={{ marginTop: 16 }}>When it must happen</h3>
          <Field label="Execution window (Sepolia blocks from now)" value={windowBlocks} onChange={setWindowBlocks} />
          <h3 style={{ marginTop: 16 }}>Economics (tSETLD)</h3>
          <Field label="Reward" value={reward} onChange={setReward} />
          <Field label="Required executor bond" value={execBond} onChange={setExecBond} />
          <Field label="Creator bond" value={creatorBond} onChange={setCreatorBond} />
          <button className="btn" disabled={!numOk} onClick={() => setPhase('review')} style={{ marginTop: 8 }}>
            Review mandate
          </button>
          {!numOk && <p className="caption" style={{ marginTop: 6 }}>All amounts must be positive.</p>}
        </>
      )}

      {(phase === 'review' || phase === 'signing' || phase === 'publishing') && (
        <div className="cert" style={{ marginTop: 20 }}>
          <div className="hd"><span className="tmpl">Treasury rebalance v1 — terms</span></div>
          <div className="body">
            <div className="rows" style={{ borderTop: 0 }}>
              <div className="row"><span className="k">What must happen</span><span className="v" style={{ fontSize: 13 }}>rebalance {S.assetIn.slice(0, 8)}… → {S.assetOut.slice(0, 8)}… via the setld router, emitting RebalanceExecuted</span></div>
              <div className="row"><span className="k">Amount cap</span><span className="v fig">{maxIn}</span></div>
              <div className="row"><span className="k">Minimum output</span><span className="v fig">{minOut}</span></div>
              <div className="row"><span className="k">Reward</span><span className="v fig">{reward} tSETLD</span></div>
              <div className="row"><span className="k">Executor bond</span><span className="v fig">{execBond} tSETLD</span></div>
              <div className="row"><span className="k">Creator bond</span><span className="v fig">{creatorBond} tSETLD</span></div>
              <div className="row"><span className="k">Penalty on parameter mismatch</span><span className="v">100% of executor bond</span></div>
            </div>
            <label style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 13 }}>
              <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
              I understand the reward and bond rules.
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="btn" disabled={!understood || phase !== 'review'} onClick={publish}>
                {phase === 'signing' ? 'Awaiting wallet…' : phase === 'publishing' ? 'Publishing…' : 'Fund and publish'}
              </button>
              {phase === 'review' && <button className="btn secondary" onClick={() => setPhase('compose')}>Edit</button>}
            </div>
            {txHash && <p className="caption mono-sm" style={{ marginTop: 8 }}>tx {txHash} — safe to leave this page</p>}
            {err && <p className="note" style={{ marginTop: 8 }}>{err}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
