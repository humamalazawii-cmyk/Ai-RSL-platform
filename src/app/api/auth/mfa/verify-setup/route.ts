import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  prisma,
  getUserSession,
} from '@/lib/db';
import {
  checkGeneralRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import {
  verifyTOTPCode,
  generateBackupCodes,
} from '@/lib/mfa';
import {
  logMFAEnabled,
  logSuspiciousActivity,
} from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// Input Validation
// ============================================

const verifySetupSchema = z.object({
  code: z
    .string()
    .min(1, 'الكود مطلوب')
    .regex(/^\d{6}$/, 'الكود يجب أن يكون 6 أرقام'),
});

// ============================================
// POST /api/auth/mfa/verify-setup
// Verifies the first TOTP code and ENABLES MFA
// Returns backup codes (shown ONCE — user must save them)
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

    const parsed = verifySetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 }
      );
    }

    const { code } = parsed.data;

    // -----------------------------------------
    // 4. Fetch user
    // -----------------------------------------
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        mfaSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // -----------------------------------------
    // 5. Block if MFA already enabled
    // -----------------------------------------
    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: 'المصادقة الثنائية مفعّلة بالفعل' },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 6. Ensure setup was initiated (secret exists)
    // -----------------------------------------
    if (!user.mfaSecret) {
      return NextResponse.json(
        {
          error: 'لم يتم بدء الإعداد. الرجاء البدء من جديد.',
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 7. Verify the TOTP code
    // -----------------------------------------
    const isValid = verifyTOTPCode(user.mfaSecret, code);
    if (!isValid) {
      logSuspiciousActivity(
        'mfa_setup_invalid_code',
        user.id,
        user.email,
        ip,
        userAgent
      ).catch(() => {});

      return NextResponse.json(
        {
          error: 'الكود غير صحيح. تأكد من الوقت في جوالك ثم حاول مرة أخرى.',
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 8. Generate backup codes
    // -----------------------------------------
    const { plainCodes, hashedCodes } = generateBackupCodes();

    // -----------------------------------------
    // 9. Activate MFA + save backup codes
    // -----------------------------------------
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: hashedCodes,
        mfaEnforcedAt: new Date(),
      },
    });

    // -----------------------------------------
    // 10. Log MFA enabled event
    // -----------------------------------------
    logMFAEnabled(user.id, user.email, ip, userAgent).catch(() => {});

    // -----------------------------------------
    // 11. Return success + backup codes (ONCE!)
    // -----------------------------------------
    return NextResponse.json({
      ok: true,
      message: 'تم تفعيل المصادقة الثنائية بنجاح!',
      backupCodes: plainCodes,
      warning:
        'احفظ هذه الأكواد في مكان آمن. لن تتمكن من رؤيتها مرة أخرى. كل كود يُستخدم مرة واحدة فقط.',
    });
  } catch (err) {
    console.error('[mfa/verify-setup] unexpected error:', err);
    return NextResponse.json(
      { error: 'خطأ في الخادم. الرجاء المحاولة لاحقاً.' },
      { status: 500 }
    );
  }
}