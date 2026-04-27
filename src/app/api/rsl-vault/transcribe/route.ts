/**
 * POST /api/rsl-vault/transcribe
 * ============================================
 * Transcribe a meeting recording stored in Google Drive.
 *
 * Pipeline:
 *   1. Auth check (RSL allowlist)
 *   2. Validate meeting (exists, status=UPLOADED, has driveFileId)
 *   3. Update status: UPLOADED -> TRANSCRIBING
 *   4. Download from Drive to /tmp
 *   5. Extract audio (mp4 -> m4a mono 16kbps)
 *   6. Chunk if needed (>24MB each)
 *   7. Transcribe each chunk via gpt-4o-transcribe
 *   8. Merge transcripts + segments
 *   9. Save Transcript row in DB
 *  10. Update status: TRANSCRIBING -> ANALYZING (ready for Day 4)
 *  11. Cleanup tmp files (always, even on error)
 *
 * On error: status -> FAILED, save errorMessage.
 *
 * Synchronous: client waits ~30s-5min depending on audio length.
 * Day 3.5 (optional, conditional on Day 6 test results) will add
 * a Claude cleanup layer here without refactor.
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getUserSession, prisma } from '@/lib/db';
import { isRSLInternal } from '@/lib/rsl-allowlist';
import { downloadDriveFile } from '@/lib/google-drive';
import {
  extractAudio,
  chunkAudio,
  cleanupFiles,
  type AudioChunk,
} from '@/lib/audio-converter';
import {
  transcribeAudio,
  estimateCost,
  type TranscribeResult,
} from '@/lib/openai-whisper';

export const dynamic = 'force-dynamic';
// Cloud Run default request timeout is 300s; transcription of long meetings
// may take 1-3 min. Increase Next.js route timeout to match.
export const maxDuration = 300;

interface TranscribeRequestBody {
  meetingId?: string;
}

interface ChunkTranscript {
  chunk: AudioChunk;
  result: TranscribeResult;
}

/**
 * Merge multiple chunk transcripts into one.
 *
 * Note: We don't currently dedupe overlap regions (5s overlap exists to
 * preserve word boundaries during chunking, but Whisper doesn't return
 * exact-match strings at boundaries, so naive dedup is unsafe).
 * For Day 3, we accept minor duplication at chunk seams. Day 4 Claude
 * cleanup can detect and remove it if it becomes a problem.
 */
function mergeTranscripts(transcripts: ChunkTranscript[]): {
  fullText: string;
  segments: unknown;
} {
  const sortedByIndex = [...transcripts].sort(
    (a, b) => a.chunk.index - b.chunk.index
  );

  const fullText = sortedByIndex
    .map((t) => t.result.text)
    .join('\n\n')
    .trim();

  // Segments: one entry per chunk with its metadata.
  // Stored as JSON in DB; consumed by Day 4 (Claude analysis).
  const segments = sortedByIndex.map((t) => ({
    chunkIndex: t.chunk.index,
    startSeconds: t.chunk.startSeconds,
    endSeconds: t.chunk.endSeconds,
    text: t.result.text,
    duration: t.result.duration ?? null,
    language: t.result.language ?? null,
  }));

  return { fullText, segments };
}

