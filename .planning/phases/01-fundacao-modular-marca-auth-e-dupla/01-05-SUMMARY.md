---
phase: 01-fundacao-modular-marca-auth-e-dupla
plan: 01-05
subsystem: duo
tags: [duo, pairing, rls, drizzle, rate-limit, server-actions, vitest]

requires:
  - phase: 01-02
    provides: "Postgres duo schema, RLS roles and atomic pairing claim foundation"
  - phase: 01-03
    provides: "QUEUE/2 pairing, dashboard, profile and duo route surfaces"
  - phase: 01-04
    provides: "Verified Better Auth sessions and protected app route gates"
provides:
  - "Duo domain rules and application use cases for pairing, identity and shared settings"
  - "RLS-scoped duo repository with atomic claim and revoke database functions"
  - "Persistent pairing-attempt rate limits"
  - "Redacted pairing-attempt security logs and successful pairing audit records"
  - "Server-backed pairing, dashboard, profile and duo settings pages"
  - "Duo flow, domain and application-isolation test coverage"
affects: [duo, security, app-router, database, future-catalog, future-gameplay]

tech-stack:
  added: [kysely-override]
  patterns:
    - "Duo business rules stay in pure domain and application modules"
    - "Duo repository operations run inside transaction-local app-user identity"
    - "Pairing code claims and revocations use restricted database functions"
    - "Authenticated app routes resolve authoritative duo route state before rendering"
    - "Persistent rate-limit keys are namespaced by operation and user"

key-files:
  created:
    - apps/web/src/modules/duo/domain/pairing-code.ts
    - apps/web/src/modules/duo/domain/duo-policy.ts
    - apps/web/src/modules/duo/application/ports.ts
    - apps/web/src/modules/duo/application/create-pairing-code.ts
    - apps/web/src/modules/duo/application/join-duo.ts
    - apps/web/src/modules/duo/application/update-duo-settings.ts
    - apps/web/src/modules/duo/application/get-duo-dashboard.ts
    - apps/web/src/modules/duo/infrastructure/duo-repository.ts
    - apps/web/src/modules/duo/presentation/view-models.ts
    - apps/web/src/platform/rate-limit/persistent.ts
    - apps/web/src/platform/security/audit.ts
    - packages/db/src/migrations/0002_pairing_runtime.sql
    - packages/db/src/migrations/0003_review_hardening.sql
    - apps/web/tests/duo-domain.test.ts
    - apps/web/tests/duo-flow.test.ts
    - apps/web/tests/duo-isolation.test.ts
  modified:
    - apps/web/src/modules/duo/index.ts
    - apps/web/src/app/(public)/parear/page.tsx
    - apps/web/src/app/app/page.tsx
    - apps/web/src/app/app/perfil/page.tsx
    - apps/web/src/app/app/dupla/page.tsx
    - packages/db/src/rls/membership.sql
    - packages/db/src/testing/migrate-empty.ts
    - pnpm-workspace.yaml
    - pnpm-lock.yaml

key-decisions:
  - "Verified session identity, including display name, is resolved on the server and never trusted from hidden form fields."
  - "Pairing claim and revoke behavior is implemented as restricted database functions so concurrency and authorization remain authoritative."
  - "Pairing attempt limits use persistent database storage rather than process memory."
  - "Kysely is pinned to 0.28.17 through a workspace override to keep Better Auth's adapter production-build compatible."

patterns-established:
  - "Duo pages consume public module view models and actions instead of importing repository internals."
  - "Duo-scoped reads and mutations use withAppUserTransaction and never privileged migrator access."
  - "Pairing failures map to neutral inactive, limited and race-lost product states."
  - "Pairing audit records retain outcomes without logging submitted codes or credentials."

requirements-completed: [DUO-01, DUO-02, DUO-03, DUO-04, DUO-05, DUO-06, DUO-07, DUO-08, DUO-09, DUO-10, SEC-02, SEC-04, SEC-06, SEC-07]

duration: 1h 13m
completed: 2026-06-03
---

# Phase 01 Plan 05: Duo Pairing And Route State Summary

**Duo pairing and identity backed by transaction-local RLS access, persistent attempt limits, server actions and route-state enforcement**

## Performance

- **Duration:** 1h 13m
- **Started:** 2026-06-03T07:47:00-03:00
- **Completed:** 2026-06-03T09:00:28-03:00
- **Tasks:** 3
- **Files modified:** 28

## Accomplishments

