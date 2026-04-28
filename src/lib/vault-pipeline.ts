/**
 * RSL Vault Pipeline — Shared Helpers
 * ============================================
 * Pure functions that perform the transcription + analysis pipelines.
 * Can be called from:
 *   - HTTP routes (transcribe, analyze)
 *   - Internal orchestrator (process)
 *
 * These functions handle their own meeting-status transitions and
 * persistence. They do NOT handle auth — caller is responsible.
 */
import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";
import { prisma } from "./db";
import { downloadDriveFile } from "./google-drive";
import {
  extractAudio,
  chunkAudio,
  cleanupFiles,
  type AudioChunk,
} from "./audio-converter";
import {
  transcribeAudio,
  estimateCost,
  type TranscribeResult,
} from "./openai-whisper";
import { analyzeMeetingTranscript, AnalyzedIdea } from "./claude-analyzer";

// ============================================================
// TRANSCRIPTION
// ============================================================

interface ChunkTranscript {
  chunk: AudioChunk;
  result: TranscribeResult;
}

export interface TranscriptionResult {
  transcriptId: string;
  meetingId: string;
  text: string;
  duration: number;
  sourceBytes: number;
  audioBytes: number;
  chunkCount: number;
  estimatedCostUsd: number;
  model: string;
}

/**
 * Merge multiple chunk transcripts into one.
 *
 * Note: We don't currently dedupe overlap regions (5s overlap exists to
 * preserve word boundaries during chunking, but Whisper doesn't return
 * exact-match strings at boundaries, so naive dedup is unsafe).
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
    .join("\n\n")
    .trim();

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

/**
 * Run the transcription pipeline for a meeting.
 *
 * Pre-conditions:
 *   - Meeting exists in DB with status=UPLOADED and a driveFileId
 *   - userEmail has Drive OAuth connection
 *
 * Side effects:
 *   - Updates meeting.status: UPLOADED → TRANSCRIBING → ANALYZING
 *     (or → FAILED on error, with errorMessage)
 *   - Creates Transcript row in DB
 *   - On error: throws (caller should catch + return appropriate response)
 */
