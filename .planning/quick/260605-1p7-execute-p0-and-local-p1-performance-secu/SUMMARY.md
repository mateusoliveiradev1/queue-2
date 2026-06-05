---
quick_id: 260605-1p7
slug: execute-p0-and-local-p1-performance-secu
status: complete
completed: 2026-06-05T04:19:59.937Z
source_quick: 260605-1g4
---

# Summary

Executed the repository-local parts of quick `260605-1g4` for production performance and security hardening.

## Completed

- Added the missing Phase 03.3 fixture variables to `.env.example`.
- Split auth session reads into normal cached reads and authoritative no-cache checks.
- Moved library/catalog mutations, discovery mutations, duo settings, pairing mutations, profile/session security and push subscription writes to `requireAuthoritativeVerifiedSession()`.
- Kept normal authenticated page reads and read-only polling/search routes on `requireVerifiedSession()` so Better Auth's short signed cookie cache can reduce repeated DB session lookups.
- Reduced Better Auth trusted IP headers to `x-forwarded-for`, matching Vercel's documented request header path.
- Added server timing coverage to `/app` and `/app/jogo/[slug]`.
- Tightened Next Image remote config to RAWG media cover paths only, with AVIF/WebP formats and a longer optimized-image cache TTL.
- Re-ran the Phase 03.3 gate and refreshed the performance artifacts.

## Verification

- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/web test auth-security performance-metrics discovery-application discovery-push discovery-search discovery-ui catalog-library-ui performance-mutation-ui` - passed, 8 files / 92 tests.
- `pnpm phase:03.3:gate` - local checks passed; final result remains `BLOCKED - missing fixture evidence`.

## Still Blocked

Phase 03.3 still needs production/preview fixtures and platform evidence:

- ready-duo, partner and other-duo credentials;
- `E2E_PHASE3_3_CATALOG_QUERY`;
- `E2E_PHASE3_3_GAME_SLUG`;
- Vercel Function region;
- Neon compute region and scale-to-zero setting;
- pooled production `DATABASE_URL` confirmation;
- Vercel Speed Insights/Observability/Firewall evidence.

This quick improves the code path and evidence setup, but it does not close Phase 03.3.

