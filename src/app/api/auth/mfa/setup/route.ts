import { NextRequest, NextResponse } from 'next/server';
import {
  prisma,
  getUserSession,
} from '@/lib/db';
import {
  checkGeneralRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import { generateMFASetupWithQR } from '@/lib/mfa';
import { logSuspiciousActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// POST /api/auth/mfa/setup
// Initiates MFA setup: generates secret + QR code
// Stores secret in DB but keeps mfaEnabled=false
// User must verify first code via /verify-setup to enable
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
    // 3. Fetch user
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
    // 4. Block if MFA already enabled
    // -----------------------------------------
    if (user.mfaEnabled) {
      logSuspiciousActivity(
        'mfa_setup_attempt_when_already_enabled',
        user.id,
        user.email,
        ip,
        userAgent
      ).catch(() => {});

      return NextResponse.json(
        {
          error: 'المصادقة الثنائية مفعّلة بالفعل. قم بإلغائها أولاً لإعادة الإعداد.',
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 5. Generate new secret + QR code
    // -----------------------------------------
    const setup = await generateMFASetupWithQR(user.email);

    // -----------------------------------------
    // 6. Store secret (but keep MFA disabled)
    // -----------------------------------------
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: setup.secret,
        // mfaEnabled stays false until verify-setup succeeds
      },
    });

    // -----------------------------------------
    // 7. Return QR + URL (NOT the secret in plain — security)
    // -----------------------------------------
    return NextResponse.json({
      ok: true,
      qrCodeDataURL: setup.qrCodeDataURL,
      otpAuthURL: setup.otpAuthURL,
      // Show secret in case QR doesn't work — user can type it manually
      secretForManualEntry: setup.secret,
      message: 'امسح رمز QR بتطبيق Google Authenticator، ثم أدخل الكود للتأكيد',
    });
  } catch (err) {
    console.error('[mfa/setup] unexpected error:', err);
    return NextResponse.json(
      { error: 'خطأ في الخادم. الرجاء المحاولة لاحقاً.' },
      { status: 500 }
    );
  }
}