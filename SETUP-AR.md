# 🚀 RSL-AI — دليل الإعداد والنشر الكامل

منصة AI RSL تجمع **عرض المستثمرين** + **نظام ERP حقيقي** في مكان واحد.

---

## 🏗️ بنية المشروع

```
rsl-ai-platform/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← صفحة الهبوط (الدخول)
│   │   ├── investor/             ← داشبورد المستثمرين
│   │   ├── erp/                  ← نظام ERP الحقيقي
│   │   │   ├── accounts/         ← دليل الحسابات
│   │   │   └── journal-entries/  ← القيود اليومية
│   │   ├── admin/                ← لوحة تتبع الزوار
│   │   └── api/                  ← كل الـ APIs
│   ├── components/
│   └── lib/
│       └── db.ts                 ← قاعدة البيانات + Auth
├── prisma/
│   ├── schema.prisma             ← نموذج قاعدة البيانات
│   └── seed.ts                   ← البيانات الأولية
├── scripts/
│   └── deploy.bat                ← نشر بنقرة واحدة
├── Dockerfile                    ← لـ Cloud Run
├── cloudbuild.yaml               ← النشر التلقائي
└── docker-compose.yml            ← PostgreSQL للتطوير
```

---

## 📦 الإعداد الأولي (مرة واحدة — 30 دقيقة)

### الخطوة 1: تثبيت المتطلبات

على جهازك (Windows):
- **Node.js 20+** — https://nodejs.org
- **Docker Desktop** — https://docker.com (للـ PostgreSQL المحلي)
- **Git** (عندك بالفعل)
- **gcloud CLI** — https://cloud.google.com/sdk/docs/install

### الخطوة 2: تثبيت حزم المشروع

افتح PowerShell في مجلد `D:\Ai-RSL-platform`:

```powershell
npm install
```

### الخطوة 3: تشغيل PostgreSQL محلياً

```powershell
docker-compose up -d
```

سيُشغّل PostgreSQL على المنفذ 5432.

### الخطوة 4: إنشاء ملف البيئة

```powershell
copy .env.example .env
```

افتح `.env` وعدّل `JWT_SECRET` لسلسلة عشوائية طويلة (32+ حرف).

### الخطوة 5: إنشاء قاعدة البيانات

```powershell
npm run db:push
npm run db:seed
```

هذا ينشئ كل الجداول ويضيف:
- مستخدم Admin افتراضي: `admin@rsl-ai.com` / `RSL-Admin-2026`
- 10 حسابات محاسبية عراقية للاختبار
- فئات ووحدات قياس أولية

### الخطوة 6: تشغيل المشروع محلياً

```powershell
npm run dev
```

افتح http://localhost:3000

**جرّب:**
- دخول المستثمرين بكلمة السر: `RSL2026`
- دخول الموظفين: `admin@rsl-ai.com` / `RSL-Admin-2026`

---

## ☁️ النشر على Google Cloud

### الخطوة 1: تجهيز Google Cloud (مرة واحدة)

```powershell
# سجّل الدخول
gcloud auth login

# أنشئ أو اختر مشروعاً
gcloud projects create rsl-ai-prod --name="RSL-AI Production"
gcloud config set project rsl-ai-prod
gcloud config set run/region me-central1

# فعّل الخدمات
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

**⚠️ اربط الفوترة بالمشروع** من https://console.cloud.google.com/billing

### الخطوة 2: إنشاء قاعدة البيانات الإنتاجية (Cloud SQL)

```powershell
gcloud sql instances create rsl-db --database-version=POSTGRES_16 --tier=db-f1-micro --region=me-central1 --root-password=CHOOSE_STRONG_PASSWORD

gcloud sql databases create rsl_ai --instance=rsl-db
```

### الخطوة 3: إنشاء الأسرار

```powershell
# سر قاعدة البيانات
echo "postgresql://postgres:YOUR_PASSWORD@/rsl_ai?host=/cloudsql/PROJECT_ID:me-central1:rsl-db" | gcloud secrets create database-url --data-file=-

# سر JWT
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > jwt.tmp
gcloud secrets create jwt-secret --data-file=jwt.tmp
del jwt.tmp

