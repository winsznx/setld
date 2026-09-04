import { NextRequest, NextResponse } from 'next/server';
import { verifyStandalone } from '@/lib/verify-standalone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id || !/^0x[0-9a-fA-F]{64}$/.test(id)) {
    return NextResponse.json({ error: 'pass ?id=<0x…32bytes>' }, { status: 400 });
  }
  try {
    return NextResponse.json(await verifyStandalone(id));
  } catch (e) {
    return NextResponse.json({ result: 'evidence-unavailable', error: (e as Error).message }, { status: 200 });
  }
}
