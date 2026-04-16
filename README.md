# RSL-AI — Alrafdain Smart Life Platform

منصة إدارة أعمال ذكية تجمع عرض المستثمرين + نظام ERP الحقيقي في مكان واحد.

## Quick Start

```powershell
npm install
docker-compose up -d
copy .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

افتح http://localhost:3000

## Deploy

```powershell
scripts\deploy.bat
```

## Documentation

راجع [SETUP-AR.md](./SETUP-AR.md) للدليل الكامل.

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS (RTL)
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL 16
- **Auth**: JWT + bcrypt
- **Deploy**: Google Cloud Run + Cloud SQL + Cloud Build

## Default Credentials (CHANGE IN PRODUCTION)

- Investor: `RSL2026`
- Admin: `admin@rsl-ai.com` / `RSL-Admin-2026`

© 2026 RSL-AI — معلومات سرية
