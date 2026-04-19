/**
 * RSL-AI Password Policy (Strict)
 *
 * Centralized password validation for the entire application.
 * Used in: login, change password, reset password, signup.
 *
 * Policy level: STRICT (suitable for government/financial institutions)
 */

import { z } from 'zod';

// ============================================
// Policy Configuration
// ============================================

export const PASSWORD_POLICY = {
  minLength: 16,
  maxLength: 128,

  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  minUniqueChars: 8,

  forbidCommon: true,
  forbidUserInfo: true,
  forbidSequential: true,
  forbidRepeating: true,

  maxAgeDays: 90,
  preventReuse: 5,

  lockoutThreshold: 5,
  lockoutDurationMinutes: 30,
} as const;

// ============================================
// Common Passwords Blacklist
// ============================================

const COMMON_PASSWORDS = new Set<string>([
  'password', 'password1', 'password123', 'passw0rd',
  '12345678', '123456789', '1234567890', '11111111',
  'qwerty', 'qwerty123', 'qwertyuiop',
  'admin', 'administrator', 'admin123',
  'welcome', 'welcome1', 'welcome123',
  'letmein', 'monkey', 'dragon', 'sunshine',
  'princess', 'football', 'baseball', 'basketball',
  'iloveyou', 'trustno1', 'superman', 'batman',
  'master', 'shadow', 'ashley', 'michael',
  'abc123', 'abcdef', 'abcdefgh',
  // RSL-AI specific
  'rsl-ai', 'alrafidain', 'rafidain', 'iraq123', 'baghdad',
]);

// ============================================
// Sequential & Repeating Patterns
// ============================================

const SEQUENTIAL_PATTERNS = [
  '0123456789', '9876543210',
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  'poiuytrewq', 'lkjhgfdsa', 'mnbvcxz',
];

function hasSequentialPattern(password: string, minLength: number = 4): boolean {
  const lower = password.toLowerCase();
  for (const pattern of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i <= pattern.length - minLength; i++) {
      const seq = pattern.substring(i, i + minLength);
      if (lower.includes(seq)) return true;
    }
  }
  return false;
}

function hasRepeatingChars(password: string, maxRepeat: number = 3): boolean {
  const regex = new RegExp(`(.)\\1{${maxRepeat - 1},}`);
  return regex.test(password);
}

// ============================================
// Character Class Checks
// ============================================

function hasUppercase(password: string): boolean {
  return /[A-Z]/.test(password);
}

function hasLowercase(password: string): boolean {
  return /[a-z]/.test(password);
}

function hasNumber(password: string): boolean {
  return /[0-9]/.test(password);
}

function hasSpecial(password: string): boolean {
  return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
}

function countUniqueChars(password: string): number {
  return new Set(password).size;
}

// ============================================
// Main Validation Function
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  errorsAr: string[];
}

