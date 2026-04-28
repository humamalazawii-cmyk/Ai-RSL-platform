/**
 * POST /api/rsl-vault/process
 * ============================================
 * Day 5 orchestrator: takes a Drive fileId, runs the full pipeline.
 *
 * Steps:
 *   1. Auth (RSL allowlist)
 *   2. Find or create Meeting row (linked to driveFileId)
 *   3. If status=READY, return existing ideas (idempotent)
 *   4. Otherwise, kick off pipeline:
 *      a. /api/rsl-vault/transcribe (Day 3 — Whisper)
 *      b. /api/rsl-vault/analyze    (Day 4 — Claude)
 *   5. Return final state
 *
 * This calls the transcribe + analyze endpoints internally via fetch
 * (server-to-server, same Cloud Run instance).
 *
 * Synchronous: client waits for the full pipeline (~1-3 minutes).
 *
 * Body: { driveFileId: string, name?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserSession, prisma } from "@/lib/db";
import { isRSLInternal } from "@/lib/rsl-allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 min — Whisper + Claude can be slow

export async function POST(request: NextRequest) {
  // Auth
  const session = await getUserSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRSLInternal(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse
  let driveFileId: string;
  let name: string | undefined;
  try {
    const body = await request.json();
    driveFileId = body.driveFileId;
    name = body.name;
    if (!driveFileId || typeof driveFileId !== "string") {
      return NextResponse.json(
        { error: "driveFileId required" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 1. Find or create Meeting
  let meeting = await prisma.meeting.findFirst({
    where: { driveFileId },
  });

  if (!meeting) {
    meeting = await prisma.meeting.create({
      data: {
        title: name ?? `Recording ${driveFileId.substring(0, 8)}`,
        meetingDate: new Date(),
        source: "GOOGLE_MEET",
        driveFileId,
        status: "UPLOADED",
        createdBy: session.email,
      },
    });
    console.log(
      `[process] Created Meeting ${meeting.id} for driveFileId ${driveFileId}`
    );
  }

  // 2. Idempotency: if already READY, return ideas
  if (meeting.status === "READY") {
    const ideas = await prisma.idea.findMany({
      where: { meetingId: meeting.id },
      select: { id: true, title: true, feasible: true, estimatedDays: true },
    });
    return NextResponse.json({
      ok: true,
      status: "already_processed",
      meetingId: meeting.id,
      ideasCount: ideas.length,
      ideas,
    });
  }

  // 3. Build origin URL for internal calls
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const cookieHeader = request.headers.get("cookie") ?? "";

  // 4. Run /transcribe (only if not already done)
  if (meeting.status === "UPLOADED" || meeting.status === "FAILED") {
    console.log(`[process] Triggering /transcribe for ${meeting.id}`);
    const transcribeResp = await fetch(`${origin}/api/rsl-vault/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ meetingId: meeting.id }),
    });

    if (!transcribeResp.ok) {
      const errBody = await transcribeResp.text();
      return NextResponse.json(
        {
          error: "Transcription failed",
          stage: "transcribe",
          details: errBody,
          meetingId: meeting.id,
        },
        { status: 500 }
      );
    }
  }

  // 5. Run /analyze
  console.log(`[process] Triggering /analyze for ${meeting.id}`);
  const analyzeResp = await fetch(`${origin}/api/rsl-vault/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ meetingId: meeting.id }),
  });

  if (!analyzeResp.ok) {
    const errBody = await analyzeResp.text();
    return NextResponse.json(
      {
        error: "Analysis failed",
        stage: "analyze",
        details: errBody,
        meetingId: meeting.id,
      },
      { status: 500 }
    );
  }

  const analyzeData = await analyzeResp.json();

  return NextResponse.json({
    ok: true,
    status: "processed",
    meetingId: meeting.id,
    ...analyzeData,
  });
}
