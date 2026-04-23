'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// ============================================
// Types
// ============================================

type AuthEvent = {
  id: string;
  eventType: string;
  success: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  metadata: unknown;
};

type ApiResponse = {
  ok: boolean;
  user: { id: string; email: string; name: string };
  summary: {
    total: number;
    loginSuccess: number;
    loginFailure: number;
  };
  events: AuthEvent[];
  limit: number;
};

// ============================================
// Event type display config (Arabic labels + colors)
// ============================================

const EVENT_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  LOGIN_SUCCESS: { label: 'تسجيل دخول ناجح', color: '#15803D', bg: '#DCFCE7' },
  LOGIN_FAILURE: { label: 'محاولة دخول فاشلة', color: '#B91C1C', bg: '#FEE2E2' },
  LOGOUT: { label: 'تسجيل خروج', color: '#CBD5E1', bg: '#F1F5F9' },
  PASSWORD_CHANGED: { label: 'تغيير كلمة المرور', color: '#1D4ED8', bg: '#DBEAFE' },
  PASSWORD_RESET_REQUESTED: { label: 'طلب استرجاع كلمة المرور', color: '#A16207', bg: '#FEF3C7' },
  PASSWORD_RESET_COMPLETED: { label: 'إعادة تعيين كلمة المرور', color: '#15803D', bg: '#DCFCE7' },
  MFA_ENABLED: { label: 'تفعيل المصادقة الثنائية', color: '#15803D', bg: '#DCFCE7' },
  MFA_DISABLED: { label: 'إلغاء المصادقة الثنائية', color: '#B91C1C', bg: '#FEE2E2' },
  MFA_CHALLENGE_SUCCESS: { label: 'مصادقة ثنائية ناجحة', color: '#15803D', bg: '#DCFCE7' },
  MFA_CHALLENGE_FAILURE: { label: 'مصادقة ثنائية فاشلة', color: '#B91C1C', bg: '#FEE2E2' },
  ACCOUNT_LOCKED: { label: 'قفل الحساب', color: '#B91C1C', bg: '#FEE2E2' },
  ACCOUNT_UNLOCKED: { label: 'فتح الحساب', color: '#15803D', bg: '#DCFCE7' },
  SUSPICIOUS_ACTIVITY: { label: 'نشاط مريب', color: '#9333EA', bg: '#F3E8FF' },
  RATE_LIMIT_EXCEEDED: { label: 'تجاوز حد المحاولات', color: '#A16207', bg: '#FEF3C7' },
};

