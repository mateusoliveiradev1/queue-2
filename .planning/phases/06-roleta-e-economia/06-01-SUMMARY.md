---
phase: "06-roleta-e-economia"
plan: "01"
subsystem: "database"
tags:
  - roulette
  - economy
  - postgres
  - drizzle
  - rls
dependency_graph:
  requires:
    - "06-00"
    - "Phase 05 gamificacao coletiva XP/event foundations"
  provides:
    - "Authoritative roulette persistence schema"
    - "Roulette forced RLS and least-privileged grants"
    - "Roulette migration, source contracts, RLS and concurrency verification"
  affects:
    - "06-roleta-e-economia"
    - "database"
    - "roulette"
    - "economy"
    - "play notifications"
tech_stack:
  added: []
  patterns:
    - "Postgres forced RLS on all duo-scoped roulette tables"
    - "Append-only boost and history ledgers with idempotency keys"
    - "Unique active round and unique boost spend constraints"
    - "Source-level migration contract tests plus database-backed RLS/concurrency tests"
key_files:
  created:
    - "packages/db/src/migrations/0015_roulette_core.sql"
  modified:
    - "packages/db/src/schema/app.ts"
    - "packages/db/src/rls/policies.sql"
    - "packages/db/src/migrations/meta/_journal.json"
    - "packages/db/tests/roulette-migrations.test.ts"
    - "packages/db/tests/roulette-concurrency.test.ts"
key_decisions:
  - "Roulette outcome notifications extend the existing app.play_notifications type constraint instead of adding a parallel notification table."
  - "Security-definer roulette integrity triggers return early for non-members so RLS remains the first cross-duo rejection layer."
  - "Boost spend concurrency tests update balance only from the winning ledger insert, matching exactly-once transaction semantics."
  - "The reviewed manual migration 0015_roulette_core is retained instead of a generated full-schema Drizzle baseline."
requirements_completed:
  - "ROUL-09"
  - "ROUL-02"
  - "ROUL-06"
  - "ROUL-07"
  - "ROUL-08"
  - "ROUL-10"
  - "SAFE-06"
metrics:
  duration: "20 min"
  started_at: "2026-06-09T11:10:59Z"
  completed_at: "2026-06-09T11:30:37Z"
  tasks: 1
  files_modified: 6
---

# Phase 06 Plan 01: Roulette Database Foundation Summary

Server-persisted roulette rounds, boost economy state, pity/cooldown state, history events, notification types, forced RLS and database verification are now in place.

## Accomplishments

- Added seven `app.roulette_*` tables with duo scope, constraints, indexes, comments, grants and forced RLS.
- Mirrored the roulette schema in Drizzle and registered migration `0015_roulette_core` in the journal.
- Extended Play notifications with `roulette-result-locked` and `roulette-result-discarded`.
- Added source-level migration contract tests and kept the Wave 0 database RLS/concurrency tests passing against a configured test database.

## Task Results

| Task | Name | Commit | Result |
| ---- | ---- | ------ | ------ |
| 1 RED | Add failing roulette database contract tests | `17325cf` | Failing source contract tests proved roulette schema, migration, RLS and notification updates were missing. |
| 1 GREEN | Add roulette database foundation | `d95bd0b` | Implemented schema, migration, RLS, grants, journal entry and concurrency helper fix. |
| 1 REFACTOR | Align roulette RLS policy declarations | `889953c` | Reflowed policy declarations so the exact plan grep proves membership checks and forced RLS. |

## Verification

