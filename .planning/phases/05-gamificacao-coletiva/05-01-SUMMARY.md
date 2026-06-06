---
phase: 05-gamificacao-coletiva
plan: "01"
subsystem: database
tags: [postgres, rls, gamification, nextjs, vitest]

requires:
  - phase: 04-jogando-agora-sessoes-e-agendamento
    provides: play sessions, terminal status, progress facts and XP ledger precedent
provides:
  - Duo-scoped gamification schema with RLS, grants, indexes and typed Drizzle mirrors
  - Versioned shared XP, level, achievement, quest and streak domain policies
  - Server-only gamification repository skeleton with RLS user transactions and bounded job claims
  - Focused domain, application, migration, RLS and concurrency tests for Phase 5 foundation
affects: [05-gamificacao-coletiva, gamification, play, discovery, database, jobs]

tech-stack:
  added: []
  patterns:
    - server-only repository with withAppUserTransaction for member operations
    - append-only shared XP ledger with idempotent award keys
    - duo-scoped forced RLS tables and worker-bounded job claims

key-files:
  created:
    - apps/web/src/modules/gamification/domain/gamification-policy.ts
    - apps/web/src/modules/gamification/domain/level-curve.ts
    - apps/web/src/modules/gamification/domain/achievement-catalog.ts
    - apps/web/src/modules/gamification/domain/quest-catalog.ts
    - apps/web/src/modules/gamification/domain/streak-policy.ts
    - apps/web/src/modules/gamification/application/ports.ts
    - apps/web/src/modules/gamification/infrastructure/gamification-repository.ts
    - apps/web/tests/gamification-domain.test.ts
    - apps/web/tests/gamification-application.test.ts
    - packages/db/src/migrations/0011_gamification_core.sql
    - packages/db/tests/gamification-migrations.test.ts
    - packages/db/tests/gamification-rls.test.ts
    - packages/db/tests/gamification-concurrency.test.ts
  modified:
    - apps/web/src/modules/gamification/index.ts
    - packages/db/src/migrations/meta/_journal.json
    - packages/db/src/rls/policies.sql
    - packages/db/src/roles.sql
    - packages/db/src/schema/app.ts
    - packages/db/src/schema/ops.ts

key-decisions:
  - "app.duo_xp_awards remains the canonical shared XP ledger; Phase 5 extends it instead of creating a parallel gamification ledger."
  - "Gamification user-facing persistence is server-only and uses withAppUserTransaction; worker claims remain bounded with FOR UPDATE SKIP LOCKED."
  - "Achievement, quest, streak and level policies are pure/versioned module contracts before UI and event integration plans consume them."
  - "TEST_DATABASE_URL was not configured, so database integration tests are recorded as skipped evidence, not passing database proof."

patterns-established:
  - "XP and unlock idempotency use deterministic keys plus ON CONFLICT convergence."
  - "Gamification public index exports domain/application contracts but not infrastructure singletons."
  - "Projection rebuilds and adjustments are audit records; history is adjusted rather than erased."

requirements-completed: [GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08, GAME-09, GAME-10, GAME-11, GAME-13, GAME-15, GAME-16, GAME-17, SAFE-03]

duration: 27min
completed: 2026-06-06
---

# Phase 05 Plan 01: Gamificacao Foundation Summary

**Shared duo XP economy foundation with RLS-backed Postgres schema, pure reward policies and server-only repository contracts**

## Performance

- **Duration:** 27 min
- **Started:** 2026-06-06T08:20:01Z
- **Completed:** 2026-06-06T08:47:08Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Added the Phase 5 gamification data model: achievements, quest templates/cycles/progress, streak events/state, reward notifications, adjustments and projection rebuild audit records.
- Added versioned pure policies for shared XP, the 50-level curve, 50 achievement seeds, active weekly/monthly/seasonal quests and 04:00 duo-day streak rules.
- Added the server-only gamification repository skeleton, application ports and tests for idempotent XP/unlocks/cycles and bounded worker job claims.

## Task Commits

1. **Task 1: Add gamification schema, RLS and grants** - `52eb466` (feat)
2. **Task 2: Create gamification module public contracts and pure policies** - `0185d8c` (feat)
3. **Task 3: Implement repository skeleton and foundation tests** - `db3f280` (feat)

**Plan metadata:** pending final docs commit.

## Verification