export async function POST(request: Request) {
  // ============================================
  // 1. Auth
  // ============================================
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isRSLInternal(session.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ============================================
  // 2. Parse + validate request
  // ============================================
  let body: TranscribeRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body.meetingId || typeof body.meetingId !== 'string') {
    return NextResponse.json(
      { error: 'meetingId is required (string)' },
      { status: 400 }
    );
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: body.meetingId },
  });

  if (!meeting) {
    return NextResponse.json(
      { error: `Meeting not found: ${body.meetingId}` },
      { status: 404 }
    );
  }

  if (!meeting.driveFileId) {
    return NextResponse.json(
      { error: 'Meeting has no driveFileId — cannot download source' },
      { status: 400 }
    );
  }

  if (meeting.status !== 'UPLOADED') {
    return NextResponse.json(
      {
        error: `Meeting status is ${meeting.status}; expected UPLOADED. ` +
          `Was it already transcribed?`,
      },
      { status: 409 }
    );
  }

  // ============================================
  // 3. Mark as TRANSCRIBING
  // ============================================
  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: 'TRANSCRIBING', errorMessage: null },
  });

  // Track all temp paths for guaranteed cleanup
  const tempFiles: string[] = [];

  try {
    // ============================================
    // 4. Download from Drive
    // ============================================
    const tmpDir = os.tmpdir();
    const videoPath = path.join(tmpDir, `meeting-${meeting.id}.mp4`);
    tempFiles.push(videoPath);

    console.log(`[transcribe] Meeting ${meeting.id}: downloading from Drive...`);
    const downloadedBytes = await downloadDriveFile(
      session.email!,
      meeting.driveFileId,
      videoPath
    );

    // ============================================
    // 5. Extract audio
    // ============================================
    const audio = await extractAudio(videoPath, tmpDir);
    tempFiles.push(audio.audioPath);

    // ============================================
    // 6. Chunk if needed
    // ============================================
    const chunks = await chunkAudio(
      audio.audioPath,
      audio.duration,
      audio.sizeBytes
    );

    // If chunked, the original audioPath is also one of the chunks (single-chunk
    // fast path) OR new chunk files were created. Either way, track them all.
    for (const c of chunks) {
      if (c.path !== audio.audioPath) {
        tempFiles.push(c.path);
      }
    }

    // ============================================
    // 7. Transcribe each chunk sequentially
    //    (Sequential not parallel: avoids hitting OpenAI rate limits +
    //     Cloud Run memory pressure with many concurrent uploads.)
    // ============================================
    const chunkTranscripts: ChunkTranscript[] = [];

    for (const chunk of chunks) {
      const buffer = await fs.readFile(chunk.path);
      const filename = path.basename(chunk.path);

      console.log(
        `[transcribe] Chunk ${chunk.index + 1}/${chunks.length} ` +
          `(${(buffer.length / 1024 / 1024).toFixed(2)}MB)...`
      );

      const result = await transcribeAudio(buffer, filename, {
        language: 'ar',
        model: 'gpt-4o-transcribe',
      });

      chunkTranscripts.push({ chunk, result });
    }

    // ============================================
    // 8. Merge transcripts
    // ============================================
    const { fullText, segments } = mergeTranscripts(chunkTranscripts);

    // ============================================
    // 9. Save Transcript + update Meeting
    // ============================================
    const transcript = await prisma.transcript.create({
      data: {
        meetingId: meeting.id,
        fullText,
        segments: segments as object,
        whisperModel: 'gpt-4o-transcribe',
      },
    });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: 'ANALYZING', // Ready for Day 4 (Claude analysis)
        durationMinutes: Math.round(audio.duration / 60),
        detectedLanguage:
          chunkTranscripts[0]?.result.language ?? meeting.detectedLanguage,
      },
    });

    const cost = estimateCost(audio.duration, 'gpt-4o-transcribe');

    console.log(
      `[transcribe] Meeting ${meeting.id} complete: ` +
        `${audio.duration.toFixed(0)}s audio, ` +
        `${chunks.length} chunk(s), $${cost.toFixed(4)}`
    );

    return NextResponse.json({
      transcriptId: transcript.id,
      meetingId: meeting.id,
      text: fullText,
      duration: audio.duration,
      sourceBytes: downloadedBytes,
      audioBytes: audio.sizeBytes,
      chunkCount: chunks.length,
      estimatedCostUsd: parseFloat(cost.toFixed(4)),
      model: 'gpt-4o-transcribe',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[transcribe] Meeting ${meeting.id} FAILED:`, message);

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: 'FAILED',
        errorMessage: message.slice(0, 1000), // truncate to fit DB column
      },
    });

    return NextResponse.json(
      {
        error: 'Transcription failed',
        meetingId: meeting.id,
        details: message,
      },
      { status: 500 }
    );
  } finally {
    // ============================================
    // 11. Cleanup (always)
    // ============================================
    if (tempFiles.length > 0) {
      await cleanupFiles(tempFiles).catch((err) => {
        console.warn('[transcribe] Cleanup error (non-fatal):', err);
      });
    }
  }
}
