---
phase: "04-jogando-agora-sessoes-e-agendamento"
plan: "01"
subsystem: database
tags: [postgres, rls, drizzle, play, sessions, scheduling, xp]
requires:
  - phase: "01-fundacao-modular-marca-auth-e-dupla"
    provides: "Duo membership, runtime RLS identity and database role foundation"
  - phase: "03.2-biblioteca-escalavel-e-backlog-operacional"
    provides: "Duo library status model with Jogando backlog state"
provides:
  - "Phase 4 play-owned database schema with forced RLS, constraints and grants"
  - "Play module public policy and application contracts"
  - "Server-only repository skeleton using runtime app-user transactions"
  - "Focused policy, application, migration, RLS and concurrency tests"
affects: [play, library, gamification, scheduling, notifications, phase-04]
tech-stack:
  added: []
  patterns:
    - "Duo-scoped play tables use forced RLS and membership policies"
    - "Play persistence runs through withAppUserTransaction instead of bypassing RLS"
    - "Idempotent awards and jobs use unique keys plus claim indexes"
key-files:
  created:
    - "packages/db/src/migrations/0009_play_core.sql"
    - "packages/db/tests/play-migrations.test.ts"
    - "packages/db/tests/play-rls.test.ts"
    - "packages/db/tests/play-concurrency.test.ts"
    - "apps/web/src/modules/play/domain/play-policy.ts"
    - "apps/web/src/modules/play/infrastructure/play-repository.ts"
    - "apps/web/tests/play-domain.test.ts"
    - "apps/web/tests/play-application.test.ts"
  modified:
    - "packages/db/src/schema/app.ts"
    - "packages/db/src/schema/ops.ts"
    - "packages/db/src/rls/policies.sql"
    - "apps/web/src/modules/play/application/ports.ts"
    - "apps/web/src/modules/play/index.ts"
key-decisions:
  - "Play owns active queue, sessions, confirmations, scheduling, notifications, push subscriptions and Phase 4 XP award persistence through app/ops tables."
  - "Repository methods use withAppUserTransaction for user-scoped paths so RLS remains active during normal product reads and writes."
  - "Database integration tests keep missing TEST_DATABASE_URL as an explicit skip rather than passing evidence."
patterns-established:
  - "Active Jogando roles are represented separately from duo_library_games status while preserving the existing Jogando limit."
  - "Double-confirmed effects and XP awards are idempotent through confirmation and award-key uniqueness."
  - "Reminder jobs are claimed with FOR UPDATE SKIP LOCKED and worker-only update grants."
requirements-completed: [PLAY-02, PLAY-03, PLAY-06, PLAY-08, PLAY-12, PLAY-13, SESS-01, SESS-02, SESS-03, SESS-04, SESS-11, SESS-12, SESS-13, SESS-14, SAFE-01, SAFE-02, SAFE-04]
duration: 35 min
completed: 2026-06-05
---

# Phase 04 Plan 01: Play Foundation Summary

**Postgres-backed play model with forced RLS, pure queue/session policies and server-only repository contracts**

## Performance

- **Duration:** 35 min
- **Started:** 2026-06-05T11:43:19Z
- **Completed:** 2026-06-05T12:18:28Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Added the Phase 4 play schema for active games, sessions, confirmations, progress, chapters, Momentos, spoiler reveals, terminal requests, scheduled sessions, attendance, notifications, push subscriptions, XP awards and reminder jobs.
- Enforced core safety rules in PostgreSQL with forced RLS, partial unique indexes, constraints, due-job indexes and least-privilege grants.
- Created the `play` module public contracts, pure domain policies and server-only repository skeleton needed by downstream dashboard, session, timeline and reminder plans.
- Added focused unit/application tests plus DB integration tests for migration, RLS and concurrency behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add play schema and RLS foundation** - `2880973` (`feat(04-01): add play data foundation`)
2. **Task 2: Create play module public contracts and pure policies** - `80a836f` (`feat(04-01): add play module policies`)
3. **Task 3: Implement repository skeleton and invariant tests** - `a00322d` (`feat(04-01): add play repository skeleton`)

## Files Created/Modified

- `packages/db/src/migrations/0009_play_core.sql` - Authoritative Phase 4 play schema, constraints, indexes, RLS and grants.
- `packages/db/src/schema/app.ts` - Drizzle mirror for play-owned app schema tables.
- `packages/db/src/schema/ops.ts` - Drizzle mirror for scheduled job state.
- `packages/db/src/rls/policies.sql` - RLS policy mirror for play tables and job access.
- `packages/db/tests/play-migrations.test.ts` - Migration, forced-RLS, index, grant and comment checks.
- `packages/db/tests/play-rls.test.ts` - Cross-duo isolation and sensitive push/spoiler checks.
- `packages/db/tests/play-concurrency.test.ts` - Principal, active live session and XP idempotency race checks.
- `apps/web/src/modules/play/domain/play-policy.ts` - Pure Phase 4 play rules.
- `apps/web/src/modules/play/application/ports.ts` - Public play application persistence contracts.
- `apps/web/src/modules/play/infrastructure/play-repository.ts` - Server-only Postgres repository skeleton.
- `apps/web/src/modules/play/index.ts` - Narrow public play entrypoint.
- `apps/web/tests/play-domain.test.ts` - Policy coverage for Phase 4 decision truths.
- `apps/web/tests/play-application.test.ts` - Application contract and repository skeleton tests.

## Decisions Made

- Play state is persisted in dedicated play-owned tables rather than embedding Phase 4 rules in library routes or UI.
- The generalized `app.push_subscriptions` table remains owner-readable only because endpoint and auth material are sensitive.
- Runtime product paths use `withAppUserTransaction`; worker-only job claiming remains outside user context and receives separate grants.
- `TEST_DATABASE_URL` absence is treated as an explicit integration-test skip and remains required evidence before release gates can claim DB behavior passed.

## Deviations from Plan

None - plan scope was executed as written. The `cancelConfirmation` port shape was aligned to the session-based repository operation while implementing Task 3.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion.

## Issues Encountered

- The first executor process stopped returning completion signals after Task 2. Work was recovered inline from the visible git state without reverting its commits.
- `pnpm --filter @queue/db test:integration -- play-migrations play-rls play-concurrency` skipped because `TEST_DATABASE_URL` is not configured. This is recorded as missing external DB evidence, not as passing database integration evidence.

## Verification

- `pnpm --filter @queue/web test -- play-domain play-application` - passed, 23 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/db typecheck` - passed.
- `pnpm check:architecture` - passed.
- `pnpm --filter @queue/db test:integration -- play-migrations play-rls play-concurrency` - skipped with explicit `TEST_DATABASE_URL` message.

## User Setup Required

None - no new external service configuration required for this plan. Database integration evidence still requires an isolated `TEST_DATABASE_URL`.

## Next Phase Readiness

Plan 04-02 can build the Jogando Agora dashboard and active-game ordering flow on top of the play policies, repository contracts and database invariants created here.

---
*Phase: 04-jogando-agora-sessoes-e-agendamento*
*Completed: 2026-06-05*
