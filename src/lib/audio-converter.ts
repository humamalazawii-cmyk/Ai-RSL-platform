/**
 * Audio Converter Service
 *
 * Handles two responsibilities:
 *   1. Video-to-audio extraction (MP4 -> M4A)
 *      Google Meet recordings come as MP4, but Whisper accepts audio.
 *      Converting to mono 16kbps m4a reduces size by ~95% with no ASR quality loss.
 *
 *   2. Chunking large audio files (>25MB) for OpenAI Whisper limit
 *      Splits with 5-second overlap to avoid losing words at boundaries.
 *
 * Dependencies:
 *   - ffmpeg binary (installed via Dockerfile in runner stage)
 *
 * Architecture note:
 *   Uses spawn() instead of exec() to avoid shell injection risks
 *   and to handle large outputs without buffer overflow.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Maximum size for a single Whisper API call (in bytes).
 * OpenAI's hard limit is 25MB; we use 24MB for safety margin.
 */
const MAX_CHUNK_SIZE_BYTES = 24 * 1024 * 1024;

/**
 * Overlap between chunks (in seconds).
 * Prevents words from being cut at chunk boundaries.
 */
const CHUNK_OVERLAP_SECONDS = 5;

/**
 * Run ffmpeg with given arguments.
 * Resolves on success (exit code 0), rejects on error.
 *
 * @param args - ffmpeg CLI arguments
 * @returns stderr output (ffmpeg writes progress/info to stderr by design)
 */
function runFfmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => {
      reject(
        new Error(
          `Failed to spawn ffmpeg: ${err.message}. ` +
            `Is ffmpeg installed? (Check Dockerfile runner stage)`
        )
      );
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stderr);
      } else {
        reject(
          new Error(
            `ffmpeg exited with code ${code}. stderr: ${stderr.slice(-500)}`
          )
        );
      }
    });
  });
}

/**
 * Get duration of a media file in seconds using ffprobe.
 * (ffprobe is bundled with ffmpeg.)
 */
function getMediaDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffprobe: ${err.message}`));
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(
          new Error(`ffprobe failed with code ${code}: ${stderr}`)
        );
      }
      const duration = parseFloat(stdout.trim());
      if (isNaN(duration)) {
        return reject(new Error(`Invalid duration: "${stdout.trim()}"`));
      }
      resolve(duration);
    });
  });
}

export interface AudioExtractionResult {
  /** Path to extracted audio file */
  audioPath: string;
  /** Duration in seconds */
  duration: number;
  /** Final file size in bytes */
  sizeBytes: number;
}

/**
 * Extract audio from a video file (or pass through if already audio).
 * Output: mono 16kbps m4a — optimized for Whisper.
 *
 * @param inputPath - Path to source MP4/M4A/MP3/etc.
 * @param outputDir - Where to write the output (defaults to OS temp)
 * @returns Path + metadata of extracted audio
 */
export async function extractAudio(
  inputPath: string,
  outputDir?: string
): Promise<AudioExtractionResult> {
  const dir = outputDir ?? os.tmpdir();
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(dir, `${baseName}-audio-${Date.now()}.m4a`);

  // ffmpeg flags:
  //   -i {input}            input file
  //   -vn                   no video (strip video stream)
  //   -ac 1                 mono (saves 50% size, fine for ASR)
  //   -ar 16000             16kHz sample rate (Whisper standard)
  //   -b:a 16k              16kbps bitrate (very compressed, still intelligible)
  //   -c:a aac              AAC codec (m4a container)
  //   -y                    overwrite output if exists
  const args = [
    '-i',
    inputPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-b:a',
    '16k',
    '-c:a',
    'aac',
    '-y',
    outputPath,
  ];

  console.log(`[ffmpeg] Extracting audio from ${path.basename(inputPath)}...`);
  await runFfmpeg(args);

  const [stats, duration] = await Promise.all([
    fs.stat(outputPath),
    getMediaDuration(outputPath),
  ]);

  console.log(
    `[ffmpeg] Extracted ${(stats.size / 1024 / 1024).toFixed(2)}MB ` +
      `(${duration.toFixed(0)}s) -> ${path.basename(outputPath)}`
  );

  return {
    audioPath: outputPath,
    duration,
    sizeBytes: stats.size,
  };
}

export interface AudioChunk {
  /** Path to chunk file */
  path: string;
  /** Sequence index (0-based) */
  index: number;
  /** Start time in source audio (seconds) */
  startSeconds: number;
  /** End time in source audio (seconds) */
  endSeconds: number;
  /** Size in bytes */
  sizeBytes: number;
}

/**
 * Split an audio file into chunks under MAX_CHUNK_SIZE_BYTES.
 * Returns the chunks in order.
 *
 * Algorithm:
 *   1. Compute target chunk duration based on file's bitrate.
 *   2. Split with 5s overlap to preserve word boundaries.
 *   3. Each chunk is independently transcribable.
 *
 * If input is already <= MAX_CHUNK_SIZE_BYTES, returns single chunk wrapping it.
 *
 * @param audioPath - Path to source audio (must be the extracted m4a)
 * @param totalDuration - Duration in seconds (from extractAudio result)
 * @param totalSizeBytes - Size in bytes (from extractAudio result)
 * @returns Ordered list of chunks
 */
export async function chunkAudio(
  audioPath: string,
  totalDuration: number,
  totalSizeBytes: number
): Promise<AudioChunk[]> {
  // Fast path: small enough to send as one
  if (totalSizeBytes <= MAX_CHUNK_SIZE_BYTES) {
    return [
      {
        path: audioPath,
        index: 0,
        startSeconds: 0,
        endSeconds: totalDuration,
        sizeBytes: totalSizeBytes,
      },
    ];
  }

  // Compute chunk duration from effective bitrate
  // bytes_per_second = totalSizeBytes / totalDuration
  // chunk_seconds = MAX_CHUNK_SIZE_BYTES / bytes_per_second
  const bytesPerSecond = totalSizeBytes / totalDuration;
  const chunkDurationSeconds = Math.floor(
    MAX_CHUNK_SIZE_BYTES / bytesPerSecond
  );

  if (chunkDurationSeconds < 30) {
    throw new Error(
      `Computed chunk duration too short (${chunkDurationSeconds}s). ` +
        `Audio file may be corrupt or have unusual encoding.`
    );
  }

  const chunks: AudioChunk[] = [];
  const dir = path.dirname(audioPath);
  const baseName = path.basename(audioPath, path.extname(audioPath));

  let startSeconds = 0;
  let index = 0;

  while (startSeconds < totalDuration) {
    const chunkPath = path.join(
      dir,
      `${baseName}-chunk-${String(index).padStart(3, '0')}.m4a`
    );

    // Last chunk: don't go past total duration
    const remainingSeconds = totalDuration - startSeconds;
    const thisChunkSeconds = Math.min(chunkDurationSeconds, remainingSeconds);

    // ffmpeg: -ss seek_start -t duration -i input -c copy output
    // -c copy means no re-encoding (fast, lossless)
    const args = [
      '-ss',
      String(startSeconds),
      '-t',
      String(thisChunkSeconds),
      '-i',
      audioPath,
      '-c',
      'copy',
      '-y',
      chunkPath,
    ];

    await runFfmpeg(args);
    const stats = await fs.stat(chunkPath);

    chunks.push({
      path: chunkPath,
      index,
      startSeconds,
      endSeconds: startSeconds + thisChunkSeconds,
      sizeBytes: stats.size,
    });

    console.log(
      `[chunk] ${index}: ${startSeconds.toFixed(0)}s -> ` +
        `${(startSeconds + thisChunkSeconds).toFixed(0)}s ` +
        `(${(stats.size / 1024 / 1024).toFixed(2)}MB)`
    );

    // Advance with overlap, but never exceed total
    startSeconds += chunkDurationSeconds - CHUNK_OVERLAP_SECONDS;
    index++;
  }

  return chunks;
}

/**
 * Clean up temporary files.
 * Safe to call multiple times; ignores missing files.
 *
 * @param paths - Files to delete
 */
export async function cleanupFiles(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (p) => {
      try {
        await fs.unlink(p);
      } catch (err: unknown) {
        // ENOENT = file already gone, that's fine
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') {
          console.warn(`[cleanup] Failed to delete ${p}: ${(err as Error).message}`);
        }
      }
    })
  );
}