- Implemented pure duo domain rules and application use cases for six-character pairing codes, duo membership, identity, timezone and shared preferences.
- Added an RLS-scoped Drizzle repository, atomic pairing claim and revoke functions, and persistent pairing-attempt rate limits.
- Replaced pairing, dashboard, profile and duo placeholders with server-backed authoritative state and route enforcement.
- Added domain, flow and application-isolation tests covering pairing outcomes, no-solo behavior, plain-text validation and cross-duo denial.
- Added redacted pairing-attempt security records and a duo-scoped `duo.pairing_completed` audit event after successful claims.

## Task Commits

1. **Task 1: Create duo domain rules and application use cases** - `356a134` (feat)
2. **Task 2: Implement repository, transactions and rate limits** - `4dc87c8` (feat)
3. **Task 3: Wire pairing, dashboard, profile and duo pages** - `7e378b4` (feat)

**Plan metadata:** pending final docs commit

**Post-plan review/verifier fixes:** `b279c0a`, `a287d8d`, `8711193`

## Files Created/Modified

- `apps/web/src/modules/duo/domain/*` - Pure pairing-code and duo policy rules.
- `apps/web/src/modules/duo/application/*` - Duo use cases and infrastructure ports.
- `apps/web/src/modules/duo/infrastructure/duo-repository.ts` - RLS-scoped Drizzle persistence and atomic pairing state mapping.
- `apps/web/src/modules/duo/presentation/view-models.ts` - Portuguese route-facing states and messages.
- `apps/web/src/modules/duo/index.ts` - Server-only public duo module actions and view helpers.
- `apps/web/src/platform/rate-limit/persistent.ts` - Database-backed operation rate limiter.
- `apps/web/src/platform/security/audit.ts` - Structured pairing-attempt audit log contract without codes or credentials.
- `apps/web/src/app/(public)/parear/page.tsx` - Pairing code creation, revoke and join flow.
- `apps/web/src/app/app/*` - Duo-scoped dashboard, profile and shared settings pages.
- `packages/db/src/migrations/0002_pairing_runtime.sql` - Restricted pairing claim and revoke runtime functions.
- `packages/db/src/rls/membership.sql` - Source RLS/function contract updated for pairing runtime behavior.
- `packages/db/src/testing/migrate-empty.ts` - Test migration runner now applies all numbered migrations in order.
- `apps/web/tests/duo-*.test.ts` - Duo domain, flow and application-isolation coverage.
- `pnpm-workspace.yaml` and `pnpm-lock.yaml` - Kysely compatibility override for Better Auth.

## Decisions Made

- Pairing actions use the verified session user's server-resolved name. Client-provided display-name fields are not an identity authority.
- Atomic claim and safe revoke behavior belongs in restricted Postgres functions because application-only checks cannot guarantee race safety.
- Pairing attempt limits persist in `auth.rate_limit`, namespaced by user and operation, so serverless process restarts do not reset abuse controls.
- Better Auth and pairing attempt limits use the same bigint epoch-millisecond rate-limit timestamp contract.
- Concurrent race-lost classification is tied to the exact active pairing-code row observed by the claimant; later historical attempts remain neutral inactive failures.
- Kysely remains pinned to `0.28.17` until Better Auth's adapter is verified against a newer compatible release.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added safe pairing revoke and race-lost database behavior**
- **Found during:** Task 2
- **Issue:** The existing database contract could claim a pairing code but could not safely revoke it or distinguish a concurrent losing claimant without weakening runtime grants.
- **Fix:** Added immutable migration `0002_pairing_runtime.sql`, updated the source membership SQL and made the empty-database test migrator apply all numbered migrations.
- **Files modified:** `packages/db/src/migrations/0002_pairing_runtime.sql`, `packages/db/src/rls/membership.sql`, `packages/db/src/testing/migrate-empty.ts`
- **Verification:** `pnpm --filter @queue/db typecheck`, `pnpm --filter @queue/db test:integration`, `pnpm verify`
- **Committed in:** `4dc87c8`

**2. [Rule 3 - Blocking] Pinned Kysely for Better Auth production-build compatibility**
- **Found during:** Task 3
- **Issue:** Better Auth's installed Kysely adapter failed the Next.js production build with `kysely@0.29.2` because expected migration exports were absent.
- **Fix:** Added a workspace override for `kysely@0.28.17`, which is inside the adapter's supported peer range.
- **Files modified:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- **Verification:** `pnpm --filter @queue/web build`
- **Committed in:** `7e378b4`

**3. [Rule 1 - Security] Removed client display-name authority from pairing actions**
- **Found during:** Task 3
- **Issue:** Hidden client form values could have been treated as the pairing member's display name.
- **Fix:** Resolved the name from the verified server session and retained application-level plain-text validation and fallback behavior.
- **Files modified:** `apps/web/src/modules/duo/index.ts`, `apps/web/src/modules/duo/application/join-duo.ts`, `apps/web/src/app/(public)/parear/page.tsx`
- **Verification:** `pnpm --filter @queue/web test -- duo`, `pnpm --filter @queue/web typecheck`
- **Committed in:** `7e378b4`

