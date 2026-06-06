---
phase: 05-gamificacao-coletiva
plan: "03"
subsystem: ui
tags: [nextjs, react, gamification, dashboard, accessibility, toast]

requires:
  - phase: 05-01
    provides: "Reward engine, XP ledger and duo gamification projections"
  - phase: 05-02
    provides: "Challenge and achievement progress facts consumed by the dashboard"
provides:
  - "Bounded gamification dashboard read model for XP, level, streak, quests, achievements and XP ledger"
  - "Shared gamification band mounted on `/app` immediately below Jogando Agora"
  - "Discreet product-language XP ledger panel"
  - "Non-blocking QUEUE/2 reward feedback from whitelisted search-param states"
  - "Focused unit/UI tests and an accessibility fixture for the Phase 5 dashboard"
affects: [05-gamificacao-coletiva, dashboard, play, gamification, accessibility]

tech-stack:
  added: []
  patterns:
    - "Server-authoritative gamification dashboard view model"
    - "Product-language ledger mapping from reward reasons"
    - "Whitelisted reward feedback derived from URL state without browser-supplied XP authority"

key-files:
  created:
    - "apps/web/src/modules/gamification/presentation/gamification-dashboard-band.tsx"
    - "apps/web/src/modules/gamification/presentation/xp-ledger-panel.tsx"
    - "apps/web/src/modules/gamification/presentation/reward-toast.tsx"
    - "apps/web/src/app/app/phase-5-status.ts"
    - "apps/web/tests/gamification-dashboard-ui.test.tsx"
    - "apps/web/tests/gamification-reward-toast.test.tsx"
  modified:
    - "apps/web/src/modules/gamification/application/get-gamification-dashboard.ts"
    - "apps/web/src/modules/gamification/application/ports.ts"
    - "apps/web/src/modules/gamification/infrastructure/gamification-repository.ts"
    - "apps/web/src/modules/gamification/presentation/view-models.ts"
    - "apps/web/src/modules/gamification/index.ts"
    - "apps/web/src/app/app/page.tsx"
    - "apps/web/src/app/globals.css"
    - "apps/web/tests/gamification-rewards.test.ts"
    - "apps/web/tests/gamification-application.test.ts"
    - "apps/web/tests/accessibility.spec.ts"

key-decisions:
  - "Dashboard reads server projections and ledger facts, then maps them into PT-BR product-language view models; the browser never supplies XP authority."
  - "The dashboard band lives immediately below PlayingNowDashboard and links to the full conquistas/desafios surfaces instead of replacing them."
  - "Reward feedback is a non-blocking inline/toast-style component keyed by a whitelisted `recompensa` search param."
  - "Browser accessibility evidence is skipped explicitly until authenticated E2E fixtures are configured."

patterns-established:
  - "Summary dashboard queries stay bounded: three active quests, three recent achievements and five XP ledger entries."
  - "Gamification copy speaks to the duo, never to individual competitive progress."
  - "Reduced-motion styling keeps reward/streak feedback visible without animation pressure."

requirements-completed: [PLAY-05, GAME-01, GAME-02, GAME-03, GAME-04, GAME-13, GAME-14, GAME-17]

duration: 15min
completed: 2026-06-06
---

# Phase 05 Plan 03: Gamificacao Dashboard Summary

**Shared gamification dashboard band with bounded XP ledger, active quest summary and non-blocking reward feedback.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-06T09:34:06Z
- **Completed:** 2026-06-06T09:49:11Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Added the server-side dashboard read model that combines duo XP projections, streak state, active quests, recent achievements and recent XP ledger awards.
- Rendered a PT-BR gamification band directly after `PlayingNowDashboard` on `/app`, preserving Jogando Agora as the primary commitment hero.
- Added a discreet XP ledger panel and non-blocking reward feedback with QUEUE/2 styling, reduced-motion support and focused UI tests.
- Added an accessibility spec entry for the Phase 5 dashboard that skips with explicit fixture requirements when the browser environment is not configured.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dashboard read model** - `69bfcd4` (feat)
2. **Task 2: Render dashboard band and ledger** - `f6faa95` (feat)
3. **Task 3: Add reward feedback** - `92402b5` (feat)

**Plan metadata:** captured in the final docs/state commit.

## Files Created/Modified

