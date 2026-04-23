import { redirect } from 'next/navigation';
import { getInvestorSession } from '@/lib/db';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function InvestorDashboard() {
  const session = await getInvestorSession();
  if (!session) redirect('/');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/investor" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
              style={{background:'linear-gradient(135deg,#0D9488,#D4A017)'}}>RSL</div>
            <div>
              <div className="font-bold">RSL-AI</div>
              <div className="text-xs text-slate-400">منصة المستثمرين</div>
            </div>
          </Link>
          <LogoutButton redirectTo="/" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero */}
        <section className="card p-10 relative overflow-hidden mb-8">
          <div className="absolute inset-0 opacity-10"
            style={{background:'radial-gradient(circle at 80% 20%, #0D9488, transparent 50%)'}}/>
          <div className="relative">
            <div className="text-sm text-teal-400 font-semibold mb-3">منصة عرض المستثمرين · نيسان 2026</div>
            <h1 className="text-5xl font-black mb-4 leading-tight">
              <span className="gradient-text">AI RSL</span> — الرافدين للحياة الذكية
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl leading-relaxed">
              نظام إدارة أعمال متكامل بمحرك مراقبة ذكي غير مرئي — يخدم 87% من المنشآت العراقية التي لا تملك أي نظام رقمي
            </p>
          </div>
        </section>

        {/* Key Metrics */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">الأرقام الرئيسية</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'حجم السوق 2028', value: '$2.4B', color: 'teal' },
              { label: 'السوق غير المخدوم', value: '87%', color: 'gold' },
              { label: 'الاستثمار السنة 1', value: '$150K', color: 'teal' },
              { label: 'نقطة التعادل', value: 'شهر 24-28', color: 'gold' },
              { label: 'الهدف سنة 5', value: '10,000 عميل', color: 'teal' },
              { label: 'إيراد سنة 5', value: '$30M', color: 'gold' },
              { label: 'الوحدات', value: '25', color: 'teal' },
              { label: 'القطاعات', value: '24', color: 'gold' },
            ].map(m => (
              <div key={m.label} className="card p-5">
                <div className="text-xs text-slate-400 mb-2">{m.label}</div>
                <div className={`text-3xl font-black ${m.color==='teal'?'text-teal-400':'text-yellow-500'} tabular`}>{m.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Value Prop */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">القيمة الجوهرية</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-6">
              <div className="text-3xl mb-3">🧠</div>
              <h3 className="font-bold text-lg mb-2 text-teal-400">ثلاثة محركات × أربع طبقات</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                COE + CJAE + CUOM × مراقبة + اكتشاف + تدريب + تقييم = <b>12 وظيفة ذكية غير مرئية</b>
              </p>
            </div>
            <div className="card p-6">
              <div className="text-3xl mb-3">🪄</div>
              <h3 className="font-bold text-lg mb-2 text-yellow-500">إعداد ذكي تلقائي</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                اختر القطاع والحجم، والذكاء الاصطناعي يولّد قاعدة البيانات بالكامل في دقائق
              </p>
            </div>
            <div className="card p-6">
              <div className="text-3xl mb-3">📡</div>
              <h3 className="font-bold text-lg mb-2 text-teal-400">يعمل بدون إنترنت 70%</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                انقطاع الإنترنت يتحوّل إلى <b>خندق تنافسي</b> لا يستطيع SAP اختراقه
              </p>
            </div>
          </div>
        </section>

        {/* Two Versions */}
        <section className="card p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">نسختان لسوقين</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-xl">📘</div>
                <div>
                  <h3 className="font-bold text-lg">RSL Standard</h3>
                  <p className="text-xs text-slate-400">النسخة العادية — بدون AI</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-3">
                محاسبة ومخزون ومبيعات وموارد بشرية — للشريحة الأوسع من السوق
              </p>
              <div className="text-teal-400 font-bold">من $43/شهر (63,000 د.ع)</div>
            </div>
            <div className="card p-6" style={{borderColor:'#0D9488'}}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{background:'linear-gradient(135deg,#0D9488,#D4A017)'}}>🧠</div>
                <div>
                  <h3 className="font-bold text-lg">RSL AI</h3>
                  <p className="text-xs text-teal-400">النسخة الذكية — مع المحركات × الطبقات</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-3">
                كل ما في العادية + مراقبة غير مرئية + كشف احتيال + تدريب تكيّفي + تقييم موضوعي
              </p>
              <div className="text-yellow-500 font-bold">من $81/شهر (119,000 د.ع)</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="card p-8 text-center"
          style={{background:'linear-gradient(135deg, rgba(13,148,136,0.15), rgba(212,160,23,0.15))'}}>
          <h2 className="text-2xl font-bold mb-3">هل تريد الغوص في التفاصيل؟</h2>
          <p className="text-slate-300 mb-6">المنصة قيد التطوير — محتوى تفصيلي إضافي سيُضاف قريباً</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/investor" className="btn-primary">📊 الأرقام المالية</Link>
            <Link href="/investor" className="btn-ghost">🧠 المحركات الثلاثة</Link>
            <Link href="/investor" className="btn-ghost">📄 الوثائق</Link>
          </div>
        </section>

        <p className="text-center text-xs text-slate-600 mt-12">
          © 2026 RSL-AI — محتوى سرّي — لا يُشارك بدون إذن خطّي
        </p>
      </main>
    </div>
  );
}
