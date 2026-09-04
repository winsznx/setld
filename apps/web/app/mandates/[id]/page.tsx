import { completed } from '@/lib/data';
import { SettlementCertificate } from '@/components/SettlementCertificate';
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

const BY_ID: Record<string, string> = {
  '0x2e69eac5b98a7192868083b62ad5d756aa917a019ac0c0a701b117e3a43094c7': 'canonical-correct',
  '0x507b1d27d27cc9121a7f1af24bb364efbde7c49d6856ec0fef91f354b6f9950d': 'canonical-wrong-cap',
};

export function generateStaticParams() {
  return Object.keys(BY_ID).map((id) => ({ id }));
}

export default async function MandatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const label = BY_ID[id.toLowerCase()];
  if (!label) notFound();
  const m = completed(label);
  const fulfilled = m.finalState === 'FULFILLED';

  return (
    <main className="page reading">
      <h1>Mandate record</h1>
      <p style={{ marginTop: 8 }}>
        {fulfilled
          ? 'A verified Sepolia execution satisfied every committed condition. The reward was released to the executor and the bond returned.'
          : `A Sepolia transaction succeeded on Ethereum but violated a committed condition (${m.onChainSettlement?.code}). The reward was refunded and the executor bond penalized.`}
      </p>
      <div style={{ marginTop: 20 }}>
        <SettlementCertificate m={m} />
      </div>
      <p style={{ marginTop: 20 }}>
        <a className="btn secondary" href={`/verify`}>Verify this record independently</a>
      </p>
    </main>
  );
}
