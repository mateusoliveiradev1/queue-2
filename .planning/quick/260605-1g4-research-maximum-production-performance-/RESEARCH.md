---
quick_id: 260605-1g4
slug: research-maximum-production-performance-
status: complete
created: 2026-06-05T04:10:00.000Z
scope: production-performance-security-research
---

# Maximum Performance And Security Research

## Goal

Research the current QUEUE/2 stack deeply enough to decide the next performance/security hardening work before Phase 03.3 is treated as complete.

The stack in scope is Next.js 16 App Router, React 19, Vercel Functions/CDN/Firewall/Observability, Neon Postgres, Better Auth self-hosted, Drizzle/pg, pnpm workspaces and Turborepo.

## Official Sources Consulted

- Next.js production checklist: https://nextjs.org/docs/pages/guides/production-checklist
- Next.js App Router caching model: https://nextjs.org/docs/app/guides/caching-without-cache-components
- Next.js route segment config: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
- Next.js Content Security Policy guide: https://nextjs.org/docs/app/guides/content-security-policy
- Next.js Image component/config: https://nextjs.org/docs/app/api-reference/components/image
- Better Auth performance guide: https://better-auth.com/docs/guides/optimizing-for-performance
- Better Auth security reference: https://better-auth.com/docs/reference/security
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Neon scale to zero: https://neon.com/docs/introduction/scale-to-zero
- Vercel Function regions: https://vercel.com/docs/functions/configuring-functions/region
- Vercel Observability Insights: https://vercel.com/docs/observability/insights
- Vercel Speed Insights: https://vercel.com/docs/speed-insights
- Vercel Firewall and WAF rate limiting: https://vercel.com/docs/vercel-firewall and https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- PostgreSQL row-level security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/

## Executive Findings

- Phase 03.3 must stay blocked. `.planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-PERFORMANCE-REVIEW.md` is `BLOCKED - missing fixture evidence`, and there is no production/preview route timing evidence yet.
- The highest-probability latency source is server request work, not only client UI. `apps/web/src/platform/auth/session.ts` forces `disableCookieCache: true` for every `getCurrentSession()`, even though Better Auth cookie cache is configured. That makes normal authenticated page rendering hit the auth database path on nearly every request.
- This session-cache optimization must be security-aware. Read-only page rendering can use short signed cookie cache, but sensitive mutations and account/security screens need an authoritative no-cache session path before writes or revocation-sensitive operations.
- Runtime locality is a P0 performance variable. Vercel Functions should execute close to the Neon compute because authenticated App Router pages do multiple server-to-database roundtrips before rendering.
- Neon scale-to-zero is incompatible with judging production latency unless the production compute intentionally accepts wake-up cost. For launch-quality evidence, production should use an always-active compute or the baseline must explicitly include cold-start/wake-up measurements.
- The runtime database URL already documents a pooled, least-privileged Neon URL in `.env.example`. Keep that boundary. Do not replace RLS/server authorization with client-side or direct browser data access for speed.
- `apps/web/next.config.ts` allows RAWG image hosts but does not yet tune image cache TTL/formats or restrict paths/search. Next docs recommend being specific with remote image patterns.
- Production CSP is strong in several places but still has `script-src 'self' 'unsafe-inline'`. Next supports nonce/SRI approaches, but nonces force dynamic rendering and have performance tradeoffs. Treat CSP hardening as measured security work, not a blind toggle.
- Query review passed for current fixtures, but catalog/library search still uses `ILIKE '%' || query || '%'`. Normal btree indexes do not fully solve substring search at scale; plan `pg_trgm` or a proper search vector before large catalog data.
- Several hot routes have useful `Server-Timing` labels, but `/app` and `/app/jogo/[slug]` should get the same coverage so production traces can isolate auth, duo, catalog, library and render time consistently.
- `.env.example` does not document `E2E_PHASE3_3_CATALOG_QUERY` or `E2E_PHASE3_3_GAME_SLUG`, while the Phase 03.3 gate requires them. This is a P0 evidence blocker.

## Non-Negotiables

- No shared CDN/cache for duo-private state.
- No client-side authority for duo progress, matches, XP, status changes or account/session security.
- No weakening of forced RLS, transaction-local `queue2.user_id`, least-privileged runtime role or server-mediated writes.
- No secrets in browser bundles, telemetry payloads, logs or planning artifacts.
- No performance pass without production/preview evidence from authenticated ready-duo, partner and other-duo fixtures.

## Priority Matrix

