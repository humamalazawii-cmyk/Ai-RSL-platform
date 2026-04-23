import Link from 'next/link';

/**
 * RSL Vault — Main Dashboard (Day 1 Placeholder)
 * ============================================
 * Day 1: Empty state + status indicator
 * Day 5: Full dashboard with meeting list, filters, search
 */
export default function RSLVaultHome() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
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

        {/* Status indicator */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          قيد البناء — Day 1 من 6
        </div>
      </div>

      {/* Day-by-day progress */}
      <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-4 text-slate-200">خطة البناء</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-3">
            <span className="text-emerald-400">✓</span>
            <span className="text-slate-300">
              Day 1: Database schema + Allowlist middleware + Layout
            </span>
          </li>
          <li className="flex items-center gap-3 opacity-50">
            <span className="text-slate-500">○</span>
            <span className="text-slate-400">Day 2: Google Drive OAuth + Auto-detect recordings</span>
          </li>
          <li className="flex items-center gap-3 opacity-50">
            <span className="text-slate-500">○</span>
            <span className="text-slate-400">Day 3: OpenAI Whisper transcription queue</span>
          </li>
          <li className="flex items-center gap-3 opacity-50">
            <span className="text-slate-500">○</span>
            <span className="text-slate-400">Day 4: Claude API — 4 parallel analyses</span>
          </li>
          <li className="flex items-center gap-3 opacity-50">
            <span className="text-slate-500">○</span>
            <span className="text-slate-400">Day 5: Dashboard UI + Meeting detail page</span>
          </li>
          <li className="flex items-center gap-3 opacity-50">
            <span className="text-slate-500">○</span>
            <span className="text-slate-400">Day 6: First real meeting test + polish</span>
          </li>
        </ul>
      </div>

      {/* Quick info card */}
      <div className="mt-6 bg-teal-500/5 border border-teal-500/20 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-teal-300 mb-2">الوصول</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          هذه الصفحة محمية بطبقتين: JWT authentication + Email allowlist.
          فقط همام وعلي يستطيعان الوصول. أي شخص آخر — حتى SUPER_ADMIN — يُوجَّه تلقائياً للصفحة الرئيسية.
        </p>
      </div>

      {/* Return link */}
      <div className="mt-8 text-center">
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
