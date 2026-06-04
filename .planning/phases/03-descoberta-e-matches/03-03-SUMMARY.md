---
phase: 03-descoberta-e-matches
plan: "03"
subsystem: discovery-ui
tags: [nextjs, react, motion, accessibility, discovery]

requires:
  - phase: 03-01
    provides: "Discovery persistence, RLS policies, domain rules and library handoff constraints"
  - phase: 03-02
    provides: "Discovery application use cases, autocomplete API, match live, surprise and quiz services"
provides:
  - "Authenticated /app/descobrir route with Discovery navigation and dashboard entry point"
  - "Motion-enabled Discovery deck with swipe, keyboard and explicit decision controls"
  - "Compact Live, Surpresa, Quiz and Busca modes around the central deck"
  - "Quick and advanced filters, bounded autocomplete and three-question mood quiz UI"
  - "Accessible match celebration, focused match history and safe Wishlist/Jogando/Pausado handoff"
affects: [phase-04, library, discovery, accessibility, e2e-fixtures]

tech-stack:
  added:
    - "motion@12.40.0"
  patterns:
    - "Authenticated App Router pages compose public domain module APIs and pass presentation-safe props to Client Components."
    - "Discovery motion lives in client components with reduced-motion, button and keyboard paths as equivalent controls."
    - "Discovery renders catalog-derived source/freshness metadata through discovery-owned presentation components."

key-files:
  created:
    - "apps/web/src/app/app/descobrir/page.tsx"
    - "apps/web/src/app/app/descobrir/loading.tsx"
    - "apps/web/src/modules/discovery/presentation/discovery-card.tsx"
    - "apps/web/src/modules/discovery/presentation/discovery-deck.tsx"
    - "apps/web/src/modules/discovery/presentation/discovery-filters.tsx"
    - "apps/web/src/modules/discovery/presentation/discovery-search.tsx"
    - "apps/web/src/modules/discovery/presentation/discovery-source-metadata.tsx"
    - "apps/web/src/modules/discovery/presentation/live-panel.tsx"
    - "apps/web/src/modules/discovery/presentation/match-celebration.tsx"
    - "apps/web/src/modules/discovery/presentation/match-history.tsx"
    - "apps/web/src/modules/discovery/presentation/mood-quiz.tsx"
  modified:
    - "apps/web/package.json"
    - "pnpm-lock.yaml"
    - "apps/web/src/components/app-shell.tsx"
    - "apps/web/src/app/app/page.tsx"
    - "apps/web/src/app/globals.css"
    - "apps/web/tests/discovery-ui.test.tsx"
    - "apps/web/tests/accessibility.spec.ts"

key-decisions:
  - "Discovery uses Motion for the swipe deck but keeps Quero jogar, Agora nao and Pular as first-class form actions for accessibility and reduced motion."
  - "Discovery handoff reuses the library public status control surface and keeps Zerado/Dropado disabled until the later double-confirmation phase."
  - "Browser-level Discovery accessibility is represented in the E2E spec now, but authenticated visual review remains gated on configured E2E database/user fixtures."

patterns-established:
  - "Discovery Client Components receive server actions as props and submit forms instead of embedding business rules in UI handlers."
  - "Route-level mode shortcuts stay compact above the deck, while filters and side panels use full-width bands instead of nested cards."
  - "Search/autocomplete fetches the existing discovery search API with a bounded limit and renders selected suggestions as Discovery cards."

requirements-completed: [DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, DISC-11, DISC-12]

duration: 22 min
completed: 2026-06-04
---

# Phase 03 Plan 03: Discovery Deck and Match Experience Summary

**Authenticated Discovery deck with Motion swipe controls, compact modes, filters, quiz, search, match celebration, history and safe library handoff.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-04T10:52:12Z
- **Completed:** 2026-06-04T11:13:37Z
- **Tasks:** 4
- **Files modified:** 18

## Accomplishments

- Added `/app/descobrir` as the authenticated Discovery ritual, with app-shell navigation, dashboard copy and Portuguese-BR loading/empty/status states.
- Built the central Discovery deck with drag/swipe, explicit buttons, keyboard operation, reduced-motion behavior, readable source/freshness metadata and accessible match announcement.
- Added Live, Surpresa, Quiz and Busca as compact modes around the deck, plus quick filters, advanced `Mais filtros`, bounded autocomplete and a three-question mood quiz.
- Added polished match history and valid library handoff actions for Wishlist, Jogando and Pausado without auto-add or duplicate rows.
- Extended UI and accessibility coverage so Discovery route coverage is present in the E2E accessibility spec.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Discovery navigation and server-rendered route shell** - `b13fdb1` (feat)
2. **Task 2: Build accessible motion deck and decision controls** - `21d6e2e` (feat)
3. **Task 3: Build modes, filters, search and quiz UI** - `c7eb39d` (feat)
4. **Task 4: Build match history and valid status handoff UI** - `ff1e5aa` (feat)
5. **Architecture auto-fix after Task 4** - `0139138` (fix)
6. **Plan-level accessibility coverage** - `960233b` (test)

**Plan metadata:** committed after this summary was written.

## Files Created/Modified

