---
phase: 03-descoberta-e-matches
plan: "01"
subsystem: discovery
tags: [postgres, rls, drizzle, vitest, mood-quiz, recommendation]

requires:
  - phase: 02.1-localizacao-e-qualidade-do-catalogo
    provides: Published PT-BR catalog reads, sourced time/availability facts and library compatibility baseline.
provides:
  - Duo-scoped discovery persistence for member decisions, matches, live sessions, mood quiz answers and push subscriptions.
  - Forced-RLS policies and least-privilege grants for discovery tables.
  - Pure discovery decision, match, cooldown, mood merge, filter and recommendation policies.
  - Focused database integration tests for discovery RLS/concurrency and web domain tests for discovery rules.
affects: [03-02, 03-03, 03-04, phase-6-roleta]

tech-stack:
  added: []
  patterns:
    - Duo-scoped discovery tables use forced RLS plus owner/member write policies.
    - Discovery domain rules consume plain facts and avoid framework/database imports.
    - Collaborative recommendation influence remains weight zero until data thresholds are met.

key-files:
  created:
    - packages/db/src/migrations/0008_discovery_core.sql
    - packages/db/tests/discovery-rls.test.ts
    - packages/db/tests/discovery-concurrency.test.ts
    - apps/web/src/modules/discovery/domain/discovery-policy.ts
    - apps/web/src/modules/discovery/domain/mood-quiz.ts
    - apps/web/src/modules/discovery/domain/recommendation-policy.ts
    - apps/web/src/modules/discovery/application/ports.ts
    - apps/web/src/modules/discovery/index.ts
    - apps/web/tests/discovery-domain.test.ts
  modified:
    - packages/db/src/schema/app.ts
    - packages/db/src/rls/policies.sql
    - packages/db/src/roles.sql

key-decisions:
  - "Agora nao uses a 14-day cooldown and negative recommendation weight; Pular stays weight zero."
  - "Collaborative recommendation influence requires at least 20 current-duo decisions and 100 cross-duo positive facts."
  - "Discovery library handoff is limited to Wishlist, Jogando and Pausado during Phase 3."
  - "Push subscription rows are writable/readable only by their owning member because endpoint/auth material is sensitive."

patterns-established:
  - "Discovery module entrypoint exposes pure contracts first; persistence adapters remain for the next plan."
  - "Recommendation reasons are compact labels such as PC em comum, campanha 2p and Game Pass verificado."

requirements-completed: [DISC-01, DISC-03, DISC-04, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, DISC-11]

duration: 16 min
completed: 2026-06-04
---

# Phase 03 Plan 01: Discovery Persistence And Domain Foundation Summary

**Duo-scoped discovery storage with forced RLS plus pure decision, mood and cold-start recommendation policies.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-04T04:02:27Z
- **Completed:** 2026-06-04T04:18:06Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Added `app.discovery_member_decisions`, `app.discovery_matches`, `app.discovery_live_sessions`, `app.discovery_mood_quiz_answers` and `app.discovery_push_subscriptions` with constraints, indexes, forced RLS and runtime/worker grants.
- Created pure discovery policies for `want`, `not_now`, `skip`, duplicate-match handling, deck exclusion, valid library handoff and source modes.
- Added the three-question mood quiz merge contract, recommendation filter validation, cold-start ranking, explainable reasons and collaborative threshold gating.
- Added focused Vitest coverage for discovery domain rules and database integration tests for RLS isolation plus concurrent reciprocal match creation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add discovery database schema, RLS and grants** - `f80b8f8` (feat)
2. **Task 2: Implement discovery decision and match domain rules** - `f187b69` (feat)
3. **Task 3: Implement mood, filter and recommendation policies** - `6a8bb97` (feat)

**Plan metadata:** pending final commit

## Files Created/Modified

- `packages/db/src/migrations/0008_discovery_core.sql` - Discovery tables, indexes, constraints, forced RLS policies and grants.
- `packages/db/src/schema/app.ts` - Drizzle schema definitions for discovery persistence.
- `packages/db/src/rls/policies.sql` - Canonical discovery RLS policies.
- `packages/db/src/roles.sql` - Runtime, worker and read-only grants for discovery tables without DELETE.
- `packages/db/tests/discovery-rls.test.ts` - Cross-duo isolation, owner-only member rows, match/live authorization and index/RLS checks.
- `packages/db/tests/discovery-concurrency.test.ts` - Concurrent reciprocal approvals create one match row.
- `apps/web/src/modules/discovery/domain/discovery-policy.ts` - Pure decision, cooldown, match and library handoff rules.
- `apps/web/src/modules/discovery/domain/mood-quiz.ts` - Three-question mood quiz and conservative duo merge.
- `apps/web/src/modules/discovery/domain/recommendation-policy.ts` - Filter validation, cold-start ranking, reason labels, variety band and collaborative threshold gate.
- `apps/web/src/modules/discovery/application/ports.ts` - Discovery application contracts and repository ports.
- `apps/web/src/modules/discovery/index.ts` - Public discovery module entrypoint.
- `apps/web/tests/discovery-domain.test.ts` - Domain coverage for decisions, mood and recommendations.

