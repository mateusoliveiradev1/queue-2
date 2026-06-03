---
phase: 01-fundacao-modular-marca-auth-e-dupla
plan: "02"
subsystem: database
tags: [postgres, neon, drizzle, rls, vitest]

requires:
  - phase: 01-01
    provides: "pnpm/Turborepo workspace, @queue/db package and architecture checker"
provides:
  - "Postgres foundation migration for auth, app, catalog and ops schemas"
  - "Duo identity, pairing, preferences, operational event and idempotency tables"
  - "Forced RLS policies with transaction-local app user identity"
  - "Least-privileged role contract for migrator, app runtime, worker and read-only access"
  - "Environment-gated integration tests for migrations, cross-duo isolation and pairing concurrency"
  - "Neon restore rehearsal runbook and user setup checklist"
affects: [phase-01, database, auth, duo, security, neon]

tech-stack:
  added: [drizzle-orm, drizzle-kit, pg, "@neondatabase/serverless", vitest]
  patterns:
    - "Use DIRECT_DATABASE_URL for migrations and DATABASE_URL for pooled runtime access."
    - "Set queue2.user_id transaction-locally before any duo-scoped runtime query."
    - "Use SECURITY DEFINER SQL functions for membership checks and pairing claims, with fixed search_path and restricted EXECUTE grants."
    - "Gate database integration tests on TEST_DATABASE_URL with an explicit skip message."

key-files:
  created:
    - ".env.example"
    - "packages/db/drizzle.config.ts"
    - "packages/db/src/client.ts"
    - "packages/db/src/migrations/0001_foundation.sql"
    - "packages/db/src/rls/membership.sql"
    - "packages/db/src/rls/policies.sql"
    - "packages/db/src/schema/auth.ts"
    - "packages/db/src/schema/app.ts"
    - "packages/db/src/schema/ops.ts"
    - "packages/db/src/testing/migrate-empty.ts"
    - "packages/db/src/testing/rls-test-context.ts"
    - "packages/db/tests/migrations.test.ts"
    - "packages/db/tests/rls-isolation.test.ts"
    - "packages/db/tests/pairing-concurrency.test.ts"
    - "packages/db/RESTORE.md"
  modified:
    - "packages/db/package.json"
    - "packages/db/src/index.ts"
    - "packages/db/src/roles.sql"
    - "pnpm-lock.yaml"
    - "pnpm-workspace.yaml"

key-decisions:
  - "Runtime database identity is stored in transaction-local queue2.user_id so pooled connections cannot leak authorization context."
  - "Duo creation and pairing claims are SQL function paths; the runtime role does not receive direct duo membership writes."
  - "Integration tests skip only when TEST_DATABASE_URL is absent and print the missing-env reason."
  - "Neon restore rehearsal is documented as a branch-based pre-launch gate."

patterns-established:
  - "Database tests apply the checked-in SQL migration instead of relying on generated state."
  - "RLS policies are kept in standalone SQL files and mirrored into the foundation migration."
  - "Duo-scoped operational facts are append-only through runtime grants."

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, DATA-11, DATA-12, DUO-04, DUO-09, DUO-10, SEC-01, SAFE-09]

duration: 16 min
completed: 2026-06-03
---

# Phase 01 Plan 02: Database Foundation Summary

**Postgres schemas, forced duo RLS, pairing concurrency functions and Neon restore rehearsal for QUEUE/2**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-03T04:04:28Z
- **Completed:** 2026-06-03T04:20:52Z
- **Tasks:** 3
- **Files modified:** 24

## Accomplishments

- Created the Phase 1 database foundation across `auth`, `catalog`, `app` and `ops` ownership boundaries.
- Added forced RLS, membership helpers and transaction-local user context for duo-scoped data access.
- Added integration tests for empty/upgrade migration, runtime role restrictions, cross-duo denial and concurrent pairing.
- Documented Neon branch separation, restore-window rehearsal and required connection-string setup.

## Task Commits

1. **Task 1: Define schemas, migrations and role contract** - `da56322` (feat)
2. **Task 2: Implement RLS helpers and duo invariants** - `cc279ce` (feat)
3. **Task 3: Add database verification tests and restore notes** - `fa15f52` (test)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `.env.example` - Documents pooled runtime, direct migration and test database URLs.
- `packages/db/drizzle.config.ts` - Configures Drizzle Kit against `DIRECT_DATABASE_URL`.
- `packages/db/src/schema/*.ts` - Defines auth, app and ops Drizzle schema contracts.
- `packages/db/src/migrations/0001_foundation.sql` - Creates schemas, tables, constraints, indexes, roles, helpers and RLS policies.
- `packages/db/src/rls/*.sql` - Keeps membership helpers and policies auditable outside the migration file.
- `packages/db/src/client.ts` - Adds server-only runtime pool and transaction-local user helpers.
- `packages/db/src/testing/*.ts` - Adds migration and RLS test helpers.
- `packages/db/tests/*.test.ts` - Adds migration, isolation and pairing concurrency integration tests.
- `packages/db/RESTORE.md` - Documents Neon branch restore rehearsal.
- `packages/db/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` - Adds database/test dependencies, scripts and esbuild build approval.

