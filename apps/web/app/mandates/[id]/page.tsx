import { completed } from '@/lib/data';
import { SettlementCertificate } from '@/components/SettlementCertificate';
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

const BY_ID: Record<string, string> = {
  '0x907043a3e8db72db45e0fd737b69d8975a53570487ff1b4c47f3db3cc1fb9598': 'canonical-correct',
  '0xc28c59bac1c4ca108af0361c0cf27820a0455c57eff53ab05b3f9da3fe5e9360': 'canonical-wrong-cap',
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
