---
phase: 05-gamificacao-coletiva
plan: 05
subsystem: ui-api-jobs
tags: [nextjs, gamification, cron, postgres, rls, accessibility]

requires:
  - phase: 05-gamificacao-coletiva
    provides: "05-02 XP/streak domain contracts, 05-03 reward application, 05-04 achievements route"
provides:
  - "Authenticated /app/desafios route with weekly, monthly and seasonal challenge read model"
  - "CRON_SECRET-guarded gamification maintenance route and local trigger script"
  - "Idempotent quest rotation and streak Freeze maintenance use cases"
  - "Permanent monthly and seasonal challenge rewards mapped to achievement seals"
affects: [phase-05, gamification, app-shell, jobs, accessibility, performance]

tech-stack:
  added: []
  patterns:
    - "Server-authoritative gamification read models behind verified session routes"
    - "ops.scheduled_jobs runners claimed with bounded batches and FOR UPDATE SKIP LOCKED"
    - "Challenge completion rewards through existing XP ledger and achievement unlock contracts"

key-files:
  created:
    - "apps/web/src/app/app/desafios/page.tsx"
    - "apps/web/src/modules/gamification/application/get-challenges.ts"
    - "apps/web/src/modules/gamification/application/run-quest-rotation-jobs.ts"
    - "apps/web/src/modules/gamification/application/run-streak-jobs.ts"
    - "apps/web/src/modules/gamification/jobs.ts"
    - "apps/web/src/app/api/jobs/gamification/maintenance/route.ts"
    - "scripts/gamification-maintenance.ts"
  modified:
    - "apps/web/src/modules/gamification/application/apply-gamification-fact.ts"
    - "apps/web/src/modules/gamification/domain/quest-catalog.ts"
    - "apps/web/src/modules/gamification/presentation/view-models.ts"
    - "apps/web/src/components/app-shell.tsx"
    - "apps/web/src/app/globals.css"
    - "vercel.json"

key-decisions:
  - "Use existing achievement catalog seeds for monthly and seasonal permanent seals instead of adding schema or cosmetic inventory."
  - "Require job payload createdByUserId so maintenance mutations run through existing duo-scoped RLS context."
  - "Keep challenge UI read-only; progress, XP, Freeze consumption and seal unlocks stay server-authoritative."

patterns-established:
  - "Gamification maintenance route mirrors play reminder route: node runtime, force dynamic, maxDuration 300, CRON_SECRET bearer guard."
  - "Seasonal challenge cards expose seal history copy from completedAt without visible failure history for expired/incomplete cycles."
  - "App route additions update AppShell, performance route allowlist and accessibility coverage together."

requirements-completed: [PLAY-05, GAME-09, GAME-10, GAME-11, GAME-12, GAME-13, GAME-14, GAME-15, GAME-16, GAME-17, SAFE-03]

duration: 17min
completed: 2026-06-06
---

# Phase 05 Plan 05: Challenge Rotation and Streak Maintenance Summary

**Desafios semanais/mensais/sazonais com Streak Freeze automatico, rota cron protegida e selos permanentes por conclusao real da dupla**

## Performance

- **Duration:** 17min
- **Started:** 2026-06-06T10:36:00Z
- **Completed:** 2026-06-06T10:52:42Z
- **Tasks:** 3
- **Files modified:** 27

## Accomplishments

- Added `/app/desafios` as a real authenticated product route in PT-BR with weekly, monthly and seasonal challenge sections, Streak panel, Streak Freeze state, filters, focus states and responsive mobile navigation.
- Added `getChallenges` read model so challenge UI reads duo-scoped server state only; the UI cannot create progress or consume freezes.
- Added gamification maintenance route/script using `CRON_SECRET`, bounded claim limits and existing `ops.scheduled_jobs` claim semantics for duplicate/overlapping runner safety.
- Implemented quest rotation for active weekly/monthly/seasonal windows and automatic streak checks that consume at most one Freeze per missed duo-day.
- Wired monthly and seasonal challenge completions to existing permanent achievement/seal seeds while keeping XP payout idempotent through the canonical `app.duo_xp_awards` ledger.

