---
phase: 02-catalogo-e-biblioteca
plan: "02"
subsystem: library
tags: [postgres, rls, library, platforms, match-score]

requires:
  - phase: 02-catalogo-e-biblioteca
    provides: Plan 02-01 catalog schema, stable catalog IDs and source/freshness contract
provides:
  - Duo-scoped platform and library tables with forced RLS
  - Phase 2 library domain policies and public use cases
  - Server-only library repository with transaction-local database identity
affects: [library, catalog, play, discovery, ui, database]

tech-stack:
  added: []
  patterns:
    - Runtime library writes derive duo membership from the authenticated user inside a transaction
    - Member platform changes use enabled rows instead of runtime DELETE grants
    - Match score is qualitative and explainable, without fake percentage precision

key-files:
  created:
    - packages/db/src/migrations/0005_library_duo_state.sql
    - packages/db/tests/library-rls.test.ts
    - packages/db/tests/library-concurrency.test.ts
    - apps/web/src/modules/library/domain/platforms.ts
    - apps/web/src/modules/library/domain/library-policy.ts
    - apps/web/src/modules/library/domain/match-score.ts
    - apps/web/src/modules/library/application/ports.ts
    - apps/web/src/modules/library/application/get-library-overview.ts
    - apps/web/src/modules/library/application/update-member-platforms.ts
    - apps/web/src/modules/library/application/add-game-to-wishlist.ts
    - apps/web/src/modules/library/application/move-library-game.ts
    - apps/web/src/modules/library/application/get-library-game-detail.ts
    - apps/web/src/modules/library/infrastructure/library-repository.ts
    - apps/web/src/modules/library/presentation/view-models.ts
    - apps/web/src/modules/library/index.ts
    - apps/web/tests/library-domain.test.ts
  modified:
    - packages/db/src/schema/app.ts
    - packages/db/src/rls/policies.sql
    - packages/db/src/roles.sql

key-decisions:
  - "Member platform rows are disabled instead of deleted so the runtime role does not need DELETE on duo-scoped tables."
  - "The database enforces the three-Jogando limit with a trigger that locks the duo row before counting active games."
  - "Library detail composition calls the catalog module public entrypoint instead of deep-importing catalog internals."

patterns-established:
  - "Library public API injects the server-only repository in index.ts while tests target pure domain/use-case seams."
  - "Repository methods never accept client-supplied duoId as authoritative; they derive duo membership from userId."

requirements-completed: [CAT-06, CAT-07, LIB-01, LIB-02, LIB-03, LIB-04, LIB-05]

duration: 9 min
completed: 2026-06-03
---

# Phase 02 Plan 02: Duo Library And Platform Domain Summary

**Duo-scoped library state with platform intersections, forced RLS and qualitative match-score rules**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-03T21:40:00Z
- **Completed:** 2026-06-03T21:49:17Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Added `app.member_platforms` and `app.duo_library_games` with constraints, indexes, RLS policies, role grants and a database-enforced `jogando` limit.
- Added pure platform, status and match-score rules for Phase 2 library behavior.
- Added server-only repository methods for platform updates, Wishlist additions, status moves, overview reads and game detail reads.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add duo platform and library tables with RLS** - `77930ad` (feat)
2. **Task 2: Implement library domain rules and use cases** - `3ea31bf` (feat)
3. **Task 3: Implement library repository and detail read models** - `51561b4` (feat)

**Plan metadata:** pending metadata commit

## Files Created/Modified

- `packages/db/src/migrations/0005_library_duo_state.sql` - Library tables, RLS policies, grants and Jogando limit trigger.
- `packages/db/src/schema/app.ts` - Drizzle schema for platform and library tables.
- `packages/db/src/rls/policies.sql` - Reusable RLS policy contract for library tables.
- `packages/db/src/roles.sql` - Least-privilege runtime grants for library rows.
- `packages/db/tests/library-rls.test.ts` - Cross-duo isolation and member platform ownership coverage.
- `packages/db/tests/library-concurrency.test.ts` - Concurrent fourth-Jogando guard coverage.
- `apps/web/src/modules/library/domain/*.ts` - Pure platform, status and compatibility policies.
- `apps/web/src/modules/library/application/*.ts` - Use cases and repository ports.
- `apps/web/src/modules/library/infrastructure/library-repository.ts` - Server-only Postgres persistence through transaction-local user identity.
- `apps/web/src/modules/library/presentation/view-models.ts` - Library overview/detail view models.
- `apps/web/src/modules/library/index.ts` - Public library module entrypoint.
- `apps/web/tests/library-domain.test.ts` - Domain/use-case tests without framework or database imports.

## Decisions Made

- Used `enabled` platform rows instead of deleting platform choices, preserving least privilege and avoiding runtime DELETE grants.
- Enforced the `jogando` limit in PostgreSQL with a trigger, not only in application code.
- Kept Zerado/Dropado as valid stored states but blocked Phase 2 mutations to them in domain/use-case policy until Phase 4 double confirmation exists.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope change.

## Issues Encountered

- Optional `rg` checks hit PowerShell quoting/wildcard parsing twice. Required typecheck, tests and architecture checks passed.
- `TEST_DATABASE_URL` is not configured locally, so library RLS/concurrency integration tests produced the explicit skip output required by the plan.

## User Setup Required

None - no new external service configuration required.

## Next Phase Readiness

Plan 02-03 can wire authenticated catalog, library and game detail UI against the catalog/library public module APIs, with platform choices, shared library status and match-score read models available.

---
*Phase: 02-catalogo-e-biblioteca*
*Completed: 2026-06-03*
