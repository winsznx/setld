'use client';
import { useState } from 'react';
import { verifyInBrowser, type ClientVerifyResult } from '@/lib/verify-client';

const DEMOS = [
  { label: 'correct — FULFILLED', id: '0x907043a3e8db72db45e0fd737b69d8975a53570487ff1b4c47f3db3cc1fb9598' },
  { label: 'verified but wrong — INVALID_ATTEMPT', id: '0xc28c59bac1c4ca108af0361c0cf27820a0455c57eff53ab05b3f9da3fe5e9360' },
];

export default function Verify() {
  const [id, setId] = useState(DEMOS[0].id);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ClientVerifyResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    setErr(null);
    try {
      setResult(await verifyInBrowser(id));
    } catch (e) {
      setErr((e as Error).message);
    }
    setRunning(false);
  }

  return (
    <main className="page reading">
      <h1>Verify a mandate</h1>
      <p style={{ marginTop: 8 }}>
        Your browser re-runs <span className="mono-sm">verify()</span> on the Creditcoin
        BlockProver precompile against a bundled Attestcoin proof, re-decodes the proven bytes
        through the deployed EvmV1Decoder, re-runs the settlement predicate, and checks value
        conservation from the settlement receipt. No wallet, no server.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        {DEMOS.map((d) => (
          <button key={d.id} className="btn secondary" onClick={() => setId(d.id)} aria-pressed={id === d.id}>
            {d.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          className="mono"
          style={{ flex: 1, height: 40, padding: '0 12px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <button className="btn" onClick={run} disabled={running}>{running ? 'Verifying…' : 'Verify'}</button>
      </div>

      {err && <p className="note" style={{ marginTop: 16 }}>{err}</p>}

      {result && (
        <div style={{ marginTop: 24 }}>
          {result.checks.length > 0 && (
            <div className="rows">
              {result.checks.map((c, i) => (
                <div className={`row${c.pass ? '' : ' fail'}`} key={i}>
                  <span className="k"><span className={`glyph ${c.pass ? 'pass' : 'fail'}`}>{c.pass ? '▪' : '▫'}</span> {c.name}</span>
                  <span className="v" style={{ fontSize: 12.5 }}>{c.detail}</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: 12, fontWeight: 600 }}>
            Result: <span className={result.result === 'match' ? 'verdict affirm' : result.result === 'mismatch' ? 'verdict refuse' : ''}>{result.result}</span>
          </p>
          <details className="disclose">
            <summary>Show recomputed evidence</summary>
            <div className="mono-sm">{JSON.stringify(result.evidence, null, 2)}</div>
          </details>
        </div>
      )}
    </main>
  );
}
