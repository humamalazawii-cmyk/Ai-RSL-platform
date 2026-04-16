import { NextRequest, NextResponse } from 'next/server';
import { checkInvestorPassword, registerVisitor, createSession, logPageView } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { password, name, email, phone, company } = await req.json();
    if (!checkInvestorPassword(password)) return NextResponse.json({ error: 'كلمة السر غير صحيحة' }, { status: 401 });
    if (!name || !email) return NextResponse.json({ error: 'الاسم والإيميل مطلوبان' }, { status: 400 });

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const visitor = await registerVisitor({ name, email, phone, company, ipAddress, userAgent });
    await logPageView(visitor.id, '/investor');

    const token = createSession({ type: 'investor', visitorId: visitor.id, email });
    const res = NextResponse.json({ ok: true });
    res.cookies.set('rsl-investor', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60*60*24*7, path: '/',
    });
    return res;
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
