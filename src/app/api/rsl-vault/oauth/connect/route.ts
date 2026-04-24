/**
 * GET /api/rsl-vault/oauth/connect
 * ============================================
 * Initiates Google OAuth flow.
 *
 * Flow:
 *   1. Verify user is logged in + on allowlist
 *   2. Generate random state (CSRF token)
 *   3. Store state in HTTP-only cookie
 *   4. Redirect to Google authorization URL with state
 *
 * Google will redirect back to /api/rsl-vault/oauth/callback
 * with the code + state (state must match cookie).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getUserSession } from '@/lib/db';
import { isRSLInternal } from '@/lib/rsl-allowlist';
import { generateAuthUrl } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Layer 1: Must be authenticated
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Layer 2: Must be on RSL internal allowlist
  if (!isRSLInternal(session.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Generate CSRF state (32 random bytes, base64url)
  const state = crypto.randomBytes(32).toString('base64url');

  // Store state in HTTP-only cookie (10-minute expiry)
  cookies().set('rsl-oauth-state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax', // Must be 'lax' for OAuth redirect to include cookie
    path: '/',
    maxAge: 600, // 10 minutes
  });

  // Generate authorization URL
  const authUrl = generateAuthUrl(state);

  // Redirect user to Google
  return NextResponse.redirect(authUrl);
}
