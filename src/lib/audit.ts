// ============================================
// MFA Event Helpers
// ============================================

/**
 * Log MFA being enabled (user activated 2FA).
 */
export async function logMFAEnabled(
  userId: string,
  email: string,
  ip?: string | null,
  userAgent?: string | null,
  metadata?: Record<string, unknown>
) {
  return logAuthEvent({
    eventType: AuthEventType.MFA_ENABLED,
    success: true,
    userId,
    email,
    ip,
    userAgent,
    metadata,
  });
}

/**
 * Log MFA being disabled (user removed 2FA).
 */
export async function logMFADisabled(
  userId: string,
  email: string,
  ip?: string | null,
  userAgent?: string | null,
  metadata?: Record<string, unknown>
) {
  return logAuthEvent({
    eventType: AuthEventType.MFA_DISABLED,
    success: true,
    userId,
    email,
    ip,
    userAgent,
    metadata,
  });
}

/**
 * Log successful MFA challenge during login.
 */
export async function logMFAChallengeSuccess(
  userId: string,
  email: string,
  ip?: string | null,
  userAgent?: string | null,
  metadata?: Record<string, unknown>
) {
  return logAuthEvent({
    eventType: AuthEventType.MFA_CHALLENGE_SUCCESS,
    success: true,
    userId,
    email,
    ip,
    userAgent,
    metadata,
  });
}

/**
 * Log failed MFA challenge (wrong code).
 */
export async function logMFAChallengeFailure(
  userId: string,
  email: string,
  ip?: string | null,
  userAgent?: string | null,
  metadata?: Record<string, unknown>
) {
  return logAuthEvent({
    eventType: AuthEventType.MFA_CHALLENGE_FAILURE,
    success: false,
    userId,
    email,
    ip,
    userAgent,
    metadata,
  });
}/**
 * RSL-AI Audit Logger
 *
 * Records authentication & security events to the AuthEvent table.
 * Used for:
 * - Compliance (SOC 2, ISO 27001, GDPR)
 * - Security investigations
 * - User self-service ("show me my login history")
 * - Detecting suspicious patterns
 *
 * All functions are fire-and-forget friendly: logging failures
 * are caught and logged to console but never throw, so auth
 * flows continue even if audit logging is broken.
 */

import { AuthEventType, Prisma } from '@prisma/client';
import { prisma } from './db';

// ============================================
// Event Logging Interface
// ============================================

