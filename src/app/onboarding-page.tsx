"use client";
import { useState } from "react";

const SECTORS = [
  { key: "grocery", name: "Grocery", nameAr: "بقالة", icon: "🏪", modules: 6 },
  { key: "gas_station", name: "Gas Station", nameAr: "بنزين خانة", icon: "⛽", modules: 6 },
  { key: "restaurant", name: "Restaurant", nameAr: "مطعم", icon: "🍽", modules: 7 },
  { key: "factory", name: "Factory", nameAr: "مصنع", icon: "🏭", modules: 18 },
  { key: "hotel", name: "Hotel", nameAr: "فندق", icon: "🏨", modules: 14 },
  { key: "clinic", name: "Clinic", nameAr: "عيادة", icon: "🏥", modules: 12 },
  { key: "school", name: "School", nameAr: "مدرسة", icon: "🎓", modules: 10 },
  { key: "bank", name: "Bank", nameAr: "بنك", icon: "🏦", modules: 16 },
  { key: "construction", name: "Construction", nameAr: "مقاولات", icon: "🏗", modules: 14 },
  { key: "salon", name: "Salon", nameAr: "صالون", icon: "💇", modules: 6 },
  { key: "pharmacy", name: "Pharmacy", nameAr: "صيدلية", icon: "💊", modules: 8 },
  { key: "consulting", name: "Consulting", nameAr: "استشارات", icon: "💼", modules: 8 },
  { key: "bakery", name: "Bakery", nameAr: "مخبز", icon: "🥖", modules: 8 },
  { key: "auto_repair", name: "Auto Repair", nameAr: "ورشة سيارات", icon: "🔧", modules: 7 },
  { key: "laundry", name: "Laundry", nameAr: "مغسلة", icon: "👔", modules: 6 },
  { key: "auto_dealership", name: "Auto Dealer", nameAr: "وكالة سيارات", icon: "🚗", modules: 10 },
  { key: "shopping_mall", name: "Shopping Mall", nameAr: "مجمع تجاري", icon: "🏬", modules: 12 },
  { key: "logistics", name: "Logistics", nameAr: "لوجستيك", icon: "🚛", modules: 10 },
  { key: "ecommerce", name: "E-Commerce", nameAr: "تجارة إلكترونية", icon: "🛒", modules: 10 },
  { key: "ngo", name: "NGO", nameAr: "منظمة غير ربحية", icon: "🤝", modules: 8 },
  { key: "government", name: "Government", nameAr: "جهة حكومية", icon: "🏛", modules: 16 },
  { key: "insurance", name: "Insurance", nameAr: "تأمين", icon: "🛡", modules: 12 },
  { key: "training_center", name: "Training Center", nameAr: "مركز تدريب", icon: "📚", modules: 8 },
  { key: "mining", name: "Mining", nameAr: "تعدين", icon: "⛏", modules: 14 },
];

const SCALES = [
  { key: "micro", name: "Micro", nameAr: "متناهية الصغر", range: "1-5", desc: "Corner shop, salon, single location", modules: "4-6" },
  { key: "small", name: "Small", nameAr: "صغيرة", range: "6-25", desc: "Restaurant chain, clinic, workshop", modules: "8-12" },
  { key: "medium", name: "Medium", nameAr: "متوسطة", range: "26-200", desc: "Factory, hotel, school", modules: "14-18" },
  { key: "large", name: "Large", nameAr: "كبيرة", range: "201-1K", desc: "Hospital, bank, university", modules: "20-24" },
  { key: "enterprise", name: "Enterprise", nameAr: "مؤسسات", range: "1000+", desc: "Conglomerate, government, multinational", modules: "28+" },
];

const COUNTRIES = [
  { code: "IQ", name: "Iraq", nameAr: "العراق", flag: "🇮🇶" },
  { code: "SA", name: "Saudi Arabia", nameAr: "السعودية", flag: "🇸🇦" },
  { code: "AE", name: "UAE", nameAr: "الإمارات", flag: "🇦🇪" },
  { code: "KW", name: "Kuwait", nameAr: "الكويت", flag: "🇰🇼" },
  { code: "QA", name: "Qatar", nameAr: "قطر", flag: "🇶🇦" },
  { code: "BH", name: "Bahrain", nameAr: "البحرين", flag: "🇧🇭" },
  { code: "OM", name: "Oman", nameAr: "عمان", flag: "🇴🇲" },
  { code: "JO", name: "Jordan", nameAr: "الأردن", flag: "🇯🇴" },
  { code: "EG", name: "Egypt", nameAr: "مصر", flag: "🇪🇬" },
  { code: "LB", name: "Lebanon", nameAr: "لبنان", flag: "🇱🇧" },
  { code: "TR", name: "Turkey", nameAr: "تركيا", flag: "🇹🇷" },
  { code: "OTHER", name: "Other", nameAr: "أخرى", flag: "🌍" },
];

