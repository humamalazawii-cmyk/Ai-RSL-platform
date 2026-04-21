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
import { getUserAuthHistory } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// GET /api/auth/login-history
// Returns the current user's authentication history
// (last 50 events by default)
// ============================================

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);

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
    // 2. Check session (user must be logged in)
    // -----------------------------------------
    const session = await getUserSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    // -----------------------------------------
    // 3. Parse optional query params
    // -----------------------------------------
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200)
      : 50;

    // -----------------------------------------
    // 4. Verify user still exists
    // -----------------------------------------
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // -----------------------------------------
    // 5. Fetch auth history
    // -----------------------------------------
    const events = await getUserAuthHistory(user.id, limit);

    // -----------------------------------------
    // 6. Count totals for summary
    // -----------------------------------------
    const totalCount = await prisma.authEvent.count({
      where: { userId: user.id },
    });

    const successCount = await prisma.authEvent.count({
      where: {
        userId: user.id,
        success: true,
        eventType: 'LOGIN_SUCCESS',
      },
    });

    const failureCount = await prisma.authEvent.count({
      where: {
        userId: user.id,
        eventType: 'LOGIN_FAILURE',
      },
    });

    // -----------------------------------------
    // 7. Return structured response
    // -----------------------------------------
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      summary: {
        total: totalCount,
        loginSuccess: successCount,
        loginFailure: failureCount,
      },
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        success: e.success,
        ip: e.ip,
        userAgent: e.userAgent,
        createdAt: e.createdAt,
        metadata: e.metadata,
      })),
      limit,
    });
  } catch (err) {
    console.error('[login-history] unexpected error:', err);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}