/**
 * GET /api/rsl-vault/oauth/callback
 * ============================================
 * Google redirects here after user grants consent.
 *
 * Receives: ?code=<auth_code>&state=<csrf_token>
 *
 * Flow:
 *   1. Verify user session + allowlist (defense in depth)
 *   2. Verify state matches cookie (CSRF protection)
 *   3. Exchange code for tokens
 *   4. Encrypt + save tokens to DB
 *   5. Clear state cookie
 *   6. Redirect to /rsl-vault with success flag
 *
 * On error: redirect to /rsl-vault with error flag.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserSession } from '@/lib/db';
import { isRSLInternal } from '@/lib/rsl-allowlist';
import { exchangeCodeForTokens, saveTokens } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

const VAULT_URL = '/rsl-vault';

function redirectWithError(error: string) {
  return NextResponse.redirect(
    `${VAULT_URL}?error=${encodeURIComponent(error)}`
  );
}

function redirectWithSuccess() {
  return NextResponse.redirect(`${VAULT_URL}?connected=1`);
}

export async function GET(req: NextRequest) {
  try {
    // ================================================
    // 1. Auth checks (defense in depth)
    // ================================================
    const session = await getUserSession();
    if (!session) {
      return redirectWithError('not_authenticated');
    }

    if (!isRSLInternal(session.email)) {
      return redirectWithError('forbidden');
    }

    // ================================================
    // 2. Parse query params
    // ================================================
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // User denied consent
    if (error) {
      return redirectWithError(`google_${error}`);
    }

    if (!code || !state) {
      return redirectWithError('missing_params');
    }

    // ================================================
    // 3. CSRF verification
    // ================================================
    const cookieStore = cookies();
    const savedState = cookieStore.get('rsl-oauth-state')?.value;

    if (!savedState) {
      return redirectWithError('state_expired');
    }

    if (savedState !== state) {
      return redirectWithError('state_mismatch');
    }

    // Clear state cookie (one-time use)
    cookieStore.delete('rsl-oauth-state');

    // ================================================
    // 4. Exchange code for tokens
    // ================================================
    const tokens = await exchangeCodeForTokens(code);

    // ================================================
    // 5. Save tokens (encrypted) to DB
    // ================================================
    await saveTokens(session.email!, tokens);

    // ================================================
    // 6. Success — redirect back to vault
    // ================================================
    return redirectWithSuccess();
  } catch (err) {
    console.error('[oauth/callback] Error:', err);
    const message = err instanceof Error ? err.message : 'unknown_error';
    return redirectWithError(`callback_failed:${message.slice(0, 50)}`);
  }
}
