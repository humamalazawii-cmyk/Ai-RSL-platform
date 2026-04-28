/**
 * POST /api/rsl-vault/process
 * ============================================
 * Day 5 orchestrator: takes a Drive fileId, runs the full pipeline.
 *
 * Steps:
 *   1. Auth (RSL allowlist)
 *   2. Find or create Meeting row (linked to driveFileId)
 *   3. If status=READY, return existing ideas (idempotent)
 *   4. If UPLOADED → run transcription (status → ANALYZING)
 *   5. Run analysis (status → READY)
 *   6. Return final state
 *
 * NOTE: Calls vault-pipeline helpers DIRECTLY (no self-fetch).
 * This avoids the Cloud Run SSL handshake issue with self-HTTPS.
 *
 * Body: { driveFileId: string, name?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserSession, prisma } from "@/lib/db";
import { isRSLInternal } from "@/lib/rsl-allowlist";
import { runTranscription, runAnalysis } from "@/lib/vault-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

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

  // Find or create Meeting
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

  // Idempotency: already READY
  if (meeting.status === "READY") {
    const ideas = await prisma.idea.findMany({
      where: { meetingId: meeting.id },
      select: {
        id: true,
        title: true,
        feasible: true,
        estimatedDays: true,
      },
    });
    return NextResponse.json({
      ok: true,
      status: "already_processed",
      meetingId: meeting.id,
      ideasCount: ideas.length,
      ideas,
    });
  }

  // Run transcription if needed
  if (meeting.status === "UPLOADED" || meeting.status === "FAILED") {
    // If FAILED, reset to UPLOADED so runTranscription accepts it
    if (meeting.status === "FAILED") {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: "UPLOADED", errorMessage: null },
      });
    }

    console.log(`[process] Starting transcription for ${meeting.id}`);
    try {
      await runTranscription(meeting.id, session.email);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        {
          error: "Transcription failed",
          stage: "transcribe",
          details: message,
          meetingId: meeting.id,
        },
        { status: 500 }
      );
    }
  }

  // Run analysis
  console.log(`[process] Starting analysis for ${meeting.id}`);
  try {
    const analysisResult = await runAnalysis(meeting.id);
    return NextResponse.json({
      ok: true,
      // status comes from spread
      ...analysisResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Analysis failed",
        stage: "analyze",
        details: message,
        meetingId: meeting.id,
      },
      { status: 500 }
    );
  }
}
