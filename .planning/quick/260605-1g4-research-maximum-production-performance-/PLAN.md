---
quick_id: 260605-1g4
slug: research-maximum-production-performance-
status: complete
created: 2026-06-05T04:10:00.000Z
---

# Research Maximum Production Performance

## Goal

Create the execution plan for maximum production performance and security hardening on the current QUEUE/2 stack, without falsely closing Phase 03.3.

## Plan

### P0 - Evidence And Runtime Baseline

- Add `E2E_PHASE3_3_CATALOG_QUERY` and `E2E_PHASE3_3_GAME_SLUG` to `.env.example`.
- Configure real preview/production values for:
  - `E2E_BASE_URL`
  - ready duo user and partner credentials
  - other-duo credentials
  - Phase 03.3 catalog query and game slug
- Record actual Vercel Function region, Neon compute region, Neon scale-to-zero setting and whether `DATABASE_URL` is pooled.
- Run `pnpm phase:03.3:gate` against preview/production.
- Keep Phase 03.3 blocked unless the browser performance/accessibility step runs rather than skips.

### P1 - Auth And Session Latency

- Change the auth/session contract so normal page rendering can use Better Auth's short signed cookie cache.
- Add an explicit authoritative session helper for:
  - server actions that mutate duo/account/security state;
  - profile session management;
  - logout/revoke/email/password flows;
  - any operation where session revocation freshness matters.
- Reduce cookie cache max age if needed for security posture, then document the tradeoff.
- Lazy-initialize Better Auth runtime DB/pool where practical.
- Evaluate `better-auth/minimal` with the Drizzle adapter and keep it only if tests prove equivalent behavior.
- Update focused auth/security tests to assert both fast page reads and authoritative sensitive checks.

### P1 - Database Hot Paths

- Add server timing coverage to `/app` and `/app/jogo/[slug]`.
- Review these routes with production-like fixtures:
  - `/app`
  - `/app/catalogo`
  - `/app/biblioteca`
  - `/app/descobrir`
  - `/app/jogo/[slug]`
- Consolidate avoidable query waterfalls in dashboard, catalog status hydration, library queue and discovery state reads.
- Replace catalog/library substring search bottlenecks with `pg_trgm` indexes or a search-vector design.
- Add representative `EXPLAIN (ANALYZE, BUFFERS)` evidence after each query/index change.

### P1 - Next/Vercel Runtime And Client Performance

- Set function region policy close to Neon and document why that region was chosen.
- Add bundle analysis for critical routes and establish route JS budgets.
- Push `use client` boundaries down where bundle analysis shows avoidable client JS.
- Decide on `next/font/local` vs system fonts; avoid remote font dependencies under the current CSP.
- Tune Next Image config with stricter `remotePatterns`, allowed formats/qualities and cache TTL after checking RAWG image behavior.
- Add shared cache only for catalog/public-safe data with tag revalidation. Keep duo-private data uncached/shared-no-store.

### P1 - Security Hardening

- Evaluate CSP nonce/SRI path and remove production script `unsafe-inline` only after testing Next rendering/performance implications.
- Add Vercel Firewall/WAF rate-limit rules for expensive and sensitive endpoints:
  - `/api/auth/*`
  - `/api/discovery/search`
  - `/api/jobs/catalog/refresh`
  - `/api/performance/web-vitals`
- Keep app/database rate limits as authoritative checks; WAF is only a prefilter.
- Restrict Better Auth trusted IP headers to the real proxy chain.
- Capture ASVS Level 2 evidence for auth, session, access control, logging, secrets, headers and RLS.

### P2 - Ongoing Scale Work

- Add Vercel Speed Insights and Observability review to release routine.
- Add slow-query and function-latency review before every phase closure that changes hot paths.
- Consider read replicas, queue workers or more aggressive caching only after traces show they solve measured bottlenecks.

## Definition Of Done

- Phase 03.3 has a non-skipped browser performance/accessibility run against preview or production.
- Production/preview baselines record client timing, server timing and function metrics.
- Auth/session changes preserve secure mutations and have tests for cached and authoritative paths.
- RLS and least-privileged DB access are unchanged or stronger.
- Security headers/WAF/rate limits are documented with evidence, not assumptions.