## Decisions Made

- Runtime authorization context uses `set_config('queue2.user_id', ..., true)` inside a transaction, not session-level `SET`.
- Pairing code creation and claims are SQL function paths so direct runtime grants stay narrow.
- `queue2_app_runtime` can query and update only through RLS-protected grants and cannot create schemas or bypass RLS.
- Integration tests are mandatory when `TEST_DATABASE_URL` exists and explicit skips when it does not.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added database package scripts, config and dependencies**
- **Found during:** Task 1
- **Issue:** `@queue/db` was still the Plan 01-01 server-only stub with no `tsconfig`, database dependencies or test scripts, so the plan's verification commands could not run.
- **Fix:** Added package scripts, `tsconfig`, Drizzle/Vitest config and required database/test dependencies.
- **Files modified:** `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/vitest.integration.config.ts`, `pnpm-lock.yaml`
- **Verification:** `pnpm --filter @queue/db typecheck` and `pnpm --filter @queue/db test:integration`
- **Committed in:** `da56322`, `fa15f52`

**2. [Rule 3 - Blocking] Approved esbuild build scripts for pnpm 11**
- **Found during:** Task 1
- **Issue:** `pnpm install` stopped at `ERR_PNPM_IGNORED_BUILDS` for `esbuild`, preventing dependency installation.
- **Fix:** Added explicit `allowBuilds.esbuild: true` while preserving the existing `sharp` approval.
- **Files modified:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- **Verification:** `pnpm install` completed and ran esbuild postinstall checks.
- **Committed in:** `da56322`

**3. [Rule 1 - Bug] Fixed pg query helper values typing**
- **Found during:** Task 2
- **Issue:** `queryAsAppUser` accepted a readonly values array, but `pg` expects a mutable values array.
- **Fix:** Changed the helper parameter to `unknown[]`.
- **Files modified:** `packages/db/src/client.ts`
- **Verification:** `pnpm --filter @queue/db typecheck`
- **Committed in:** `cc279ce`

**4. [Rule 2 - Missing Critical] Removed direct runtime duo insertion**
- **Found during:** Task 3
- **Issue:** The runtime role did not need direct `INSERT` on `app.duos`; keeping it could permit orphan duo rows outside the pairing function path.
- **Fix:** Tightened grants to `SELECT, UPDATE` on `app.duos`; duo creation remains available through `app.create_duo_with_pairing_code`.
- **Files modified:** `packages/db/src/roles.sql`, `packages/db/src/migrations/0001_foundation.sql`
- **Verification:** role grant grep, `pnpm --filter @queue/db typecheck`, `pnpm --filter @queue/db test:integration`
- **Committed in:** `fa15f52`

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 bug, 1 missing critical).
**Impact on plan:** All deviations were required to satisfy the database verification, least-privilege and non-interactive workflow guarantees. No later plan scope was implemented.

## Issues Encountered

- `TEST_DATABASE_URL` is not configured in this environment, so database integration tests skipped with an explicit message. The tests are executable and will run when pointed at an isolated Neon branch or local Postgres database.

## Verification

- `pnpm --filter @queue/db typecheck` -> passed.
- `pnpm --filter @queue/db test:integration` -> passed with 3 files / 5 tests skipped because `TEST_DATABASE_URL` is absent.
- `pnpm check:architecture` -> passed.
- `pnpm verify` -> passed; database integration tests skipped with explicit missing-env output.
- SQL inspection confirmed `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, `SECURITY DEFINER`, fixed `search_path`, restricted function grants and RLS predicate indexes.
- Test inspection confirmed cross-duo read/write denial and concurrent pairing assertions exist.

## Known Stubs

None. The scan found only `.env.example` placeholder connection strings, an intentional upgrade-test label and a non-UI empty default parameter.

## Authentication Gates

None.

## User Setup Required

External Neon branch and connection-string setup is required. See `01-02-USER-SETUP.md` for:

- `DATABASE_URL`, `DIRECT_DATABASE_URL` and `TEST_DATABASE_URL`
- Neon development, preview/test and production branch separation
- Restore-window rehearsal setup before production launch

## Next Phase Readiness

The database foundation is ready for the remaining Phase 1 auth, brand and duo implementation plans. Live database verification remains gated on `TEST_DATABASE_URL`; once configured, run `pnpm --filter @queue/db test:integration` to execute migration, RLS and pairing concurrency tests against a real branch.

## Self-Check: PASSED

- Confirmed key created files exist on disk.
- Confirmed task commits `da56322`, `cc279ce` and `fa15f52` exist in git history.
- Re-ran task and plan verification before writing this summary.

---

*Phase: 01-fundacao-modular-marca-auth-e-dupla*
*Completed: 2026-06-03*
