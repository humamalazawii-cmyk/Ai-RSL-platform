import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma, hashPassword } from '@/lib/db';
import {
  checkGeneralRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import { logPasswordResetCompleted, logSuspiciousActivity } from '@/lib/audit';
import { validatePassword } from '@/lib/password-policy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// Input Validation
// ============================================

const resetPasswordSchema = z.object({
  newPassword: z.string().min(1, 'كلمة المرور الجديدة مطلوبة').max(128),
});

const tokenParamSchema = z
  .string()
  .min(32, 'رمز غير صحيح')
  .max(128, 'رمز غير صحيح')
  .regex(/^[a-f0-9]+$/, 'رمز غير صحيح');

// ============================================
// Main Handler
// ============================================

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get('user-agent') ?? null;

  try {
    // 1. Rate limit
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

    // 2. Validate token format
    const tokenResult = tokenParamSchema.safeParse(params.token);
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: 'الرابط غير صحيح أو منتهي الصلاحية' },
        { status: 400 }
      );
    }
    const plainToken = tokenResult.data;

    // 3. Parse + validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'طلب غير صحيح' }, { status: 400 });
    }

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 }
      );
    }
    const { newPassword } = parsed.data;

    // 4. Hash token to match stored value
    const tokenHash = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');

    // 5. Lookup token in DB
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    // 6. Validate token
    if (!tokenRecord) {
      logSuspiciousActivity(
        'invalid_reset_token_used',
        null,
        null,
        ip,
        userAgent
      ).catch(() => {});
      return NextResponse.json(
        { error: 'الرابط غير صحيح أو منتهي الصلاحية' },
        { status: 400 }
      );
    }

    if (tokenRecord.usedAt) {
      logSuspiciousActivity(
        'reused_reset_token',
        tokenRecord.userId,
        tokenRecord.user.email,
        ip,
        userAgent
      ).catch(() => {});
      return NextResponse.json(
        { error: 'هذا الرابط تم استخدامه مسبقاً' },
        { status: 400 }
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'انتهت صلاحية الرابط. الرجاء طلب رابط جديد.' },
        { status: 400 }
      );
    }

    const user = tokenRecord.user;

    // 7. Validate new password against policy
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

    // 8. Hash new password + update user + mark token used (atomic transaction)
    const newHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          id: { not: tokenRecord.id },
        },
        data: { usedAt: new Date() },
      }),
    ]);

    // 9. Audit log
    logPasswordResetCompleted(user.id, user.email, ip, userAgent).catch(
      () => {}
    );

    // 10. Success
    return NextResponse.json({
      ok: true,
      message: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.',
    });
  } catch (err) {
    console.error('[reset-password] unexpected error:', err);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