- `pnpm --filter @queue/web test -- gamification-domain gamification-application` - passed, 2 files / 17 tests.
- `pnpm --filter @queue/db test:integration -- gamification-migrations gamification-rls gamification-concurrency` - skipped, 3 files / 9 tests, because `TEST_DATABASE_URL` is not configured.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/db typecheck` - passed.
- `pnpm check:architecture` - passed.

## Files Created/Modified

- `packages/db/src/migrations/0011_gamification_core.sql` - authoritative gamification schema, RLS, grants, indexes, comments and cross-table integrity triggers.
- `packages/db/src/schema/app.ts` and `packages/db/src/schema/ops.ts` - Drizzle schema mirrors for app/ops gamification tables.
- `packages/db/src/rls/policies.sql` - reusable RLS policy mirror for gamification tables.
- `packages/db/src/roles.sql` - canonical role grants now include duo projection columns needed by gamification.
- `apps/web/src/modules/gamification/domain/*` - XP, level, achievement, quest and streak policy contracts.
- `apps/web/src/modules/gamification/application/ports.ts` - application/repository data contracts.
- `apps/web/src/modules/gamification/infrastructure/gamification-repository.ts` - server-only runtime repository skeleton.
- `apps/web/tests/gamification-domain.test.ts` and `apps/web/tests/gamification-application.test.ts` - focused unit/contract coverage.
- `packages/db/tests/gamification-*.test.ts` - migration, RLS and concurrency integration coverage, gated by `TEST_DATABASE_URL`.

## Decisions Made

- Reused `app.duo_xp_awards` as the single shared XP ledger so play, discovery and gamification facts converge through one audit trail.
- Kept infrastructure out of `apps/web/src/modules/gamification/index.ts`; downstream modules must depend on public domain/application contracts.
- Added projection grants for `app.duos.xp`, `level`, `streak` and `updated_at` because repository projection updates are required for basic gamification operation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Registered the 0011 migration in Drizzle journal**
- **Found during:** Task 1 (schema/RLS foundation)
- **Issue:** The new migration file would not be discoverable by the migration journal.
- **Fix:** Added the `0011_gamification_core` journal entry.
- **Files modified:** `packages/db/src/migrations/meta/_journal.json`
- **Verification:** `pnpm --filter @queue/db typecheck`; migration integration command executed and skipped only because `TEST_DATABASE_URL` is absent.
- **Committed in:** `52eb466`

**2. [Rule 2 - Missing Critical] Added cross-table gamification integrity triggers**
- **Found during:** Task 1 (schema/RLS foundation)
- **Issue:** Quest cycle and progress rows could otherwise reference inconsistent template types, duo cycles or XP rewards.
- **Fix:** Added trigger functions enforcing template type and same-duo reward/cycle consistency.
- **Files modified:** `packages/db/src/migrations/0011_gamification_core.sql`
- **Verification:** `pnpm --filter @queue/db typecheck`; integration tests are present but skipped without `TEST_DATABASE_URL`.
- **Committed in:** `52eb466`

**3. [Rule 2 - Missing Critical] Granted duo projection update columns**
- **Found during:** Task 3 (repository skeleton)
- **Issue:** `updateProjection` could not update `app.duos.xp`, `level` or `streak` under runtime/worker privileges.
- **Fix:** Granted the required projection columns in migration and canonical role SQL, with a migration privilege assertion.
- **Files modified:** `packages/db/src/migrations/0011_gamification_core.sql`, `packages/db/src/roles.sql`, `packages/db/tests/gamification-migrations.test.ts`
- **Verification:** `pnpm --filter @queue/db typecheck`; integration test command executed and skipped only because `TEST_DATABASE_URL` is absent.
- **Committed in:** `db3f280`

---

**Total deviations:** 3 auto-fixed (3 Rule 2 missing critical)
**Impact on plan:** All fixes were required for correctness and operational safety; no feature scope was expanded.

## Issues Encountered

- `TEST_DATABASE_URL` is not configured, so DB migration/RLS/concurrency tests did not execute against Postgres. The test files and commands are in place, but this summary does not claim passing database evidence.

## Known Stubs

None. Stub scan found only test helpers, literals and version constants; no TODO/FIXME/placeholder UI or unwired mock data blocks this plan goal.

## Auth Gates

None.

## User Setup Required

No new external service configuration is required to use the committed code. Full database evidence requires setting `TEST_DATABASE_URL` to an isolated Postgres/Neon test database and rerunning the DB integration command listed above.

## Next Phase Readiness

- Phase 5 downstream plans can consume pure gamification policies and repository ports without deep-importing infrastructure.
- UI/reward integration plans should use deterministic fact keys and only award XP for confirmed duo facts.
- Before release gating, run the DB integration suite with `TEST_DATABASE_URL` so RLS and concurrency evidence is not skipped.

---

*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*

## Self-Check: PASSED

- SUMMARY exists at `.planning/phases/05-gamificacao-coletiva/05-01-SUMMARY.md`.
- Key created/modified files from all three task commits exist on disk.
- Task commits found in git history: `52eb466`, `0185d8c`, `db3f280`.
- Verification claims match executed commands, including the explicit `TEST_DATABASE_URL` database skip.
