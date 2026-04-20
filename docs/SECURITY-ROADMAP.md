# Security Roadmap — RSL-AI Platform

> **هذا الملف:** الاستراتيجية طويلة المدى للأمان في RSL-AI.
> يصف نموذج العمل (Tiered Security) كيف تُباع ميزات الأمان للعملاء حسب احتياجهم.
>
> **ملاحظة:** هذا ملف **استراتيجي** — مختلف عن `SECURITY-TODO.md` الذي يتتبع CVEs والثغرات التقنية.

---

## 🎯 الفلسفة

```
كل عميل = مؤسسة منفصلة (Organization) في DB
كل مؤسسة تختار مستوى الأمان حسب احتياجها وتدفع وفقاً لذلك
```

هذا النموذج يستخدمه: Salesforce, Notion, Slack, GitHub, Auth0, AWS.

### الفوائد التجارية
1. **تسعير ذكي:** عميل صغير يدفع $0، عميل كبير يدفع $200+
2. **Upsell طبيعي:** ابدأ Basic → بعد سنة يحتاج MFA → ترقية
3. **Differentiation:** نتفوق على المنافسين بدعم Enterprise
4. **Compliance:** شركات كثيرة تحتاج SOC2/ISO — تدفع
5. **Recurring revenue:** دخل شهري ثابت ومضمون

---

## 🔐 المستويات الأربعة (Tiers)

### 🟢 Basic — أساسي ($0/mo)

**الميزات:**
- Email + Password authentication
- Password policy enforcement (12+ chars, mixed case, etc.)
- Rate limiting (Upstash Redis)
- Account lockout بعد محاولات فاشلة
- Audit logging كامل
- Forgot password (email reset via Resend)

**العميل المثالي:**
- متاجر صغيرة
- أعمال شخصية
- اختبار المنصة

**الحالة الحالية:** ✅ **مكتمل** (Phases 1, 2, 2C)

---

### 🟡 Professional — احترافي ($15/mo)

**الميزات الإضافية:**
- ⏳ MFA اختياري (Google Authenticator/TOTP)
- ⏳ Login history للمستخدم نفسه (يشوف آخر دخول)
- ⏳ Email alerts للنشاط المريب
- ⏳ Session timeout قابل للتخصيص (1h - 24h)
- ⏳ MFA backup codes

**العميل المثالي:**
- شركات متوسطة (10-50 موظف)
- مكاتب محاسبة
- عيادات طبية
- مكاتب محاماة

**Phases المطلوبة:** 3, 4

---

### 🟠 Business — تجاري ($50/mo)

**الميزات الإضافية:**
- ⏳ MFA إجباري لكل المستخدمين
- ⏳ MFA grace period (يعطي المستخدم X يوم لتفعيله)
- ⏳ IP Whitelisting (شبكة المكتب فقط)
- ⏳ Login history للمدراء (يشوفون نشاط الكل)
- ⏳ Force password change كل X يوم
- ⏳ Suspicious activity alerts (Email + SMS)
- ⏳ Detailed audit reports (export to CSV/PDF)

**العميل المثالي:**
- شركات كبيرة (50-500 موظف)
- مؤسسات حكومية
- شركات حسابات محترفة

**Phases المطلوبة:** 5, 6, 7

---

### 🔴 Enterprise — مؤسسي ($200+/mo)

**الميزات الإضافية:**
- ⏳ SSO (Single Sign-On) — SAML 2.0
- ⏳ OAuth integrations (Google, Microsoft, Okta)
- ⏳ Active Directory integration
- ⏳ Geo-restrictions (الدخول من دول محددة فقط)
- ⏳ Device management (أجهزة مسجّلة فقط)
- ⏳ Hardware security keys (YubiKey, Titan)
- ⏳ SOC2 compliance reports
- ⏳ Dedicated audit log export
- ⏳ Custom security policies per role
- ⏳ Penetration testing reports

**العميل المثالي:**
- بنوك
- شركات تأمين
- مؤسسات حكومية حساسة
- شركات تتعامل ببيانات سرية

**Phases المطلوبة:** 8, 9, 10

---

## 🏗️ التصميم التقني

### Database Model

