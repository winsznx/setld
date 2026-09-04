import { type CompletedMandate, SEPOLIA_EXPLORER, CC3_EXPLORER, short } from '@/lib/data';

function Row({
  k,
  children,
  fail,
  glyph,
  expect,
}: {
  k: string;
  children: React.ReactNode;
  fail?: boolean;
  glyph?: 'pass' | 'fail' | 'pending';
  expect?: string;
}) {
  return (
    <div className={`row${fail ? ' fail' : ''}`}>
      <span className="k">{k}</span>
      <span className="v">
        {glyph && <span className={`glyph ${glyph}`}>{glyph === 'fail' ? '▫' : glyph === 'pending' ? '◐' : '▪'} </span>}
        {children}
        {expect && <span className="expect">committed: {expect}</span>}
      </span>
    </div>
  );
}

/**
 * The design.md §6.3 settlement certificate. Both the affirmed and refused certificate show
 * an identical "Attestcoin proof: Verified" line; the divergence is in the rows below.
 */
export function SettlementCertificate({ m }: { m: CompletedMandate }) {
  const fulfilled = m.finalState === 'FULFILLED';
  const s = m.onChainSettlement;
  const ve = m.verifiedExecution as {
    txFrom?: string;
    receiptStatus?: number;
    selector?: string;
    logs?: unknown[];
  };
  const wrongField = s && !fulfilled ? s.code : null;

  return (
    <div className={`cert ${fulfilled ? 'affirm' : 'refuse'}`}>
      <div className="hd">
        <span className="id">Mandate {short(m.mandateId, 8, 6)}</span>
        <span className="tmpl">Treasury rebalance v1</span>
      </div>
      <div className="body">
        <div className="sect">
          <div className="rows" style={{ borderTop: 0 }}>
            <Row k="Attestcoin proof" glyph="pass">
              Verified — source block {String(m.attestcoinProof.headerNumber)}, tx index{' '}
              {String(m.attestcoinProof.transactionIndex)}
            </Row>
            <Row k="Executor identity" glyph={wrongField === 'SENDER_NOT_BOUND_EXECUTOR' ? 'fail' : 'pass'}>
              {wrongField === 'SENDER_NOT_BOUND_EXECUTOR' ? 'Mismatch' : `Match — ${short(ve.txFrom ?? '', 6, 4)}`}
            </Row>
            <Row
              k="Receipt status"
              glyph={ve.receiptStatus === 1 ? 'pass' : 'fail'}
            >
              {ve.receiptStatus === 1 ? 'Success — the Ethereum transaction was included and succeeded' : 'Reverted'}
            </Row>
            <Row
              k={
                wrongField === 'AMOUNT_IN_OVER_CAP'
                  ? 'Committed amount cap'
                  : wrongField === 'WRONG_ASSET_OUT'
                    ? 'Protected destination asset'
                    : 'Committed predicate'
              }
              glyph={fulfilled ? 'pass' : 'fail'}
              fail={!fulfilled}
            >
              {fulfilled ? 'Pass — every committed field satisfied' : `Fail — ${s?.code} (predicate step ${s?.failedStep})`}
            </Row>
          </div>
        </div>

        <div className="sect">
          <div className="rows">
            <Row k="Reward" glyph={fulfilled ? 'pass' : 'fail'}>
              <span className={`verdict ${fulfilled ? 'affirm' : 'refuse'}`}>{fulfilled ? 'Released to executor' : 'Refunded to creator'}</span>
            </Row>
            <Row k="Executor bond" glyph={fulfilled ? 'pass' : 'fail'}>
              <span className={`verdict ${fulfilled ? 'affirm' : 'refuse'}`}>{fulfilled ? 'Returned' : 'Penalty applied'}</span>
            </Row>
          </div>
        </div>

        <div className="sect">
          <div className="rows">
            <Row k="Source transaction">
              <a href={`${SEPOLIA_EXPLORER}/tx/${m.transactions.sepoliaExecute}`} target="_blank" rel="noreferrer">
                {short(m.transactions.sepoliaExecute ?? '', 8, 6)} ↗ Sepolia
              </a>
            </Row>
            <Row k="Creditcoin settlement">
              <a href={`${CC3_EXPLORER}/tx/${m.transactions.settle}`} target="_blank" rel="noreferrer">
                {short(m.transactions.settle ?? '', 8, 6)} ↗ CC3
              </a>
            </Row>
            <Row k="Reference model" glyph={m.referenceModelPrediction === s?.code ? 'pass' : 'fail'}>
              {m.referenceModelPrediction === s?.code ? `Agreed — ${m.referenceModelPrediction}` : 'Disagreed'}
            </Row>
          </div>
        </div>

        <details className="disclose">
          <summary>Show the verified execution</summary>
          <div className="mono-sm">{JSON.stringify(m.verifiedExecution, null, 2)}</div>
        </details>
        <details className="disclose">
          <summary>Show the proof material</summary>
          <div className="mono-sm">{JSON.stringify(m.attestcoinProof, null, 2)}</div>
        </details>
      </div>
    </div>
  );
}
