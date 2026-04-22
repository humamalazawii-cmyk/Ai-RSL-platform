'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MFAChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeToken = searchParams.get('token');

  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If no token, redirect to login
  useEffect(() => {
    if (!challengeToken) {
      router.replace('/');
    }
  }, [challengeToken, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: { challengeToken: string; code?: string; backupCode?: string } = {
        challengeToken: challengeToken!,
      };

      if (useBackup) {
        payload.backupCode = backupCode.trim();
      } else {
        payload.code = code.trim();
      }

      const res = await fetch('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'خطأ في التحقق');
        setLoading(false);
        return;
      }

      // Success — redirect to ERP dashboard
      if (data.usedBackupCode) {
        alert('⚠️ استخدمت كود استعادة. يُنصح بإعادة إعداد MFA لاحقاً.');
      }

      router.replace('/erp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
      setLoading(false);
    }
  }

  if (!challengeToken) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4" dir="rtl">
      <div className="w-full max-w-md bg-[#1E293B] rounded-2xl shadow-2xl p-8 border border-[#334155]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#854F0B]/20 mb-4">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">المصادقة الثنائية</h1>
          <p className="text-sm text-[#94A3B8]">
            {useBackup
              ? 'أدخل أحد أكواد الاستعادة التي حفظتها'
              : 'أدخل الكود من تطبيق Google Authenticator'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {!useBackup ? (
            <div>
              <label className="block text-sm font-medium text-[#E2E8F0] mb-2">
                كود MFA (6 أرقام)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 bg-[#0F172A] border border-[#334155] rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-[#0F6E56] font-mono"
                placeholder="000000"
                autoFocus
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[#E2E8F0] mb-2">
                كود الاستعادة
              </label>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-[#0F172A] border border-[#334155] rounded-lg text-white text-center text-lg tracking-wider focus:outline-none focus:border-[#854F0B] font-mono"
                placeholder="XXXX-XXXX"
                autoFocus
                required
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (useBackup ? !backupCode : code.length !== 6)}
            className="w-full bg-gradient-to-r from-[#0F6E56] to-[#854F0B] text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري التحقق...' : '✅ تحقق'}
          </button>

          {/* Toggle between TOTP and backup code */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setUseBackup(!useBackup);
                setCode('');
                setBackupCode('');
                setError(null);
              }}
              className="text-sm text-[#0F6E56] hover:text-[#13A884] transition-colors"
            >
              {useBackup
                ? '← استخدم كود Google Authenticator'
                : 'استخدم كود استعادة بدلاً →'}
            </button>
          </div>

          {/* Back to login */}
          <div className="text-center pt-4 border-t border-[#334155]">
            <button
              type="button"
              onClick={() => router.replace('/')}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MFAChallengePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="text-white">جاري التحميل...</div>
      </div>
    }>
      <MFAChallengeContent />
    </Suspense>
  );
}