**4. [Code Review - Security] Aligned persistent rate limits and pairing trust-boundary validation**
- **Found during:** Mandatory phase code review
- **Issue:** Better Auth expected bigint rate-limit timestamps, while pairing used `timestamptz`; pairing creation and revoke also accepted unvalidated client-controlled values.
- **Fix:** Added immutable migration `0003_review_hardening.sql`, switched the pairing limiter to epoch milliseconds, validated timezone and UUID inputs before repository access, and tied race-lost classification to the selected code row.
- **Files modified:** `packages/db/src/migrations/0003_review_hardening.sql`, `packages/db/src/schema/auth.ts`, `apps/web/src/platform/rate-limit/persistent.ts`, `apps/web/src/modules/duo/application/create-pairing-code.ts`, `packages/db/src/rls/membership.sql`
- **Verification:** `pnpm --filter @queue/web test`, `pnpm typecheck`, `pnpm lint`, `pnpm verify`, `pnpm phase:1:gate`
- **Committed in:** `b279c0a`, `a287d8d`

**5. [Verifier - Security] Retained pairing audit events without sensitive values**
- **Found during:** Goal-backward phase verification
- **Issue:** Pairing outcomes were user-visible but did not retain an explicit security audit event outside the settings-update path.
- **Fix:** Logged redacted pairing-attempt outcomes and inserted a duo-scoped successful-pairing audit event without the submitted code.
- **Files modified:** `apps/web/src/app/(public)/parear/page.tsx`, `apps/web/src/platform/security/audit.ts`, `apps/web/src/modules/duo/infrastructure/duo-repository.ts`
- **Verification:** `pnpm --filter @queue/web test`, `pnpm --filter @queue/web typecheck`, `pnpm lint`, `pnpm check:architecture`
- **Committed in:** `8711193`

---

**Total deviations:** 5 auto-fixed (1 Rule 1, 1 Rule 2, 1 Rule 3, 1 code review, 1 verifier closure)
**Impact on plan:** The fixes preserve the planned duo scope while making pairing concurrency, authorization and production builds reliable.

## Issues Encountered

- Database integration tests exited successfully but skipped because `TEST_DATABASE_URL` is not configured. Live Postgres RLS and concurrency verification remains required.
- The production build requires auth/database environment variables. It passed with non-production build-time values for `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.
- Next.js still warns that a parent `C:\Users\Liiiraa\package-lock.json` causes workspace-root inference; Plan 01-06 can set the explicit root.

## User Setup Required

Database and auth environment setup remains required before live pairing verification. Follow `01-02-USER-SETUP.md`, including `TEST_DATABASE_URL` for integration tests.

## Known Stubs

None in the Phase 1 duo pairing, identity, profile or shared-settings scope.

## Threat Flags

- Live RLS and concurrent pairing behavior must be verified against a configured Postgres test database before release.

## Verification

- `pnpm --filter @queue/web test -- duo-domain` - passed
- `pnpm --filter @queue/web test -- duo` - passed
- `pnpm --filter @queue/web test -- duo-flow` - passed
- `pnpm --filter @queue/web test` - passed, 62 tests after verifier closure
- `pnpm --filter @queue/web typecheck` - passed
- `pnpm --filter @queue/db typecheck` - passed
- `pnpm check:architecture` - passed
- `pnpm --filter @queue/db test:integration` - exited 0; skipped without `TEST_DATABASE_URL`
- `pnpm verify` - passed; database integration tests skipped without `TEST_DATABASE_URL`
- `pnpm --filter @queue/web build` - passed with non-production build-time auth/database values
- `pnpm phase:1:gate` - passed local checks and production build; database and Playwright gates explicitly skipped

## Auth Gates

None.

## Next Phase Readiness

- Plan 01-06 can add security headers, restore documentation, end-to-end checks and the Phase 1 release gate on top of authoritative duo state.
- Real deployment and test database values are still required for live auth, RLS and pairing verification.

## Self-Check: PASSED

- Found summary, key implementation files and task commits `356a134`, `4dc87c8` and `7e378b4`.
- Plan-level unit, architecture, typecheck, verification and production-build checks passed.
- Environment-gated live database tests are recorded as pending rather than treated as executed.

---
*Phase: 01-fundacao-modular-marca-auth-e-dupla*
*Completed: 2026-06-03*
