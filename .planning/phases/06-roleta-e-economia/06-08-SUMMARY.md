---
phase: 06-roleta-e-economia
plan: 08
subsystem: ui
tags: [nextjs, server-actions, roulette, play, notifications]

requires:
  - phase: 06-04
    provides: authenticated roulette route actions and route shell
  - phase: 06-05
    provides: roulette reveal UI, result panel and compact history
  - phase: 06-07
    provides: server-owned lock/discard application behavior
provides:
  - lock/discard server actions wired from `/app/roleta`
  - explicit replacement-required UI for full Jogando queue
  - dashboard `roleta-principal` status and Principal highlight
  - Central da Dupla display marker for roulette operational facts
affects: [phase-06, roulette-route, play-dashboard, notifications]

tech-stack:
  added: []
  patterns:
    - "Server actions accept only proposal IDs and re-read authoritative roulette state in application use cases."
    - "Dashboard status query params map to fixed copy only; they do not create or authorize facts."

key-files:
  created:
    - apps/web/src/app/app/phase-6-status.ts
    - apps/web/src/modules/roulette/presentation/replacement-required.tsx
  modified:
    - apps/web/src/app/app/page.tsx
    - apps/web/src/app/app/roleta/actions.ts
    - apps/web/src/app/app/roleta/page.tsx
    - apps/web/src/app/globals.css
    - apps/web/src/modules/play/presentation/notification-center.tsx
    - apps/web/src/modules/play/presentation/playing-now-dashboard.tsx
    - apps/web/src/modules/roulette/index.ts
    - apps/web/src/modules/roulette/presentation/result-panel.tsx
    - apps/web/tests/phase-6-e2e.spec.ts
    - apps/web/tests/roulette-ui.test.tsx

key-decisions:
  - "Replacement selection uses `replacementLibraryGameId` for the exact active game to pause; no automatic pause path was added."
  - "Roulette lock/discard notification facts remain created only by the server-owned Play application path from 06-07."

patterns-established:
  - "Route action wrappers redirect on lock/discard outcomes while the action contract returns typed results for source-level verification."
  - "Central da Dupla can style roulette operational notifications using display-only type markers."

requirements-completed: [ROUL-09, ROUL-10, SAFE-06]

duration: 13 min
completed: 2026-06-09
---

# Phase 06 Plan 08: Route/UI Dashboard Wiring Summary

**Roulette lock, discard and explicit replacement flows are now usable from `/app/roleta` and visible in the dashboard/Central flow.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-09T16:50:00Z
- **Completed:** 2026-06-09T17:03:05Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added `lockRouletteResultAction` and `discardRouletteResultAction` with authoritative session checks and narrow FormData fields.
- Added `ReplacementRequired` with exact Phase 6 copy and explicit choice of which current Jogando game to pause.
- Updated `/app` to show `roleta-principal` status, highlight the new Principal, and keep Central da Dupla as display-only for roulette facts.
- Extended source and E2E coverage for lock redirect, discard, replacement-required and other-duo branches.

## Task Commits

1. **Task 1/2 RED: roulette action wiring contracts** - `8893c06` (test)
2. **Task 1/2 GREEN: route actions, replacement UI, dashboard status and Central markers** - `35eadba` (feat)

**Plan metadata:** included in the docs commit for this summary.

## Files Created/Modified

- `apps/web/src/app/app/roleta/actions.ts` - Added lock/discard server actions using only `roundId` and optional `replacementLibraryGameId`.
- `apps/web/src/app/app/roleta/page.tsx` - Wired result panel actions, replacement query branch and current Jogando choices.
- `apps/web/src/modules/roulette/presentation/replacement-required.tsx` - New explicit full-queue replacement UI.
- `apps/web/src/modules/roulette/presentation/result-panel.tsx` - Added action feedback buttons and UI-SPEC discard copy.
- `apps/web/src/app/app/phase-6-status.ts` - Added fixed `roleta-principal` dashboard status mapping.
- `apps/web/src/app/app/page.tsx` - Added Phase 6 status toast and Principal highlight wrapper.
- `apps/web/src/modules/play/presentation/playing-now-dashboard.tsx` - Added optional highlight marker for roulette handoff.
- `apps/web/src/modules/play/presentation/notification-center.tsx` - Added display-only roulette notification type marker.
- `apps/web/src/app/globals.css` - Styled replacement-required UI, Principal highlight and roulette notification marker.
- `apps/web/tests/roulette-ui.test.tsx` and `apps/web/tests/phase-6-e2e.spec.ts` - Added 06-08 route/UI/dashboard/E2E contract coverage.

## Decisions Made

- Replacement UI fetches the current active Play queue via the public Play entrypoint on the authenticated route, then submits only the selected active `libraryGameId` as a proposal.
- Successful lock redirects to the server-owned `redirectTo` value from the roulette application use case; discard redirects back to `/app/roleta` with refreshed history.
- The dashboard `estado=roleta-principal` is presentation-only fixed copy and a visual highlight, not an authorization or data authority.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The RED source test initially expected `replacementLibraryGameId` inside the route file. The implementation correctly places that input in `ReplacementRequired`, so the test was adjusted to verify route plus component composition.

## Verification

- `pnpm --filter @queue/web test -- roulette-ui roulette-application play-application` - passed, 45 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm check:architecture` - passed.
- `pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts` - passed with 9 fixture-guarded skips and exact `BLOCKED setup` output.
- `rg -n "lockRouletteResultAction|discardRouletteResultAction|replacementLibraryGameId|Escolham quem pausa|Nada muda sozinho|Descartar este resultado" apps/web/src apps/web/tests` - returned implementation and tests.
- `rg -n "resultCatalogGameId|resultLibraryGameId|duoId|boostSpent|pity" apps/web/src/app/app/roleta/actions.ts` - returned no lines.
- `rg -n "createOperationalPlayNotification|insertNotificationItem" apps/web/src/app/app apps/web/src/modules/roulette/presentation` - returned no lines.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 06-09 focused coverage and simulation. Browser evidence remains fixture-blocked until Phase 6 E2E credentials and eligible slugs are configured.

---
*Phase: 06-roleta-e-economia*
*Completed: 2026-06-09*
