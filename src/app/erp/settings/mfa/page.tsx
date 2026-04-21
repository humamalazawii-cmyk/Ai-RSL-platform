'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Step = 'loading' | 'disabled' | 'setup' | 'show-codes' | 'enabled';

type SetupResponse = {
  ok: boolean;
  qrCodeDataURL: string;
  otpAuthURL: string;
  secretForManualEntry: string;
  message: string;
};

type VerifyResponse = {
  ok: boolean;
  message: string;
  backupCodes: string[];
  warning: string;
};

type StatusResponse = {
  mfaEnabled: boolean;
};

export default function MFASettingsPage() {
  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Setup data
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [code, setCode] = useState<string>('');

  // Backup codes (shown once after activation)
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Disable form
  const [password, setPassword] = useState<string>('');
  const [showDisable, setShowDisable] = useState(false);

  // Initial: check current MFA status
  useEffect(() => {
    void checkStatus();
  }, []);

  async function checkStatus() {
    setStep('loading');
    setError(null);
    try {
      // Fetch user via login-history endpoint (returns user object)
      const res = await fetch('/api/auth/login-history?limit=1', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('فشل التحقق من الحالة');
      }
      // We don't get mfaEnabled from this — we infer by trying setup
      // For now, show the disabled state and let user decide
      setStep('disabled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
      setStep('disabled');
    }
  }

  async function startSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        // If "already enabled", switch to enabled state
        if (json.error?.includes('مفعّلة بالفعل')) {
          setStep('enabled');
          return;
        }
        throw new Error(json.error ?? 'فشل بدء الإعداد');
      }
      const data = json as SetupResponse;
      setQrCode(data.qrCodeDataURL);
      setSecret(data.secretForManualEntry);
      setStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  }

  async function verifySetup() {
    if (code.length !== 6) {
      setError('الكود يجب أن يكون 6 أرقام');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/verify-setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'الكود غير صحيح');
      }
      const data = json as VerifyResponse;
      setBackupCodes(data.backupCodes);
      setStep('show-codes');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  }

  async function disableMFA() {
    if (!password) {
      setError('كلمة المرور مطلوبة');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'فشل الإلغاء');
      }
      setPassword('');
      setShowDisable(false);
      setStep('disabled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  }

  function copyBackupCodes() {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    alert('تم النسخ!');
  }

  function downloadBackupCodes() {
    const text =
      'RSL-AI — Backup Codes\n' +
      '=====================\n\n' +
      backupCodes.join('\n') +
      '\n\nاحفظ هذا الملف في مكان آمن.\nكل كود يستخدم مرة واحدة فقط.';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rsl-ai-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
              🔐 المصادقة الثنائية MFA
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
              حماية إضافية للحساب عبر Google Authenticator
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
            ← مركز الإعدادات
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: '#7F1D1D',
              border: '1px solid #B91C1C',
              borderRadius: '8px',
              color: '#FECACA',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* === STEP: LOADING === */}
        {step === 'loading' && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              جاري التحميل...
            </div>
          </Card>
        )}

        {/* === STEP: DISABLED (Activate) === */}
        {step === 'disabled' && (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔓</div>
              <h2
                style={{
                  fontSize: '20px',
                  color: '#F1F5F9',
                  margin: '0 0 8px 0',
                }}
              >
                المصادقة الثنائية غير مفعّلة
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>
                فعّل MFA لإضافة طبقة حماية إضافية لحسابك. ستحتاج تطبيق Google Authenticator أو ما شابه.
              </p>
              <button
                onClick={() => void startSetup()}
                disabled={loading}
                style={btnPrimary}
              >
                {loading ? 'جاري التحضير...' : '🔐 تفعيل MFA'}
              </button>
            </div>
          </Card>
        )}

        {/* === STEP: SETUP (QR + Verify) === */}
        {step === 'setup' && (
          <Card>
            <h2
              style={{
                fontSize: '18px',
                color: '#F1F5F9',
                margin: '0 0 20px 0',
                textAlign: 'center',
              }}
            >
              امسح رمز QR بتطبيق Google Authenticator
            </h2>

            {/* QR Code */}
            <div
              style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              {qrCode && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={qrCode} alt="MFA QR Code" style={{ width: '240px', height: '240px' }} />
              )}
            </div>

            {/* Manual entry */}
            <div
              style={{
                background: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                أو أدخل المفتاح يدوياً:
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: '#0F6E56',
                  wordBreak: 'break-all',
                  letterSpacing: '1px',
                }}
              >
                {secret}
              </div>
            </div>

            {/* Code input */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  color: '#CBD5E1',
                  marginBottom: '8px',
                }}
              >
                أدخل الكود من التطبيق (6 أرقام):
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F1F5F9',
                  fontSize: '24px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  letterSpacing: '8px',
                }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => void verifySetup()}
                disabled={loading || code.length !== 6}
                style={{
                  ...btnPrimary,
                  flex: 1,
                  opacity: code.length !== 6 ? 0.5 : 1,
                }}
              >
                {loading ? 'جاري التحقق...' : '✅ تأكيد التفعيل'}
              </button>
              <button
                onClick={() => {
                  setStep('disabled');
                  setCode('');
                  setError(null);
                }}
                disabled={loading}
                style={btnSecondary}
              >
                إلغاء
              </button>
            </div>
          </Card>
        )}

        {/* === STEP: SHOW BACKUP CODES === */}
        {step === 'show-codes' && (
          <Card>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
              <h2 style={{ fontSize: '20px', color: '#F1F5F9', margin: 0 }}>
                تم تفعيل MFA بنجاح!
              </h2>
            </div>

            <div
              style={{
                background: '#7C2D12',
                border: '1px solid #C2410C',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#FED7AA',
                fontSize: '13px',
              }}
            >
              ⚠️ احفظ هذه الأكواد في مكان آمن. لن تتمكن من رؤيتها مرة أخرى.
              استخدمها للدخول لو فقدت جوالك.
            </div>

            {/* Backup codes grid */}
            <div
              style={{
                background: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                }}
              >
                {backupCodes.map((bc, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '15px',
                      color: '#0F6E56',
                      padding: '8px',
                      background: '#1E293B',
                      borderRadius: '4px',
                      textAlign: 'center',
                      letterSpacing: '2px',
                    }}
                  >
                    {bc}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={copyBackupCodes} style={{ ...btnSecondary, flex: 1 }}>
                📋 نسخ
              </button>
              <button onClick={downloadBackupCodes} style={{ ...btnSecondary, flex: 1 }}>
                📥 تنزيل
              </button>
            </div>

            <button
              onClick={() => {
                setStep('enabled');
                setBackupCodes([]);
              }}
              style={{ ...btnPrimary, width: '100%' }}
            >
              ✅ حفظت الأكواد، تابع
            </button>
          </Card>
        )}

        {/* === STEP: ENABLED === */}
        {step === 'enabled' && (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <h2
                style={{
                  fontSize: '20px',
                  color: '#15803D',
                  margin: '0 0 8px 0',
                }}
              >
                ✅ MFA مفعّل
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>
                الحماية الإضافية تعمل. ستحتاج كود من تطبيق المصادقة عند كل تسجيل دخول.
              </p>

              {!showDisable ? (
                <button onClick={() => setShowDisable(true)} style={btnDanger}>
                  🔓 إلغاء التفعيل
                </button>
              ) : (
                <div style={{ textAlign: 'right' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      color: '#CBD5E1',
                      marginBottom: '8px',
                    }}
                  >
                    أدخل كلمة المرور لتأكيد الإلغاء:
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F1F5F9',
                      fontSize: '14px',
                      marginBottom: '12px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => void disableMFA()}
                      disabled={loading || !password}
                      style={{ ...btnDanger, flex: 1, opacity: !password ? 0.5 : 1 }}
                    >
                      {loading ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDisable(false);
                        setPassword('');
                        setError(null);
                      }}
                      disabled={loading}
                      style={btnSecondary}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================
// Components
// ============================================

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '24px',
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// Styles
// ============================================

const btnPrimary: React.CSSProperties = {
  padding: '12px 24px',
  background: '#0F6E56',
  border: 'none',
  borderRadius: '8px',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const btnSecondary: React.CSSProperties = {
  padding: '12px 24px',
  background: '#334155',
  border: 'none',
  borderRadius: '8px',
  color: '#F1F5F9',
  fontSize: '14px',
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  padding: '12px 24px',
  background: '#B91C1C',
  border: 'none',
  borderRadius: '8px',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};