---
phase: 05-gamificacao-coletiva
plan: "11"
subsystem: gamification
tags: [concurrency, postgres, row-locking, quests, xp, idempotency]
requires:
  - phase: 05-08
    provides: recurring timezone-aware gamification jobs
  - phase: 05-09
    provides: authoritative achievement evaluation inside reward transactions
provides:
  - Serialized duo projection updates derived from final persisted XP
  - Atomic additive quest progress keyed by confirmed fact source
  - Real Neon concurrency regressions for level crossing and quest completion
affects: [phase-5-gate, reward-engine, projections, quests, streak-jobs]
tech-stack:
  added: []
  patterns:
    - one duo projection lock acquired before all derived gamification reads
    - repository-owned level derivation from persisted XP
    - source-key-conditioned quest increment and reward linking in one transaction
key-files:
  created: []
  modified:
    - apps/web/src/modules/gamification/application/ports.ts
    - apps/web/src/modules/gamification/application/apply-gamification-fact.ts
    - apps/web/src/modules/gamification/application/run-streak-jobs.ts
    - apps/web/src/modules/gamification/application/rebuild-gamification-projections.ts
    - apps/web/src/modules/gamification/infrastructure/gamification-repository.ts
    - apps/web/tests/gamification-rewards.test.ts
    - apps/web/tests/gamification-jobs.test.ts
    - packages/db/tests/gamification-concurrency.test.ts
key-decisions:
  - "Fact, streak maintenance and projection rebuild acquire the same duo/streak row locks before derived reads."
  - "Level is no longer accepted from callers; the repository maps the XP returned by the atomic update."
  - "Quest completion is reported by the source-key-conditioned increment, and only that transition may create and link the reward."
requirements-completed: [GAME-01, GAME-02, GAME-03, GAME-04, GAME-09, GAME-10, GAME-11, GAME-12]
duration: 12min
completed: 2026-06-06
---

# Phase 05 Plan 11: Serialized Gamification Concurrency Summary

**Distinct concurrent facts now preserve XP, level, quest progress and one-time derived rewards.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-06T21:24:00Z
- **Completed:** 2026-06-06T21:36:01Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Added an idempotently materialized `FOR UPDATE` lock over the duo projection and streak row before fact, streak-job or rebuild derivation.
- Removed caller-supplied levels from the transaction port; projection updates derive the level from the XP returned by Postgres.
- Persisted level-milestone Freeze events before updating the shared balance, preventing duplicate Freeze grants on replay.
- Replaced absolute quest upserts with a source-key-conditioned increment capped at the quest goal.
- Returned `advanced` and `completedNow` from the persisted quest transition and linked the single XP reward in the same transaction.
- Added real Neon tests using two concurrent runtime transactions for a level crossing and a quest completion, including explicit replay and 10-second deadlock timeouts.

## Task Commits

1. **Task 1 RED: Define serialized projection updates** - `84de585` (test)
2. **Task 1 GREEN: Serialize gamification projections** - `42484b6` (feat)
3. **Task 2 RED: Define atomic quest advancement** - `f07e8b7` (test)
4. **Task 2 GREEN: Make quest progress atomic** - `dd54180` (feat)
5. **Task 3: Cover gamification concurrency in Postgres** - `1ca9e21` (test)

**Plan metadata:** recorded in the final docs commit after state updates.

## Verification

- `pnpm --filter @queue/web test -- gamification-rewards.test.ts` - 13 tests passed.
- `pnpm --filter @queue/web test` - 46 files / 371 tests passed.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/db typecheck` - passed.
- `pnpm --filter @queue/db test:integration -- gamification-concurrency` with `.env.local` test branch - 1 file / 9 tests passed against Neon.
- Both new database scenarios completed below the explicit 10-second timeout and cleaned their duo fixtures.

## Decisions Made

- The lock row is the existing duo plus `gamification_streak_state`; the state row is created idempotently before locking so all mutating paths share one order.
- The first projection update applies XP/streak, then Freeze derivation compares locked-before with returned-after; a second zero-XP update only persists an inserted Freeze event.
- Completed quests stop accepting additional source keys because no further progress or completion effect is meaningful after the goal.
- Integration tests mirror repository SQL instead of importing the web package into `packages/db`, preserving dependency direction while exercising Postgres, RLS and grants.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated complete transaction test doubles**
- **Found during:** Task 1 and Task 2 typecheck
- **Issue:** Existing suites implement the full transaction port and lacked `lockProjection`, `advanceQuestProgress` and `linkQuestProgressReward`.
- **Fix:** Added minimal read-model doubles and a stateful quest fake in the reward suite.
- **Verification:** Web typecheck and all 371 web tests passed.
- **Committed in:** `42484b6`, `dd54180`

**2. [Rule 3 - Blocking] Loaded the isolated database URL explicitly**
- **Found during:** Task 3 integration run
- **Issue:** Vitest does not automatically load the root `.env.local`, so the first command skipped the database file.
- **Fix:** Loaded only `TEST_DATABASE_URL` into the process and reran against the configured Neon test branch.
- **Verification:** All 9 concurrency tests executed and passed; none remained skipped.
- **Committed in:** no source change

---

**Total deviations:** 2 auto-fixed blocking issues
**Impact on plan:** No scope change; both fixes were required to obtain typed and real-database evidence.

## Issues Encountered

- Node/Postgres emitted a forward-looking warning that `sslmode=require` aliases current `verify-full` behavior and will change semantics in a future major driver release. It did not affect this plan, but connection-string hardening should be reviewed during dependency upgrades.
- Authenticated browser fixtures and deployed cron cadence evidence remain external Phase 5 verification items documented in `05-USER-SETUP.md`.

## User Setup Required

No new setup. Existing browser fixture and deployed scheduler variables remain documented in `.planning/phases/05-gamificacao-coletiva/05-USER-SETUP.md`.

## Next Phase Readiness

All implementation gaps identified by the initial Phase 5 verification now have code and automated evidence. The phase is ready for full gate rerun and re-verification; browser and deployed scheduler checks remain external.

## Self-Check: PASSED

- Found the projection lock, repository-owned level derivation, atomic quest increment and idempotent reward link.
- Found task commits `84de585`, `42484b6`, `f07e8b7`, `dd54180` and `1ca9e21`.
- Confirmed 371 web tests and 9 real Neon concurrency tests pass.

---
*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*
