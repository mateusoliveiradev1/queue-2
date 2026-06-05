---
quick_id: 260605-1p7
slug: execute-p0-and-local-p1-performance-secu
status: blocked-external-evidence
generated: 2026-06-05T04:13:27.574Z
---

# Production Evidence Status

## Local Execution

Repository-local P0/P1 hardening was implemented:

- Phase 03.3 fixture names are documented in `.env.example`.
- Normal page session reads can use Better Auth's short cookie cache.
- Mutations/security-sensitive flows use `requireAuthoritativeVerifiedSession()`, which disables Better Auth cookie cache for that session check.
- Better Auth IP header trust is reduced to Vercel's `x-forwarded-for` path.
- `/app` and `/app/jogo/[slug]` emit server timing metrics for auth, database and render stages.
- Next Image optimization accepts only `https://media.rawg.io/media/**` cover URLs and uses a longer optimized-image cache TTL.

## Still Blocked Outside This Repo

Phase 03.3 still needs a non-skipped production/preview run with:

- `E2E_BASE_URL`
- `E2E_READY_USER_EMAIL`
- `E2E_READY_USER_PASSWORD`
- `E2E_READY_PARTNER_EMAIL`
- `E2E_READY_PARTNER_PASSWORD`
- `E2E_OTHER_DUO_USER_EMAIL`
- `E2E_OTHER_DUO_USER_PASSWORD`
- `E2E_PHASE3_3_CATALOG_QUERY`
- `E2E_PHASE3_3_GAME_SLUG`

Deployment evidence still needs to record:

- Vercel Function region for authenticated routes.
- Neon compute region.
- Whether Neon scale-to-zero is disabled for production or intentionally included in the baseline.
- Whether production `DATABASE_URL` uses the pooled Neon host.
- Whether Vercel Speed Insights, Observability and Firewall/WAF rate-limit rules are enabled.

## Phase 03.3 Status

Still blocked. This quick improves the app and the evidence path, but it does not replace the required production/preview browser and platform evidence.