- `pnpm --filter @queue/db test:integration -- roulette-migrations` before implementation: failed as RED with missing roulette contract assertions.
- `pnpm --filter @queue/db typecheck`: passed.
- `pnpm --filter @queue/db drizzle:generate`: BLOCKED without process `DIRECT_DATABASE_URL`; Drizzle reported `DIRECT_DATABASE_URL is required for migrations`.
- `pnpm --filter @queue/db drizzle:migrate`: BLOCKED without process `DIRECT_DATABASE_URL`; same named env gate.
- `pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency`: source tests passed and database tests were skipped with named `TEST_DATABASE_URL` blockers when env was not loaded.
- `.env.local` loaded into the PowerShell process, then `pnpm --filter "@queue/db" drizzle:migrate`: passed, migrations applied successfully.
- `.env.local` loaded into the PowerShell process, then `pnpm --filter "@queue/db" test:integration -- roulette-migrations roulette-rls roulette-concurrency`: passed, 13 tests passed.
- Acceptance greps for roulette table names, forced RLS plus `has_duo_membership`, migration journal tag, grants/comments and roulette notification types all passed.
- `git diff --check`: passed, with only Git's existing LF-to-CRLF warning for `policies.sql`.

## Blocked Evidence

- BLOCKED `DIRECT_DATABASE_URL`: raw `drizzle:generate` and `drizzle:migrate` fail when the shell process does not export the direct database URL.
- BLOCKED `TEST_DATABASE_URL`: raw database integration runs skip DB fixtures and print explicit roulette migration, RLS and concurrency setup blockers.
- Resolution for this execution: `.env.local` contains the needed database variables, and loading it into the same PowerShell process allowed migration plus all 13 database-backed roulette tests to pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed duplicate boost spend in concurrency helper**
- **Found during:** Task 1 GREEN verification.
- **Issue:** The existing roulette concurrency helper updated boost balance after a replayed ledger conflict, which could double-subtract shared XP in the fixture.
- **Fix:** Changed the helper to update the balance only from the CTE row returned by the winning ledger insert.
- **Files modified:** `packages/db/tests/roulette-concurrency.test.ts`
- **Commit:** `d95bd0b`

**2. [Rule 2 - Missing critical security] Kept cross-duo rejection at RLS**
- **Found during:** Task 1 GREEN RLS verification.
- **Issue:** Security-definer integrity triggers could raise internal validation errors before RLS denied a non-member write.
- **Fix:** Added membership guards to roulette trigger functions so non-member rows return to the caller and are rejected by forced RLS.
- **Files modified:** `packages/db/src/migrations/0015_roulette_core.sql`
- **Commit:** `d95bd0b`

**3. [Rule 3 - Blocking tooling] Removed generated full-schema Drizzle baseline**
- **Found during:** `drizzle:generate` with env loaded.
- **Issue:** Drizzle generated a full-schema `0015_flimsy_mimic.sql` and snapshot because this repo has no prior Drizzle snapshots, which would have conflicted with the reviewed manual migration.
- **Fix:** Removed the generated artifacts and restored the journal to the single reviewed `0015_roulette_core` migration entry.
- **Files modified:** `packages/db/src/migrations/meta/_journal.json`
- **Commit:** `d95bd0b`

**4. [Rule 3 - Verification] Made RLS policy grep deterministic**
- **Found during:** Acceptance-grep verification.
- **Issue:** `has_duo_membership` calls were split onto lines that did not include `roulette`, so the exact plan grep did not show membership checks.
- **Fix:** Reflowed roulette policy declarations in `policies.sql` onto single lines without changing SQL semantics.
- **Files modified:** `packages/db/src/rls/policies.sql`
- **Commit:** `889953c`

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

No unplanned threat surface was introduced. The new database trust boundary, RLS, grants and notification constraint changes are the explicit scope of this plan and its threat model.

## TDD Gate Compliance

PASSED.

- RED commit exists: `17325cf`
- GREEN commit exists after RED: `d95bd0b`
- REFACTOR commit exists after GREEN: `889953c`

## Next Plan Readiness

Ready for `06-02`; roulette database facts are persisted and protected for the next application/domain implementation plan.

## Self-Check: PASSED

- Created file exists: `packages/db/src/migrations/0015_roulette_core.sql`
- Summary file exists: `.planning/phases/06-roleta-e-economia/06-01-SUMMARY.md`
- Task commits found in git history: `17325cf`, `d95bd0b`, `889953c`
- Worktree was clean before writing this summary.