## Task Commits

1. **Task 1: Add challenge read model and `/app/desafios` page** - `8c76860` (feat)
2. **Task 2: Implement quest rotation and streak maintenance jobs** - `550ba19` (feat)
3. **Task 3: Wire quest completion rewards and permanent seals** - `6c4a8b8` (feat)

## Files Created/Modified

- `apps/web/src/app/app/desafios/page.tsx` - authenticated challenges route with ready-duo redirect handling and server timing.
- `apps/web/src/app/app/desafios/challenge-route-params.ts` - PT-BR period query parsing and shareable route builder.
- `apps/web/src/modules/gamification/application/get-challenges.ts` - duo-scoped challenges/streak read model.
- `apps/web/src/modules/gamification/application/run-quest-rotation-jobs.ts` - bounded idempotent quest window rotation runner.
- `apps/web/src/modules/gamification/application/run-streak-jobs.ts` - 04:00 duo-day streak check and automatic Freeze consumption runner.
- `apps/web/src/modules/gamification/jobs.ts` - server-only maintenance orchestration and `CRON_SECRET` authorization.
- `apps/web/src/app/api/jobs/gamification/maintenance/route.ts` - cron route for gamification maintenance.
- `scripts/gamification-maintenance.ts` - local trigger for the maintenance route.
- `apps/web/src/modules/gamification/application/apply-gamification-fact.ts` - challenge completion achievement/seal unlocks.
- `apps/web/src/modules/gamification/domain/quest-catalog.ts` - quest completion achievement metadata for monthly/seasonal seeds.
- `apps/web/src/modules/gamification/presentation/challenge-board.tsx` and `streak-panel.tsx` - challenge and streak UI components.
- `apps/web/src/modules/gamification/presentation/view-models.ts` - challenge route view model and seasonal seal history copy.
- `apps/web/src/components/app-shell.tsx` and `apps/web/src/app/globals.css` - Desafios navigation and responsive styling.
- `apps/web/src/platform/performance/metrics.ts` and `budgets.ts` - `app.desafios` performance route registration.
- `apps/web/tests/gamification-challenges.test.tsx`, `gamification-jobs.test.ts`, `gamification-streak.test.tsx`, `gamification-rewards.test.ts` - focused coverage.
- `apps/web/tests/accessibility.spec.ts` - added `/app/desafios` accessibility route coverage, skipped without fixtures.
- `package.json` and `vercel.json` - maintenance script and scheduled cron route.

## Decisions Made

- Used the existing `ops.scheduled_jobs` table instead of a new gamification job table; this keeps SAFE-03 scheduling under one reviewed ops pattern.
- Required `createdByUserId` in gamification job payloads so job mutations run inside existing app-user RLS context and can verify the job duo matches the resolved membership.
- Reused existing achievements (`mes-da-dupla`, `selo-sazonal`, `spooky-coop`, `awards-em-casa`, `aniversario-da-fila`) as permanent seals instead of introducing inventory/shop/loadout concepts.
- Did not change database schema or migration `0011_gamification_core.sql`; the existing tables, constraints, RLS and grants already support the implemented challenge/streak/job behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Registered `/app/desafios` in performance route contracts**
- **Found during:** Task 1
- **Issue:** The new route used server timing key `app.desafios`, but the performance route allowlist and budgets only knew `app.conquistas`.
- **Fix:** Added `app.desafios` to metrics normalization, route budgets and critical route paths.
- **Files modified:** `apps/web/src/platform/performance/metrics.ts`, `apps/web/src/platform/performance/budgets.ts`
- **Verification:** `pnpm --filter @queue/web typecheck`; `gamification-challenges` source tests.
- **Committed in:** `8c76860`

