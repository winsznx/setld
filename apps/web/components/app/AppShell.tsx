'use client';
import { CC3, SEPOLIA } from '@/lib/chain';
import type { useWallet } from '@/lib/useWallet';

export function WalletStrip({ w, need }: { w: ReturnType<typeof useWallet>; need?: 'cc3' | 'sepolia' }) {
  if (!w.address) {
    return (
      <div className="wallet-strip">
        <span>Not connected</span>
        <button className="btn" onClick={w.connect} disabled={w.connecting}>
          {w.connecting ? 'Connecting…' : 'Connect wallet'}
        </button>
        {w.error && <span className="wallet-err">{w.error}</span>}
      </div>
    );
  }
  const wrongCc3 = need === 'cc3' && !w.onCC3;
  const wrongSep = need === 'sepolia' && !w.onSepolia;
  return (
    <div className="wallet-strip">
      <span className={wrongCc3 ? 'seg pending' : 'seg'}>
        {w.onCC3 ? 'Creditcoin Testnet' : `Chain ${w.chainId}`} · {w.address.slice(0, 6)}…{w.address.slice(-4)}
        {w.tctc != null && ` · ${Number(w.tctc).toFixed(2)} tCTC`}
        {w.tsetld != null && ` · ${Number(w.tsetld).toFixed(2)} tSETLD`}
      </span>
      {wrongCc3 && (
        <button className="btn secondary" onClick={() => w.switchTo(CC3)}>
          Switch to Creditcoin Testnet
        </button>
      )}
      {wrongSep && (
        <button className="btn secondary" onClick={() => w.switchTo(SEPOLIA)}>
          Switch to Sepolia
        </button>
      )}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  hint,
  error,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  mono?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label" style={{ display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <input
        className={mono ? 'mono' : undefined}
        style={{
          width: '100%',
          height: 40,
          padding: '0 12px',
          border: `1px solid ${error ? 'var(--refuse)' : 'var(--rule)'}`,
          borderLeft: error ? '3px solid var(--refuse)' : undefined,
          borderRadius: 3,
          background: 'var(--surface)',
          color: 'var(--ink)',
          fontSize: mono ? 13 : 15,
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="caption" style={{ color: 'var(--refuse)', marginTop: 4 }}>{error}</p> : hint ? <p className="caption" style={{ marginTop: 4 }}>{hint}</p> : null}
    </div>
  );
}
