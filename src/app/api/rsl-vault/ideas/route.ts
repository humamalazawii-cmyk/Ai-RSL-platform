/**
 * GET /api/rsl-vault/ideas?meetingId=xxx
 * ============================================
 * Returns all ideas extracted from a specific meeting.
 * Used by UI to display ideas after analysis completes.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserSession, prisma } from "@/lib/db";
import { isRSLInternal } from "@/lib/rsl-allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Auth
  const session = await getUserSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRSLInternal(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const meetingId = request.nextUrl.searchParams.get("meetingId");
  if (!meetingId) {
    return NextResponse.json(
      { error: "meetingId query param required" },
      { status: 400 }
    );
  }

  const ideas = await prisma.idea.findMany({
    where: { meetingId },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      feasible: true,
      feasibilityReasoning: true,
      estimatedDays: true,
      estimatedMonthlyCost: true,
      proposedMonth: true,
      status: true,
      sourceQuote: true,
      tags: true,
    },
  });

  return NextResponse.json({
    ok: true,
    meetingId,
    count: ideas.length,
    ideas,
  });
}
