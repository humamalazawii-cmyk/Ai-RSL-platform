import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/db';
import ERPSidebar from '@/components/erp/ERPSidebar';

export default async function ERPLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();
  if (!session) redirect('/');

  return (
    <div className="flex min-h-screen">
      <ERPSidebar email={session.email ?? ""} />
      <main className="flex-1 mr-64 p-8">{children}</main>
    </div>
  );
}