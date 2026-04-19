'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  validatePassword,
  getPasswordStrength,
  PASSWORD_POLICY,
} from '@/lib/password-policy';

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Real-time password strength
  const strength = useMemo(
    () => (newPassword ? getPasswordStrength(newPassword) : null),
    [newPassword]
  );

  // Real-time policy validation
  const validation = useMemo(
    () => (newPassword ? validatePassword(newPassword) : null),
    [newPassword]
  );

  // Policy checks (for checklist UI)
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

  // Strength bar color
  const strengthColor = useMemo(() => {
    if (!strength) return 'bg-slate-700';
    if (strength.score < 20) return 'bg-red-500';
    if (strength.score < 40) return 'bg-orange-500';
    if (strength.score < 60) return 'bg-yellow-500';
    if (strength.score < 80) return 'bg-teal-500';
    return 'bg-emerald-500';
  }, [strength]);

  // Form validity
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    validation?.valid &&
    passwordsMatch &&
    !loading;

  // Submit handler
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ. الرجاء المحاولة مرة أخرى.');
        setLoading(false);
        return;
      }

      // Success!
      setSuccess(true);
      setLoading(false);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/erp');
        router.refresh();
      }, 2000);
    } catch {
      setError('تعذّر الاتصال بالخادم');
      setLoading(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-5xl">
            ✓
          </div>
          <h1 className="text-3xl font-black mb-3 gradient-text">
            تم التحديث بنجاح!
          </h1>
          <p className="text-slate-400 mb-6">
            تم تغيير كلمة المرور. سيتم توجيهك إلى لوحة القيادة...
          </p>
          <div className="w-8 h-8 mx-auto border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
          <Link href="/erp" className="hover:text-teal-400 transition">
            لوحة القيادة
          </Link>
          <span>›</span>
          <span>الإعدادات</span>
          <span>›</span>
          <span className="text-slate-200">تغيير كلمة المرور</span>
        </div>
        <h1 className="text-4xl font-black mb-2 gradient-text">
          🔐 تغيير كلمة المرور
        </h1>
        <p className="text-slate-400">
          للحفاظ على أمان حسابك، اختر كلمة مرور قوية ولا تشاركها مع أحد
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-200">
            كلمة المرور الحالية <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition ltr"
              placeholder="أدخل كلمة المرور الحالية"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition text-sm"
              tabIndex={-1}
            >
              {showCurrent ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700/50"></div>

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
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition ltr"
              placeholder="أدخل كلمة مرور قوية"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition text-sm"
              tabIndex={-1}
            >
              {showNew ? '🙈' : '👁'}
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
                ></div>
              </div>
            </div>
          )}

          {/* Policy Checklist */}
          {newPassword && checks.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {checks.map((check, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs ${
                    check.passed ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  <span className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-slate-800">
                    {check.passed ? '✓' : '○'}
                  </span>
                  <span>{check.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-200">
            تأكيد كلمة المرور الجديدة <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition ltr"
              placeholder="أعد إدخال كلمة المرور"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition text-sm"
              tabIndex={-1}
            >
              {showConfirm ? '🙈' : '👁'}
            </button>
          </div>

          {/* Match indicator */}
          {confirmPassword && (
            <div
              className={`mt-2 text-xs ${
                passwordsMatch ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {passwordsMatch
                ? '✓ كلمتا المرور متطابقتان'
                : '✗ كلمتا المرور غير متطابقتين'}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 btn-primary disabled:!transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                جاري التحديث...
              </span>
            ) : (
              'تحديث كلمة المرور'
            )}
          </button>
          <Link
            href="/erp"
            className="btn-ghost flex items-center justify-center"
          >
            إلغاء
          </Link>
        </div>
      </form>

      {/* Security Tips */}
      <div
        className="card p-6 mt-6"
        style={{
          background:
            'linear-gradient(135deg, rgba(13,148,136,0.08), rgba(212,160,23,0.08))',
        }}
      >
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <span>💡</span>
          <span>نصائح أمنية</span>
        </h3>
        <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
          <li>
            • استخدم مدير كلمات مرور (مثل Bitwarden) لحفظ كلمات معقدة وفريدة
          </li>
          <li>• لا تعيد استخدام كلمات المرور بين الحسابات المختلفة</li>
          <li>• تجنّب المعلومات الشخصية (اسمك، تاريخ ميلادك، أرقام الهاتف)</li>
          <li>• غيّر كلمة المرور فوراً إذا اشتبهت بأنها سُرّبت</li>
        </ul>
      </div>
    </div>
  );
}