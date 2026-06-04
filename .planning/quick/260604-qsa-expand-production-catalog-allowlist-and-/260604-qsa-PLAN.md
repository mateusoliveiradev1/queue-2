---
quick_id: 260604-qsa
slug: expand-production-catalog-allowlist-and-
status: verifying
created: 2026-06-04
---

# Quick Task 260604-qsa: Expand Production Catalog Allowlist And Avoid Empty Discovery

## Goal

Fix production Discovery feeling empty/stale by addressing both causes found in production:

- The current production duo had no platform rows, so the default common-platform Discovery filter returned zero games.
- The catalog refresh job only syncs the 12 entries hard-coded in `catalogSyncAllowlist`, so the list updates timestamps but does not grow.

## Tasks

1. [x] Restore production duo platform rows immediately so the current deck is not empty.
2. [x] Expand the RAWG allowlist with verified slugs/names for more duo-friendly co-op games.
3. [x] Make Discovery avoid a blank default deck when platform preferences are not configured yet.
4. [x] Run focused tests, typecheck, lint and build.
5. [ ] Deploy/push.
6. [ ] Trigger production catalog refresh and validate catalog count.

## Verification

- Production DB deck math: current duo default deck > 0.
- `pnpm --filter @queue/web test -- discovery-application discovery-search catalog-sync` - passed, 34 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm lint` - passed.
- `pnpm --filter @queue/web build` - passed.
- Production catalog count after refresh > 12.