export function validatePassword(
  password: string,
  userInfo: { email?: string; name?: string } = {}
): ValidationResult {
  const errors: string[] = [];
  const errorsAr: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
    errorsAr.push(`يجب أن تكون كلمة المرور ${PASSWORD_POLICY.minLength} حرف على الأقل`);
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must be at most ${PASSWORD_POLICY.maxLength} characters`);
    errorsAr.push(`يجب ألا تتجاوز كلمة المرور ${PASSWORD_POLICY.maxLength} حرف`);
  }

  if (PASSWORD_POLICY.requireUppercase && !hasUppercase(password)) {
    errors.push('Password must contain an uppercase letter (A-Z)');
    errorsAr.push('يجب أن تحتوي كلمة المرور على حرف كبير (A-Z)');
  }
  if (PASSWORD_POLICY.requireLowercase && !hasLowercase(password)) {
    errors.push('Password must contain a lowercase letter (a-z)');
    errorsAr.push('يجب أن تحتوي كلمة المرور على حرف صغير (a-z)');
  }
  if (PASSWORD_POLICY.requireNumber && !hasNumber(password)) {
    errors.push('Password must contain a number (0-9)');
    errorsAr.push('يجب أن تحتوي كلمة المرور على رقم (0-9)');
  }
  if (PASSWORD_POLICY.requireSpecial && !hasSpecial(password)) {
    errors.push('Password must contain a special character');
    errorsAr.push('يجب أن تحتوي كلمة المرور على رمز خاص');
  }

  if (countUniqueChars(password) < PASSWORD_POLICY.minUniqueChars) {
    errors.push(`Password must contain at least ${PASSWORD_POLICY.minUniqueChars} unique characters`);
    errorsAr.push(`يجب أن تحتوي كلمة المرور على ${PASSWORD_POLICY.minUniqueChars} أحرف مختلفة على الأقل`);
  }

  if (PASSWORD_POLICY.forbidCommon) {
    const lower = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lower)) {
      errors.push('This password is too common');
      errorsAr.push('كلمة المرور شائعة جداً');
    }
  }

  if (PASSWORD_POLICY.forbidUserInfo) {
    const lower = password.toLowerCase();
    if (userInfo.email) {
      const emailLocal = userInfo.email.split('@')[0].toLowerCase();
      if (emailLocal.length >= 4 && lower.includes(emailLocal)) {
        errors.push('Password must not contain your email');
        errorsAr.push('يجب ألا تحتوي كلمة المرور على بريدك الإلكتروني');
      }
    }
    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
      for (const part of nameParts) {
        if (lower.includes(part)) {
          errors.push('Password must not contain your name');
          errorsAr.push('يجب ألا تحتوي كلمة المرور على اسمك');
          break;
        }
      }
    }
  }

  if (PASSWORD_POLICY.forbidSequential && hasSequentialPattern(password)) {
    errors.push('Password must not contain sequential characters (abc, 123)');
    errorsAr.push('يجب ألا تحتوي كلمة المرور على تسلسل (abc, 123)');
  }

  if (PASSWORD_POLICY.forbidRepeating && hasRepeatingChars(password)) {
    errors.push('Password must not contain 3+ repeating characters (aaa, 111)');
    errorsAr.push('يجب ألا تحتوي كلمة المرور على 3 أحرف متكررة أو أكثر');
  }

  return {
    valid: errors.length === 0,
    errors,
    errorsAr,
  };
}

// ============================================
// Zod Schemas
// ============================================

export const passwordSchema = z
  .string()
  .min(PASSWORD_POLICY.minLength, {
    message: `Password must be at least ${PASSWORD_POLICY.minLength} characters`,
  })
  .max(PASSWORD_POLICY.maxLength, {
    message: `Password must be at most ${PASSWORD_POLICY.maxLength} characters`,
  });

export function createStrictPasswordSchema(userInfo?: { email?: string; name?: string }) {
  return passwordSchema.refine(
    (password) => validatePassword(password, userInfo).valid,
    (password) => {
      const result = validatePassword(password, userInfo);
      return {
        message: result.errors[0] || 'Password does not meet policy requirements',
      };
    }
  );
}

// ============================================
// Password Strength Scoring
// ============================================

export type PasswordStrength = 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';

export interface StrengthResult {
  score: number;
  strength: PasswordStrength;
  label: string;
  labelAr: string;
}

export function getPasswordStrength(password: string): StrengthResult {
  let score = 0;

  score += Math.min(30, password.length * 2);

  if (hasUppercase(password)) score += 10;
  if (hasLowercase(password)) score += 10;
  if (hasNumber(password)) score += 10;
  if (hasSpecial(password)) score += 15;

  score += Math.min(15, countUniqueChars(password));

  if (hasSequentialPattern(password)) score -= 15;
  if (hasRepeatingChars(password)) score -= 10;
  if (COMMON_PASSWORDS.has(password.toLowerCase())) score -= 30;

  score = Math.max(0, Math.min(100, score));

  let strength: PasswordStrength;
  let label: string;
  let labelAr: string;

  if (score < 20) {
    strength = 'very-weak';
    label = 'Very Weak';
    labelAr = 'ضعيفة جداً';
  } else if (score < 40) {
    strength = 'weak';
    label = 'Weak';
    labelAr = 'ضعيفة';
  } else if (score < 60) {
    strength = 'medium';
    label = 'Medium';
    labelAr = 'متوسطة';
  } else if (score < 80) {
    strength = 'strong';
    label = 'Strong';
    labelAr = 'قوية';
  } else {
    strength = 'very-strong';
    label = 'Very Strong';
    labelAr = 'قوية جداً';
  }

  return { score, strength, label, labelAr };
}