---
phase: 05-gamificacao-coletiva
plan: "02"
subsystem: gamification
tags: [nextjs, typescript, postgres, rls, gamification, play, discovery]

requires:
  - phase: 05-01
    provides: Gamification schema, policies, catalog seeds, level curve, quests and repository skeleton
provides:
  - Authoritative duo reward application for confirmed server facts
  - Play and Discovery integration through public gamification contracts
  - Projection rebuild/reconciliation with auditable adjustment evidence
  - Anti-farm/idempotency coverage for session duration, chapter caps and duplicate source ids
affects: [play, discovery, gamification, database, phase-05]

tech-stack:
  added: []
  patterns:
    - Server-authoritative gamification facts applied through module public entrypoints
    - Transaction adapter entrypoint for same-transaction cross-module reward effects
    - Ledger-first projection rebuild with explicit adjustment records

key-files:
  created:
    - apps/web/src/modules/gamification/application/apply-gamification-fact.ts
    - apps/web/src/modules/gamification/application/get-gamification-dashboard.ts
    - apps/web/src/modules/gamification/application/rebuild-gamification-projections.ts
    - apps/web/src/modules/gamification/index.server.ts
    - apps/web/tests/gamification-rewards.test.ts
    - apps/web/tests/play-gamification-integration.test.ts
    - apps/web/tests/discovery-gamification-integration.test.ts
  modified:
    - apps/web/src/modules/gamification/application/ports.ts
    - apps/web/src/modules/gamification/infrastructure/gamification-repository.ts
    - apps/web/src/modules/gamification/index.ts
    - apps/web/src/modules/play/application/ports.ts
    - apps/web/src/modules/play/infrastructure/play-repository.ts
    - apps/web/src/modules/discovery/application/record-discovery-decision.ts
    - packages/db/tests/gamification-concurrency.test.ts

key-decisions:
  - "Critical Play rewards are applied inside the Play transaction via a gamification transaction adapter; reward failure returns an explicit use-case failure."
  - "Discovery matches apply non-recurring gamification progress through the public contract but do not grant XP."
  - "Projection rebuild uses the XP ledger and streak state as sources of truth, recording adjustment/rebuild evidence instead of deleting history."

patterns-established:
  - "Confirmed domain facts carry source type/id and metadata; clients never supply XP, level, streak, quest or achievement outcomes."
  - "Cross-module same-transaction integration uses `gamification/index.server.ts`, not deep imports into infrastructure."
  - "Duplicate XP inserts converge on any unique conflict, including duplicate source ids with different award keys."

requirements-completed: [PLAY-05, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-09, GAME-10, GAME-11, GAME-13, GAME-15, GAME-16, SAFE-03]

duration: 27min
completed: 2026-06-06
---

# Phase 05 Plan 02: Gamificacao Coletiva Summary

**Reward engine for shared duo XP, quests, achievements, streak projections and Play/Discovery confirmed facts**

## Performance

- **Duration:** 27 min
- **Started:** 2026-06-06T08:52:14Z
- **Completed:** 2026-06-06T09:19:07Z
- **Tasks:** 3
- **Files modified:** 25

## Accomplishments

- Added `applyGamificationFact` to apply server-confirmed duo facts with idempotent XP ledger rows, projection updates, level-up summaries, achievements, quest progress, streak changes and reward notifications.
- Replaced Play direct reward paths for live/offline sessions, scheduled attendance, chapters and terminal statuses with gamification contract calls inside the confirming transaction.
- Added Discovery match gamification progress without recurring XP.
- Added `rebuildGamificationProjections` to reconcile XP/level/streak projections from ledger/state evidence and record audit adjustments.
- Extended app and DB tests for duplicate facts, source caps, short sessions, reward failure behavior and duplicate source-id races.

## Task Commits

1. **Task 1: Build reward application service and projection updates** - `825de8f` (feat)
2. **Task 2: Integrate Play and Discovery confirmed facts** - `5237c1a` (feat)
3. **Task 3: Add anti-farm and reconciliation coverage** - `c68011c` (fix)

## Files Created/Modified

