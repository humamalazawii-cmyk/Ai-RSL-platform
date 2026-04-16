import { prisma, getUserSession } from '@/lib/db';

export default async function JournalEntriesPage() {
  const session = await getUserSession();
  const entries = await prisma.journalEntry.findMany({
    where: { organization: { users: { some: { id: session?.userId } } } },
    orderBy: { entryDate: 'desc' },
    take: 50,
    include: { lines: true },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-black mb-2 gradient-text">القيود اليومية</h1>
      <p className="text-slate-400 mb-8">سجل القيود المحاسبية ({entries.length} قيد)</p>

      {entries.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-xl font-bold mb-2">لا توجد قيود بعد</h2>
          <p className="text-slate-400">ستظهر القيود هنا فور إنشائها — واجهة الإنشاء ستُبنى في المرحلة التالية</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="p-4 text-right text-slate-400">رقم القيد</th>
                <th className="p-4 text-right text-slate-400">النوع</th>
                <th className="p-4 text-right text-slate-400">التاريخ</th>
                <th className="p-4 text-right text-slate-400">الوصف</th>
                <th className="p-4 text-right text-slate-400">الحالة</th>
                <th className="p-4 text-right text-slate-400">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-slate-800 last:border-0">
                  <td className="p-4 font-mono text-teal-400">{e.entryNumber}</td>
                  <td className="p-4 text-xs">{e.entryType}</td>
                  <td className="p-4 text-xs">{e.entryDate.toISOString().split('T')[0]}</td>
                  <td className="p-4">{e.description || '—'}</td>
                  <td className="p-4 text-xs">{e.status}</td>
                  <td className="p-4 tabular text-yellow-500">{Number(e.totalDebit).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
