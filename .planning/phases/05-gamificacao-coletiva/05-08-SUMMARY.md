---
phase: 05-gamificacao-coletiva
plan: "08"
subsystem: infrastructure
tags: [timezone, dst, postgres, jobs, recurrence, gamification]
requires:
  - phase: 05-07
    provides: initial gamification job production and bounded worker access
provides:
  - Timezone-aware weekly, monthly, seasonal and streak scheduling
  - Idempotent recurring successors for successful gamification jobs
  - Real Postgres evidence for producer, claim, processing, completion and recurrence
affects: [05-09, 05-11, phase-5-gate, gamification-jobs]
tech-stack:
  added: []
  patterns:
    - two-pass Intl civil-time conversion for IANA timezones
    - deterministic successor keys enqueued before current-job completion
    - real worker-role SQL integration coverage without crossing package boundaries
key-files:
  created:
    - apps/web/src/modules/gamification/domain/gamification-schedule.ts
  modified:
    - apps/web/src/modules/gamification/domain/quest-catalog.ts
    - apps/web/src/modules/gamification/application/run-quest-rotation-jobs.ts
    - apps/web/src/modules/gamification/application/run-streak-jobs.ts
    - apps/web/tests/gamification-domain.test.ts
    - apps/web/tests/gamification-jobs.test.ts
    - packages/db/tests/gamification-concurrency.test.ts
    - scripts/phase-5-gate.mjs
    - .planning/phases/05-gamificacao-coletiva/05-PERFORMANCE-REVIEW.md
    - .planning/phases/05-gamificacao-coletiva/05-ECONOMY-AUDIT.md
    - .planning/phases/05-gamificacao-coletiva/05-USER-SETUP.md
key-decisions:
  - "Seasonal quest windows are explicit catalog boundaries for June, October and December rather than inferred seasons."
  - "Quest jobs carry exactly one questType and every successful runner enqueues its deterministic successor before completing the current job."
  - "The database package verifies the real worker role and repository SQL shape directly instead of importing web infrastructure across package boundaries."
patterns-established:
  - "Gamification civil schedules are calculated from the duo timezone and tested by reconstructing both UTC instants and local wall-clock values."
  - "Recurring job retries converge through deterministic keys and idempotent inserts."
requirements-completed: [PLAY-05, GAME-09, GAME-10, GAME-11, GAME-12, GAME-13, GAME-16, SAFE-03]
duration: 11min
completed: 2026-06-06
---

# Phase 05 Plan 08: Timezone-Aware Recurring Jobs Summary

**Duo-local quest and streak schedules now run as idempotent recurring chains with real Postgres coverage.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-06T20:50:00Z
- **Completed:** 2026-06-06T21:01:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added one pure scheduling source for weekly Monday 00:00, monthly day-one 00:00, explicit seasonal boundaries and streak checks at 04:00 in the duo timezone.
- Covered Sao Paulo and New York, including the 2026 daylight-saving transition, invalid IANA timezones and reconstructed civil-time assertions.
- Reworked quest and streak runners to validate singular payloads, process authoritative duo data and enqueue one deterministic successor before completing the current job.
- Added a real migrated-database chain test using `queue2_worker` for production, claim, work, completion, recurrence and retry idempotency.
- Ran the complete Phase 5 local gate successfully, including architecture, typecheck, 72 web tests, 16 database tests, migrations, zero drift and query review.

## Task Commits

1. **Task 1 RED: Define duo-local gamification schedules** - `8f5f6a9` (test)
2. **Task 1 GREEN: Schedule gamification in duo-local time** - `d1faa1c` (feat)
3. **Task 2 RED: Define recurring gamification jobs** - `b924720` (test)
4. **Task 2 GREEN: Recur quest and streak jobs by timezone** - `a924001` (feat)
5. **Task 3: Prove recurring job chain in Postgres** - `8e8cb7d` (test)

**Plan metadata:** recorded in the final docs commit after state updates.

## Verification

- `pnpm --filter @queue/web test -- gamification-domain.test.ts gamification-jobs.test.ts` - 25 focused tests passed.
- `pnpm --filter @queue/db test:integration -- gamification-concurrency` - 7 database tests passed with the configured integration environment.
- `pnpm phase:5:gate` - all local checks passed: architecture, typecheck, 72 web tests, 16 database tests, migrations, schema drift and performance review.
- Browser terminal-status evidence remains blocked by missing `E2E_PHASE5_ZERADO_SLUG` and `E2E_PHASE5_DROPADO_SLUG`.
- Production cadence evidence remains blocked by missing `CRON_SECRET` and `GAMIFICATION_RUNNER_FREQUENCY_MINUTES`.

## Decisions Made

- Seasonal schedules use explicit catalog windows: anniversary in June, spooky in October and awards in December.
- Invalid timezones fail with `invalid_gamification_timezone`; there is no silent UTC fallback.
- Successor identity includes duo, job species and the next UTC instant, making retries between enqueue and complete converge safely.
- Membership mismatch, missing users, invalid payloads and job-species divergence fail without creating a successor.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Preserved package architecture in the database integration**
- **Found during:** Task 3 integration design
- **Issue:** Importing the web repository into `@queue/db` would violate package and modular boundaries.
- **Fix:** Exercised the real migrated tables, worker role and repository-equivalent SQL shape inside the database package, while the web unit suite covers the actual runners.
- **Verification:** Architecture passed and the combined web/database suites proved the complete chain.
- **Committed in:** `8e8cb7d`

**2. [Rule 3 - Blocking] Renamed an architecture-checker false-positive identifier**
- **Found during:** Task 1 architecture verification
- **Issue:** A local variable named `window` matched a browser-global static rule even though it represented a seasonal interval.
- **Fix:** Renamed it to `seasonalWindow` without changing behavior.
- **Verification:** Architecture and domain tests passed.
- **Committed in:** `d1faa1c`

**3. [Rule 1 - Bug] Shortened the integration fixture cycle key**
- **Found during:** Task 3 database verification
- **Issue:** The first fixture key exceeded the database column limit and failed before testing recurrence.
- **Fix:** Replaced it with a bounded deterministic fixture key.
- **Verification:** The complete database integration file passed all seven tests.
- **Committed in:** `8e8cb7d`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** The fixes preserved the planned behavior and strengthened architectural and database fidelity without expanding product scope.

## Issues Encountered

- The first direct database command did not load `.env.local`, so the suite reported its explicit missing-environment skip. It was rerun through the configured environment wrapper and passed.
- Authenticated browser fixtures and production cron cadence evidence remain external release blockers; the local implementation gate is green.

## User Setup Required

The remaining external variables and evidence steps are documented in `.planning/phases/05-gamificacao-coletiva/05-USER-SETUP.md`.

## Next Phase Readiness

The recurring job foundation is ready for achievement predicates in 05-09 and the broader concurrency proof in 05-11.

## Self-Check: PASSED

- Found the schedule source, explicit seasonal catalog, recurring runners, worker-role database chain and regenerated gate artifacts.
- Found task commits `8f5f6a9`, `d1faa1c`, `b924720`, `a924001` and `8e8cb7d`.
- Confirmed focused tests, complete local Phase 5 gate and zero schema drift.

---
*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*
