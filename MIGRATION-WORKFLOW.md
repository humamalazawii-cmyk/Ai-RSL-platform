# Migration Workflow

## Prerequisites
- Cloud SQL Auth Proxy access
- DATABASE_URL from Secret Manager

## Steps for Schema Changes

### 1. Edit schema
Edit `prisma/schema.prisma` with your changes.

### 2. Start Cloud SQL Auth Proxy
```bash
cloud-sql-proxy --port 5433 "rsl-sys:me-central1:rsl-db" > /tmp/proxy.log 2>&1 &
sleep 3
```

### 3. Set DATABASE_URL for local migrations
```bash
export DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url | python3 -c "
import sys
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

url = sys.stdin.read().strip()
parsed = urlparse(url)
qs = parse_qs(parsed.query)
qs.pop('host', None)
qs['sslmode'] = ['disable']
new_query = urlencode({k: v[0] for k, v in qs.items()})
new_netloc = f'{parsed.username}:{parsed.password}@127.0.0.1:5433'
print(urlunparse((parsed.scheme, new_netloc, parsed.path, '', new_query, '')))
")
```

### 4. Backup database
```bash
pg_dump "$DATABASE_URL" --no-owner --no-acl > "/tmp/backup-$(date +%Y%m%d-%H%M%S).sql"
```

### 5. Create migration (review SQL before applying!)
```bash
npx prisma migrate dev --name descriptive_name --create-only
cat prisma/migrations/*_descriptive_name/migration.sql  # review
```

### 6. Check for dangerous operations
```bash
grep -E "^DROP|DROP TABLE|DROP COLUMN" prisma/migrations/*/migration.sql
```

### 7. Apply migration
```bash
npx prisma migrate deploy
```

### 8. Verify
```bash
psql "$DATABASE_URL" -c '\dt'
```

### 9. Commit and push
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): describe your change"
git push origin main
```

### 10. Clean up
```bash
unset DATABASE_URL
pkill -f cloud-sql-proxy
```

## Why not run migrate deploy in build script?
Cloud Build doesn't have DATABASE_URL access (secrets are runtime-only).
Migrations must be applied manually before pushing schema changes.

## Rollback procedure
1. Identify last good revision: `gcloud run revisions list --service=rsl-ai --region=me-central1`
2. Route traffic: `gcloud run services update-traffic rsl-ai --region=me-central1 --to-revisions=REVISION=100`
3. Restore DB if needed: `psql "$DATABASE_URL" < /tmp/backup-YYYYMMDD.sql`

