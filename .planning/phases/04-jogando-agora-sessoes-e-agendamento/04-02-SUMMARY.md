---
phase: "04-jogando-agora-sessoes-e-agendamento"
plan: "02"
subsystem: ui
tags: [nextjs, react, dnd-kit, play, dashboard, server-actions]
requires:
  - phase: "04-jogando-agora-sessoes-e-agendamento"
    provides: "Plan 04-01 play schema, policies and repository foundation"
provides:
  - "Jogando Agora dashboard with Principal hero and secondary active games"
  - "Server-authoritative activation, promotion and reorder use cases"
  - "Accessible organization mode with drag-and-drop plus up/down controls"
  - "Phase 4 dashboard E2E scaffold with explicit fixture blockers"
affects: [dashboard, play, library, phase-04-e2e]
tech-stack:
  added:
    - "@dnd-kit/core@6.3.1"
    - "@dnd-kit/sortable@10.0.0"
  patterns:
    - "Dashboard composes play through the module public entrypoint"
    - "Client drag state submits ordered hidden inputs to server actions"
    - "Server actions revalidate dashboard, Biblioteca and affected game detail routes"
key-files:
  created:
    - "apps/web/src/modules/play/application/activate-playing-game.ts"
    - "apps/web/src/modules/play/application/get-current-play.ts"
    - "apps/web/src/modules/play/application/promote-playing-game.ts"
    - "apps/web/src/modules/play/application/reorder-playing-games.ts"
    - "apps/web/src/modules/play/presentation/playing-now-dashboard.tsx"
    - "apps/web/src/modules/play/presentation/playing-order-controls.tsx"
    - "apps/web/src/modules/play/presentation/view-models.ts"
    - "apps/web/src/app/app/phase-4-actions.ts"
    - "apps/web/tests/play-dashboard-ui.test.tsx"
    - "apps/web/tests/phase-4-e2e.spec.ts"
    - "packages/db/src/migrations/0010_play_active_reorder.sql"
  modified:
    - "apps/web/src/app/app/page.tsx"
    - "apps/web/src/app/globals.css"
    - "apps/web/src/modules/library/application/move-library-game.ts"
    - "apps/web/src/modules/library/application/ports.ts"
    - "apps/web/src/modules/library/infrastructure/library-repository.ts"
    - "apps/web/src/modules/play/application/ports.ts"
    - "apps/web/src/modules/play/infrastructure/play-repository.ts"
    - "apps/web/src/modules/play/index.ts"
    - "apps/web/package.json"
    - "pnpm-lock.yaml"
key-decisions:
  - "Moving a library game to Jogando now coordinates with play activation and returns structured active-role outcomes."
  - "Reorder/promotion is server-authoritative: client order is only a proposal validated against current duo active games."
  - "Dashboard E2E requires real active-game fixtures and records missing environment as blocked evidence."
patterns-established:
  - "First active game is Principal; later games are deterministic secondaries unless replacement is required."
  - "Explicit organization mode pairs dnd-kit drag behavior with accessible up/down controls."
  - "Playing Now UI avoids marketing hero copy and keeps Principal as the first dashboard signal."
requirements-completed: [PLAY-01, PLAY-02, PLAY-03, PLAY-04, SAFE-04]
duration: 3h 45m
completed: 2026-06-05
---

# Phase 04 Plan 02: Jogando Agora Summary

**Dashboard-first Jogando Agora experience with safe active-game activation, promotion and ordering**

## Performance

- **Duration:** 3h 45m, including subagent recovery after usage-limit interruption
- **Started:** 2026-06-05T12:20:00Z
- **Completed:** 2026-06-05T16:09:36Z
- **Tasks:** 3
- **Files modified:** 30

## Accomplishments

