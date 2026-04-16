import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/db';
import Link from 'next/link';

export default async function ERPLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();
  if (!session) redirect('/');

  return (
    <div className="flex min-h-screen">
      <aside className="fixed top-0 right-0 h-full w-64 bg-slate-900/80 backdrop-blur-xl border-l border-slate-800 overflow-y-auto">
        <div className="p-6 border-b border-slate-800">
          <Link href="/erp" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
              style={{background:'linear-gradient(135deg,#0D9488,#D4A017)'}}>RSL</div>
            <div>
              <div className="font-bold">RSL-AI ERP</div>
              <div className="text-xs text-slate-400">النظام الداخلي</div>
            </div>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          <div className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-2 font-semibold">الرئيسية</div>
          <Link href="/erp" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/50">🏠 لوحة القيادة</Link>
          <div className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-2 font-semibold mt-6">المحاسبة</div>
          <Link href="/erp/accounts" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/50">📊 دليل الحسابات</Link>
          <Link href="/erp/journal-entries" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/50">📝 القيود اليومية</Link>
        </nav>
        <div className="p-4 border-t border-slate-800 mt-auto">
          <form action="/api/auth/logout" method="POST">
            <button className="w-full btn-ghost text-sm">خروج</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 mr-64 p-8">{children}</main>
    </div>
  );
}
