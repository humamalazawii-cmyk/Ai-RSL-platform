import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserSession } from '@/lib/db';
import { isRSLInternal } from '@/lib/rsl-allowlist';
import LogoutButton from '@/components/auth/LogoutButton';

/**
 * RSL Vault Layout
 * ============================================
 * Protected layout for internal tools (/rsl-vault/*).
 * TWO-LAYER auth check:
 *   1. Must be authenticated (JWT valid)
 *   2. Email must be on RSL_INTERNAL_EMAILS allowlist
 *
 * Anyone else — even SUPER_ADMIN — is redirected to /.
 */
export default async function RSLVaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getUserSession();

  // Layer 1: Must be logged in
  if (!session) redirect('/');

  // Layer 2: Email must be on allowlist
  if (!isRSLInternal(session.email)) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/rsl-vault" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#0D9488,#D4A017)' }}
            >
              RSL
            </div>
            <div>
              <div className="font-bold text-slate-100">مستودع أفكار RSL</div>
              <div className="text-xs text-slate-400">أداة داخلية — {session.email}</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition"
            >
              الصفحة الرئيسية
            </Link>
            <LogoutButton redirectTo="/" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