- Wired library moves into play activation so first Jogando becomes Principal, second/third become secondaries and fourth activation returns a replacement decision without auto-pausing.
- Added promotion and reorder use cases plus authoritative server actions with timing stages and route revalidation.
- Replaced the dashboard placeholder with a `Jogando Agora` section: Principal hero, secondary cards, primary detail/session/log links and an explicit organization mode.
- Added dnd-kit sortable support while preserving keyboard-reachable up/down controls and reduced-motion static behavior.
- Added dashboard UI tests and Phase 4 E2E coverage that skips honestly until authenticated active-game fixtures are configured.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire activation and current-play read models** - `b06193a` (`feat(04-02): wire active play activation`)
2. **Task 2: Add reorder and promotion mutations** - `3b923a5` (`feat(04-02): add active play ordering mutations`)
3. **Task 3: Render Jogando Agora on dashboard** - `61e6804` (`feat(04-02): render playing now dashboard`)

## Files Created/Modified

- `apps/web/src/modules/play/application/get-current-play.ts` - Reads current active play model for the authenticated duo.
- `apps/web/src/modules/play/application/activate-playing-game.ts` - Coordinates library status movement with play active role creation.
- `apps/web/src/modules/play/application/promote-playing-game.ts` - Promotes a secondary while demoting the previous Principal.
- `apps/web/src/modules/play/application/reorder-playing-games.ts` - Validates submitted active-game order and writes role/position atomically.
- `apps/web/src/app/app/phase-4-actions.ts` - Server actions for promotion and reorder.
- `apps/web/src/modules/play/presentation/playing-now-dashboard.tsx` - Principal hero and secondary cards.
- `apps/web/src/modules/play/presentation/playing-order-controls.tsx` - DnD and accessible up/down controls.
- `apps/web/src/modules/play/presentation/view-models.ts` - Current-play to UI view model mapping.
- `apps/web/src/app/app/page.tsx` - Dashboard composition now starts with Jogando Agora.
- `apps/web/src/app/globals.css` - Playing Now responsive, focus and reduced-motion styles.
- `apps/web/tests/play-dashboard-ui.test.tsx` - UI contract coverage.
- `apps/web/tests/phase-4-e2e.spec.ts` - Browser coverage scaffold for active-game fixtures.

## Decisions Made

- The library module remains the owner of status transitions, while play owns active role assignment after a successful Jogando move.
- Reorder and promotion are intentionally server-authoritative; the client can rearrange UI state but the server validates exact active set, membership and unique IDs before persisting.
- Phase 4 dashboard browser evidence depends on real ready-duo fixtures with active Principal/secondary slugs and does not use a test-only session bypass.

## Deviations from Plan

None - plan scope was executed as written. A small follow-up migration (`0010_play_active_reorder.sql`) was added during Task 2 to support atomic active-role rewrites without violating unique indexes mid-update.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion beyond required database support for the planned reorder mutation.

## Issues Encountered

- The plan executor hit the account usage limit after committing Tasks 1 and 2. Task 3, verification, summary and metadata were recovered inline without reverting prior commits.
- `pnpm --filter @queue/db test:integration -- play-concurrency` skipped because `TEST_DATABASE_URL` is not configured.
- `pnpm --filter @queue/web test:e2e -- tests/phase-4-e2e.spec.ts` skipped because Phase 4 E2E fixture variables are missing.

## Verification

- `pnpm --filter @queue/web test -- play-application play-dashboard-ui library-application` - passed, 25 tests.
- `pnpm --filter @queue/web test -- play-dashboard-ui` - passed, 4 tests after typecheck fix.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm check:architecture` - passed.
- `pnpm --filter @queue/db test:integration -- play-concurrency` - skipped with explicit `TEST_DATABASE_URL` message.
- `pnpm --filter @queue/web test:e2e -- tests/phase-4-e2e.spec.ts` - skipped with explicit missing fixture list.

## User Setup Required

None for local code. Real browser evidence requires `E2E_BASE_URL`, ready duo credentials, other-duo credentials, `E2E_PHASE4_PRINCIPAL_SLUG` and `E2E_PHASE4_SECONDARY_SLUG`.

## Next Phase Readiness

Plan 04-03 can add live/offline sessions, confirmation-gated progress, chapters and XP effects on top of the current active-game dashboard and order model.

---
*Phase: 04-jogando-agora-sessoes-e-agendamento*
*Completed: 2026-06-05*
