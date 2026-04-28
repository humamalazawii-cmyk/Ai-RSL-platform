/**
 * POST /api/rsl-vault/analyze
 * ============================================
 * Triggers Claude analysis on a meeting transcript.
 *
 * Flow:
 *   1. Auth (RSL allowlist)
 *   2. Validate meeting (must have transcript, status ANALYZING)
 *   3. Run Claude analyzer
 *   4. Save Idea records to DB
 *   5. Update meeting status: ANALYZING → READY
 *   6. Return summary { ideasCount, costUSD, durationMs }
 *
 * Errors:
 *   - 401: not authenticated or not on RSL allowlist
 *   - 404: meeting not found
 *   - 400: invalid state (no transcript, wrong status)
 *   - 500: Claude analysis failed (after 3 retries)
 *
 * Idempotency:
 *   - If status=READY already, returns existing idea count without re-analyzing
 *   - If status=ANALYZING, runs analysis (typical case after Whisper)
 *   - Other statuses → 400 error
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserSession, prisma } from "@/lib/db";
import { isRSLInternal } from "@/lib/rsl-allowlist";
import {
  analyzeMeetingTranscript,
  AnalyzedIdea,
} from "@/lib/claude-analyzer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — Claude analysis can be slow

// ============================================================
// MAIN HANDLER
// ============================================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // -------- 1. AUTH --------
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

  // -------- 2. PARSE REQUEST --------
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

  // -------- 3. FETCH MEETING + TRANSCRIPT --------
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { transcript: true, ideas: true },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // -------- 4. IDEMPOTENCY: already analyzed? --------
  if (meeting.status === "READY") {
    return NextResponse.json({
      ok: true,
      status: "already_analyzed",
      meetingId: meeting.id,
      ideasCount: meeting.ideas.length,
      message: "Meeting already analyzed; no re-analysis performed",
    });
  }

  // -------- 5. STATE VALIDATION --------
  if (meeting.status !== "ANALYZING") {
    return NextResponse.json(
      {
        error: `Meeting status is "${meeting.status}" — expected "ANALYZING"`,
        hint: "Run transcription first (POST /api/rsl-vault/transcribe)",
      },
      { status: 400 }
    );
  }

  if (!meeting.transcript || !meeting.transcript.fullText) {
    return NextResponse.json(
      { error: "Meeting has no transcript" },
      { status: 400 }
    );
  }

  // -------- 6. RUN CLAUDE ANALYSIS --------
  console.log(
    `[analyze] Starting Claude analysis for meeting ${meetingId} ` +
      `(transcript: ${meeting.transcript.fullText.length} chars)`
  );

  let analysis: Awaited<ReturnType<typeof analyzeMeetingTranscript>>;
  try {
    analysis = await analyzeMeetingTranscript(meeting.transcript.fullText, {
      meetingTitle: meeting.title,
      meetingDate: meeting.meetingDate,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[analyze] Claude failed for meeting ${meetingId}:`, error);

    // Mark meeting as FAILED with error message
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: "FAILED",
        errorMessage: `Claude analysis: ${errorMessage}`,
      },
    });

    return NextResponse.json(
      {
        error: "Claude analysis failed",
        details: errorMessage,
        meetingId,
      },
      { status: 500 }
    );
  }

  console.log(
    `[analyze] Claude returned ${analysis.ideas.length} ideas ` +
      `(${analysis.inputTokens} in / ${analysis.outputTokens} out / $${analysis.costUSD})`
  );

  // -------- 7. SAVE IDEAS TO DB --------
  let savedCount = 0;
  if (analysis.ideas.length > 0) {
    // Use createMany for efficiency (single INSERT)
    const ideaRecords = analysis.ideas.map((idea: AnalyzedIdea) => ({
      meetingId: meeting.id,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      priority: idea.priority,
      tags: idea.tags,
      feasible: idea.feasible,
      feasibilityReasoning: idea.feasibilityReasoning,
      estimatedDays: idea.estimatedDays,
      estimatedMonthlyCost: idea.estimatedMonthlyCost,
      proposedMonth: idea.proposedMonth,
      sourceQuote: idea.sourceQuote,
      // status defaults to PROPOSED — Humam decides APPROVED/REJECTED in UI
    }));

    const result = await prisma.idea.createMany({ data: ideaRecords });
    savedCount = result.count;
  }

  // -------- 8. UPDATE MEETING STATUS --------
  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: "READY",
      // Optionally store summary in meeting.summary if Claude provides one
      // (current schema has summary field but we don't generate one separately;
      //  could be added later if needed)
    },
  });

  const durationMs = Date.now() - startTime;

  console.log(
    `[analyze] Meeting ${meetingId} complete: ${savedCount} ideas saved, ` +
      `status → READY, ${durationMs}ms`
  );

  // -------- 9. RETURN SUMMARY --------
  return NextResponse.json({
    ok: true,
    status: "analyzed",
    meetingId: meeting.id,
    ideasCount: savedCount,
    costUSD: analysis.costUSD,
    durationMs,
    modelUsed: analysis.modelUsed,
    tokens: {
      input: analysis.inputTokens,
      output: analysis.outputTokens,
    },
  });
}

// ============================================================
// METHOD GUARDS
// ============================================================
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed — use POST" },
    { status: 405 }
  );
}
