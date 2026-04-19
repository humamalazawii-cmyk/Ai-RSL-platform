/**
 * RSL-AI Rate Limiting
 *
 * Distributed rate limiting using Upstash Redis.
 * Works across multiple Cloud Run instances.
 *
 * Three limiters with different windows:
 * - login: 5 attempts per 15 min per IP+email
 * - passwordReset: 3 requests per hour per email
 * - general: 100 requests per minute per IP
 *
 * Fail-open policy: If Redis is down, requests are ALLOWED
 * (to prevent total lockout). Consider fail-closed for
 * maximum security environments.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ============================================
// Redis Client (Singleton)
// ============================================

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      '[rate-limit] UPSTASH credentials missing. Rate limiting is DISABLED.'
    );
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

// ============================================
// Rate Limiters (Lazy Initialized)
// ============================================

let loginLimiter: Ratelimit | null = null;
let passwordResetLimiter: Ratelimit | null = null;
let generalLimiter: Ratelimit | null = null;

function getLoginLimiter(): Ratelimit | null {
  if (loginLimiter) return loginLimiter;
  const redis = getRedis();
  if (!redis) return null;

  loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:login',
    analytics: true,
  });
  return loginLimiter;
}

function getPasswordResetLimiter(): Ratelimit | null {
  if (passwordResetLimiter) return passwordResetLimiter;
  const redis = getRedis();
  if (!redis) return null;

  passwordResetLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:pwreset',
    analytics: true,
  });
  return passwordResetLimiter;
}

function getGeneralLimiter(): Ratelimit | null {
  if (generalLimiter) return generalLimiter;
  const redis = getRedis();
  if (!redis) return null;

  generalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:general',
    analytics: true,
  });
  return generalLimiter;
}

// ============================================
// Rate Limit Result Type
// ============================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp ms
  resetInSeconds: number;
  retryAfterSeconds?: number;
}

function buildResult(
  success: boolean,
  limit: number,
  remaining: number,
  reset: number
): RateLimitResult {
  const resetInSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
  return {
    success,
    limit,
    remaining,
    reset,
    resetInSeconds,
    retryAfterSeconds: success ? undefined : resetInSeconds,
  };
}

// Fail-open fallback
const ALLOW_ON_FAILURE: RateLimitResult = {
  success: true,
  limit: 0,
  remaining: 0,
  reset: 0,
  resetInSeconds: 0,
};

// ============================================
// Public API
// ============================================

/**
 * Check login rate limit.
 * Key: combination of IP + email (lowercased).
 * Allows 5 attempts per 15 minutes.
 */
export async function checkLoginRateLimit(
  ip: string,
  email: string
): Promise<RateLimitResult> {
  const limiter = getLoginLimiter();
  if (!limiter) return ALLOW_ON_FAILURE;

  try {
    const key = `${ip}:${email.toLowerCase()}`;
    const { success, limit, remaining, reset } = await limiter.limit(key);
    return buildResult(success, limit, remaining, reset);
  } catch (err) {
    console.error('[rate-limit] login check failed:', err);
    return ALLOW_ON_FAILURE;
  }
}

/**
 * Check password reset rate limit.
 * Key: email (lowercased).
 * Allows 3 reset requests per hour.
 */
export async function checkPasswordResetRateLimit(
  email: string
): Promise<RateLimitResult> {
  const limiter = getPasswordResetLimiter();
  if (!limiter) return ALLOW_ON_FAILURE;

  try {
    const { success, limit, remaining, reset } = await limiter.limit(
      email.toLowerCase()
    );
    return buildResult(success, limit, remaining, reset);
  } catch (err) {
    console.error('[rate-limit] password reset check failed:', err);
    return ALLOW_ON_FAILURE;
  }
}

/**
 * Check general API rate limit.
 * Key: IP address.
 * Allows 100 requests per minute.
 */
export async function checkGeneralRateLimit(
  ip: string
): Promise<RateLimitResult> {
  const limiter = getGeneralLimiter();
  if (!limiter) return ALLOW_ON_FAILURE;

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip);
    return buildResult(success, limit, remaining, reset);
  } catch (err) {
    console.error('[rate-limit] general check failed:', err);
    return ALLOW_ON_FAILURE;
  }
}

// ============================================
// IP Extraction Helper
// ============================================

/**
 * Extract client IP from Next.js request headers.
 * Priority: x-forwarded-for (Cloud Run) > x-real-ip > 'unknown'
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    // x-forwarded-for can be "client, proxy1, proxy2" — take the first
    return xff.split(',')[0].trim();
  }

  const xri = headers.get('x-real-ip');
  if (xri) return xri.trim();

  return 'unknown';
}

// ============================================
// Response Headers Helper
// ============================================

/**
 * Build standard RateLimit headers (RFC 6585 + IETF draft).
 * Attach to responses for client visibility.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
  };
  if (!result.success && result.retryAfterSeconds) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }
  return headers;
}