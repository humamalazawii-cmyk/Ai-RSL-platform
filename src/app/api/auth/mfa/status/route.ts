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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// GET /api/auth/mfa/status
// Returns current MFA status for the authenticated user
// ============================================

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);

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
    // 2. Check authentication
    // -----------------------------------------
    const session = await getUserSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'غير مصرح — يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // -----------------------------------------
    // 3. Fetch MFA status from DB
    // -----------------------------------------
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        mfaEnforcedAt: true,
        mfaBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // -----------------------------------------
    // 4. Return status (without sensitive data)
    // -----------------------------------------
    return NextResponse.json({
      enabled: user.mfaEnabled,
      enforcedAt: user.mfaEnforcedAt,
      backupCodesRemaining: user.mfaBackupCodes?.length ?? 0,
    });
  } catch (error) {
    console.error('[MFA Status] Error:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}