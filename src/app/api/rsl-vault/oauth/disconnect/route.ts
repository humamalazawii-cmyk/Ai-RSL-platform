/**
 * POST /api/rsl-vault/oauth/disconnect
 * ============================================
 * Deletes stored OAuth tokens for current user.
 * User will need to re-authorize to use Drive again.
 */

import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/db';
import { isRSLInternal } from '@/lib/rsl-allowlist';
import { disconnectDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isRSLInternal(session.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await disconnectDrive(session.email!);
  return NextResponse.json({ ok: true });
}
