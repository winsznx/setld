'use client';
import { useWallet } from '@/lib/useWallet';
import { WalletStrip } from '@/components/app/AppShell';

export default function AppHome() {
  const w = useWallet();
  return (
    <main className="page reading">
      <h1>setld app</h1>
      <p style={{ marginTop: 8 }}>
        Post a bonded execution mandate, or bond and execute one. Settlement is decided by an
        Attestcoin proof and the committed predicate — not by a reviewer.
      </p>
      <WalletStrip w={w} need="cc3" />

      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        <a className="record-link" href="/app/create/">
          <strong>Create a mandate</strong>
          <span className="caption">Define the execution, fund the reward, let the verified receipt decide settlement.</span>
        </a>
        <a className="record-link" href="/app/jobs/">
          <strong>Find work</strong>
          <span className="caption">Bind a Sepolia execution address, bond an open mandate, execute, get paid deterministically.</span>
        </a>
        <a className="record-link" href="/proof/">
          <strong>View the live proof</strong>
          <span className="caption">The side-by-side settlement diptych. No wallet.</span>
        </a>
      </div>
    </main>
  );
}
