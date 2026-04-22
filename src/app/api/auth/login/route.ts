import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, verifyPassword, createSession } from '@/lib/db';
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  checkGeneralRateLimit,
  getClientIp,
  rateLimitHeaders,
  type RateLimitResult,
} from '@/lib/rate-limit';
import {
  logLoginSuccess,
  logLoginFailure,
  logAccountLocked,
  logRateLimitExceeded,
} from '@/lib/audit';
import { PASSWORD_POLICY } from '@/lib/password-policy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// Input Validation
// ============================================

const loginSchema = z.object({
  email: z.string().email('صيغة البريد الإلكتروني غير صحيحة').max(320),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(128),
});

// Generic error message to avoid user enumeration
// (don't reveal whether email exists or password is wrong)
const GENERIC_AUTH_ERROR = 'بيانات الدخول غير صحيحة';

// ============================================
// Helper: merge rate-limit headers into a response
// ============================================

function withRateLimitHeaders(res: NextResponse, rl: RateLimitResult): NextResponse {
  const headers = rateLimitHeaders(rl);
  for (const [key, value] of Object.entries(headers)) {
    res.headers.set(key, value);
  }
  return res;
}

// ============================================
// Main Handler
// ============================================

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get('user-agent') ?? null;

  try {
    // -----------------------------------------
    // 1. GENERAL rate limit (100/min per IP)
    // -----------------------------------------
    const generalRl = await checkGeneralRateLimit(ip);
    if (!generalRl.success) {
      logRateLimitExceeded(null, '/api/auth/login', ip, userAgent).catch(() => {});
      const res = NextResponse.json(
        { error: 'عدد محاولاتك كبير. الرجاء المحاولة لاحقاً.' },
        { status: 429 }
      );
      return withRateLimitHeaders(res, generalRl);
    }

    // -----------------------------------------
    // 2. Parse + validate body
    // -----------------------------------------
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'طلب غير صحيح' }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    // -----------------------------------------
    // 3. LOGIN rate limit (5/15min per IP+email)
    // -----------------------------------------
    const loginRl = await checkLoginRateLimit(ip, email);
    if (!loginRl.success) {
      logRateLimitExceeded(email, '/api/auth/login', ip, userAgent).catch(() => {});
      const res = NextResponse.json(
        {
          error: `تم تجاوز الحد المسموح. حاول بعد ${Math.ceil(loginRl.resetInSeconds / 60)} دقيقة.`,
        },
        { status: 429 }
      );
      return withRateLimitHeaders(res, loginRl);
    }

    // -----------------------------------------
    // 4. Lookup user
    // -----------------------------------------
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Log failure without userId (email doesn't exist)
      logLoginFailure(email, 'user_not_found', ip, userAgent).catch(() => {});
      const res = NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
      return withRateLimitHeaders(res, loginRl);
    }

    // -----------------------------------------
    // 5. Account lockout check
    // -----------------------------------------
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      logLoginFailure(email, 'account_locked', ip, userAgent, user.id).catch(() => {});
      const res = NextResponse.json(
        {
          error: `الحساب مقفل مؤقتاً. حاول بعد ${minutesLeft} دقيقة.`,
        },
        { status: 423 }
      );
      return withRateLimitHeaders(res, loginRl);
    }

    // -----------------------------------------
    // 6. Verify password
    // -----------------------------------------
    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      // Auto-reset counter if last failed attempt was > 24h ago
      // Prevents stale failures from accumulating over days/weeks
      const RESET_WINDOW_MS = 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      const lastFailed = user.lastFailedAttempt?.getTime() ?? 0;
      const shouldResetCounter = nowMs - lastFailed > RESET_WINDOW_MS;

      const newFailedCount = shouldResetCounter ? 1 : user.failedLoginAttempts + 1;
      const shouldLock = newFailedCount >= PASSWORD_POLICY.lockoutThreshold;

      const updateData: {
        failedLoginAttempts: number;
        lastFailedAttempt: Date;
        lockedUntil?: Date;
      } = {
        failedLoginAttempts: newFailedCount,
        lastFailedAttempt: new Date(nowMs),
      };

      if (shouldLock) {
        updateData.lockedUntil = new Date(
          nowMs + PASSWORD_POLICY.lockoutDurationMinutes * 60 * 1000
        );
      }

      await prisma.user
        .update({
          where: { id: user.id },
          data: updateData,
        })
        .catch((err) => {
          // Don't block the response if update fails
          console.error('[login] failed to update failedLoginAttempts:', err);
        });

      // Audit logging (fire-and-forget)
      logLoginFailure(email, 'wrong_password', ip, userAgent, user.id).catch(() => {});

      if (shouldLock) {
        logAccountLocked(
          user.id,
          email,
          'max_failed_attempts',
          ip,
          userAgent,
          PASSWORD_POLICY.lockoutDurationMinutes
        ).catch(() => {});
      }

      const res = NextResponse.json(
        {
          error: shouldLock
            ? `تم قفل الحساب مؤقتاً لمدة ${PASSWORD_POLICY.lockoutDurationMinutes} دقيقة.`
            : GENERIC_AUTH_ERROR,
        },
        { status: shouldLock ? 423 : 401 }
      );
      return withRateLimitHeaders(res, loginRl);
    }

    // -----------------------------------------
    // -----------------------------------------
    // 7a. MFA Check: if enabled, return challenge token (no cookie)
    // -----------------------------------------
    if (user.mfaEnabled) {
      const challengeToken = createSession(
        {
          type: 'user',
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        '5m'
      );
      // Password was correct — reset rate limit counter
      resetLoginRateLimit(ip, email).catch(() => {});
      const res = NextResponse.json({
        ok: true,
        mfaRequired: true,
        challengeToken,
      });
      return withRateLimitHeaders(res, loginRl);
    }

    // -----------------------------------------
    // 7b. Success: reset counters, issue token
    // -----------------------------------------
    await prisma.user
      .update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      })
      .catch((err) => {
        console.error('[login] failed to update user on success:', err);
      });

    const token = createSession(
      {
        type: 'user',
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      '24h'
    );

    logLoginSuccess(user.id, email, ip, userAgent).catch(() => {});
    resetLoginRateLimit(ip, email).catch(() => {});

    const res = NextResponse.json({ ok: true });
    res.cookies.set('rsl-user', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return withRateLimitHeaders(res, loginRl);
  } catch (err) {
    console.error('[login] unexpected error:', err);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}