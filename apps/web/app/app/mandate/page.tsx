'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Contract } from 'ethers';
import { C, ABI, cc3Read, MANDATE_STATE, EVAL_NAMES, CC3 } from '@/lib/chain';
import { LifecycleSpine, type SpineNode, explorerTx } from '@/components/app/LifecycleSpine';

export const dynamic = 'force-static';

function MandateInner() {
  const id = useSearchParams().get('id') ?? '';
  const [m, setM] = useState<Record<string, unknown> | null>(null);
  const [settled, setSettled] = useState<{ code: string; step: number; tx: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!/^0x[0-9a-fA-F]{64}$/.test(id)) {
      setErr('Provide ?id=<0x…32 bytes>');
      return;
    }
    let live = true;
    const poll = async () => {
      try {
        const core = new Contract(C.SetldCore, ABI.core as never, cc3Read());
        const mn = await core.getMandate(id);
        if (!live) return;
        setM({
          state: MANDATE_STATE[Number(mn.state)],
          creator: mn.creator,
          acceptedExecutor: mn.acceptedExecutor,
          acceptedSourceSender: mn.acceptedSourceSender,
          reward: mn.econ.rewardAmount.toString(),
          executorBond: mn.econ.executorBond.toString(),
          executionStartBlock: Number(mn.executionStartBlock),
          executionEndBlock: Number(mn.executionEndBlock),
        });
        const head = await cc3Read().getBlockNumber();
        const logs = await core.queryFilter(core.filters.MandateSettled(id), Math.max(0, head - 40_000), head).catch(() => []);
        if (logs.length) {
          const l = logs[logs.length - 1] as { args: unknown[]; transactionHash: string };
          setSettled({ code: EVAL_NAMES[Number(l.args[2])] ?? String(l.args[2]), step: Number(l.args[3]), tx: l.transactionHash });
        }
      } catch (e) {
        setErr((e as Error).message);
      }
    };
    void poll();
    const t = setInterval(poll, 12_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [id]);

  if (err) return <main className="page reading"><h1>Mandate</h1><p className="note">{err}</p></main>;
  if (!m) return <main className="page reading"><h1>Mandate</h1><p>Loading from Creditcoin…</p></main>;

  const st = m.state as string;
  const accepted = st !== 'OPEN' && st !== 'NONE';
  const terminal = ['FULFILLED', 'INVALID_ATTEMPT', 'EXECUTION_REVERTED', 'TIMED_OUT', 'CANCELLED', 'RELEASED'].includes(st);
  const affirm = st === 'FULFILLED';

  const nodes: SpineNode[] = [
    { label: 'Published', state: 'reached' },
    { label: 'Accepted', state: accepted ? 'reached' : st === 'OPEN' ? 'current' : 'future', detail: accepted ? `executor ${(m.acceptedExecutor as string).slice(0, 10)}…` : undefined },
    { label: 'Executed on Ethereum', state: terminal || settled ? 'reached' : accepted ? 'current' : 'future' },
    { label: 'Waiting for Attestcoin', state: settled ? 'reached' : accepted && !terminal ? 'current' : 'future', tone: !settled && accepted && !terminal ? 'pending' : undefined },
    { label: 'Proof submitted', state: settled ? 'reached' : 'future', link: settled ? { href: explorerTx('cc3', settled.tx), text: settled.tx.slice(0, 10) } : undefined },
    {
      label: terminal ? `Settled — ${st}` : 'Settled',
      state: terminal ? 'reached' : 'future',
      tone: affirm ? 'affirm' : terminal ? 'refuse' : undefined,
      detail: settled && !affirm ? `${settled.code} (predicate step ${settled.step})` : undefined,
    },
  ];

  return (
    <main className="page">
      <div className="mandate-layout">
        <div className="spine-col">
          <LifecycleSpine nodes={nodes} />
        </div>
        <div className={`cert ${affirm ? 'affirm' : terminal ? 'refuse' : st === 'OPEN' ? '' : 'pending'}`} style={{ maxWidth: 720 }}>
          <div className="hd">
            <span className="id">Mandate {id.slice(0, 10)}…</span>
            <span className="tmpl">Treasury rebalance v1 · {st}</span>
          </div>
          <div className="body">
            <div className="rows" style={{ borderTop: 0 }}>
              <div className="row"><span className="k">Creator</span><span className="v mono-sm">{m.creator as string}</span></div>
              <div className="row"><span className="k">Reward</span><span className="v fig">{(BigInt(m.reward as string) / 10n ** 18n).toString()} tSETLD</span></div>
              <div className="row"><span className="k">Executor bond</span><span className="v fig">{(BigInt(m.executorBond as string) / 10n ** 18n).toString()} tSETLD</span></div>
              {accepted && <div className="row"><span className="k">Bound source address</span><span className="v mono-sm">{m.acceptedSourceSender as string}</span></div>}
              {settled && (
                <div className={`row${affirm ? '' : ' fail'}`}>
                  <span className="k">Predicate</span>
                  <span className="v">
                    <span className={`glyph ${affirm ? 'pass' : 'fail'}`}>{affirm ? '▪' : '▫'}</span>{' '}
                    {affirm ? 'Every committed field satisfied' : `${settled.code} (step ${settled.step})`}
                  </span>
                </div>
              )}
            </div>
            {st === 'OPEN' && (
              <p style={{ marginTop: 12 }}>
                <a className="btn" href={`/app/execution/?id=${id}`}>Bond and execute this mandate</a>
              </p>
            )}
            {settled && (
              <p style={{ marginTop: 12 }}>
                <a className="btn secondary" href={`/verify/`}>Verify this settlement independently</a>{' '}
                <a className="btn secondary" href={`${CC3.explorer}/tx/${settled.tx}`} target="_blank" rel="noreferrer">Settlement tx ↗</a>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function MandatePage() {
  return (
    <Suspense fallback={<main className="page reading"><h1>Mandate</h1><p>Loading…</p></main>}>
      <MandateInner />
    </Suspense>
  );
}
