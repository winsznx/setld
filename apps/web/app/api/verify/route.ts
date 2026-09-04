import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KNOWN: Record<string, string> = {
  '0x2e69eac5b98a7192868083b62ad5d756aa917a019ac0c0a701b117e3a43094c7': 'canonical-correct',
  '0x507b1d27d27cc9121a7f1af24bb364efbde7c49d6856ec0fef91f354b6f9950d': 'canonical-wrong-cap',
};

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id || !/^0x[0-9a-fA-F]{64}$/.test(id)) {
    return NextResponse.json({ error: 'pass ?id=<0x…32bytes>' }, { status: 400 });
  }
  const { verifyMandate } = await import('@setld/verifier/verify');
  try {
    const result = await verifyMandate(id, {});
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ result: 'evidence-unavailable', error: (e as Error).message, knownDemo: KNOWN[id.toLowerCase()] ?? null }, { status: 200 });
  }
}
