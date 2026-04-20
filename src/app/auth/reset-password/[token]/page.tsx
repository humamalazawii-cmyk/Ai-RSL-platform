'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AuthBox from '@/components/auth/AuthBox';
import {
  validatePassword,
  getPasswordStrength,
  PASSWORD_POLICY,
} from '@/lib/password-policy';

// Eye icon (show)
function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Eye-off icon (hide)
function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

// Check icon
function CheckIcon({ passed }: { passed: boolean }) {
  return passed ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-400"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-500"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = useMemo(
    () => (newPassword ? getPasswordStrength(newPassword) : null),
    [newPassword]
  );

  const validation = useMemo(
    () => (newPassword ? validatePassword(newPassword) : null),
    [newPassword]
  );

  const checks = useMemo(() => {
    if (!newPassword) return [];
    return [
      {
        label: `${PASSWORD_POLICY.minLength} حرف على الأقل`,
        passed: newPassword.length >= PASSWORD_POLICY.minLength,
      },
      {
        label: 'حرف كبير (A-Z)',
        passed: /[A-Z]/.test(newPassword),
      },
      {
        label: 'حرف صغير (a-z)',
        passed: /[a-z]/.test(newPassword),
      },
      {
        label: 'رقم (0-9)',
        passed: /[0-9]/.test(newPassword),
      },
      {
        label: 'رمز خاص (!@#$%...)',
        passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword),
      },
      {
        label: `${PASSWORD_POLICY.minUniqueChars} أحرف مختلفة`,
        passed: new Set(newPassword).size >= PASSWORD_POLICY.minUniqueChars,
      },
    ];
  }, [newPassword]);

  const strengthColor = useMemo(() => {
    if (!strength) return 'bg-slate-700';
    if (strength.score < 20) return 'bg-red-500';
    if (strength.score < 40) return 'bg-orange-500';
    if (strength.score < 60) return 'bg-yellow-500';
    if (strength.score < 80) return 'bg-teal-500';
    return 'bg-emerald-500';
  }, [strength]);

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    !!token &&
    validation?.valid &&
    passwordsMatch &&
    !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ. الرجاء المحاولة مجدداً.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch {
      setError('خطأ في الاتصال. الرجاء المحاولة مجدداً.');
      setLoading(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <AuthBox
        title="✅ تم بنجاح"
        subtitle="تم تغيير كلمة المرور"
      >
        <div className="space-y-4 text-center">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm text-emerald-200 leading-relaxed">
              تم تغيير كلمة المرور بنجاح.
              <br />
              سيتم تحويلك لصفحة الدخول خلال لحظات...
            </p>
          </div>
          <Link
            href="/"
            className="block w-full text-center py-3 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-semibold transition"
          >
            الدخول الآن ←
          </Link>
        </div>
      </AuthBox>
    );
  }

  // Main form
  return (
    <AuthBox
      title="🔐 إعادة تعيين كلمة المرور"
      subtitle="اختر كلمة مرور جديدة قوية"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New Password */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-200">
            كلمة المرور الجديدة <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="أدخل كلمة مرور قوية"
              autoComplete="new-password"
              required
              disabled={loading}
              className="w-full pr-4 pl-12 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition ltr disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 transition p-1"
              tabIndex={-1}
              aria-label={showNew ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showNew ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {/* Strength Meter */}
          {newPassword && strength && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400">قوة كلمة المرور:</span>
                <span
                  className={`text-xs font-bold ${
                    strength.score < 40
                      ? 'text-red-400'
                      : strength.score < 60
                      ? 'text-yellow-400'
                      : strength.score < 80
                      ? 'text-teal-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {strength.labelAr}
                </span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strengthColor} transition-all duration-300`}
                  style={{ width: `${strength.score}%` }}
                />
              </div>
            </div>
          )}

          {/* Policy Checklist */}
          {newPassword && (
            <div className="mt-3 p-3 bg-slate-900/40 border border-slate-700/50 rounded-lg">
              <p className="text-xs font-semibold text-slate-300 mb-2">
                متطلبات كلمة المرور:
              </p>
              <ul className="space-y-1.5">
                {checks.map((check, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-2 text-xs ${
                      check.passed ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    <CheckIcon passed={check.passed} />
                    <span>{check.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-200">
            تأكيد كلمة المرور <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد كتابة كلمة المرور الجديدة"
              autoComplete="new-password"
              required
              disabled={loading}
              className="w-full pr-4 pl-12 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition ltr disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 transition p-1"
              tabIndex={-1}
              aria-label={showConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {/* Match indicator */}
          {confirmPassword && (
            <p
              className={`mt-2 text-xs ${
                passwordsMatch ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {passwordsMatch
                ? '✓ كلمتا المرور متطابقتان'
                : '✗ كلمتا المرور غير متطابقتين'}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-300 text-center">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
        </button>

        {/* Back link */}
        <div className="pt-2 text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-teal-400 transition"
          >
            ← إلغاء والعودة لتسجيل الدخول
          </Link>
        </div>
      </form>
    </AuthBox>
  );
}
