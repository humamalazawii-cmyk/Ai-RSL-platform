'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ============================================
// Types
// ============================================

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

// ============================================
// Navigation Config
// ============================================

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    label: 'الرئيسية',
    items: [
      { href: '/erp', label: 'لوحة القيادة', icon: '🏠' },
    ],
  },
  {
    id: 'accounting',
    label: 'المحاسبة',
    items: [
      { href: '/erp/accounts', label: 'دليل الحسابات', icon: '📊' },
      { href: '/erp/journal-entries', label: 'القيود اليومية', icon: '📝' },
    ],
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    items: [
      { href: '/erp/settings', label: 'مركز الإعدادات', icon: '⚙️' },
    ],
  },
];

const STORAGE_KEY = 'rsl-sidebar-collapsed';

// ============================================
// Sidebar Component
// ============================================

export default function ERPSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Load collapse state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCollapsed(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
    setIsHydrated(true);
  }, []);

  // Save collapse state to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [collapsed, isHydrated]);

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }

  function isActive(href: string): boolean {
    if (href === '/erp') return pathname === '/erp';
    return pathname === href;
  }

  // Auto-expand group if current page is inside it
  function isGroupAutoExpanded(group: NavGroup): boolean {
    return group.items.some((item) => isActive(item.href));
  }

  function isCollapsed(groupId: string, group: NavGroup): boolean {
    // If page is inside this group, force expanded
    if (isGroupAutoExpanded(group)) return false;
    return collapsed[groupId] ?? false;
  }

  return (
    <aside className="fixed top-0 right-0 h-full w-64 bg-slate-900/80 backdrop-blur-xl border-l border-slate-800 overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <Link href="/erp" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background: 'linear-gradient(135deg,#0D9488,#D4A017)' }}
          >
            RSL
          </div>
          <div>
            <div className="font-bold">RSL-AI ERP</div>
            <div className="text-xs text-slate-400">النظام الداخلي</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 flex-1">
        {NAV_GROUPS.map((group) => {
          const collapsed = isCollapsed(group.id, group);
          const autoExpanded = isGroupAutoExpanded(group);
          return (
            <div key={group.id} className="mb-4">
              {/* Group header (clickable) */}
              <button
                onClick={() => toggleGroup(group.id)}
                disabled={autoExpanded}
                className="w-full flex items-center justify-between px-3 mb-2 text-xs text-slate-500 uppercase tracking-wider font-semibold hover:text-slate-300 transition disabled:cursor-default"
                style={{
                  opacity: autoExpanded ? 0.9 : 1,
                }}
              >
                <span>{group.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    transition: 'transform 0.2s',
                    transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    display: 'inline-block',
                  }}
                >
                  ▼
                </span>
              </button>

              {/* Group items (hidden when collapsed) */}
              <div
                style={{
                  maxHeight: collapsed ? '0' : `${group.items.length * 48}px`,
                  overflow: 'hidden',
                  transition: 'max-height 0.25s ease-in-out',
                }}
              >
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-lg text-sm transition ${
                        active
                          ? 'bg-slate-800 text-white border-r-2 border-teal-500'
                          : 'text-slate-300 hover:bg-slate-800/50'
                      }`}
                      style={{
                        marginBottom: '2px',
                      }}
                    >
                      <span style={{ marginLeft: '8px' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="px-3 py-2 mb-2 text-xs text-slate-400 truncate" title={email}>
          {email}
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition text-center"
          >
            خروج
          </button>
        </form>
      </div>
    </aside>
  );
}