// ============================================
// Helpers
// ============================================

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'غير معروف';

  // Browser detection
  let browser = 'متصفح غير معروف';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';

  // OS detection
  let os = '';
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return os ? `${browser} على ${os}` : browser;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const time = d.toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${date} — ${time}`;
}

function eventConfig(eventType: string) {
  return (
    EVENT_CONFIG[eventType] ?? {
      label: eventType,
      color: '#CBD5E1',
      bg: '#F1F5F9',
    }
  );
}

// ============================================
// Page Component
// ============================================

export default function LoginHistoryPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  // Fetch on mount
  useEffect(() => {
    void fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login-history?limit=100', {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `خطأ في الخادم (${res.status})`);
      }
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  }

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!data) return [];
    if (filter === 'ALL') return data.events;
    return data.events.filter((e) => e.eventType === filter);
  }, [data, filter]);

  // Export to CSV
  function exportCSV() {
    if (!data || data.events.length === 0) return;

    const header = ['التاريخ', 'نوع الحدث', 'الحالة', 'IP', 'الجهاز'];
    const rows = data.events.map((e) => [
      formatDate(e.createdAt),
      eventConfig(e.eventType).label,
      e.success ? 'نجح' : 'فشل',
      e.ip ?? '-',
      parseUserAgent(e.userAgent),
    ]);

    const csv = [header, ...rows]
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    // Add UTF-8 BOM for Arabic Excel support
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Get unique event types for filter dropdown
  const uniqueEventTypes = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.events.map((e) => e.eventType)));
  }, [data]);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#0F172A',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#F1F5F9',
                margin: '0 0 8px 0',
              }}
            >
              📋 سجل تسجيلات الدخول
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
              مراجعة آخر نشاطات حسابك للأمان
            </p>
          </div>
          <Link
            href="/erp/settings"
            style={{
              padding: '8px 16px',
              background: '#1E293B',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#CBD5E1',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            ← العودة لمركز الإعدادات
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              color: '#94A3B8',
              background: '#1E293B',
              borderRadius: '12px',
            }}
          >
            جاري التحميل...
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            style={{
              padding: '20px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '12px',
              color: '#991B1B',
              marginBottom: '16px',
            }}
          >
            <strong>خطأ:</strong> {error}
            <button
              onClick={() => void fetchHistory()}
              style={{
                marginRight: '12px',
                padding: '4px 12px',
                background: '#991B1B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Content */}
        {data && !loading && !error && (
          <>
            {/* Summary cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <SummaryCard
                label="إجمالي الأحداث"
                value={data.summary.total}
                icon="📊"
                color="#0F6E56"
              />
              <SummaryCard
                label="تسجيلات دخول ناجحة"
                value={data.summary.loginSuccess}
                icon="✅"
                color="#15803D"
              />
              <SummaryCard
                label="محاولات دخول فاشلة"
                value={data.summary.loginFailure}
                icon="⚠️"
                color="#B91C1C"
              />
            </div>

            {/* Controls */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  background: '#1E293B',
                  fontSize: '14px',
                  minWidth: '200px',
                }}
              >
                <option value="ALL">كل الأحداث ({data.events.length})</option>
                {uniqueEventTypes.map((t) => (
                  <option key={t} value={t}>
                    {eventConfig(t).label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => void fetchHistory()}
                style={{
                  padding: '8px 16px',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#CBD5E1',
                }}
              >
                🔄 تحديث
              </button>

              <button
                onClick={exportCSV}
                disabled={data.events.length === 0}
                style={{
                  padding: '8px 16px',
                  background: '#0F6E56',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#FFFFFF',
                  opacity: data.events.length === 0 ? 0.5 : 1,
                }}
              >
                📥 تصدير CSV
              </button>

              <div
                style={{
                  marginRight: 'auto',
                  fontSize: '13px',
                  color: '#94A3B8',
                }}
              >
                عرض {filteredEvents.length} من أصل {data.events.length} حدث
              </div>
            </div>

            {/* Events table */}
            <div
              style={{
                background: '#1E293B',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #334155',
              }}
            >
              {filteredEvents.length === 0 ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#94A3B8',
                  }}
                >
                  لا توجد أحداث لعرضها
                </div>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#0F172A' }}>
                      <th style={th}>التاريخ والوقت</th>
                      <th style={th}>الحدث</th>
                      <th style={th}>الحالة</th>
                      <th style={th}>عنوان IP</th>
                      <th style={th}>الجهاز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((e) => {
                      const cfg = eventConfig(e.eventType);
                      return (
                        <tr
                          key={e.id}
                          style={{ borderBottom: '1px solid #334155' }}
                        >
                          <td style={td}>{formatDate(e.createdAt)}</td>
                          <td style={td}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                background: cfg.bg,
                                color: cfg.color,
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                            >
                              {cfg.label}
                            </span>
                          </td>
                          <td style={td}>
                            {e.success ? (
                              <span style={{ color: '#15803D' }}>✅ نجح</span>
                            ) : (
                              <span style={{ color: '#B91C1C' }}>❌ فشل</span>
                            )}
                          </td>
                          <td style={{ ...td, fontFamily: 'monospace' }}>
                            {e.ip ?? '-'}
                          </td>
                          <td style={{ ...td, color: '#94A3B8' }}>
                            {parseUserAgent(e.userAgent)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                fontSize: '12px',
                color: '#94A3B8',
                textAlign: 'center',
              }}
            >
              💡 إذا رأيت أي نشاط مريب، قم بتغيير كلمة المرور فوراً وتواصل مع
              المسؤول
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// Reusable: Summary Card
// ============================================

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: '#1E293B',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #334155',
      }}
    >
      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color,
          marginBottom: '4px',
        }}
      >
        {icon} {value.toLocaleString('en-US')}
      </div>
      <div style={{ fontSize: '13px', color: '#94A3B8' }}>{label}</div>
    </div>
  );
}

// ============================================
// Inline styles
// ============================================

const th: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'right',
  fontSize: '12px',
  fontWeight: 600,
  color: '#CBD5E1',
  borderBottom: '2px solid #334155',
};

const td: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'right',
};