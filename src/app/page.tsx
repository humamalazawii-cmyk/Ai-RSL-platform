"use client";
import { useState, useEffect } from "react";
import { useState, useEffect } from "react";

const SECTORS = [
  { name: "Grocery", nameAr: "بقالة", icon: "🏪" },
  { name: "Gas Station", nameAr: "بنزين خانة", icon: "⛽" },
  { name: "Restaurant", nameAr: "مطعم", icon: "🍽" },
  { name: "Factory", nameAr: "مصنع", icon: "🏭" },
  { name: "Hotel", nameAr: "فندق", icon: "🏨" },
  { name: "Clinic", nameAr: "عيادة", icon: "🏥" },
  { name: "School", nameAr: "مدرسة", icon: "🎓" },
  { name: "Bank", nameAr: "بنك", icon: "🏦" },
  { name: "Construction", nameAr: "مقاولات", icon: "🏗" },
  { name: "Salon", nameAr: "صالون", icon: "💇" },
  { name: "Pharmacy", nameAr: "صيدلية", icon: "💊" },
  { name: "Logistics", nameAr: "لوجستيك", icon: "🚛" },
];

const FEATURES = [
  { title: "AI builds your ERP", titleAr: "الذكاء الاصطناعي يبني نظامك", desc: "Describe your business in 3 steps. AI generates the complete system — flowcharts, chart of accounts, workflows, and reports.", icon: "⚡", color: "#0D9488" },
  { title: "Smart training", titleAr: "تدريب ذكي", desc: "AI creates personalized learning paths for every employee. Adaptive quizzes, role-based content, and skill gap analysis.", icon: "📚", color: "#7C3AED" },
  { title: "Fraud detection", titleAr: "كشف الاحتيال", desc: "Benford's Law analysis, anomaly detection, duplicate payments, and ghost employee detection — all running continuously.", icon: "🛡", color: "#DC2626" },
  { title: "Smart evaluation", titleAr: "تقييم ذكي", desc: "360-degree reviews, KPI auto-tracking, performance prediction, and promotion readiness scoring — powered by AI.", icon: "📊", color: "#F59E0B" },
];

const STATS = [
  { value: "24", label: "Sectors" },
  { value: "28+", label: "Modules" },
  { value: "42", label: "AI Features" },
  { value: "5", label: "Scale Levels" },
];

