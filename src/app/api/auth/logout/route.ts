import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { logAuthEvent } from '@/lib/audit';
import { AuthEventType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  // Capture user identity BEFORE clearing cookie (for audit log)
  let userId: string | null = null;
  let email: string | null = null;

  try {
    const token = cookies().get('rsl-user')?.value;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
      userId = decoded.sub;
      email = decoded.email;
    }
  } catch {
    // Token invalid or expired — proceed with logout anyway
  }

  // Extract IP + User-Agent for audit
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null;
  const userAgent = req.headers.get('user-agent') ?? null;

  // Log LOGOUT event (fire-and-forget — don't block on audit failure)
  if (userId) {
    logAuthEvent({
      eventType: AuthEventType.LOGOUT,
      success: true,
      userId,
      email,
      ip,
      userAgent,
    }).catch((err) => console.error('[logout] audit log failed:', err));
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('rsl-user');
  res.cookies.delete('rsl-investor');
  return res;
}
