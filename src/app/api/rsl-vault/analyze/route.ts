/**
 * POST /api/rsl-vault/analyze
 * ============================================
 * HTTP wrapper around runAnalysis() helper.
 *
 * Responsibility: auth + parse + delegate.
 * The actual pipeline is in src/lib/vault-pipeline.ts so it can be
 * called both via HTTP and from the /process orchestrator directly.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/db";
import { isRSLInternal } from "@/lib/rsl-allowlist";
import { runAnalysis } from "@/lib/vault-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // Auth
  const session = await getUserSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRSLInternal(session.email)) {
    return NextResponse.json(
      { error: "Forbidden: not on RSL internal allowlist" },
      { status: 403 }
    );
  }

  // Parse
  let meetingId: string;
  try {
    const body = await request.json();
    meetingId = body.meetingId;
    if (!meetingId || typeof meetingId !== "string") {
      return NextResponse.json(
        { error: "meetingId required (string)" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Delegate
  try {
    const result = await runAnalysis(meetingId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("not found")) {
      return NextResponse.json(
        { error: message, meetingId },
        { status: 404 }
      );
    }
    if (message.includes("expected") || message.includes("no transcript")) {
      return NextResponse.json(
        { error: message, meetingId },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Claude analysis failed",
        details: message,
        meetingId,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed — use POST" },
    { status: 405 }
  );
}
