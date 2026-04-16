import { NextRequest, NextResponse } from 'next/server';
import { prisma, verifyPassword, createSession } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 401 });
    if (!await verifyPassword(password, user.passwordHash)) return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 401 });

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    const token = createSession({ type: 'user', userId: user.id, email: user.email, role: user.role }, '24h');

    const res = NextResponse.json({ ok: true });
    res.cookies.set('rsl-user', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60*60*24, path: '/',
    });
    return res;
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
