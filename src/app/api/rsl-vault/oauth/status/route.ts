/**
 * GET /api/rsl-vault/oauth/status
 * ============================================
 * Returns whether current user has connected Google Drive.
 * Used by UI to show "Connect" vs "Connected" state.
 */

import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/db';
import { isRSLInternal } from '@/lib/rsl-allowlist';
import { getConnectionStatus } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isRSLInternal(session.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const status = await getConnectionStatus(session.email!);
  return NextResponse.json(status);
}
