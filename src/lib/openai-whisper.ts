/**
 * OpenAI Whisper Transcription Service
 *
 * Provides audio transcription using gpt-4o-transcribe model.
 * Optimized for Iraqi Arabic dialect + business meetings context.
 *
 * Architecture:
 *   - Single source of truth: env var OPENAI_API_KEY (from Secret Manager)
 *   - Smart prompting: injects RSL-specific vocab to improve recognition
 *   - Abstraction layer: transcribeAudio() wraps raw API call
 *     -> Future Day 3.5 cleanup layer plugs in here without refactor
 *
 * Cost: $0.006/minute @ gpt-4o-transcribe
 * Limits: 25MB max per request (chunking handled in audio-converter.ts)
 */

import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

// Lazy singleton — created on first use, not at import time
// (avoids crash if OPENAI_API_KEY is missing during build)
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. ' +
          'In production, ensure Secret Manager binding is configured. ' +
          'For local dev, add to .env.local'
      );
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Smart prompt for Iraqi Arabic + business meetings.
 *
 * The `prompt` parameter biases Whisper toward expected vocabulary,
 * improving recognition for technical/domain-specific terms by 5-15%.
 *
 * IMPORTANT: Whisper's prompt has a 224-token limit. Keep concise.
 */
const TRANSCRIPTION_PROMPT = `
اجتماع عمل بالعربية العراقية مع إنجليزية مختلطة.
شركة: RSL-AI - منصة ERP ذكية للمختبرات الطبية.
مصطلحات: مختبر، فحص، تحليل، CBC، HBA1C، نظام، ERP، SaaS،
API، database، اشتراك، عقد، عميل، فاتورة، موظف، تقرير،
dashboard، AI، ذكاء اصطناعي، COE، Vault، Knowledge Library.
أسماء: همام، علي جلال، الرافدين، RSL-AI، Anthropic، OpenAI.
`.trim();

export interface TranscribeOptions {
  /** Optional override for default prompt (e.g., custom meeting context) */
  prompt?: string;
  /** Language hint - 'ar' for Arabic, 'en' for English. Default: 'ar' */
  language?: 'ar' | 'en';
  /** Model: 'gpt-4o-transcribe' (recommended) | 'gpt-4o-mini-transcribe' (cheaper) */
  model?: 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';
}

export interface TranscribeResult {
  /** The transcribed text */
  text: string;
  /** Model used (for tracking) */
  model: string;
  /** Duration of audio in seconds (if returned by API) */
  duration?: number;
  /** Language detected */
  language?: string;
}

/**
 * Transcribe an audio buffer using OpenAI Whisper.
 *
 * @param audioBuffer - Raw audio bytes (m4a, mp3, wav, etc.)
 * @param filename - Original filename (extension matters for OpenAI's format detection)
 * @param options - Optional overrides
 * @returns Transcript with metadata
 *
 * @throws Error if audio > 25MB (caller must chunk first)
 * @throws Error if API call fails
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> {
  // Defensive size check — OpenAI rejects > 25MB with cryptic error
  const sizeMB = audioBuffer.length / (1024 * 1024);
  if (sizeMB > 25) {
    throw new Error(
      `Audio file too large: ${sizeMB.toFixed(2)}MB. ` +
        `OpenAI Whisper limit is 25MB. Caller must chunk audio first.`
    );
  }

  const client = getClient();
  const model = options.model ?? 'gpt-4o-transcribe';
  const language = options.language ?? 'ar';
  const prompt = options.prompt ?? TRANSCRIPTION_PROMPT;

  // OpenAI SDK requires File-like object, not raw Buffer
  const audioFile = await toFile(audioBuffer, filename);

  const startTime = Date.now();

  try {
    const response = await client.audio.transcriptions.create({
      file: audioFile,
      model,
      language,
      prompt,
      response_format: 'verbose_json', // includes duration + language detection
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[Whisper] Transcribed ${sizeMB.toFixed(2)}MB in ${elapsed}s using ${model}`
    );

    return {
      text: response.text,
      model,
      duration:
        'duration' in response ? (response.duration as number) : undefined,
      language:
        'language' in response ? (response.language as string) : undefined,
    };
  } catch (error) {
    // Surface OpenAI error details for debugging
    if (error instanceof Error) {
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Estimate transcription cost in USD.
 * Used for pre-flight checks and usage tracking.
 *
 * @param durationSeconds - Audio duration
 * @param model - Model used
 * @returns Cost in USD
 */
export function estimateCost(
  durationSeconds: number,
  model:
    | 'gpt-4o-transcribe'
    | 'gpt-4o-mini-transcribe' = 'gpt-4o-transcribe'
): number {
  const ratePerMinute = model === 'gpt-4o-transcribe' ? 0.006 : 0.003;
  return (durationSeconds / 60) * ratePerMinute;
}
