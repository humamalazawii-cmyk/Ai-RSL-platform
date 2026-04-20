import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import {
  checkGeneralRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import { logPasswordResetRequested } from '@/lib/audit';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// Configuration
// ============================================

const TOKEN_EXPIRY_MINUTES = 60;
const GENERIC_SUCCESS_MESSAGE =
  'إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة بتعليمات إعادة التعيين.';

// ============================================
// Input Validation
// ============================================

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('صيغة البريد الإلكتروني غير صحيحة')
    .max(254)
    .toLowerCase()
    .trim(),
});

// ============================================
// Main Handler
// ============================================

export async function POST(req: NextRequest) {
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

    // 2. Parse + validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'طلب غير صحيح' }, { status: 400 });
    }

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // 3. Lookup user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    // Log attempt regardless
    logPasswordResetRequested(email, ip, userAgent, user?.id ?? null).catch(
      () => {}
    );

    // Generic response if user not found
    if (!user) {
      return NextResponse.json({
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    // 4. Invalidate previous unused tokens
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    // 5. Generate token
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000
    );

    // 6. Store in DB
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        createdIp: ip,
      },
    });

    // 7. Send email
    try {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetToken: plainToken,
      });
    } catch (emailErr) {
      console.error('[forgot-password] email send failed:', emailErr);
    }

    // 8. Return success
    return NextResponse.json({
      ok: true,
      message: GENERIC_SUCCESS_MESSAGE,
    });
  } catch (err) {
    console.error('[forgot-password] unexpected error:', err);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
