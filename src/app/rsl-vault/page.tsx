import Link from 'next/link';
import { getUserSession } from '@/lib/db';
import { getConnectionStatus } from '@/lib/google-drive';
import DriveConnection from '@/components/rsl-vault/DriveConnection';

/**
 * RSL Vault — Main Dashboard
 * ============================================
 * Day 2: Drive connection management
 * Day 5: Full dashboard with meeting list, filters, search
 */

export const dynamic = 'force-dynamic';

type SearchParams = {
  connected?: string;
  error?: string;
};

export default async function RSLVaultHome({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getUserSession();
  const status = session?.email
    ? await getConnectionStatus(session.email)
    : { connected: false };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success banner after OAuth */}
      {searchParams.connected === '1' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
          <span className="text-xl">✅</span>
          <span>تم ربط Google Drive بنجاح.</span>
        </div>
      )}

      {/* Error banner */}
      {searchParams.error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xl">⚠️</span>
            <span className="font-semibold">فشل ربط Google Drive</span>
          </div>
          <div className="text-xs text-red-400/80 font-mono mr-8">
            {searchParams.error}
          </div>
        </div>
      )}

      {/* Welcome card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center mb-8">
        <div className="text-6xl mb-4">🎙️</div>
        <h1 className="text-3xl font-black mb-3 text-slate-100">
          مستودع أفكار RSL
        </h1>
        <p className="text-slate-400 mb-2">
          أداة داخلية لتحليل اجتماعات Google Meet
        </p>
        <p className="text-slate-500 text-sm mb-8">
          Whisper + Claude → ملخص + مهام + أفكار + قرارات
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          قيد البناء — Day 2 من 6
        </div>
      </div>

      {/* Google Drive Connection */}
      <div className="mb-8">
        <DriveConnection
          connected={status.connected}
          providerEmail={status.providerEmail}
          connectedAt={status.connectedAt?.toISOString()}
          lastUsedAt={status.lastUsedAt?.toISOString() ?? null}
        />
      </div>

      {/* Day-by-day progress */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 text-slate-200">خطة البناء</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-3">
            <span className="text-emerald-400">✓</span>
            <span className="text-slate-300">
              Day 1: Database schema + Allowlist middleware + Layout
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-emerald-400">✓</span>
            <span className="text-slate-300">
              Day 2: Google Drive OAuth + Auto-detect recordings
            </span>
          </li>
          <li className="flex items-center gap-3 opacity-50">
            <span className="text-slate-500">○</span>
            <span className="text-slate-400">
              Day 3: OpenAI Whisper transcription queue
            </span>
          </li>
          <li className="flex items-center gap-3 opacity-50">
            <span className="text-slate-500">○</span>
            <span className="text-slate-400">
              Day 4: Claude API — 4 parallel analyses
            </span>
          </li>
          <li className="flex items-center gap-3 opacity-50">
            <span className="text-slate-500">○</span>
            <span className="text-slate-400">
              Day 5: Dashboard UI + Meeting detail page
            </span>
          </li>
          <li className="flex items-center gap-3 opacity-50">
            <span className="text-slate-500">○</span>
            <span className="text-slate-400">
              Day 6: First real meeting test + polish
            </span>
          </li>
        </ul>
      </div>

      {/* Return link */}
      <div className="text-center">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-teal-400 transition"
        >
          ← العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
