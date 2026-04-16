import { NextRequest, NextResponse } from 'next/server';
import { getInvestorSession, logPageView } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getInvestorSession();
  if (!session?.visitorId) return NextResponse.json({ ok: false });
  const { path } = await req.json();
  if (path) await logPageView(session.visitorId, path);
  return NextResponse.json({ ok: true });
}
