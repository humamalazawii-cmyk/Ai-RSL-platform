'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  connected: boolean;
  providerEmail?: string;
  connectedAt?: string;
  lastUsedAt?: string | null;
};

export default function DriveConnection({
  connected,
  providerEmail,
  connectedAt,
  lastUsedAt,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [disconnecting, setDisconnecting] = useState(false);

  function handleConnect() {
    window.location.href = '/api/rsl-vault/oauth/connect';
  }

  async function handleDisconnect() {
    if (!confirm('هل تريد فصل Google Drive؟ ستحتاج إعادة الربط لاحقاً.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch('/api/rsl-vault/oauth/disconnect', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Disconnect failed');
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      alert('فشل الفصل: ' + (err instanceof Error ? err.message : 'خطأ'));
      setDisconnecting(false);
    }
  }

  if (!connected) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="text-4xl">🔗</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-100 mb-2">
              ربط Google Drive
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              لتحليل اجتماعاتك تلقائياً، نحتاج صلاحية قراءة تسجيلات Google Meet
              من Drive الخاص بك. الصلاحية للقراءة فقط — لن نعدّل أو نحذف أي ملف.
            </p>
          </div>
        </div>

        <button
          onClick={handleConnect}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-lg transition"
        >
          ربط Google Drive
        </button>
      </div>
    );
  }

  return (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8">
      <div className="flex items-start gap-4 mb-4">
        <div className="text-4xl">✅</div>
        <div>
          <h2 className="text-xl font-bold text-emerald-300 mb-1">
            Google Drive متصل
          </h2>
          <p className="text-sm text-slate-400">
            الحساب:{' '}
            <span className="font-mono text-slate-200">{providerEmail}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <div className="text-slate-500 text-xs mb-1">تاريخ الربط</div>
          <div className="text-slate-200">
            {connectedAt
              ? new Date(connectedAt).toLocaleDateString('ar-IQ')
              : '—'}
          </div>
        </div>
        <div>
          <div className="text-slate-500 text-xs mb-1">آخر استخدام</div>
          <div className="text-slate-200">
            {lastUsedAt
              ? new Date(lastUsedAt).toLocaleDateString('ar-IQ')
              : 'لم يُستخدم بعد'}
          </div>
        </div>
      </div>

      <button
        onClick={handleDisconnect}
        disabled={disconnecting || isPending}
        className="text-sm text-slate-400 hover:text-red-400 transition disabled:opacity-50"
      >
        {disconnecting ? 'جاري الفصل...' : 'فصل Google Drive'}
      </button>
    </div>
  );
}
