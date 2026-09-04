'use client';
import { useState } from 'react';

export default function Verify() {
  const [id, setId] = useState('0x2e69eac5b98a7192868083b62ad5d756aa917a019ac0c0a701b117e3a43094c7');
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<null | { result: string; checks?: { name: string; pass: boolean; detail: string }[]; evidence?: unknown; error?: string }>(null);

  async function run() {
    setState('running');
    setResult(null);
    try {
      const r = await fetch(`/api/verify?id=${encodeURIComponent(id.trim())}`);
      setResult(await r.json());
    } catch (e) {
      setResult({ result: 'evidence-unavailable', error: String(e) });
    }
    setState('done');
  }

  return (
    <main className="page reading">
      <h1>Verify a mandate</h1>
      <p style={{ marginTop: 8 }}>
        Recomputes the source transaction identity, re-verifies the Attestcoin proof against the
        Creditcoin precompile, re-runs the settlement predicate, and checks value conservation —
        from public chain data. No wallet.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          className="mono"
          style={{ flex: 1, height: 40, padding: '0 12px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="mandate id — 0x…"
        />
        <button className="btn" onClick={run} disabled={state === 'running'}>
          {state === 'running' ? 'Verifying…' : 'Verify'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 24 }}>
          {result.checks && (
            <div className="rows">
              {result.checks.map((c, i) => (
                <div className={`row${c.pass ? '' : ' fail'}`} key={i}>
                  <span className="k">
                    <span className={`glyph ${c.pass ? 'pass' : 'fail'}`}>{c.pass ? '▪' : '▫'}</span> {c.name}
                  </span>
                  <span className="v" style={{ fontSize: 12.5 }}>{c.detail}</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: 12, fontWeight: 600 }}>
            Result: <span className={result.result === 'match' ? 'verdict affirm' : 'verdict refuse'}>{result.result}</span>
          </p>
          {result.error && <p className="note">{result.error}</p>}
          {result.evidence != null && (
            <details className="disclose">
              <summary>Show recomputed evidence</summary>
              <div className="mono-sm">{JSON.stringify(result.evidence, null, 2)}</div>
            </details>
          )}
        </div>
      )}
    </main>
  );
}
