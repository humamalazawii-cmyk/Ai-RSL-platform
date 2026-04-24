/**
 * OAuth Token Encryption
 * ============================================
 * Encrypts OAuth tokens before storing in DB.
 * Uses AES-256-GCM — industry standard for secret storage.
 *
 * The encryption key comes from JWT_SECRET (already in Secret Manager).
 * We derive a separate key via HKDF to avoid reusing JWT key directly.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const TAG_LENGTH = 16;

/**
 * Derive a 32-byte encryption key from JWT_SECRET.
 * Using HKDF with a fixed salt for determinism (same input → same key).
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET env var not set — cannot encrypt OAuth tokens');
  }

  // Derive key via HKDF (RFC 5869)
  const derived = crypto.hkdfSync(
    'sha256',
    Buffer.from(secret, 'utf8'),
    Buffer.from('rsl-oauth-token-salt-v1', 'utf8'),
    Buffer.from('rsl-oauth-encryption', 'utf8'),
    32
  );
  return Buffer.from(derived as ArrayBuffer);
}

/**
 * Encrypt a token string.
 * Output format: base64(iv || authTag || ciphertext)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: iv (12 bytes) + authTag (16 bytes) + ciphertext
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/**
 * Decrypt a token string.
 * Input: base64(iv || authTag || ciphertext)
 */
export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encrypted, 'base64');

  if (data.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted token: too short');
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}