**2. [Rule 3 - Blocking] Updated existing achievement navigation expectation**
- **Found during:** Task 1
- **Issue:** Adding Desafios made the mobile AppShell navigation eight items; an existing achievement UI source test still asserted seven columns.
- **Fix:** Updated the existing test expectation to `repeat(8, minmax(72px, 1fr))`.
- **Files modified:** `apps/web/tests/gamification-achievements.test.tsx`
- **Verification:** `pnpm --filter @queue/web test -- gamification-achievements`
- **Committed in:** `8c76860`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both kept the new route consistent with existing observability and test contracts. No unrelated refactor or schema change.

## Issues Encountered

- E2E accessibility coverage ran but all 23 tests were skipped because browser fixtures are not configured: missing `E2E_BASE_URL`, `E2E_READY_USER_EMAIL`, `E2E_READY_USER_PASSWORD` and other existing flow fixture variables. This is recorded as skipped evidence, not a pass.
- `TEST_DATABASE_URL` is missing, so no database integration/RLS migration test was run for this plan. No schema or migration files were changed.
- `apps/web/next-env.d.ts` was already modified outside this execution and was intentionally preserved unstaged/uncommitted.

## SAFE-03 Evidence

- Catalog refresh remains scheduled in `vercel.json` at `/api/jobs/catalog/refresh`.
- Play reminders remain available through existing `scripts/play-reminders.ts` and `/api/jobs/play/reminders`.
- Gamification maintenance is now scheduled in `vercel.json` at `/api/jobs/gamification/maintenance`, with local trigger `pnpm gamification:maintenance`.
- Source tests verify `CRON_SECRET` guard, `server-only` job module, node runtime, `maxDuration = 300`, bounded repository claim, `FOR UPDATE SKIP LOCKED` and gamification job type allowlist.

## Verification

- `pnpm --filter @queue/web test -- gamification-challenges gamification-jobs gamification-streak gamification-rewards` - passed, 4 files / 19 tests.
- `pnpm --filter @queue/web test -- gamification-achievements` - passed, 1 file / 8 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/web test:e2e -- tests/accessibility.spec.ts` - executed, 23 skipped due missing E2E fixtures listed above.
- `pnpm check:architecture` - passed.

## Known Stubs

None. Defaults and empty arrays in tests/use-case inputs are fixture/default values, not runtime UI stubs.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: cron-endpoint | `apps/web/src/app/api/jobs/gamification/maintenance/route.ts` | New scheduled maintenance endpoint crosses cron-to-server boundary and is guarded by `Authorization: Bearer ${CRON_SECRET}`. |
| threat_flag: scheduled-worker | `apps/web/src/modules/gamification/application/run-streak-jobs.ts` | Server job can consume Streak Freeze and update projection state; event metadata records job/freeze action. |
| threat_flag: scheduled-worker | `apps/web/src/modules/gamification/application/run-quest-rotation-jobs.ts` | Server job creates challenge windows through existing RLS-scoped user transaction. |

## User Setup Required

- Configure `CRON_SECRET` in deployment environments before relying on `/api/jobs/gamification/maintenance`.
- Optional local trigger: `pnpm gamification:maintenance` with `CRON_SECRET` and optional `GAMIFICATION_MAINTENANCE_URL`.
- Configure E2E fixture variables before treating accessibility route coverage as passing evidence.
- Configure `TEST_DATABASE_URL` before running database/RLS integration tests.

## Next Phase Readiness

Phase 5 now has a visible challenge route, operational maintenance runner and server-authoritative reward path for weekly/monthly/seasonal quests. Plan 05-06 can consume this as the challenge/streak surface and should decide how gamification jobs are enqueued for each duo in production if that is not already covered by the session/job creation flows.

## Self-Check: PASSED

- Found summary and key files: `/app/desafios` page, gamification maintenance route, challenge read model, quest rotation runner, streak runner and maintenance script.
- Found task commits: `8c76860`, `550ba19`, `6c4a8b8`.
- No tracked file deletions were introduced by task commits.

---
*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*
