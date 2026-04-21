import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  prisma,
  verifyPassword,
  getUserSession,
} from '@/lib/db';
import {
  checkGeneralRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import {
  logMFADisabled,
  logSuspiciousActivity,
} from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// Input Validation
// ============================================

const disableSchema = z.object({
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(128),
});

// ============================================
// POST /api/auth/mfa/disable
// Disables MFA for the current user
// Requires password re-verification for security
// ============================================

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get('user-agent') ?? null;

  try {
    // -----------------------------------------
    // 1. Rate limit
    // -----------------------------------------
    const rl = await checkGeneralRateLimit(ip);
    if (!rl.success) {
      const res = NextResponse.json(
        { error: 'عدد محاولاتك كبير. الرجاء المحاولة لاحقاً.' },
        { status: 429 }
      );
      for (const [key, value] of Object.entries(rateLimitHeaders(rl))) {
        res.headers.set(key, value);
      }
      return res;
    }

    // -----------------------------------------
    // 2. Check session
    // -----------------------------------------
    const session = await getUserSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    // -----------------------------------------
    // 3. Parse + validate body
    // -----------------------------------------
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'طلب غير صحيح' }, { status: 400 });
    }

    const parsed = disableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 }
      );
    }

    const { password } = parsed.data;

    // -----------------------------------------
    // 4. Fetch user
    // -----------------------------------------
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        mfaEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // -----------------------------------------
    // 5. Block if MFA not enabled
    // -----------------------------------------
    if (!user.mfaEnabled) {
      return NextResponse.json(
        { error: 'المصادقة الثنائية غير مفعّلة' },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 6. Verify password (security: prevent unauthorized disable)
    // -----------------------------------------
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      logSuspiciousActivity(
        'mfa_disable_wrong_password',
        user.id,
        user.email,
        ip,
        userAgent
      ).catch(() => {});

      return NextResponse.json(
        { error: 'كلمة المرور غير صحيحة' },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 7. Disable MFA + clear secret + clear backup codes
    // -----------------------------------------
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        mfaEnforcedAt: null,
      },
    });

    // -----------------------------------------
    // 8. Log audit event
    // -----------------------------------------
    logMFADisabled(user.id, user.email, ip, userAgent, {
      disabledBy: 'self',
    }).catch(() => {});

    // -----------------------------------------
    // 9. Success
    // -----------------------------------------
    return NextResponse.json({
      ok: true,
      message: 'تم إلغاء المصادقة الثنائية بنجاح',
    });
  } catch (err) {
    console.error('[mfa/disable] unexpected error:', err);
    return NextResponse.json(
      { error: 'خطأ في الخادم. الرجاء المحاولة لاحقاً.' },
      { status: 500 }
    );
  }
}