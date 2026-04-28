/**
 * POST /api/rsl-vault/transcribe
 * ============================================
 * HTTP wrapper around runTranscription() helper.
 *
 * Responsibility: auth + parse + delegate.
 * The actual pipeline is in src/lib/vault-pipeline.ts so it can be
 * called both via HTTP and from the /process orchestrator directly.
 */
import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/db";
import { isRSLInternal } from "@/lib/rsl-allowlist";
import { runTranscription } from "@/lib/vault-pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface TranscribeRequestBody {
  meetingId?: string;
}

export async function POST(request: Request) {
  // Auth
  const session = await getUserSession();
  if (!session || !session.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRSLInternal(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse
  let body: TranscribeRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.meetingId || typeof body.meetingId !== "string") {
    return NextResponse.json(
      { error: "meetingId is required (string)" },
      { status: 400 }
    );
  }

  // Delegate to shared pipeline helper
  try {
    const result = await runTranscription(body.meetingId, session.email);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Map known errors to appropriate HTTP codes
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: message, meetingId: body.meetingId },
        { status: 404 }
      );
    }
    if (
      message.includes("expected UPLOADED") ||
      message.includes("no driveFileId")
    ) {
      return NextResponse.json(
        { error: message, meetingId: body.meetingId },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Transcription failed",
        meetingId: body.meetingId,
        details: message,
      },
      { status: 500 }
    );
  }
}