export interface LogEventParams {
  eventType: AuthEventType;
  success: boolean;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Core logger: writes one AuthEvent row.
 * Never throws — catches errors and logs to console.
 *
 * Returns true if logged successfully, false otherwise.
 */
export async function logAuthEvent(params: LogEventParams): Promise<boolean> {
  try {
    // Use shared prisma singleton from db.ts

    await prisma.authEvent.create({
      data: {
        eventType: params.eventType,
        success: params.success,
        userId: params.userId ?? null,
        email: params.email?.toLowerCase() ?? null,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });

    return true;
  } catch (err) {
    // Never throw — logging failures shouldn't break auth
    console.error('[audit] failed to log event:', err);
    return false;
  }
}

// ============================================
// Convenience Helpers
// ============================================

/**
 * Log a successful login.
 */
export async function logLoginSuccess(
  userId: string,
  email: string,
  ip?: string | null,
  userAgent?: string | null,
  metadata?: Record<string, unknown>
) {
  return logAuthEvent({
    eventType: AuthEventType.LOGIN_SUCCESS,
    success: true,
    userId,
    email,
    ip,
    userAgent,
    metadata,
  });
}

/**
 * Log a failed login attempt.
 * userId may be null if the email doesn't match any user.
 */
export async function logLoginFailure(
  email: string,
  reason: string,
  ip?: string | null,
  userAgent?: string | null,
  userId?: string | null
) {
  return logAuthEvent({
    eventType: AuthEventType.LOGIN_FAILURE,
    success: false,
    userId: userId ?? null,
    email,
    ip,
    userAgent,
    metadata: { reason },
  });
}

/**
 * Log a logout event.
 */
export async function logLogout(
  userId: string,
  email: string,
  ip?: string | null,
  userAgent?: string | null
) {
  return logAuthEvent({
    eventType: AuthEventType.LOGOUT,
    success: true,
    userId,
    email,
    ip,
    userAgent,
  });
}

/**
 * Log a password change.
 */
export async function logPasswordChanged(
  userId: string,
  email: string,
  ip?: string | null,
  userAgent?: string | null,
  metadata?: Record<string, unknown>
) {
  return logAuthEvent({
    eventType: AuthEventType.PASSWORD_CHANGED,
    success: true,
    userId,
    email,
    ip,
    userAgent,
    metadata,
  });
}

/**
 * Log a password reset request.
 */
export async function logPasswordResetRequested(
  email: string,
  ip?: string | null,
  userAgent?: string | null,
  userId?: string | null
) {
  return logAuthEvent({
    eventType: AuthEventType.PASSWORD_RESET_REQUESTED,
    success: true,
    userId: userId ?? null,
    email,
    ip,
    userAgent,
  });
}

/**
 * Log a password reset completion.
 */
export async function logPasswordResetCompleted(
  userId: string,
  email: string,
  ip?: string | null,
  userAgent?: string | null
) {
  return logAuthEvent({
    eventType: AuthEventType.PASSWORD_RESET_COMPLETED,
    success: true,
    userId,
    email,
    ip,
    userAgent,
  });
}

/**
 * Log an account lockout (too many failed attempts).
 */
export async function logAccountLocked(
  userId: string,
  email: string,
  reason: string,
  ip?: string | null,
  userAgent?: string | null,
  lockoutDurationMinutes?: number
) {
  return logAuthEvent({
    eventType: AuthEventType.ACCOUNT_LOCKED,
    success: true,
    userId,
    email,
    ip,
    userAgent,
    metadata: { reason, lockoutDurationMinutes },
  });
}

/**
 * Log a rate limit trigger.
 */
export async function logRateLimitExceeded(
  email: string | null,
  endpoint: string,
  ip?: string | null,
  userAgent?: string | null
) {
  return logAuthEvent({
    eventType: AuthEventType.RATE_LIMIT_EXCEEDED,
    success: false,
    email,
    ip,
    userAgent,
    metadata: { endpoint },
  });
}

/**
 * Log generic suspicious activity.
 */
export async function logSuspiciousActivity(
  reason: string,
  userId?: string | null,
  email?: string | null,
  ip?: string | null,
  userAgent?: string | null,
  metadata?: Record<string, unknown>
) {
  return logAuthEvent({
    eventType: AuthEventType.SUSPICIOUS_ACTIVITY,
    success: false,
    userId,
    email,
    ip,
    userAgent,
    metadata: { reason, ...metadata },
  });
}

// ============================================
// Query Helpers (for Phase 2 UI)
// ============================================

/**
 * Get recent auth events for a user.
 * Used by "login history" UI in Phase 2.
 */
export async function getUserAuthHistory(
  userId: string,
  limit: number = 50
) {
  try {
    // Use shared prisma singleton from db.ts
    return await prisma.authEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch (err) {
    console.error('[audit] failed to fetch user history:', err);
    return [];
  }
}

/**
 * Count failed login attempts in a time window.
 * Used to detect brute-force patterns.
 */
export async function countRecentFailedLogins(
  email: string,
  withinMinutes: number = 15
): Promise<number> {
  try {
    // Use shared prisma singleton from db.ts
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);

    return await prisma.authEvent.count({
      where: {
        email: email.toLowerCase(),
        eventType: AuthEventType.LOGIN_FAILURE,
        createdAt: { gte: since },
      },
    });
  } catch (err) {
    console.error('[audit] failed to count failed logins:', err);
    return 0;
  }
}