const GENERATION_STEPS = [
  { label: "Analyzing sector requirements", labelAr: "تحليل متطلبات القطاع" },
  { label: "Building chart of accounts", labelAr: "بناء دليل الحسابات" },
  { label: "Generating flowcharts", labelAr: "توليد المخططات التدفقية" },
  { label: "Configuring modules", labelAr: "إعداد الوحدات" },
  { label: "Setting up workflows", labelAr: "إعداد سير العمل" },
  { label: "Creating reports templates", labelAr: "إنشاء قوالب التقارير" },
  { label: "Building training paths", labelAr: "بناء مسارات التدريب" },
  { label: "Activating AI engine", labelAr: "تفعيل محرك الذكاء الاصطناعي" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [sector, setSector] = useState("");
  const [scale, setScale] = useState("");
  const [country, setCountry] = useState("");
  const [genStep, setGenStep] = useState(0);
  const [genDone, setGenDone] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedSector = SECTORS.find(s => s.key === sector);
  const selectedScale = SCALES.find(s => s.key === scale);

  const startGeneration = () => {
    setStep(4);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setGenStep(i);
      if (i >= GENERATION_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => setGenDone(true), 800);
      }
    }, 1200);
  };

  const filteredSectors = SECTORS.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nameAr.includes(searchTerm)
  );

  return (
    <div style={{ background: "#0A0D1A", color: "#E2E8F0", minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: .6; } 50% { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes checkPop { from { transform: scale(0); } to { transform: scale(1); } }
        @keyframes slideRight { from { width: 0%; } to { width: 100%; } }
        .fade-in { animation: fadeUp .5s ease-out forwards; }
        .sector-card { background: #111827; border: 2px solid #1E293B; border-radius: 14px; padding: 16px; cursor: pointer; transition: all .25s; text-align: center; }
        .sector-card:hover { border-color: #334155; transform: translateY(-2px); background: #1E293B; }
        .sector-card.selected { border-color: #0D9488; background: rgba(13,148,136,.1); box-shadow: 0 0 20px rgba(13,148,136,.15); }
        .scale-card { background: #111827; border: 2px solid #1E293B; border-radius: 14px; padding: 20px; cursor: pointer; transition: all .25s; }
        .scale-card:hover { border-color: #334155; background: #1E293B; }
        .scale-card.selected { border-color: #0D9488; background: rgba(13,148,136,.1); }
        .country-card { background: #111827; border: 2px solid #1E293B; border-radius: 12px; padding: 12px 16px; cursor: pointer; transition: all .25s; display: flex; align-items: center; gap: 10px; }
        .country-card:hover { border-color: #334155; background: #1E293B; }
        .country-card.selected { border-color: #0D9488; background: rgba(13,148,136,.1); }
        .next-btn { background: linear-gradient(135deg, #0D9488, #14B8A6); color: white; border: none; padding: 14px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all .3s; box-shadow: 0 0 25px rgba(13,148,136,.3); font-family: 'Outfit'; }
        .next-btn:hover { transform: translateY(-2px); box-shadow: 0 0 40px rgba(13,148,136,.4); }
        .next-btn:disabled { opacity: .3; cursor: not-allowed; transform: none; box-shadow: none; }
        .back-btn { background: transparent; color: #64748B; border: 1px solid #334155; padding: 14px 32px; border-radius: 50px; font-size: 16px; font-weight: 500; cursor: pointer; font-family: 'Outfit'; transition: all .2s; }
        .back-btn:hover { border-color: #64748B; color: #94A3B8; }
        .search-input { background: #111827; border: 1px solid #1E293B; border-radius: 12px; padding: 12px 16px; color: #E2E8F0; font-size: 14px; width: 100%; font-family: 'Outfit'; outline: none; transition: border-color .2s; }
        .search-input:focus { border-color: #0D9488; }
        .search-input::placeholder { color: #475569; }
        .gen-step { display: flex; align-items: center; gap: 12px; padding: 12px 0; }
        .gen-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
        .gen-active { background: rgba(13,148,136,.2); border: 2px solid #0D9488; }
        .gen-done { background: #0D9488; border: 2px solid #0D9488; animation: checkPop .3s ease-out; }
        .gen-waiting { background: #1E293B; border: 2px solid #1E293B; }
        .spinner { width: 12px; height: 12px; border: 2px solid transparent; border-top-color: #14B8A6; border-radius: 50%; animation: spin .6s linear infinite; }
        .progress-bar { height: 4px; background: #1E293B; border-radius: 2px; overflow: hidden; margin-top: 20px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #0D9488, #14B8A6); border-radius: 2px; transition: width .5s ease; }
        .success-box { background: linear-gradient(145deg, rgba(13,148,136,.1), rgba(13,148,136,.03)); border: 1px solid rgba(13,148,136,.3); border-radius: 20px; padding: 48px; text-align: center; animation: fadeUp .6s ease-out; }
      `}</style>

      {/* Top bar */}
      <div style={{ padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1E293B" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#E2E8F0" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #0D9488, #14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px", color: "#0A0D1A" }}>R</div>
          <span style={{ fontWeight: 700, fontSize: "16px" }}>AI RSL</span>
        </a>

        {step < 4 && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: step >= s ? "linear-gradient(135deg, #0D9488, #14B8A6)" : "#1E293B",
                  color: step >= s ? "#0A0D1A" : "#475569",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700, transition: "all .3s"
                }}>{s}</div>
                {s < 3 && <div style={{ width: "40px", height: "2px", background: step > s ? "#0D9488" : "#1E293B", borderRadius: "1px", transition: "all .3s" }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>

        {/* STEP 1: Select Sector */}
        {step === 1 && (
          <div className="fade-in">
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-1px", marginBottom: "8px" }}>
                What is your <span style={{ color: "#14B8A6" }}>business</span>?
              </h1>
              <p style={{ color: "#64748B", fontSize: "15px" }}>Select your sector — AI will customize everything for you</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <input
                className="search-input"
                placeholder="Search sectors..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px", marginBottom: "32px" }}>
              {filteredSectors.map(s => (
                <div
                  key={s.key}
                  className={`sector-card ${sector === s.key ? "selected" : ""}`}
                  onClick={() => setSector(s.key)}
                >
                  <div style={{ fontSize: "28px", marginBottom: "6px" }}>{s.icon}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: sector === s.key ? "#14B8A6" : "#E2E8F0" }}>{s.name}</div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{s.nameAr}</div>
                  <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>{s.modules} modules</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button className="next-btn" disabled={!sector} onClick={() => setStep(2)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Scale */}
        {step === 2 && (
          <div className="fade-in">
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-1px", marginBottom: "8px" }}>
                How <span style={{ color: "#14B8A6" }}>big</span> is your business?
              </h1>
              <p style={{ color: "#64748B", fontSize: "15px" }}>
                Setting up {selectedSector?.icon} {selectedSector?.name} — choose your scale
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
              {SCALES.map(s => (
                <div
                  key={s.key}
                  className={`scale-card ${scale === s.key ? "selected" : ""}`}
                  onClick={() => setScale(s.key)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: scale === s.key ? "#14B8A6" : "#E2E8F0" }}>{s.name}</span>
                      <span style={{ fontSize: "13px", color: "#64748B" }}>{s.nameAr}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748B" }}>{s.desc}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: scale === s.key ? "#14B8A6" : "#475569", fontFamily: "'Space Mono', monospace" }}>{s.range}</div>
                    <div style={{ fontSize: "11px", color: "#475569" }}>employees</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
              <button className="next-btn" disabled={!scale} onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Select Country */}
        {step === 3 && (
          <div className="fade-in">
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-1px", marginBottom: "8px" }}>
                Where are you <span style={{ color: "#14B8A6" }}>located</span>?
              </h1>
              <p style={{ color: "#64748B", fontSize: "15px" }}>
                {selectedSector?.icon} {selectedSector?.name} · {selectedScale?.name} ({selectedScale?.range} employees)
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "32px" }}>
              {COUNTRIES.map(c => (
                <div
                  key={c.code}
                  className={`country-card ${country === c.code ? "selected" : ""}`}
                  onClick={() => setCountry(c.code)}
                >
                  <span style={{ fontSize: "24px" }}>{c.flag}</span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: country === c.code ? "#14B8A6" : "#E2E8F0" }}>{c.name}</div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>{c.nameAr}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary before generation */}
            {country && (
              <div style={{ background: "#111827", border: "1px solid #1E293B", borderRadius: "16px", padding: "20px", marginBottom: "24px", animation: "fadeUp .4s ease-out" }}>
                <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "8px", fontWeight: 500 }}>AI will generate:</div>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  <div><span style={{ color: "#14B8A6", fontWeight: 700, fontSize: "20px", fontFamily: "'Space Mono'" }}>{selectedSector?.modules}</span><span style={{ color: "#64748B", fontSize: "12px", marginLeft: "4px" }}>modules</span></div>
                  <div><span style={{ color: "#14B8A6", fontWeight: 700, fontSize: "20px", fontFamily: "'Space Mono'" }}>150+</span><span style={{ color: "#64748B", fontSize: "12px", marginLeft: "4px" }}>accounts</span></div>
                  <div><span style={{ color: "#14B8A6", fontWeight: 700, fontSize: "20px", fontFamily: "'Space Mono'" }}>12+</span><span style={{ color: "#64748B", fontSize: "12px", marginLeft: "4px" }}>flowcharts</span></div>
                  <div><span style={{ color: "#14B8A6", fontWeight: 700, fontSize: "20px", fontFamily: "'Space Mono'" }}>8+</span><span style={{ color: "#64748B", fontSize: "12px", marginLeft: "4px" }}>reports</span></div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
              <button className="next-btn" disabled={!country} onClick={startGeneration}>
                Generate my ERP →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: AI Generating */}
        {step === 4 && !genDone && (
          <div className="fade-in" style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>{selectedSector?.icon}</div>
              <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-1px", marginBottom: "8px" }}>
                Building your <span style={{ color: "#14B8A6" }}>{selectedSector?.name}</span> ERP
              </h1>
              <p style={{ color: "#64748B", fontSize: "14px" }}>AI is generating your complete system...</p>
            </div>

            <div>
              {GENERATION_STEPS.map((gs, i) => (
                <div key={i} className="gen-step" style={{ opacity: i <= genStep ? 1 : 0.3, transition: "opacity .3s" }}>
                  <div className={`gen-dot ${i < genStep ? "gen-done" : i === genStep ? "gen-active" : "gen-waiting"}`}>
                    {i < genStep ? "✓" : i === genStep ? <div className="spinner" /> : ""}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: i <= genStep ? 500 : 400, color: i < genStep ? "#14B8A6" : i === genStep ? "#E2E8F0" : "#475569" }}>
                      {gs.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "#475569" }}>{gs.labelAr}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(genStep / GENERATION_STEPS.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* STEP 5: Done */}
        {step === 4 && genDone && (
          <div className="fade-in" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div className="success-box">
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
              <h1 style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-1px", marginBottom: "8px" }}>
                Your ERP is ready!
              </h1>
              <p style={{ color: "#64748B", fontSize: "15px", marginBottom: "24px" }}>
                {selectedSector?.icon} {selectedSector?.name} · {selectedScale?.name} · {COUNTRIES.find(c => c.code === country)?.flag} {COUNTRIES.find(c => c.code === country)?.name}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "28px", textAlign: "left" }}>
                {[
                  { label: "Chart of accounts", value: "156 accounts", done: true },
                  { label: "Modules activated", value: `${selectedSector?.modules} modules`, done: true },
                  { label: "Flowcharts generated", value: "14 processes", done: true },
                  { label: "Report templates", value: "9 reports", done: true },
                  { label: "Workflow rules", value: "23 rules", done: true },
                  { label: "Training paths", value: "5 paths", done: true },
                ].map((item, i) => (
                  <div key={i} style={{ background: "#111827", borderRadius: "10px", padding: "12px", border: "1px solid #1E293B" }}>
                    <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>{item.label}</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#14B8A6", fontFamily: "'Space Mono', monospace" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <button className="next-btn" onClick={() => window.location.href = "/dashboard"}>
                Open Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
