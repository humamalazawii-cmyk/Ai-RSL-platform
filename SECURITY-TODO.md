# Security TODOs

Tracking known security items that are accepted or deferred.

## Pending — Requires Next.js 16 Major Upgrade

Deferred because they require breaking changes (Next.js 16 + React 19).
Most are DoS-related and partially mitigated by our Phase 1 rate limiting.

| # | CVE | Severity | Status | Notes |
|---|-----|----------|--------|-------|
| 1 | [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) | high | N/A | DoS via `next/image` remotePatterns — not using remotePatterns |
| 2 | [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) | high | open | HTTP deserialization DoS with React Server Components |
| 3 | [GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) | high | N/A | HTTP request smuggling in rewrites — not using rewrites |
| 4 | [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) | high | N/A | `next/image` disk cache growth — not using `next/image` on Cloud Run |
| 5 | [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) | high | open | DoS with Server Components |

## Resolved in Previous Upgrades

- Next.js 14.2.15 → 14.2.35 patched 12 CVEs including:
  - Authorization Bypass in Middleware (critical)
  - Content Injection for Image Optimization
  - Cache Poisoning via Race Condition
  - SSRF via Middleware Redirect Handling

## Mitigations in Place

- Rate limiting (Upstash) — Phase 1 — protects against DoS scenarios
- Audit logging — Phase 1 — detects suspicious activity
- Password policy enforcement — Phase 1
- MFA (planned) — Phase 4

## Scheduled Upgrades

### Next.js 16 Upgrade
Scheduled as separate project after Phase 4 completion.
Requires:
- React 19 migration
- App Router breaking changes review
- Caching API migration
- Full regression testing
Estimated effort: 1-2 weeks.