- `apps/web/package.json` - Added `motion` to the web app dependency set.
- `pnpm-lock.yaml` - Locked `motion@12.40.0` and its dependency graph.
- `apps/web/src/components/app-shell.tsx` - Added accessible `Descobrir` navigation.
- `apps/web/src/app/app/page.tsx` - Updated dashboard entry copy so Discovery is the active match ritual and Catalogo stays catalog source.
- `apps/web/src/app/app/descobrir/page.tsx` - Added authenticated server route shell composing discovery and duo public APIs.
- `apps/web/src/app/app/descobrir/loading.tsx` - Added Portuguese-BR route loading state.
- `apps/web/src/app/globals.css` - Added responsive Discovery layout, motion deck, filters, search, quiz, match and handoff styles.
- `apps/web/src/modules/discovery/presentation/discovery-card.tsx` - Added readable card rendering with source/freshness, reasons and handoff controls.
- `apps/web/src/modules/discovery/presentation/discovery-deck.tsx` - Added Motion deck, swipe/keyboard/button decisions and reduced-motion fallback.
- `apps/web/src/modules/discovery/presentation/discovery-filters.tsx` - Added quick and advanced filter controls.
- `apps/web/src/modules/discovery/presentation/discovery-search.tsx` - Added bounded autocomplete and selected-card action context.
- `apps/web/src/modules/discovery/presentation/discovery-source-metadata.tsx` - Added discovery-owned catalog source/freshness display.
- `apps/web/src/modules/discovery/presentation/live-panel.tsx` - Added compact match live session panel.
- `apps/web/src/modules/discovery/presentation/match-celebration.tsx` - Added accessible match celebration before queue handoff.
- `apps/web/src/modules/discovery/presentation/match-history.tsx` - Added focused match history cards and status movement controls.
- `apps/web/src/modules/discovery/presentation/mood-quiz.tsx` - Added three-question quiz with preview/full-duo copy.
- `apps/web/tests/discovery-ui.test.tsx` - Added component tests for route shell, deck, filters, quiz, search, celebration and history.
- `apps/web/tests/accessibility.spec.ts` - Added `/app/descobrir` to authenticated accessibility route coverage.

## Decisions Made

- Motion is limited to the deck interaction layer; buttons and keyboard shortcuts remain equivalent paths so reduced-motion users do not lose functionality.
- Library handoff in Discovery is constrained to Wishlist, Jogando and Pausado, with Zerado/Dropado visibly disabled until double confirmation exists.
- Search/autocomplete stays on the Discovery API surface and renders Discovery cards instead of duplicating the Phase 2 catalog page.

## Verification

- `pnpm install` - passed, lockfile already up to date after adding `motion`.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/web test -- discovery-ui` - passed, 1 file and 2 tests.
- `pnpm check:architecture` - passed.
- `pnpm --filter @queue/web test:e2e -- accessibility.spec.ts` - executed; the spec includes `/app/descobrir`, but all 14 tests were skipped because `E2E_BASE_URL`, ready-user credentials and related E2E fixtures are not configured.
- Authenticated browser visual review - not completed in this environment because `/app/descobrir` requires a verified session and duo data, while `DATABASE_URL`, `E2E_BASE_URL` and `E2E_READY_USER_EMAIL` are missing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced cross-module deep import with library public entrypoint**
- **Found during:** Final plan verification after Task 4.
- **Issue:** `match-history.tsx` imported `LibraryStatusControls` from the library presentation internals, violating the modular architecture contract.
- **Fix:** Exported/imported the control through the existing library public entrypoint and adjusted the test mock to match that boundary.
- **Files modified:** `apps/web/src/modules/discovery/presentation/match-history.tsx`, `apps/web/tests/discovery-ui.test.tsx`
- **Verification:** `pnpm check:architecture`, `pnpm --filter @queue/web typecheck` and `pnpm --filter @queue/web test -- discovery-ui` passed.
- **Committed in:** `0139138`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug).
**Impact on plan:** The fix was necessary to satisfy the binding architecture contract and did not change product scope.

## Issues Encountered

- Authenticated E2E/browser verification is still gated by missing local fixtures: `DATABASE_URL`, `E2E_BASE_URL`, `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD`. The Discovery route is covered by the accessibility spec, but visual browser review must run once those fixtures exist.

## Known Stubs

None blocking. Stub scan found only intentional form placeholders and empty filter values used as valid "any" choices, plus hidden decorative labels already marked `aria-hidden`.

## User Setup Required

None for the implementation itself. Browser regression for this route needs the existing E2E fixture setup before it can exercise an authenticated duo session.

## Next Phase Readiness

Ready for Plan 03-04. Discovery now exposes the full Phase 3 ritual surface and safe library handoff; the remaining verification debt is authenticated browser review once E2E fixtures are available.

## Self-Check: PASSED

- Summary file exists: `.planning/phases/03-descoberta-e-matches/03-03-SUMMARY.md`
- Key created files exist: `/app/descobrir` route, Discovery deck, match celebration and Discovery UI tests.
- Task commits found: `b13fdb1`, `21d6e2e`, `c7eb39d`, `ff1e5aa`, `0139138`, `960233b`.

---
*Phase: 03-descoberta-e-matches*
*Completed: 2026-06-04*
