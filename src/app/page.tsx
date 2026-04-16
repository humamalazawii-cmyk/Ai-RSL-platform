'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'hero' | 'password' | 'register' | 'login'>('hero');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const r = await fetch('/api/investor/check-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    setLoading(false);
    if (r.ok) setMode('register');
    else setError('كلمة السر غير صحيحة');
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const r = await fetch('/api/investor/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...form })
    });
    setLoading(false);
    if (r.ok) router.push('/investor');
    else { const j = await r.json(); setError(j.error || 'خطأ'); }
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    });
    setLoading(false);
    if (r.ok) router.push('/erp');
    else { const j = await r.json(); setError(j.error || 'خطأ'); }
  }

  if (mode === 'hero') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-4xl w-full text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center text-4xl font-black mb-6"
              style={{background:'linear-gradient(135deg,#0D9488,#D4A017)'}}>RSL</div>
            <h1 className="text-6xl md:text-7xl font-black mb-4">
              <span className="gradient-text">RSL-AI</span>
            </h1>
            <p className="text-2xl text-slate-300 mb-2">الرافدين للحياة الذكية</p>
            <p className="text-lg text-slate-400">Alrafdain Smart Life — نظام إدارة أعمال ذكي</p>
          </div>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            منظومة إدارة أعمال من الجيل الجديد تقوم على ثلاثة محركات ذكية × أربع طبقات رقابية = 12 وظيفة ذكية غير مرئية
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setMode('password')} className="btn-primary text-lg px-8 py-4">
              🔐 دخول المستثمرين
            </button>
            <button onClick={() => setMode('login')} className="btn-ghost text-lg px-8 py-4">
              👤 دخول الموظفين (ERP)
            </button>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="card p-4">
              <div className="text-3xl font-black gradient-text tabular">24</div>
              <div className="text-xs text-slate-400 mt-1">قطاع مدعوم</div>
            </div>
            <div className="card p-4">
              <div className="text-3xl font-black gradient-text tabular">25</div>
              <div className="text-xs text-slate-400 mt-1">وحدة إدارية</div>
            </div>
            <div className="card p-4">
              <div className="text-3xl font-black gradient-text tabular">12</div>
              <div className="text-xs text-slate-400 mt-1">وظيفة ذكية</div>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-12">© 2026 RSL-AI — معلومات سرية</p>
        </div>
      </div>
    );
  }

  if (mode === 'password') {
    return (
      <AuthBox title="🔒 منطقة المستثمرين" subtitle="أدخل كلمة السر للمتابعة" onBack={() => setMode('hero')}>
        <form onSubmit={submitPassword}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="كلمة السر" autoFocus required
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-center ltr focus:border-teal-500 outline-none" />
          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
            {loading ? 'جاري التحقق...' : 'متابعة ←'}
          </button>
        </form>
      </AuthBox>
    );
  }

  if (mode === 'register') {
    return (
      <AuthBox title="✓ تم التحقق" subtitle="معلوماتك تبقى سرّية">
        <form onSubmit={submitRegister} className="space-y-3">
          <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
            placeholder="الاسم الكامل *"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-teal-500 outline-none" />
          <input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
            placeholder="البريد الإلكتروني *" dir="ltr"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-right focus:border-teal-500 outline-none" />
          <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
            placeholder="رقم الهاتف" dir="ltr"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-right focus:border-teal-500 outline-none" />
          <input value={form.company} onChange={e=>setForm({...form,company:e.target.value})}
            placeholder="الشركة / الصندوق الاستثماري"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-teal-500 outline-none" />
          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'جاري الدخول...' : 'دخول منصة العرض'}
          </button>
        </form>
      </AuthBox>
    );
  }

  if (mode === 'login') {
    return (
      <AuthBox title="👤 دخول الموظفين" subtitle="تسجيل الدخول للنظام الداخلي" onBack={() => setMode('hero')}>
        <form onSubmit={submitLogin} className="space-y-3">
          <input required type="email" value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})}
            placeholder="البريد الإلكتروني" dir="ltr"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-right focus:border-teal-500 outline-none" />
          <input required type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})}
            placeholder="كلمة السر" dir="ltr"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-right focus:border-teal-500 outline-none" />
          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
          <p className="text-xs text-slate-500 text-center pt-2">
            الافتراضي: admin@rsl-ai.com / RSL-Admin-2026
          </p>
        </form>
      </AuthBox>
    );
  }
  return null;
}

function AuthBox({ title, subtitle, children, onBack }: { title: string; subtitle: string; children: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {onBack && (
          <button onClick={onBack} className="text-sm text-slate-400 hover:text-teal-400 mb-4">← العودة</button>
        )}
        <div className="card p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
          {children}
        </div>
        <p className="text-center text-xs text-slate-600 mt-8">© 2026 RSL-AI</p>
      </div>
    </div>
  );
}
