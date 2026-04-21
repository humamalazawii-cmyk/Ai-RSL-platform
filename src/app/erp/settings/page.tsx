'use client';

import Link from 'next/link';

type Status = 'available' | 'coming-soon';

type SettingItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  status: Status;
};

type SettingGroup = {
  id: string;
  title: string;
  icon: string;
  items: SettingItem[];
};

const SETTINGS: SettingGroup[] = [
  {
    id: 'security',
    title: 'الأمان والحساب',
    icon: '🔐',
    items: [
      {
        id: 'change-password',
        title: 'تغيير كلمة المرور',
        description: 'تحديث كلمة المرور مع متطلبات الأمان',
        icon: '🔑',
        href: '/erp/settings/change-password',
        status: 'available',
      },
      {
        id: 'login-history',
        title: 'سجل تسجيلات الدخول',
        description: 'مراجعة آخر نشاطات حسابك للأمان',
        icon: '📋',
        href: '/erp/settings/login-history',
        status: 'available',
      },
      {
        id: 'mfa',
        title: 'المصادقة الثنائية MFA',
        description: 'حماية إضافية عبر Google Authenticator',
        icon: '🔒',
        href: '#',
        status: 'coming-soon',
      },
    ],
  },
  {
    id: 'company',
    title: 'الشركة',
    icon: '🏢',
    items: [
      {
        id: 'company-info',
        title: 'معلومات الشركة',
        description: 'الاسم والعنوان والشعار',
        icon: '🏢',
        href: '#',
        status: 'coming-soon',
      },
      {
        id: 'branches',
        title: 'الفروع',
        description: 'إدارة فروع الشركة',
        icon: '🏪',
        href: '#',
        status: 'coming-soon',
      },
    ],
  },
  {
    id: 'users',
    title: 'المستخدمون والصلاحيات',
    icon: '👥',
    items: [
      {
        id: 'users-list',
        title: 'إدارة المستخدمين',
        description: 'إضافة وتعديل المستخدمين',
        icon: '👤',
        href: '#',
        status: 'coming-soon',
      },
      {
        id: 'roles',
        title: 'الأدوار والصلاحيات',
        description: 'تحديد صلاحيات كل دور',
        icon: '🛡️',
        href: '#',
        status: 'coming-soon',
      },
    ],
  },
  {
    id: 'system',
    title: 'النظام',
    icon: '⚙️',
    items: [
      {
        id: 'language',
        title: 'اللغة والمنطقة',
        description: 'إعدادات اللغة والتوقيت',
        icon: '🌐',
        href: '#',
        status: 'coming-soon',
      },
      {
        id: 'backup',
        title: 'النسخ الاحتياطي',
        description: 'إعدادات النسخ والاستعادة',
        icon: '💾',
        href: '#',
        status: 'coming-soon',
      },
    ],
  },
];

export default function SettingsHubPage() {
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
            marginBottom: '32px',
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
              ⚙️ الإعدادات
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
              مركز إدارة حسابك ونظامك
            </p>
          </div>
          <Link
            href="/erp"
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
            ← العودة للوحة القيادة
          </Link>
        </div>

        {/* Settings Groups */}
        {SETTINGS.map((group) => (
          <div key={group.id} style={{ marginBottom: '32px' }}>
            {/* Group title */}
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#F1F5F9',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{group.icon}</span>
              <span>{group.title}</span>
            </h2>

            {/* Cards grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {group.items.map((item) => (
                <SettingCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            background: '#1E293B',
            borderRadius: '12px',
            border: '1px solid #334155',
            textAlign: 'center',
            fontSize: '13px',
            color: '#94A3B8',
          }}
        >
          💡 المزيد من الإعدادات قريباً — نطوّر بشكل متواصل لتلبية احتياجاتك
        </div>
      </div>
    </div>
  );
}

// ============================================
// Setting Card Component
// ============================================

function SettingCard({ item }: { item: SettingItem }) {
  const isAvailable = item.status === 'available';

  const cardContent = (
    <div
      style={{
        background: '#1E293B',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #334155',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        opacity: isAvailable ? 1 : 0.6,
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        if (isAvailable) {
          e.currentTarget.style.borderColor = '#0F6E56';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (isAvailable) {
          e.currentTarget.style.borderColor = '#334155';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ fontSize: '32px' }}>{item.icon}</div>
        {!isAvailable && (
          <span
            style={{
              padding: '2px 8px',
              background: '#854F0B',
              color: '#FEF3C7',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            قريباً
          </span>
        )}
      </div>

      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#F1F5F9',
          margin: '4px 0 0 0',
        }}
      >
        {item.title}
      </h3>

      <p
        style={{
          fontSize: '13px',
          color: '#94A3B8',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {item.description}
      </p>

      {isAvailable && (
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            color: '#0F6E56',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          فتح ←
        </div>
      )}
    </div>
  );

  if (isAvailable) {
    return (
      <Link href={item.href} style={{ textDecoration: 'none' }}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}