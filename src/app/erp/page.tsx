import { prisma, getUserSession } from '@/lib/db';

export default async function ERPDashboard() {
  const session = await getUserSession();
  const [accountCount, entryCount] = await Promise.all([
    prisma.account.count(),
    prisma.journalEntry.count(),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-black mb-2 gradient-text">لوحة القيادة</h1>
      <p className="text-slate-400 mb-8">مرحباً {session?.email} — نظرة عامة على نظامك</p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="text-xs text-slate-400 mb-2">الحسابات المحاسبية</div>
          <div className="text-4xl font-black text-teal-400 tabular">{accountCount}</div>
          <div className="text-xs text-slate-500 mt-2">في دليل الحسابات</div>
        </div>
        <div className="card p-6">
          <div className="text-xs text-slate-400 mb-2">القيود اليومية</div>
          <div className="text-4xl font-black text-yellow-500 tabular">{entryCount}</div>
          <div className="text-xs text-slate-500 mt-2">إجمالي القيود</div>
        </div>
        <div className="card p-6">
          <div className="text-xs text-slate-400 mb-2">الحالة</div>
          <div className="text-4xl font-black text-teal-400">✓ نشط</div>
          <div className="text-xs text-slate-500 mt-2">النظام يعمل</div>
        </div>
      </div>

      <div className="card p-8" style={{background:'linear-gradient(135deg, rgba(13,148,136,0.15), rgba(212,160,23,0.15))'}}>
        <h2 className="text-2xl font-bold mb-3">🚧 النظام قيد التطوير</h2>
        <p className="text-slate-300 leading-relaxed">
          هذه المرحلة الأولى من المنصة. سيتم إضافة المزيد من الوحدات تدريجياً حسب خارطة الطريق:
          المحركات الثلاثة (COE + CJAE + CUOM)، مركز الإعدادات الذكي، ووحدات المحاسبة الكاملة.
        </p>
      </div>
    </div>
  );
}
