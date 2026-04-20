'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import AuthBox from '@/components/auth/AuthBox';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('البريد الإلكتروني مطلوب');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ. الرجاء المحاولة مجدداً.');
      } else {
        setSuccess(
          data.message ||
            'إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة بتعليمات إعادة التعيين.'
        );
        setEmail('');
      }
    } catch {
      setError('خطأ في الاتصال. الرجاء المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBox
      title="🔑 نسيت كلمة المرور؟"
      subtitle="أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين"
    >
      {success ? (
        <div className="space-y-4">
          {/* Success message */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-400 flex-shrink-0 mt-0.5"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-sm text-emerald-200 leading-relaxed">
                {success}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            تحقق من صندوق الوارد (وأيضاً مجلد الرسائل غير المرغوب فيها).
            <br />
            الرابط صالح لمدة ساعة واحدة.
          </p>

          <Link
            href="/"
            className="block w-full text-center py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 transition"
          >
            ← العودة لتسجيل الدخول
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-200">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-left focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition disabled:opacity-50"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300 text-center">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
          </button>

          {/* Back link */}
          <div className="pt-2 text-center">
            <p className="text-xs text-slate-500 mb-1">تذكرت كلمة المرور؟</p>
            <Link
              href="/"
              className="text-sm text-teal-400 hover:text-teal-300 transition"
            >
              ← العودة لتسجيل الدخول
            </Link>
          </div>
        </form>
      )}
    </AuthBox>
  );
}
