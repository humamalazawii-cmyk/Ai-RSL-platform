import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'crypto';

// ============================================
// Configuration
// ============================================

const ISSUER = 'RSL-AI';
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD = 30;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

// ============================================
// Types
// ============================================

export type MFASetupResult = {
  secret: string;
  qrCodeDataURL: string;
  otpAuthURL: string;
};

export type BackupCodesResult = {
  plainCodes: string[];
  hashedCodes: string[];
};

// ============================================
// MFA Secret Generation
// ============================================

export function generateMFASecret(userEmail: string): MFASetupResult {
  const secret = new Secret({ size: 20 });

  const totp = new TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret,
  });

  const otpAuthURL = totp.toString();

  return {
    secret: secret.base32,
    qrCodeDataURL: '',
    otpAuthURL,
  };
}

export async function generateQRCodeDataURL(otpAuthURL: string): Promise<string> {
  return await QRCode.toDataURL(otpAuthURL, {
    width: 240,
    margin: 2,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
}

export async function generateMFASetupWithQR(userEmail: string): Promise<MFASetupResult> {
  const setup = generateMFASecret(userEmail);
  const qrCodeDataURL = await generateQRCodeDataURL(setup.otpAuthURL);

  return {
    ...setup,
    qrCodeDataURL,
  };
}

// ============================================
// TOTP Verification
// ============================================

export function verifyTOTPCode(secretBase32: string, code: string): boolean {
  if (!secretBase32 || !code) return false;

  const cleanCode = code.replace(/\D/g, '').slice(0, 6);
  if (cleanCode.length !== 6) return false;

  try {
    const secret = Secret.fromBase32(secretBase32);
    const totp = new TOTP({
      issuer: ISSUER,
      algorithm: ALGORITHM,
      digits: DIGITS,
      period: PERIOD,
      secret,
    });

    const delta = totp.validate({ token: cleanCode, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

// ============================================
// Backup Codes
// ============================================

function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function hashCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code.toUpperCase())
    .digest('hex');
}

export function generateBackupCodes(): BackupCodesResult {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateRandomCode(BACKUP_CODE_LENGTH);
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    plainCodes.push(formatted);
    hashedCodes.push(hashCode(formatted));
  }

  return { plainCodes, hashedCodes };
}

export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): { valid: boolean; remainingCodes: string[] } {
  if (!code || !Array.isArray(hashedCodes)) {
    return { valid: false, remainingCodes: hashedCodes ?? [] };
  }

  const cleanCode = code.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
  const inputHash = hashCode(cleanCode);

  const matchIndex = hashedCodes.indexOf(inputHash);
  if (matchIndex === -1) {
    return { valid: false, remainingCodes: hashedCodes };
  }

  const remainingCodes = hashedCodes.filter((_, idx) => idx !== matchIndex);
  return { valid: true, remainingCodes };
}

// ============================================
// Helpers
// ============================================

export function formatBackupCodesForDisplay(codes: string[]): string {
  return codes.join('\n');
}

export function isMFACodeFormat(input: string): 'totp' | 'backup' | 'invalid' {
  if (!input) return 'invalid';

  const cleanTotp = input.replace(/\D/g, '');
  if (cleanTotp.length === 6) return 'totp';

  const cleanBackup = input.replace(/[^A-Z0-9-]/gi, '');
  if (/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(cleanBackup)) return 'backup';

  return 'invalid';
}