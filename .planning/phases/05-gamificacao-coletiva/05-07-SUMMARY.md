---
phase: 05-gamificacao-coletiva
plan: "07"
subsystem: infrastructure
tags: [postgres, rls, jobs, neon, idempotency, gamification]
requires:
  - phase: 05-05
    provides: gamification maintenance consumers and scheduled job contracts
  - phase: 05-06
    provides: Phase 5 release gate and database evidence targets
provides:
  - Idempotent initial job production for ready duos
  - Separate least-privileged worker credential boundary
  - Applied migration and zero-drift evidence for worker reads and enqueue
affects: [05-08, phase-5-gate, gamification-jobs, rls]
tech-stack:
  added: []
  patterns:
    - lazy worker pool for operational job methods
    - constrained worker RLS enqueue by job type and creator payload
    - idempotent bootstrap using deterministic keys and active-state checks
key-files:
  created:
    - packages/db/src/migrations/0012_gamification_job_producer.sql
    - packages/db/src/migrations/0013_gamification_job_enqueue.sql
  modified:
    - packages/db/src/migrations/meta/_journal.json
    - packages/db/src/rls/policies.sql
    - packages/db/tests/gamification-migrations.test.ts
    - packages/db/tests/gamification-rls.test.ts
    - apps/web/src/modules/gamification/application/ports.ts
    - apps/web/src/modules/gamification/infrastructure/gamification-repository.ts
    - apps/web/src/modules/gamification/jobs.ts
    - apps/web/tests/gamification-jobs.test.ts
    - scripts/phase-5-gate.mjs
    - .planning/phases/05-gamificacao-coletiva/05-USER-SETUP.md
key-decisions:
  - "User transactions continue to use the runtime pool; job methods create the worker pool lazily from WORKER_DATABASE_URL."
  - "Migration 0012 remained immutable after application; the missing worker enqueue permission was added in incremental migration 0013."
  - "The worker can enqueue only gamification quest rotation and streak check jobs carrying createdByUserId."
patterns-established:
  - "Operational worker access is granted per table, action and job species instead of bypassing RLS."
  - "Ready-duo bootstrap selects the slot-one member deterministically and creates one active job per schedule kind."
requirements-completed: [PLAY-05, GAME-09, GAME-10, GAME-11, GAME-12, GAME-13, GAME-16, SAFE-03]
duration: 15min
completed: 2026-06-06
---

# Phase 05 Plan 07: Gamification Job Producer Summary

**Least-privileged, idempotent production of weekly, monthly, seasonal and streak jobs for every ready duo.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-06T20:25:00Z
- **Completed:** 2026-06-06T20:40:48Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Added worker-only readiness enumeration without weakening runtime user isolation or granting writes to duo membership data.
- Added an idempotent producer that ignores incomplete duos and creates the four initial gamification job species for ready duos.
- Kept normal user operations on the runtime pool and instantiated the separate worker pool only for operational job methods.
- Ran the producer before quest and streak consumers and exposed the produced job count in the maintenance result.
- Applied migrations 0012 and 0013, verified the real worker credential, and confirmed zero schema drift.

## Task Commits

1. **Task 1: Grant bounded worker access for job production** - `79ee6c5` (feat)
2. **Task 2 RED: Define gamification job bootstrap behavior** - `eeb0e51` (test)
3. **Task 2 GREEN: Produce initial gamification jobs** - `759eafe` (feat)
4. **Task 3: Run producer before maintenance consumers** - `2f2e3a2` (feat)

**Plan metadata:** recorded in the final docs commit after state updates.

## Verification

- `pnpm --filter @queue/web test -- gamification-jobs.test.ts` - passed.
- `pnpm --filter @queue/db test:integration -- gamification-migrations gamification-rls` - passed with worker and runtime role assertions.
- `pnpm --filter @queue/db drizzle:migrate` - migrations 0012 and 0013 applied.
- `gsd-sdk query verify.schema-drift 05` - no drift.
- Real `queue2_worker` transaction probe - constrained scheduled job insert succeeded and was rolled back.
- `pnpm phase:5:gate` - architecture, typecheck, 66 focused web tests, 15 DB tests, migrations and query review passed. Browser fixture and cron cadence evidence remain externally blocked.

## Decisions Made

- The worker credential is server-only and lazy so ordinary user requests do not depend on `WORKER_DATABASE_URL`.
- The ready-duo query requires pairing, a non-empty duo name and exactly two members; slot one is the deterministic creator.
- Active `pending`, `claimed` or `failed` jobs prevent logical duplicates, while deterministic keys and conflict handling protect concurrent runs.
- Worker enqueue permission is limited to `gamification-quest-rotation` and `gamification-streak-check`, with a required creator identity in the payload.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the missing worker insert policy as migration 0013**
- **Found during:** Task 3 real worker credential probe
- **Issue:** Migration 0012 granted readiness reads but the worker still received PostgreSQL `42501` when inserting the scheduled jobs it produced.
- **Fix:** Added immutable incremental migration 0013 with a worker-only INSERT policy constrained to the two gamification job types and a non-empty `createdByUserId` payload.
- **Verification:** Migration/RLS suites passed, the real worker insert probe succeeded inside a rolled-back transaction, and schema drift is zero.
- **Committed in:** `2f2e3a2`

**2. [Rule 3 - Blocking] Used the installed GSD CLI for schema drift**
- **Found during:** Task 3 gate execution
- **Issue:** The plan's local `node_modules/@gsd-build/sdk` path does not exist in this workspace.
- **Fix:** Updated the gate to call the available `gsd-sdk query verify.schema-drift 05`.
- **Verification:** The complete Phase 5 gate reached zero drift successfully.
- **Committed in:** `2f2e3a2`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both changes were required to execute the planned producer safely and verify the applied schema. Scope remained limited to the job boundary.

## Issues Encountered

- The Neon app connector required reauthentication. The existing `queue2_worker` role was configured through the direct owner connection, verified without exposing its secret, and stored only in ignored `.env.local`.
- The first environment-file write used a package-relative path after rotating the worker password; the credential was rotated again and written to the correct repository root.
- Browser terminal-status fixtures and production cron secret/cadence evidence are still absent, so the phase gate records those external checks as blocked.

## User Setup Required

The local worker and direct database values are configured. Remaining external evidence variables are documented in `.planning/phases/05-gamificacao-coletiva/05-USER-SETUP.md`.

## Next Phase Readiness

The producer foundation is ready for 05-08 to replace initial bootstrap timing with timezone-correct recurring scheduling. Local database and application gates are green.

## Self-Check: PASSED

- Found migrations 0012 and 0013, worker policies, producer contracts and runner integration.
- Found task commits `79ee6c5`, `eeb0e51`, `759eafe` and `2f2e3a2`.
- Confirmed migration application, real worker enqueue, focused tests, full local gate and zero schema drift.

---
*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*