- `apps/web/src/modules/gamification/application/get-gamification-dashboard.ts` - Expanded the application read model with bounded dashboard fields and ledger history.
- `apps/web/src/modules/gamification/application/ports.ts` - Added the repository read port for recent XP ledger awards.
- `apps/web/src/modules/gamification/infrastructure/gamification-repository.ts` - Implemented bounded, duo-scoped ledger reads ordered by newest award.
- `apps/web/src/modules/gamification/presentation/view-models.ts` - Mapped server facts into dashboard and reward summary view models with product-language labels.
- `apps/web/src/modules/gamification/presentation/gamification-dashboard-band.tsx` - Added the shared gamification summary band.
- `apps/web/src/modules/gamification/presentation/xp-ledger-panel.tsx` - Added the discreet XP history panel.
- `apps/web/src/modules/gamification/presentation/reward-toast.tsx` - Added the non-blocking reward feedback component.
- `apps/web/src/modules/gamification/index.ts` - Exported the new public gamification application and presentation surface.
- `apps/web/src/app/app/page.tsx` - Mounted the dashboard band below Jogando Agora and wired reward feedback.
- `apps/web/src/app/app/phase-5-status.ts` - Whitelisted reward search-param states.
- `apps/web/src/app/globals.css` - Added responsive, accessible and reduced-motion styles for the band and reward feedback.
- `apps/web/tests/gamification-dashboard-ui.test.tsx` - Covered read model behavior, dashboard placement, summary content, links and reduced-motion styling.
- `apps/web/tests/gamification-reward-toast.test.tsx` - Covered reward status parsing and rendering variants.
- `apps/web/tests/gamification-rewards.test.ts` - Updated fake repository coverage for the new read port.
- `apps/web/tests/gamification-application.test.ts` - Updated fake repository coverage for the new read port.
- `apps/web/tests/accessibility.spec.ts` - Added a Phase 5 dashboard accessibility scenario with explicit env fixture skips.

## Decisions Made

- Kept all XP/reward data server-authoritative. The URL can only select a whitelisted feedback message; it cannot inject XP, level or achievement values.
- Limited the dashboard to three active quests, three recent achievements and five ledger entries so `/app` remains a summary surface.
- Used collective PT-BR copy and duo-oriented labels in the ledger instead of exposing technical event names or individual scoring.
- Treated missing Playwright authenticated fixtures as a recorded skip, not passing browser evidence.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The Playwright accessibility command ran successfully but skipped browser evidence because E2E fixtures are not configured. The Phase 5 dashboard case requires `E2E_BASE_URL`, `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD`.
- `TEST_DATABASE_URL` was not required by this UI/read-model plan, and no database integration evidence was claimed.
- `apps/web/next-env.d.ts` was already modified outside this plan and was intentionally preserved unstaged.

## Verification

- `pnpm --filter @queue/web test -- gamification-dashboard-ui` - passed, 6 tests.
- `pnpm --filter @queue/web test -- gamification-reward-toast` - passed, 4 tests.
- `pnpm --filter @queue/web test -- gamification-dashboard-ui gamification-reward-toast` - passed, 10 tests across 2 files.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm check:architecture` - passed; architecture boundary check reported no violations.
- `pnpm --filter @queue/web test:e2e -- tests/accessibility.spec.ts` - command completed with 19 skipped tests because authenticated browser fixtures are missing.

## Known Stubs

None. Stub scan found no TODO/FIXME/placeholder copy or UI-blocking mock data in files created or modified by this plan. The only empty string match was an existing decorative `RoulettePointer` label rendered with `aria-hidden`.

## Auth Gates

None.

## User Setup Required

Configure authenticated E2E browser fixtures before claiming Playwright accessibility evidence for `/app`:

- `E2E_BASE_URL`
- `E2E_READY_USER_EMAIL`
- `E2E_READY_USER_PASSWORD`

## Next Phase Readiness

The Phase 5 dashboard summary surface is ready for the dedicated `/app/conquistas` and `/app/desafios` implementations to deepen achievements and challenges. The remaining blocker is browser accessibility evidence until authenticated E2E fixtures are available.

## Self-Check: PASSED

- Found summary file and all created dashboard/reward test files.
- Found task commits `69bfcd4`, `f6faa95` and `92402b5` in git history.
- No unexpected tracked file deletion was detected in task commits.

---
*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*