# كلمة سر المستثمرين
echo "RSL2026" | gcloud secrets create investor-password --data-file=-
```

### الخطوة 4: ربط GitHub بـ Cloud Build

1. افتح https://console.cloud.google.com/cloud-build/triggers
2. اضغط **Connect Repository**
3. اختر GitHub → سجّل الدخول → اختر `Ai-RSL-platform`
4. أنشئ Trigger:
   - **Name**: `auto-deploy`
   - **Event**: Push to a branch
   - **Branch**: `^main$`
   - **Configuration**: Cloud Build file (`cloudbuild.yaml`)

### الخطوة 5: ربط الدومين `rsl-ai.com`

بعد أول نشر ناجح:

```powershell
gcloud run domain-mappings create --service=rsl-ai --domain=rsl-ai.com --region=me-central1
```

أضف سجلات DNS التي يعطيها لك Google في لوحة تحكم الدومين.

---

## 🔄 دورة العمل اليومية

بعد الإعداد، كل ما تحتاجه:

### عندي (في محادثاتنا):
أعطيك كود جديد / تحديثات.

### عندك:
1. ضع الملفات الجديدة في المجلد
2. انقر نقرتين على `scripts\deploy.bat`
3. أدخل رسالة الـ commit
4. انتهى — Google Cloud يبني وينشر تلقائياً

### النتيجة:
- خلال 5-10 دقائق، التحديث على https://rsl-ai.com
- تفحصه من أي مكان في العالم
- المستثمرون يرون أحدث نسخة دائماً

---

## 🔐 كلمات السر الافتراضية (غيّرها في الإنتاج)

| ماذا | القيمة |
|------|--------|
| دخول المستثمرين | `RSL2026` |
| Admin ERP | `admin@rsl-ai.com` / `RSL-Admin-2026` |

### تغيير كلمة سر المستثمرين في الإنتاج:

```powershell
echo "YourNewPassword2026" | gcloud secrets versions add investor-password --data-file=-
```

Cloud Run سيستخدمها عند النشر التالي.

---

## 💰 التكلفة المتوقعة

| الخدمة | التكلفة الشهرية |
|--------|---------------|
| Cloud Run (< 1K زيارة/يوم) | ~$3-5 |
| Cloud SQL (db-f1-micro) | ~$10-15 |
| Cloud Build | مجاني (120 min/يوم) |
| Secret Manager | مجاني (6 أسرار) |
| **المجموع** | **~$15-20/شهر** |

كل هذا من رصيد الـ $200K — لن تدفع شيئاً لسنوات.

---

## 📋 قائمة مرجعية

### الإعداد الأولي
- [ ] تثبيت Node.js + Docker + Git
- [ ] `npm install`
- [ ] `docker-compose up -d`
- [ ] `npm run db:push && npm run db:seed`
- [ ] `npm run dev` → localhost:3000
- [ ] جرّب الدخول

### النشر
- [ ] إنشاء Google Cloud project
- [ ] إنشاء Cloud SQL
- [ ] إنشاء Secrets
- [ ] ربط GitHub بـ Cloud Build
- [ ] أول `git push` → أول نشر
- [ ] شراء `rsl-ai.com` وربطه

### يومياً
- [ ] تشغيل `scripts\deploy.bat` لأي تحديث

---

## 🆘 حل المشاكل الشائعة

**المشكلة: `npm install` يفشل**
تأكد من Node.js 20+. استخدم `node --version`.

**المشكلة: Docker لا يعمل**
شغّل Docker Desktop أولاً قبل `docker-compose`.

**المشكلة: خطأ Prisma "database not found"**
شغّل: `npm run db:push` لإنشاء الجداول.

**المشكلة: `git push` يطلب كلمة سر**
استخدم Personal Access Token من https://github.com/settings/tokens

**المشكلة: Cloud Build يفشل**
افتح https://console.cloud.google.com/cloud-build/builds لرؤية سبب الخطأ.

---

## 📞 التواصل

إذا واجهت مشكلة، أخبرني بالخطأ بالضبط (انسخ الرسالة) وسأساعدك.

🚀 **بالتوفيق!**
