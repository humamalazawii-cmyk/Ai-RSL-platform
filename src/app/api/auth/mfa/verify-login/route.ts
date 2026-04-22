import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  prisma,
  createSession,
  verifySession,
} from '@/lib/db';
import {
  verifyTOTPCode,
  verifyBackupCode,
} from '@/lib/mfa';
import {
  checkLoginRateLimit,
  checkGeneralRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import {
  logLoginSuccess,
  logLoginFailure,
  logMFAChallengeSuccess,
  logMFAChallengeFailure,
} from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const verifyLoginSchema = z.object({
  challengeToken: z.string().min(10, 'رمز التحدي مطلوب'),
  code: z.string().min(6).max(9).optional(),
  backupCode: z.string().min(8).max(12).optional(),
}).refine(
  (data) => data.code || data.backupCode,
  { message: 'يجب إدخال كود MFA أو كود الاستعادة' }
);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get('user-agent') ?? null;

  try {
    const generalRl = await checkGeneralRateLimit(ip);
    if (!generalRl.success) {
      const res = NextResponse.json(
        { error: 'عدد محاولاتك كبير. حاول لاحقاً.' },
        { status: 429 }
      );
      for (const [k, v] of Object.entries(rateLimitHeaders(generalRl))) {
        res.headers.set(k, v);
      }
      return res;
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'طلب غير صحيح' }, { status: 400 });
    }

    const parsed = verifyLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 }
      );
    }

    const { challengeToken, code, backupCode } = parsed.data;

    const session = verifySession(challengeToken);
    if (!session || session.type !== 'user' || !session.userId) {
      return NextResponse.json(
        { error: 'رمز التحدي غير صحيح أو منتهي. أعد تسجيل الدخول.' },
        { status: 401 }
      );
    }

    const loginRl = await checkLoginRateLimit(ip, session.email ?? '');
    if (!loginRl.success) {
      const res = NextResponse.json(
        { error: 'تم تجاوز الحد المسموح. حاول بعد قليل.' },
        { status: 429 }
      );
      for (const [k, v] of Object.entries(rateLimitHeaders(loginRl))) {
        res.headers.set(k, v);
      }
      return res;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        role: true,
        mfaEnabled: true,
        mfaSecret: true,
        mfaBackupCodes: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json(
        { error: 'حالة MFA غير صحيحة. اتصل بالدعم.' },
        { status: 400 }
      );
    }

    let valid = false;
    let usedBackupCode = false;
    const currentCodes = [...(user.mfaBackupCodes ?? [])];

    if (code) {
      valid = verifyTOTPCode(user.mfaSecret, code);
    } else if (backupCode) {
      const result = verifyBackupCode(backupCode, currentCodes);
      valid = result.valid;
      usedBackupCode = result.valid;
      if (result.valid) {
        await prisma.user.update({
          where: { id: user.id },
          data: { mfaBackupCodes: result.remainingCodes },
        });
      }
    }

    if (!valid) {
      logMFAChallengeFailure(user.id, user.email, ip, userAgent).catch(() => {});
      logLoginFailure(user.email, 'mfa_code_invalid', ip, userAgent, user.id).catch(() => {});
      return NextResponse.json(
        { error: 'كود MFA غير صحيح' },
        { status: 401 }
      );
    }

    const token = createSession(
      {
        type: 'user',
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      '24h'
    );

    logMFAChallengeSuccess(user.id, user.email, ip, userAgent, { usedBackupCode }).catch(() => {});
    logLoginSuccess(user.id, user.email, ip, userAgent).catch(() => {});

    const res = NextResponse.json({
      ok: true,
      usedBackupCode,
    });

    res.cookies.set('rsl-user', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('[mfa/verify-login] unexpected error:', err);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}