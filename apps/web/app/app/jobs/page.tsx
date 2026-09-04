'use client';
import { useEffect, useState } from 'react';
import { Contract } from 'ethers';
import { C, ABI, cc3Read, MANDATE_STATE } from '@/lib/chain';
import { useWallet } from '@/lib/useWallet';
import { WalletStrip } from '@/components/app/AppShell';

export default function Jobs() {
  const w = useWallet();
  const [open, setOpen] = useState<{ id: string; reward: bigint; bond: bigint; endBlock: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const core = new Contract(C.SetldCore, ABI.core as never, cc3Read());
        const head = await cc3Read().getBlockNumber();
        const created = await core.queryFilter(core.filters.MandateCreated(), Math.max(0, head - 40_000), head);
        const rows: { id: string; reward: bigint; bond: bigint; endBlock: number }[] = [];
        for (const ev of created.slice(-40)) {
          const id = (ev as { args: string[] }).args[0]!;
          const m = await core.getMandate(id).catch(() => null);
          if (m && MANDATE_STATE[Number(m.state)] === 'OPEN') {
            rows.push({ id, reward: m.econ.rewardAmount, bond: m.econ.executorBond, endBlock: Number(m.executionEndBlock) });
          }
        }
        setOpen(rows.reverse());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="page">
      <h1>Open mandates</h1>
      <p style={{ marginTop: 8 }}>Bond one, execute the source transaction on Sepolia, and settle deterministically from the Attestcoin proof.</p>
      <WalletStrip w={w} need="cc3" />

      {loading ? (
        <p style={{ marginTop: 16 }}>Reading Creditcoin…</p>
      ) : open.length === 0 ? (
        <div className="record-link" style={{ marginTop: 16 }}>
          <strong>No open mandates right now.</strong>
          <span className="caption">Create one from <a href="/app/create/">/app/create</a>, or check back.</span>
        </div>
      ) : (
        <div className="rows" style={{ marginTop: 16 }}>
          <div className="row" style={{ fontWeight: 600 }}>
            <span className="k">Mandate</span>
            <span className="v">Reward · Bond at risk · Ends (Sepolia blk)</span>
          </div>
          {open.map((r) => (
            <div className="row" key={r.id}>
              <span className="k mono-sm">
                <a href={`/app/execution/?id=${r.id}`}>{r.id.slice(0, 14)}…</a>
              </span>
              <span className="v fig">
                {(r.reward / 10n ** 18n).toString()} · {(r.bond / 10n ** 18n).toString()} · {r.endBlock}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
