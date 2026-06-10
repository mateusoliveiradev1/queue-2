---
phase: 07-paridade-visual-e-ux-com-prototipo
plan: "03"
subsystem: authenticated-home
tags: [phase-7, authenticated-home, hall, visual-parity, accessibility]
requires:
  - phase: 07-paridade-visual-e-ux-com-prototipo
    plan: "01"
    provides: Authenticated top shell and Hall route slot
  - phase: 07-paridade-visual-e-ux-com-prototipo
    plan: "02"
    provides: Compact Phase 7 public visual system
provides:
  - Authenticated Home anchor with LV/XP/STREAK status line
  - Primary Home CTAs for Descobrir, Roleta and Biblioteca
  - Low contextual Home tiles for Catalogo and Conquistas
  - Polished prepared Hall empty state
affects: [app-home, hall, gamification-dashboard, playing-now, visual-regression]
tech-stack:
  added: []
  patterns:
    - Server-derived Home anchor composed above existing Play and Gamification dashboards
    - Low contextual route tiles for delivered capabilities that are not primary nav items
key-files:
  created: []
  modified:
    - apps/web/src/app/app/page.tsx
    - apps/web/src/app/app/hall/page.tsx
    - apps/web/src/app/globals.css
    - apps/web/tests/brand-ui.test.tsx
    - apps/web/tests/gamification-dashboard-ui.test.tsx
    - apps/web/tests/play-dashboard-ui.test.tsx
    - apps/web/tests/phase-7-visual.spec.ts
key-decisions:
  - "Home keeps `Jogando Agora` as the route H1 while the large anchor title reflects the server-derived current or empty queue state."
  - "Catalogo and Conquistas are repeated as low Home tiles so delivered capabilities remain discoverable without promoting them into the primary nav."
  - "Hall remains a prepared empty shelf only; no review, replay, timeline, schema or data-backed Hall behavior was introduced."
patterns-established:
  - "`home-anchor` renders LV/XP/STREAK from the gamification view model and current queue facts from the Play view model."
  - "`home-route-tile` is the low rectangular pattern for contextual route access."
  - "`hall-empty-panel` is the wide dry prepared-state treatment for future Hall scope."
requirements-completed:
  - BRND-02
  - BRND-04
  - BRND-05
  - BRND-06
  - BRND-07
  - BRND-08
  - BRND-09
  - BRND-10
  - BRND-11
  - BRND-12
  - BRND-13
  - META-01
  - SAFE-04
  - SAFE-05
duration: 8 min
completed: 2026-06-10
---

# Phase 07 Plan 03: Authenticated Home Summary

**Home now opens with a Phase 7 internal anchor, while Hall stays an honest prepared empty shelf.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-10T00:50:00-03:00
- **Completed:** 2026-06-10T00:58:00-03:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added a Home anchor above existing dashboards with `LV`, `XP`, `STREAK`, current Principal or `NADA NA FILA / AINDA`, and CTAs for `Descobrir`, `Roleta` and `Biblioteca`.
- Preserved existing server-derived duo, play, notification and gamification reads; the new UI only renders existing view-model facts.
- Added low Home tiles for `/app/catalogo` and `/app/conquistas`, keeping those delivered capabilities discoverable outside the primary top nav.
- Reworked `/app/hall` into a wide dry `ESTANTE VAZIA / POR ENQUANTO` prepared state with no misleading CTA or Phase 8 behavior.
- Updated unit/source tests and the Phase 7 visual scaffold to cover the new Home anchor and contextual links when authenticated fixtures exist.

## Task Commits

1. **Tasks 1-3: Authenticated Home anchor, contextual links and Hall prepared state** - `97039e6` (`feat`)

## Verification

- `rg -n "LV|XP|STREAK|NADA NA FILA|Descobrir|Roleta|Biblioteca" apps/web/src/app/app/page.tsx` - passed.
- `rg -n "individual|ranking|leaderboard|competitivo" apps/web/src/app/app/page.tsx` - passed with no matches.
- `rg -n "ESTANTE VAZIA|POR ENQUANTO|em breve" apps/web/src/app/app/hall/page.tsx` - passed.
- `rg -n "review|resenha|replay|timeline|completedGame|hallShelf" apps/web/src/app/app/hall/page.tsx` - passed with no matches.
- `pnpm --filter @queue/web test -- gamification-dashboard-ui play-dashboard-ui` - passed.
- `pnpm --filter @queue/web test -- brand-ui` - passed.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm check:secrets` - passed; skipped the missing client bundle at `apps\web\.next\static`.

## Browser Evidence

- `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "/app home|contextual|Hall"` with local `E2E_BASE_URL` and `E2E_START_SERVER=1` exited cleanly but skipped the authenticated checks.
- Authenticated browser evidence remains `BLOCKED` until `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD` are configured for the target runtime.

## Deviations from Plan

- Home keeps the existing `Jogando Agora` H1 for route continuity and test stability; the new large anchor title carries the current/empty queue state.
- The implementation commit covers all three tasks because Home, contextual tiles, Hall and shared CSS/test changes are tightly coupled in the same files.

## Issues Encountered

- Older Home tests needed `logoutCurrentSessionAction` in their auth/session mocks after the AppShell logout form became part of the rendered page.
- New duplicated visible labels (`NADA NA FILA`, `POR ENQUANTO`, current game title) required tests to assert presence rather than uniqueness.

## User Setup Required

- Configure local or preview authenticated E2E credentials before accepting `/app` and `/app/hall` screenshots as release evidence.

## Next Phase Readiness

Ready for `07-04`: the authenticated entry point now has the Phase 7 rhythm and contextual route access, while Hall remains safely prepared for future Phase 8 work.

---
*Phase: 07-paridade-visual-e-ux-com-prototipo*
*Completed: 2026-06-10*