export default function LandingPage() {
  const [visible, setVisible] = useState(false);
  const [activeSector, setActiveSector] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setVisible(true);
    const interval = setInterval(() => setActiveSector(s => (s + 1) % SECTORS.length), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: "#0A0D1A", color: "#E2E8F0", minHeight: "100vh", fontFamily: "'Outfit', sans-serif", overflow: "hidden" }}
         onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}>

      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes rotateSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp 0.8s ease-out forwards; opacity: 0; }
        .d1 { animation-delay: 0.1s; } .d2 { animation-delay: 0.2s; } .d3 { animation-delay: 0.3s; }
        .d4 { animation-delay: 0.4s; } .d5 { animation-delay: 0.5s; } .d6 { animation-delay: 0.6s; }
        .float { animation: float 6s ease-in-out infinite; }
        .nav-link { color: #94A3B8; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #0D9488; }
        .glow-btn { background: linear-gradient(135deg, #0D9488, #14B8A6); color: white; border: none; padding: 14px 36px; border-radius: 50px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 0 30px rgba(13,148,136,0.3); font-family: 'Outfit', sans-serif; }
        .glow-btn:hover { transform: translateY(-2px); box-shadow: 0 0 50px rgba(13,148,136,0.5); }
        .ghost-btn { background: transparent; color: #94A3B8; border: 1px solid #334155; padding: 14px 36px; border-radius: 50px; font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.3s; font-family: 'Outfit', sans-serif; }
        .ghost-btn:hover { border-color: #0D9488; color: #0D9488; }
        .feature-card { background: linear-gradient(145deg, #111827, #1E293B); border: 1px solid #1E293B; border-radius: 16px; padding: 28px; transition: all 0.4s; cursor: pointer; }
        .feature-card:hover { border-color: #0D9488; transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
        .sector-pill { padding: 8px 16px; border-radius: 30px; font-size: 13px; font-weight: 500; border: 1px solid #1E293B; background: #111827; transition: all 0.3s; cursor: default; white-space: nowrap; }
        .sector-active { border-color: #0D9488; background: rgba(13,148,136,0.15); color: #14B8A6; }
        .stat-card { text-align: center; padding: 24px; }
        .stat-num { font-size: 48px; font-weight: 800; background: linear-gradient(135deg, #0D9488, #14B8A6, #5EEAD4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'Space Mono', monospace; }
        .grid-line { position: absolute; background: linear-gradient(to bottom, transparent, rgba(13,148,136,0.06), transparent); width: 1px; height: 100%; }
      `}</style>

      {/* Ambient background */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)", animation: "float 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", animation: "float 10s ease-in-out infinite 2s" }} />
        {[1,2,3,4,5].map(i => <div key={i} className="grid-line" style={{ left: `${i * 20}%` }} />)}
      </div>

      {/* Content wrapper */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #0D9488, #14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "16px", color: "#0A0D1A" }}>R</div>
            <span style={{ fontWeight: 700, fontSize: "18px", letterSpacing: "-0.5px" }}>AI RSL</span>
          </div>
          <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
            <a href="#features" className="nav-link">Features</a>
            <a href="#sectors" className="nav-link">Sectors</a>
            <a href="#how" className="nav-link">How it works</a>
            <button className="glow-btn" style={{ padding: "10px 24px", fontSize: "14px" }}>Get Started</button>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 40px 60px", textAlign: "center" }}>
          <div className={`fade-up d1`} style={{ display: "inline-block", padding: "6px 16px", borderRadius: "30px", border: "1px solid #1E293B", fontSize: "13px", color: "#94A3B8", marginBottom: "24px", background: "#111827" }}>
            <span style={{ color: "#14B8A6", marginRight: "6px", animation: "pulse 2s infinite" }}>●</span>
            AI-Powered Universal ERP Platform
          </div>

          <h1 className="fade-up d2" style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 auto 24px", maxWidth: "900px" }}>
            Your entire business.
            <br />
            <span style={{ background: "linear-gradient(135deg, #0D9488, #14B8A6, #5EEAD4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Built by AI.
            </span>
          </h1>

          <p className="fade-up d3" style={{ fontSize: "18px", color: "#94A3B8", maxWidth: "580px", margin: "0 auto 40px", lineHeight: 1.7, fontWeight: 300 }}>
            Select your sector, define your scale. AI generates the complete ERP — flowcharts, accounting, workflows, training — in minutes, not months.
          </p>

          <div className="fade-up d4" style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <button className="glow-btn">Start building free →</button>
            <button className="ghost-btn">Watch demo</button>
          </div>

          {/* Animated sector ticker */}
          <div className="fade-up d5" style={{ marginTop: "60px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", maxWidth: "700px", margin: "60px auto 0" }}>
            {SECTORS.map((s, i) => (
              <div key={s.name} className={`sector-pill ${i === activeSector ? "sector-active" : ""}`}>
                <span style={{ marginRight: "4px", fontSize: "14px" }}>{s.icon}</span>
                {s.name}
              </div>
            ))}
          </div>
        </section>

        {/* Stats bar */}
        <section className="fade-up d6" style={{ maxWidth: "900px", margin: "40px auto 0", padding: "0 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "linear-gradient(145deg, #111827, #1E293B)", borderRadius: "20px", border: "1px solid #1E293B", overflow: "hidden" }}>
            {STATS.map((s, i) => (
              <div key={s.label} className="stat-card" style={{ borderRight: i < 3 ? "1px solid #1E293B" : "none" }}>
                <div className="stat-num">{s.value}</div>
                <div style={{ fontSize: "14px", color: "#64748B", fontWeight: 500, marginTop: "4px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{ maxWidth: "1200px", margin: "0 auto", padding: "100px 40px 60px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-1px", marginBottom: "12px" }}>
              AI does <span style={{ color: "#14B8A6" }}>everything</span>
            </h2>
            <p style={{ color: "#64748B", fontSize: "16px", maxWidth: "500px", margin: "0 auto" }}>Four AI layers that build, manage, train, and evaluate — without human intervention.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "16px" }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "4px", color: "#F1F5F9" }}>{f.title}</h3>
                <p style={{ fontSize: "12px", color: f.color, fontWeight: 500, marginBottom: "12px", fontFamily: "'Space Mono', monospace" }}>{f.titleAr}</p>
                <p style={{ fontSize: "14px", color: "#94A3B8", lineHeight: 1.7, fontWeight: 300 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 40px 100px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-1px", marginBottom: "12px" }}>
              Three steps. <span style={{ color: "#14B8A6" }}>That's it.</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
            {[
              { step: "01", title: "Choose your sector", desc: "Gas station, factory, clinic, bank — pick from 24 sectors and 5 scale levels." },
              { step: "02", title: "AI generates everything", desc: "Flowcharts, chart of accounts, workflows, reports, training — all auto-built in minutes." },
              { step: "03", title: "Go live instantly", desc: "Your ERP is ready. AI manages operations, trains staff, and detects fraud from day one." },
            ].map((s, i) => (
              <div key={s.step} style={{ padding: "32px", borderRadius: "16px", background: i === 1 ? "linear-gradient(145deg, rgba(13,148,136,0.1), rgba(13,148,136,0.02))" : "transparent", border: i === 1 ? "1px solid rgba(13,148,136,0.3)" : "1px solid #1E293B" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "36px", fontWeight: 700, color: i === 1 ? "#14B8A6" : "#1E293B", marginBottom: "16px" }}>{s.step}</div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>{s.title}</h3>
                <p style={{ fontSize: "14px", color: "#64748B", lineHeight: 1.7, fontWeight: 300 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 40px 100px", textAlign: "center" }}>
          <div style={{ background: "linear-gradient(145deg, #111827, #1E293B)", borderRadius: "24px", border: "1px solid #1E293B", padding: "60px 40px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-50%", right: "-20%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.1) 0%, transparent 70%)" }} />
            <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, letterSpacing: "-1px", marginBottom: "12px", position: "relative" }}>
              Ready to build the future?
            </h2>
            <p style={{ color: "#64748B", fontSize: "16px", marginBottom: "32px", position: "relative" }}>
              One platform. Every sector. Every scale. Fully AI-driven.
            </p>
            <button className="glow-btn" style={{ position: "relative" }}>Get started now →</button>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid #1E293B", padding: "32px 40px", maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, #0D9488, #14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", color: "#0A0D1A" }}>R</div>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>AI RSL Platform</span>
          </div>
          <p style={{ color: "#475569", fontSize: "13px" }}>© 2026 AI RSL. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
