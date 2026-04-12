# AI RSL Platform

AI-Powered Universal ERP — Every sector, every scale, fully AI-driven.

## Quick Start (5 minutes)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or use Docker)
- Claude API key from [console.anthropic.com](https://console.anthropic.com)

### Step 1: Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/ai-rsl-platform.git
cd ai-rsl-platform
npm install
```

### Step 2: Set up environment
```bash
cp .env.example .env
# Edit .env with your database URL and API keys
```

### Step 3: Start database (Docker)
```bash
docker compose up db -d
```

### Step 4: Initialize database
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### Step 5: Run the app
```bash
npm run dev
# Open http://localhost:3000
```

## Push to GitHub (3 commands)

```bash
git init
git add .
git commit -m "Initial commit: AI RSL Platform skeleton"
git remote add origin https://github.com/YOUR_USERNAME/ai-rsl-platform.git
git push -u origin main
```

## Deploy to Google Cloud

### One-time setup
1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Cloud Run, Cloud SQL, and Container Registry APIs
3. Create a Cloud SQL PostgreSQL instance
4. Create a service account with Cloud Run Admin + Cloud SQL Client roles
5. Add these GitHub Secrets:
   - `GCP_PROJECT_ID` — your project ID
   - `GCP_SA_KEY` — service account JSON key
   - `DATABASE_URL` — Cloud SQL connection string
   - `ANTHROPIC_API_KEY` — your Claude API key
   - `NEXTAUTH_SECRET` — random secret string

### Auto-deploy
After setup, every push to `main` branch automatically deploys to Google Cloud via GitHub Actions.

## Project Structure

```
ai-rsl-platform/
├── .github/workflows/    # CI/CD pipeline
├── prisma/
│   └── schema.prisma     # Database schema (25+ tables)
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # React components
│   ├── lib/
│   │   ├── ai.ts         # AI engine (Claude API wrapper)
│   │   └── db.ts         # Database client
│   ├── config/
│   │   └── sectors.ts    # 24 sector definitions
│   └── types/            # TypeScript types
├── Dockerfile            # Production container
├── docker-compose.yml    # Local development
└── package.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Next.js API Routes, Node.js |
| Database | PostgreSQL 16 via Prisma ORM |
| AI Engine | Claude API (Anthropic) |
| Auth | NextAuth.js |
| Deployment | Google Cloud Run |
| CI/CD | GitHub Actions |
| Container | Docker |

## Database Schema

25+ tables covering:
- Multi-tenancy (organizations, users, modules)
- Accounting (accounts, journal entries, fiscal periods, cost centers)
- Contacts (customers, vendors)
- Inventory (products, warehouses, stock movements)
- Sales (invoices, invoice lines)
- Procurement (purchase orders)
- HR (departments, employees)
- AI Training (training paths, progress tracking)
- AI Evaluation (evaluation cycles, performance reviews)
- Workflows & Flowcharts (AI-generated process maps)
- Audit (complete audit trail with change tracking)

## License

Proprietary — All rights reserved.