| Priority | Work | Why It Matters |
|----------|------|----------------|
| P0 | Capture real Phase 03.3 production/preview evidence | Local checks and query review are not enough to explain production slowness. |
| P0 | Add missing Phase 03.3 fixture env names to `.env.example` | The team currently lacks the documented variables required to unblock the gate. |
| P0 | Verify Vercel Function region against Neon compute region | Server-rendered authenticated pages pay network latency for every DB roundtrip. |
| P0 | Decide production Neon scale-to-zero policy | Scale-to-zero wake-up can dominate first request latency and distort performance evidence. |
| P0 | Enable Vercel Speed Insights/Observability and keep custom Web Vitals | RUM and function route metrics are needed to separate client, server and upstream latency. |
| P1 | Split cached session reads from authoritative session checks | Biggest likely latency win while preserving secure writes/revocation-sensitive checks. |
| P1 | Lazy-initialize auth/db clients where possible | Avoid build/import-time env coupling and reduce accidental runtime work. |
| P1 | Consolidate hot-route DB roundtrips | Fewer transactions/queries usually beats more `Promise.all`, especially on a single pg client. |
| P1 | Add catalog search index strategy (`pg_trgm` or search vector) | Prevent substring search from becoming the next production bottleneck. |
| P1 | Add full server timing coverage for `/app` and game detail | Production traces need the same labels across all critical routes. |
| P1 | Tighten CSP with nonce/SRI evaluation | Improves XSS defense, but must account for dynamic rendering and static-cache impact. |
| P1 | Add Vercel Firewall/WAF prefilters | Keep malformed/high-volume traffic away from expensive auth, DB and RAWG paths. |
| P2 | Bundle analysis and route JS budgets | Prevent Motion/client components/action sheets from inflating first interaction cost. |
| P2 | Self-host fonts with `next/font/local` or commit to system fonts | Prevent invisible fallback/CLS surprises while keeping CSP closed to remote fonts. |
| P2 | Tune Next Image config | Better cache behavior and tighter allowlists for RAWG media. |
| P2 | Consider read replicas only after traces show read pressure | Replica complexity is not justified before measuring actual DB bottlenecks. |

## Stack-Specific Notes

### Next.js and Vercel

- Use route segment config or Vercel project settings to keep Node.js functions in the region closest to Neon, then record the actual deployed region in evidence.
- Use `maxDuration` intentionally for long jobs/routes, but do not mask slow interactive routes by simply increasing duration.
- Use App Router cache only after classifying data. Catalog/public curated reads may use shared cache and tag revalidation. Duo-scoped reads should remain private/no-store unless a private per-user strategy is explicitly proven safe.
- Keep `use client` boundaries small. Discovery interaction can stay client-rich, but dashboard/catalog/library shell and data shaping should stay server-side.
- Add bundle analysis before optimizing blindly. Track JS for `/app`, `/app/catalogo`, `/app/biblioteca`, `/app/descobrir` and `/app/jogo/[slug]`.

### Better Auth

- Better Auth explicitly recommends cookie caching to avoid hitting the database every time `getSession`/`useSession` is called.
- The current app config enables cookie cache, but `getCurrentSession()` disables it every time. Replace this with two APIs:
  - normal page/session reads use a short signed cookie cache;
  - sensitive mutations/security screens use an authoritative no-cache session check.
- Consider `better-auth/minimal` with the Drizzle adapter if tests confirm compatibility and built-in migrations are not needed.
- Restrict IP-header trust to the actual deployment proxy path. Do not accept Cloudflare-specific headers unless Cloudflare is truly in front of Vercel.

### Neon Postgres and Drizzle/pg

- Keep pooled runtime URL for app requests and direct migrator URL for migrations.
- Tune `pg.Pool` max with Vercel concurrency and Neon pool limits. Bigger pool values are not automatically faster in serverless.
- Add timeout discipline: short connection timeout already exists; add statement/lock timeout strategy in transactions where feasible.
- Optimize transactions by reducing query count and row shape, not by weakening RLS. `Promise.all` inside one pg transaction client does not create true parallel SQL execution.
- Use `EXPLAIN (ANALYZE, BUFFERS)` against representative data after each query/index change. The current query review used available fixtures and is not a substitute for production-sized catalog data.

### Security

- PostgreSQL RLS default-denies rows when policies are absent after RLS is enabled. Keep forced RLS and dedicated runtime roles.
- Vercel Firewall/WAF should be a prefilter for abusive traffic, while application-level auth/rate-limit checks remain authoritative.
- CSP hardening should target removal of production `unsafe-inline` for scripts, but must be measured because nonce-based CSP forces dynamic rendering in Next.
- Continue mapping launch evidence to OWASP ASVS Level 2. The goal is verifiable controls, not absolute-security language.

## Recommended Next Move

Run a follow-up implementation quick before Phase 4:

1. Document and configure the missing Phase 03.3 E2E variables.
2. Capture production/preview timing evidence with Vercel/Neon region and scale-to-zero state recorded.
3. Refactor session reads into cached vs authoritative paths with security tests.
4. Re-run `pnpm phase:03.3:gate`.