- `apps/web/src/modules/gamification/application/apply-gamification-fact.ts` - Authoritative reward application use case.
- `apps/web/src/modules/gamification/application/get-gamification-dashboard.ts` - Duo-scoped gamification dashboard read model.
- `apps/web/src/modules/gamification/application/rebuild-gamification-projections.ts` - Ledger-first projection reconciliation.
- `apps/web/src/modules/gamification/index.server.ts` - Public server-only transaction adapter entrypoint.
- `apps/web/src/modules/play/application/*.ts` - Confirmed Play actions now apply gamification facts.
- `apps/web/src/modules/discovery/application/record-discovery-decision.ts` - Match-created facts now progress gamification without XP.
- `apps/web/tests/*gamification*.test.ts` and `packages/db/tests/gamification-concurrency.test.ts` - Reward, integration and idempotency coverage.

## Decisions Made

- Critical Play reward failures return `reward-application-failed` and are thrown inside the transaction path so the confirming action does not commit without reward effects.
- Discovery match gamification is non-critical and non-XP; it is exposed on the result as an optional gamification effect.
- Rebuild changes projections through deltas and adjustment records instead of rewriting or deleting ledger history.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added transaction-safe public gamification server entrypoint**
- **Found during:** Task 2 (Integrate Play and Discovery confirmed facts)
- **Issue:** Play needed same-transaction gamification without deep-importing gamification infrastructure, but the planned files did not include a public server-only adapter.
- **Fix:** Added `apps/web/src/modules/gamification/index.server.ts` exposing only the transaction adapter and application contract.
- **Files modified:** `apps/web/src/modules/gamification/index.server.ts`, `apps/web/src/modules/play/infrastructure/play-repository.ts`
- **Verification:** `pnpm check:architecture`; `pnpm --filter @queue/web test -- play-gamification-integration discovery-gamification-integration`
- **Committed in:** `5237c1a`

**2. [Rule 1 - Bug] Fixed duplicate XP source conflict handling**
- **Found during:** Task 3 (Add anti-farm and reconciliation coverage)
- **Issue:** XP inserts handled `award_key` conflicts but could still fail on the separate `(duo_id, source_type, source_id)` unique constraint when replay keys differed.
- **Fix:** Switched gamification and legacy Play XP inserts to `ON CONFLICT DO NOTHING` and added DB coverage for duplicate source ids with different keys.
- **Files modified:** `apps/web/src/modules/gamification/infrastructure/gamification-repository.ts`, `apps/web/src/modules/play/infrastructure/play-repository.ts`, `packages/db/tests/gamification-concurrency.test.ts`
- **Verification:** `pnpm --filter @queue/web test -- gamification-rewards`; DB integration command executed but skipped without `TEST_DATABASE_URL`.
- **Committed in:** `c68011c`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes were required for the plan's transaction and anti-farm guarantees. No unrelated scope was added.

## Issues Encountered

- `TEST_DATABASE_URL` is not configured, so `pnpm --filter @queue/db test:integration -- gamification-concurrency` skipped all 4 DB integration tests. This is recorded as missing DB evidence, not passing DB evidence.
- No authentication gates occurred.

## Verification

- `pnpm --filter @queue/web test -- gamification-rewards play-gamification-integration discovery-gamification-integration` - passed, 11 tests.
- `pnpm --filter @queue/web test -- play-sessions play-scheduling play-terminal-status` - passed, 14 tests.
- `pnpm --filter @queue/web test -- gamification-application play-application` - passed, 16 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm check:architecture` - passed.
- `pnpm --filter @queue/db test:integration -- gamification-concurrency` - skipped because `TEST_DATABASE_URL` is not configured.

## Known Stubs

None that block this plan's goal.

## User Setup Required

None for app code. Configure `TEST_DATABASE_URL` against an isolated Postgres/Neon test branch to execute DB concurrency evidence instead of skip.

## Next Phase Readiness

Phase 5 can now build user-facing gamification surfaces on shared projections and reward summaries. DB concurrency evidence remains pending until a test database URL is provided.

## Self-Check: PASSED

- Created files exist.
- Task commits exist: `825de8f`, `5237c1a`, `c68011c`.

---
*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*