```typescript
model Organization {
  id              String   @id @default(cuid())
  name            String
  // ... existing fields
  securityPolicy  SecurityPolicy?
}

model SecurityPolicy {
  id              String   @id @default(cuid())
  organizationId  String   @unique
  organization    Organization @relation(fields: [organizationId], references: [id])

  // Tier
  tier            SecurityTier @default(BASIC)

  // MFA
  mfaRequired     Boolean  @default(false)
  mfaGracePeriodDays Int?

  // IP Restrictions
  ipWhitelist     String[] @default([])

  // Geo
  allowedCountries String[] @default([])

  // Sessions
  sessionTimeoutMinutes Int @default(480)

  // Password
  passwordExpiryDays Int?

  // Notifications
  alertOnNewDevice Boolean @default(false)
  alertOnNewIp     Boolean @default(false)
  alertEmail       String?

  // SSO (Enterprise)
  ssoEnabled       Boolean @default(false)
  ssoProvider      String?
  ssoConfig        Json?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum SecurityTier {
  BASIC
  PROFESSIONAL
  BUSINESS
  ENTERPRISE
}
```

### Middleware Flow

```
كل request:
  1. Identify user + organization
  2. Load SecurityPolicy for org
  3. Check IP whitelist (if any)
  4. Check geo (if any)
  5. Verify MFA (if required and not present)
  6. Verify session timeout
  7. Allow / Deny / Challenge MFA
```

---

## 📅 خطة التنفيذ

### المرحلة الحالية (الأشهر 1-3)

- [x] **Phase 1+2+2C:** Basic Tier (مكتمل)
- [ ] **Phase 3:** Login History UI
- [ ] **Phase 4:** MFA implementation (يفعّل Professional)
- [ ] **SecurityPolicy model:** الأساس لكل المستويات
- [ ] **Settings UI:** صفحة لإدارة السياسة

### المرحلة المتوسطة (الأشهر 3-6 — قبل الإطلاق)

- [ ] **Phase 5:** IP Whitelisting (يفعّل Business)
- [ ] **Phase 6:** Email/SMS alerts
- [ ] **Phase 7:** Force password change policy
- [ ] **Admin dashboard:** للمدراء يديرون الأمان
- [ ] **Audit reports:** Export CSV/PDF

### المرحلة المتقدمة (بعد الإطلاق — حسب طلب العملاء)

- [ ] **Phase 8:** SSO (SAML/OAuth)
- [ ] **Phase 9:** Geo-restrictions
- [ ] **Phase 10:** Hardware keys
- [ ] **Compliance:** SOC2 audit prep

---

## 💰 نموذج التسعير

### الافتراضات
- العملة: USD أو IQD equivalent
- الفوترة: شهرية أو سنوية (خصم 20% للسنوي)
- الـ Free Trial: 14 يوم لكل tier
- Per-user pricing بعد عدد محدد

### السعر للمستخدم الواحد

| Tier | شهري | سنوي (15% خصم) | حد المستخدمين |
|---|---|---|---|
| Basic | $0 | $0 | حتى 5 |
| Professional | $15 | $153 | حتى 25 |
| Business | $50 | $510 | حتى 100 |
| Enterprise | $200+ | Custom | غير محدود |

### Add-ons (إضافات اختيارية)

- **Priority support:** +$50/mo
- **Custom integrations:** +$100/mo
- **Dedicated account manager:** +$300/mo
- **On-premise deployment:** Custom pricing

---

## 🎯 KPIs للقياس

### للأمان
- نسبة المستخدمين بـ MFA مفعّل
- عدد محاولات الدخول الفاشلة
- متوسط الوقت لكشف نشاط مريب
- عدد الحسابات المقفلة (account lockouts)

### للأعمال
- نسبة العملاء في كل tier
- معدل الترقية من Basic → Professional → Business
- متوسط الإيرادات لكل عميل (ARPU)
- معدل الاحتفاظ بالعملاء (retention)

---

## ⚠️ اعتبارات مهمة

### Privacy & Compliance
- **GDPR:** للعملاء الأوروبيين — حق نسيان البيانات
- **HIPAA:** للعيادات الطبية — تشفير قوي مطلوب
- **PCI DSS:** لو نتعامل مع بطاقات الدفع
- **محلياً (العراق):** قوانين حماية البيانات (إن وُجدت)

### Performance
- IP checks لازم تكون سريعة (cache مع Redis)
- Geo lookup يستخدم MaxMind GeoIP2 (offline DB)
- MFA checks ما تأخر الـ login أكثر من 1s

### Backwards Compatibility
- العملاء الحاليين (Basic) ما يلزمهم تحديث
- الترقية تكون تلقائية بدون فقدان بيانات
- الاسترداد للأسفل (downgrade) متاح بسلاسة

---

## 🔗 ملفات مرتبطة

- `SESSION-LOG.md` — سجل الجلسات والتقدم اليومي
- `SECURITY-TODO.md` — CVEs والثغرات التقنية
- `MIGRATION-WORKFLOW.md` — كيفية تطبيق DB migrations
- `prisma/schema.prisma` — Database schema الحالي

---

**Last updated:** 2026-04-20
**Author:** Humam Al-Azzawi
**Status:** Strategic vision — implementation in progress