export async function runTranscription(
  meetingId: string,
  userEmail: string
): Promise<TranscriptionResult> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });

  if (!meeting) {
    throw new Error(`Meeting not found: ${meetingId}`);
  }
  if (!meeting.driveFileId) {
    throw new Error("Meeting has no driveFileId — cannot download source");
  }
  if (meeting.status !== "UPLOADED") {
    throw new Error(
      `Meeting status is ${meeting.status}; expected UPLOADED`
    );
  }

  // Mark as TRANSCRIBING
  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: "TRANSCRIBING", errorMessage: null },
  });

  const tempFiles: string[] = [];

  try {
    // Download from Drive
    const tmpDir = os.tmpdir();
    const videoPath = path.join(tmpDir, `meeting-${meeting.id}.mp4`);
    tempFiles.push(videoPath);

    console.log(
      `[transcribe] Meeting ${meeting.id}: downloading from Drive...`
    );
    const downloadedBytes = await downloadDriveFile(
      userEmail,
      meeting.driveFileId,
      videoPath
    );

    // Extract audio
    const audio = await extractAudio(videoPath, tmpDir);
    tempFiles.push(audio.audioPath);

    // Chunk if needed
    const chunks = await chunkAudio(
      audio.audioPath,
      audio.duration,
      audio.sizeBytes
    );

    for (const c of chunks) {
      if (c.path !== audio.audioPath) {
        tempFiles.push(c.path);
      }
    }

    // Transcribe each chunk sequentially
    const chunkTranscripts: ChunkTranscript[] = [];
    for (const chunk of chunks) {
      const buffer = await fs.readFile(chunk.path);
      const filename = path.basename(chunk.path);

      console.log(
        `[transcribe] Chunk ${chunk.index + 1}/${chunks.length} ` +
          `(${(buffer.length / 1024 / 1024).toFixed(2)}MB)...`
      );

      const result = await transcribeAudio(buffer, filename, {
        language: "ar",
        model: "gpt-4o-transcribe",
      });

      chunkTranscripts.push({ chunk, result });
    }

    // Merge transcripts
    const { fullText, segments } = mergeTranscripts(chunkTranscripts);

    // Save Transcript + update Meeting
    const transcript = await prisma.transcript.create({
      data: {
        meetingId: meeting.id,
        fullText,
        segments: segments as object,
        whisperModel: "gpt-4o-transcribe",
      },
    });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: "ANALYZING",
        durationMinutes: Math.round(audio.duration / 60),
        detectedLanguage:
          chunkTranscripts[0]?.result.language ?? meeting.detectedLanguage,
      },
    });

    const cost = estimateCost(audio.duration, "gpt-4o-transcribe");

    console.log(
      `[transcribe] Meeting ${meeting.id} complete: ` +
        `${audio.duration.toFixed(0)}s audio, ` +
        `${chunks.length} chunk(s), $${cost.toFixed(4)}`
    );

    return {
      transcriptId: transcript.id,
      meetingId: meeting.id,
      text: fullText,
      duration: audio.duration,
      sourceBytes: downloadedBytes,
      audioBytes: audio.sizeBytes,
      chunkCount: chunks.length,
      estimatedCostUsd: parseFloat(cost.toFixed(4)),
      model: "gpt-4o-transcribe",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[transcribe] Meeting ${meeting.id} FAILED:`, message);

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: "FAILED",
        errorMessage: message.slice(0, 1000),
      },
    });

    throw error;
  } finally {
    if (tempFiles.length > 0) {
      await cleanupFiles(tempFiles).catch((err) => {
        console.warn("[transcribe] Cleanup error (non-fatal):", err);
      });
    }
  }
}

// ============================================================
// ANALYSIS
// ============================================================

export interface AnalysisRunResult {
  meetingId: string;
  status: "analyzed" | "already_analyzed";
  ideasCount: number;
  costUSD: number;
  durationMs: number;
  modelUsed: string;
  tokens: {
    input: number;
    output: number;
  };
}

/**
 * Run Claude analysis on a transcribed meeting.
 *
 * Pre-conditions:
 *   - Meeting exists in DB
 *   - Status is ANALYZING (just transcribed) or READY (already done)
 *   - Has linked Transcript with fullText
 *
 * Side effects:
 *   - Updates meeting.status: ANALYZING → READY (or → FAILED on error)
 *   - Creates Idea records via createMany
 *   - On error: throws (caller should catch)
 *
 * Idempotent: if status=READY, returns existing state without re-analyzing.
 */
export async function runAnalysis(
  meetingId: string
): Promise<AnalysisRunResult> {
  const startTime = Date.now();

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { transcript: true, ideas: true },
  });

  if (!meeting) {
    throw new Error(`Meeting not found: ${meetingId}`);
  }

  // Idempotency
  if (meeting.status === "READY") {
    return {
      meetingId: meeting.id,
      status: "already_analyzed",
      ideasCount: meeting.ideas.length,
      costUSD: 0,
      durationMs: 0,
      modelUsed: "n/a (cached)",
      tokens: { input: 0, output: 0 },
    };
  }

  if (meeting.status !== "ANALYZING") {
    throw new Error(
      `Meeting status is "${meeting.status}" — expected "ANALYZING"`
    );
  }

  if (!meeting.transcript || !meeting.transcript.fullText) {
    throw new Error("Meeting has no transcript");
  }

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
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`[analyze] Claude failed for meeting ${meetingId}:`, error);

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: "FAILED",
        errorMessage: `Claude analysis: ${errorMessage}`.slice(0, 1000),
      },
    });

    throw error;
  }

  console.log(
    `[analyze] Claude returned ${analysis.ideas.length} ideas ` +
      `(${analysis.inputTokens} in / ${analysis.outputTokens} out / $${analysis.costUSD})`
  );

  // Save ideas
  let savedCount = 0;
  if (analysis.ideas.length > 0) {
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
    }));

    const result = await prisma.idea.createMany({ data: ideaRecords });
    savedCount = result.count;
  }

  // Update status
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "READY" },
  });

  const durationMs = Date.now() - startTime;

  console.log(
    `[analyze] Meeting ${meetingId} complete: ${savedCount} ideas saved, ` +
      `status → READY, ${durationMs}ms`
  );

  return {
    meetingId: meeting.id,
    status: "analyzed",
    ideasCount: savedCount,
    costUSD: analysis.costUSD,
    durationMs,
    modelUsed: analysis.modelUsed,
    tokens: {
      input: analysis.inputTokens,
      output: analysis.outputTokens,
    },
  };
}