## Decisions Made

- `Agora nao` uses a 14-day cooldown and `-2` preference weight, while `Pular` removes the current card with zero preference impact.
- Collaborative influence is disabled below 20 current-duo decisions or 100 cross-duo positive facts; above threshold it remains a low-weight signal.
- One-member mood quiz answers return `preview-only`; full recommendation mode requires both members.
- Push subscription endpoint/key material is not shared across duo members at the RLS read layer, even though other discovery state is duo-readable.

## Verification

- `pnpm --filter @queue/db typecheck` - passed.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/web test -- discovery-domain` - passed, 14 tests.
- `pnpm check:architecture` - passed.
- `pnpm --filter @queue/db test:integration -- discovery` - explicit skip: `TEST_DATABASE_URL is not configured`.

## Acceptance Criteria

- Cross-duo discovery SELECT/INSERT/UPDATE behavior is covered by `packages/db/tests/discovery-rls.test.ts`; execution requires `TEST_DATABASE_URL`.
- Partner decision, quiz and push subscription overwrite attempts are covered by `packages/db/tests/discovery-rls.test.ts`; execution requires `TEST_DATABASE_URL`.
- Concurrent reciprocal approvals are covered by `packages/db/tests/discovery-concurrency.test.ts`; execution requires `TEST_DATABASE_URL`.
- Hot-read indexes exist for deck exclusion, cooldown expiry, match history, live session lookup and partner match detection.
- Decision, mood and recommendation rules are pure and covered by `apps/web/tests/discovery-domain.test.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Restricted push subscription reads to the owning member**
- **Found during:** Task 1 (Add discovery database schema, RLS and grants)
- **Issue:** Push rows include endpoint and Web Push auth material. Duo-wide SELECT would expose another member's browser subscription material unnecessarily.
- **Fix:** `app_discovery_push_subscriptions_select_own` requires `user_id = app.current_user_id()` while insert/update remain owner-only.
- **Files modified:** `packages/db/src/migrations/0008_discovery_core.sql`, `packages/db/src/rls/policies.sql`, `packages/db/tests/discovery-rls.test.ts`
- **Verification:** SQL policy inspection, db typecheck and discovery RLS test coverage; integration execution skipped without `TEST_DATABASE_URL`.
- **Committed in:** `f80b8f8`

**2. [Rule 1 - Bug] Fixed strict indexed access in mood merge**
- **Found during:** Task 3 (Implement mood, filter and recommendation policies)
- **Issue:** `noUncheckedIndexedAccess` flagged possible undefined answers after array length checks.
- **Fix:** Captured checked array entries with non-null assertions before merge operations.
- **Files modified:** `apps/web/src/modules/discovery/domain/mood-quiz.ts`
- **Verification:** `pnpm --filter @queue/web typecheck` and `pnpm --filter @queue/web test -- discovery-domain`.
- **Committed in:** `6a8bb97`

---

**Total deviations:** 2 auto-fixed (1 security hardening, 1 implementation bug)
**Impact on plan:** Both changes preserve the planned behavior and tighten correctness/security. No scope expansion beyond the discovery foundation.

## Issues Encountered

- `TEST_DATABASE_URL` is not configured in this environment, so discovery RLS and concurrency integration tests were collected but skipped explicitly. This is not a pass for the database controls; run against an isolated Neon/Postgres test branch before release gating.

## Known Stubs

None - no placeholder/TODO stubs were found in files created or modified by this plan.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/03-descoberta-e-matches/03-01-SUMMARY.md`.
- Task commits found: `f80b8f8`, `f187b69`, `6a8bb97`.
- Key created files found: `packages/db/src/migrations/0008_discovery_core.sql`, `apps/web/src/modules/discovery/domain/discovery-policy.ts`, `apps/web/src/modules/discovery/domain/recommendation-policy.ts`, `packages/db/tests/discovery-concurrency.test.ts`.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

Ready for `03-02`: application services can now persist decisions, create matches transactionally, build decks/search/surprise flows from the pure policies, and hand matched games to library actions without introducing business rules in routes or UI.

---
*Phase: 03-descoberta-e-matches*
*Completed: 2026-06-04*
