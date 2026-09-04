import { facts, completed, ablation, agentLog } from '@/lib/data';
import { SettlementCertificate } from '@/components/SettlementCertificate';

export const dynamic = 'force-static';

export default function Proof() {
  const f = facts();
  const correct = completed('canonical-correct');
  const wrong = completed('canonical-wrong-cap');
  const abl = ablation();
  const agent = agentLog();

  return (
    <main className="page">
      <h1>Live proof</h1>
      <p style={{ marginTop: 8 }}>
        Two mandates settled on public testnets. A valid cross-chain proof proves what happened.
        setld still decides whether what happened satisfied the job.
      </p>

      <div className="diptych" style={{ marginTop: 24 }}>
        <p className="cap">
          The same Attestcoin verifier proved both transactions. setld paid the correct executor
          and refused the wrong one, with no evaluator.
        </p>
        <div><SettlementCertificate m={correct} /></div>
        <div className="gutter" />
        <div><SettlementCertificate m={wrong} /></div>
      </div>

      <h2 style={{ marginTop: 40, marginBottom: 8 }}>Replay is rejected</h2>
      <p className="mono-sm">
        Re-submitting the correct-case proof against a fresh accepted mandate reverts{' '}
        SourceTxAlreadyConsumed({(f.canonicalDemoTransactions.replayRejection as { consumedSourceTxKey: string }).consumedSourceTxKey}).
        The proof submitter earns only a fixed reimbursement and never the reward.
      </p>

      <h2 style={{ marginTop: 40, marginBottom: 8 }}>Why Attestcoin earns its place</h2>
      <p>
        The same two executions, same predicate, same economics, run through a trusted-reporter
        baseline instead of the Attestcoin path:
      </p>
      <div className="rows">
        <div className="row"><span className="k">Honest reporter — agreement with setld</span><span className="v">{abl.honestParity.disagreements === 0 ? '▪ every case' : `▫ ${abl.honestParity.disagreements} disagreements`}</span></div>
        <div className="row fail"><span className="k">Compromised reporter — invalid reward leaked (baseline)</span><span className="v">{abl.reporterCompromise.invalid_reward_leakage_count_B0} case · 10 tSETLD</span></div>
        <div className="row"><span className="k">Compromised reporter — invalid reward leaked (setld)</span><span className="v"><span className="glyph pass">▪</span> 0</span></div>
      </div>
      <p className="caption" style={{ marginTop: 8 }}>
        A compromised reporter paid the reward for an execution that violated the committed cap.
        setld refused the identical execution because the on-chain proof and predicate did not support it.
      </p>

      {agent && (
        <>
          <h2 style={{ marginTop: 40, marginBottom: 8 }}>The agent decides whether to act, not whether it succeeded</h2>
          <div className="rows">
            {agent.outcomes.map((o: { decision: string; mandateId: string; rationale: string }, i: number) => (
              <div className="row" key={i}>
                <span className="k">{o.decision === 'ACCEPT' ? '▪ ACCEPT' : '▫ ABSTAIN'} {o.mandateId.slice(0, 12)}…</span>
                <span className="v" style={{ maxWidth: '52ch', fontSize: 12.5 }}>{o.rationale}</span>
              </div>
            ))}
          </div>
          <p className="caption" style={{ marginTop: 8 }}>
            Model: {agent.log.find((l: { step: string; data: { model?: string } }) => l.data?.model)?.data?.model ?? 'claude-sonnet-5'}.
            Deterministic guardrails gate every decision; the model cannot bypass them, mark an
            execution successful, or choose a payout.
          </p>
        </>
      )}

      <details className="disclose" style={{ marginTop: 32 }}>
        <summary>How could this result be misleading?</summary>
        <div className="mono-sm">
          {f.limitations.join('\n\n')}
        </div>
      </details>

      <h2 style={{ marginTop: 32, marginBottom: 8 }}>Verify it yourself</h2>
      <div className="mono-sm wrap-x">
        {f.reproductionCommands.join('\n')}
      </div>
    </main>
  );
}
