/**
 * GET /api/rsl-vault/scan
 * ============================================
 * Scans connected Drive for audio/video files (meeting recordings).
 *
 * For each file, checks if a Meeting row already exists in DB:
 *   - existingMeeting: null  → "new" (can create + process)
 *   - existingMeeting.status: "READY"        → already analyzed
 *   - existingMeeting.status: "ANALYZING"    → in-progress (Day 4)
 *   - existingMeeting.status: "TRANSCRIBING" → in-progress (Day 3)
 *   - existingMeeting.status: "FAILED"       → can retry
 *
 * Returns combined view so UI can show: filename, size, date, status, action button.
 *
 * Auth: RSL allowlist (admin@rsl-ai.com / ajalal72@gmail.com)
 */
import { NextResponse } from "next/server";
import { getUserSession, prisma } from "@/lib/db";
import { isRSLInternal } from "@/lib/rsl-allowlist";
import { listAudioFiles } from "@/lib/google-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Auth
  const session = await getUserSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRSLInternal(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Fetch Drive files
    const driveFiles = await listAudioFiles(session.email);

    // 2. Look up existing Meetings by driveFileId
    const driveIds = driveFiles.map((f) => f.id);
    const existingMeetings = await prisma.meeting.findMany({
      where: { driveFileId: { in: driveIds } },
      select: {
        id: true,
        driveFileId: true,
        status: true,
        title: true,
        createdAt: true,
        ideas: { select: { id: true } },
      },
    });

    const meetingsByDriveId = new Map(
      existingMeetings.map((m) => [m.driveFileId, m])
    );

    // 3. Combine
    const recordings = driveFiles.map((file) => {
      const meeting = meetingsByDriveId.get(file.id);
      return {
        driveFileId: file.id,
        name: file.name,
        mimeType: file.mimeType,
        sizeMB: Math.round((file.sizeBytes / 1024 / 1024) * 100) / 100,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        meeting: meeting
          ? {
              id: meeting.id,
              status: meeting.status,
              title: meeting.title,
              ideasCount: meeting.ideas.length,
              createdAt: meeting.createdAt.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({
      ok: true,
      count: recordings.length,
      recordings,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[scan] Failed:", error);
    return NextResponse.json(
      { error: "Drive scan failed", details: errorMessage },
      { status: 500 }
    );
  }
}
