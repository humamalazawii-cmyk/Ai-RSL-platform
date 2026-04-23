/**
 * RSL Internal Allowlist
 * ============================================
 * Email-based access control for internal tools (/rsl-vault).
 * Only Humam and Ali can access — no one else, regardless of role.
 *
 * This is intentionally NOT a database-driven role check.
 * Hardcoded for simplicity + security: adding someone requires a deploy.
 */

/**
 * Emails allowed to access /rsl-vault/*
 * To add/remove: edit this list, commit, deploy.
 */
export const RSL_INTERNAL_EMAILS = [
  'admin@rsl-ai.com',   // Humam
  'ajalal72@gmail.com', // Ali
] as const;

/**
 * Check if an email is on the RSL internal allowlist.
 * Case-insensitive match (stored emails may be normalized lowercase).
 */
export function isRSLInternal(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return RSL_INTERNAL_EMAILS.some(
    (allowed) => allowed.toLowerCase() === normalized
  );
}
