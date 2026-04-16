import { prisma, getUserSession } from '@/lib/db';

export default async function AccountsPage() {
  const session = await getUserSession();
  const accounts = await prisma.account.findMany({
    where: { organization: { users: { some: { id: session?.userId } } } },
    orderBy: { code: 'asc' },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-black mb-2 gradient-text">دليل الحسابات</h1>
      <p className="text-slate-400 mb-8">الدليل المحاسبي العراقي الموحد — عيّنة مبدئية ({accounts.length} حساب)</p>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="p-4 text-right text-slate-400">الكود</th>
              <th className="p-4 text-right text-slate-400">الاسم</th>
              <th className="p-4 text-right text-slate-400">النوع</th>
              <th className="p-4 text-right text-slate-400">المستوى</th>
              <th className="p-4 text-right text-slate-400">العملة</th>
              <th className="p-4 text-right text-slate-400">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
                <td className="p-4 font-mono text-teal-400" dir="ltr">{a.code}</td>
                <td className="p-4" style={{paddingRight: `${a.level * 16}px`}}>{a.nameAr}</td>
                <td className="p-4 text-xs text-slate-400">{a.type}</td>
                <td className="p-4 text-xs text-slate-400">{a.level}</td>
                <td className="p-4 text-xs text-slate-400">{a.currency}</td>
                <td className="p-4 tabular text-yellow-500">{Number(a.balance).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
