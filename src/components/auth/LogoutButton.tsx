'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  className?: string;
  redirectTo?: string;
  label?: string;
  loadingLabel?: string;
};

export default function LogoutButton({
  className = 'btn-ghost text-sm',
  redirectTo = '/auth/login',
  label = 'خروج',
  loadingLabel = 'جاري تسجيل الخروج...',
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`${className} disabled:opacity-50`}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
