import { facts, completed } from '@/lib/data';
import { SettlementCertificate } from '@/components/SettlementCertificate';

export const dynamic = 'force-static';

export default function Home() {
  const f = facts();
  const correct = completed('canonical-correct');
  const wrong = completed('canonical-wrong-cap');
  return (
    <main className="page">
      <p className="hero-line">The agent did not report completion. The receipt did.</p>

      <div className="diptych">
        <p className="cap">
          The same Attestcoin verifier proved both transactions. setld paid the correct executor
          and refused the wrong one, with no evaluator.
        </p>
        <div><SettlementCertificate m={correct} /></div>
        <div className="gutter" />
        <div><SettlementCertificate m={wrong} /></div>
      </div>

      <p style={{ marginTop: 32, maxWidth: '64ch' }}>
        setld lets a protocol post a bonded execution mandate. The executor acts on Ethereum,
        the Attestcoin Protocol proves the real transaction and receipt, and Creditcoin pays or
        penalizes the executor from the committed rules.
      </p>
      <p style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <a className="btn" href="/proof">View the live proof</a>
        <a className="btn secondary" href="/verify">Verify a mandate</a>
      </p>

      <h2 style={{ marginTop: 48, marginBottom: 12 }}>How it works</h2>
      <div className="band">
        <div><span className="step-k">Mandate + reward + bond</span><span className="step-v">escrowed on Creditcoin</span></div>
        <div><span className="step-k">External transaction</span><span className="step-v">on Ethereum Sepolia</span></div>
        <div><span className="step-k">Verified receipt</span><span className="step-v">proved by Attestcoin</span></div>
        <div><span className="step-k">Settlement</span><span className="step-v">pay or penalize deterministically</span></div>
      </div>

      <h2 style={{ marginTop: 40, marginBottom: 12 }}>Testnet status</h2>
      <div className="rows">
        <div className="row"><span className="k">Creditcoin core</span><span className="v mono-sm">{f.contracts.creditcoin.SetldCore}</span></div>
        <div className="row"><span className="k">Attestcoin adapter</span><span className="v mono-sm">{f.contracts.creditcoin.SetldAttestcoinAdapter}</span></div>
        <div className="row"><span className="k">Sepolia router</span><span className="v mono-sm">{f.contracts.sepolia.SetldExecutionRouter}</span></div>
        <div className="row"><span className="k">SDK</span><span className="v mono-sm">{f.attestcoin.sdk}</span></div>
      </div>
      <p className="caption" style={{ marginTop: 16 }}>All assets are test assets. Repository: <a href={f.repository}>{f.repository}</a></p>
    </main>
  );
}
