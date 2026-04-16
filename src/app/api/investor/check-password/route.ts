import { NextRequest, NextResponse } from 'next/server';
import { checkInvestorPassword } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (checkInvestorPassword(password)) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: 'wrong' }, { status: 401 });
}
