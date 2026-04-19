import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  prisma,
  verifyPassword,
  hashPassword,
  getUserSession,
} from '@/lib/db';
import {
  checkGeneralRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import { logPasswordChanged, logSuspiciousActivity } from '@/lib/audit';
import { validatePassword } from '@/lib/password-policy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// Input Validation
// ============================================

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة').max(128),
  newPassword: z.string().min(1, 'كلمة المرور الجديدة مطلوبة').max(128),
});

// ============================================
// Main Handler
// ============================================

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get('user-agent') ?? null;

  try {
    // -----------------------------------------
    // 1. General rate limit
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

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // -----------------------------------------
    // 4. Fetch user
    // -----------------------------------------
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      // Session exists but user deleted — suspicious
      logSuspiciousActivity(
        'session_user_not_found',
        session.userId,
        session.email,
        ip,
        userAgent
      ).catch(() => {});
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // -----------------------------------------
    // 5. Verify current password
    // -----------------------------------------
    const currentValid = await verifyPassword(
      currentPassword,
      user.passwordHash
    );
    if (!currentValid) {
      logSuspiciousActivity(
        'wrong_current_password_on_change',
        user.id,
        user.email,
        ip,
        userAgent
      ).catch(() => {});
      return NextResponse.json(
        { error: 'كلمة المرور الحالية غير صحيحة' },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 6. Ensure new ≠ current
    // -----------------------------------------
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية' },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 7. Validate new password against policy
    // -----------------------------------------
    const validation = validatePassword(newPassword, {
      email: user.email,
      name: user.name,
    });
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.errorsAr[0] ?? 'كلمة المرور لا تلبي المتطلبات',
          details: validation.errorsAr,
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 8. Hash + update
    // -----------------------------------------
    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
        // Reset security counters on password change
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // -----------------------------------------
    // 9. Log audit event
    // -----------------------------------------
    logPasswordChanged(user.id, user.email, ip, userAgent, {
      changedBy: 'self',
    }).catch(() => {});

    // -----------------------------------------
    // 10. Success
    // -----------------------------------------
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[change-password] unexpected error:', err);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}