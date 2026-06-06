---
phase: 05-gamificacao-coletiva
plan: "04"
subsystem: ui
tags: [nextjs, react, gamification, accessibility, rarity, svg]

requires:
  - phase: 05-01
    provides: achievement catalog, unlock tables, repository ports and RLS-backed gamification storage
  - phase: 05-02
    provides: server-authoritative reward engine and unlock writes from domain facts
  - phase: 05-03
    provides: dashboard gamification summary surface and reward feedback patterns
provides:
  - Dedicated authenticated `/app/conquistas` route
  - Duo-scoped achievement read model with grouped and rarity-filtered views
  - Accessible rarity filters and custom engraved SVG badge icons
  - Authenticated AppShell navigation entry for Conquistas
affects: [05-gamificacao-coletiva, gamification, app-shell, accessibility, performance]

tech-stack:
  added: []
  patterns:
    - Server-authoritative achievement unlock reads through the gamification repository
    - Hidden locked achievements rendered as mystery states without source predicate leaks
    - Shareable rarity filters validated at the route boundary
    - Custom SVG badge icons with rarity-token styling

key-files:
  created:
    - apps/web/src/app/app/conquistas/achievement-route-params.ts
    - apps/web/src/app/app/conquistas/page.tsx
    - apps/web/src/modules/gamification/application/get-achievements.ts
    - apps/web/src/modules/gamification/presentation/achievement-badge-icon.tsx
    - apps/web/src/modules/gamification/presentation/achievement-grid.tsx
    - apps/web/src/modules/gamification/presentation/achievement-rarity-filter.tsx
    - apps/web/tests/gamification-achievements.test.tsx
  modified:
    - apps/web/src/app/globals.css
    - apps/web/src/components/app-shell.tsx
    - apps/web/src/modules/gamification/application/ports.ts
    - apps/web/src/modules/gamification/index.ts
    - apps/web/src/modules/gamification/presentation/view-models.ts
    - apps/web/src/platform/performance/budgets.ts
    - apps/web/src/platform/performance/metrics.ts
    - apps/web/tests/accessibility.spec.ts

key-decisions:
  - "`/app/conquistas` reads unlock state on the server from the gamification repository; browser filters never affect unlock authority."
  - "Locked hidden achievements expose mystery copy, synthetic view keys and no slug, predicate or source IDs until unlocked."
  - "Seven-item mobile app navigation uses horizontally scrollable min-width tracks to avoid text overlap."
  - "`app.conquistas` is registered in performance route allowlists and budgets so static server timing labels stay allowlisted."

patterns-established:
  - "Achievement route read pattern: validate search params, guard session/duo server-side, then render route view models."
  - "Achievement presentation pattern: SVG badge icons are product assets, while rarity changes accent treatment without ranking users."
  - "Hidden achievement pattern: safe mystery copy is the only client-visible locked state for hidden rows."

requirements-completed: [GAME-05, GAME-06, GAME-07, GAME-08, GAME-17]

duration: 18min
completed: 2026-06-06
---

# Phase 05 Plan 04: Conquistas Route Summary

**Dedicated `/app/conquistas` product route with duo-scoped unlock state, rarity filters and custom engraved SVG achievement badges**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-06T09:57:00Z
- **Completed:** 2026-06-06T10:14:29Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Added a route-ready achievement read model that covers the seeded catalog, groups achievements, validates rarity filters and keeps unlock state server-authoritative.
- Built the visible achievements surface with custom SVG badge icons, rarity filter controls, hidden mystery states, keyboard/touch focus states and responsive grid styling.
- Added `/app/conquistas` to the authenticated app shell, server route, accessibility coverage and performance route allowlists.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add achievement read model and filters** - `be725a0` (feat)
2. **Task 2: Build achievement grid, rarity filter and badge icons** - `8c41eda` (feat)
3. **Task 3: Add `/app/conquistas` route and navigation** - `ba9c35c` (feat)

**Plan metadata:** captured in the final docs/state commit.

## Files Created/Modified

- `apps/web/src/app/app/conquistas/achievement-route-params.ts` - Validates route rarity search params and redirects invalid values to the canonical achievements route.
- `apps/web/src/app/app/conquistas/page.tsx` - Authenticated achievements page with session/duo guards, server timing stages, notifications and grouped route rendering.
- `apps/web/src/app/globals.css` - Achievement grid, badge, rarity filter and seven-item mobile navigation styles.
- `apps/web/src/components/app-shell.tsx` - Adds Conquistas to authenticated desktop and mobile navigation.
- `apps/web/src/modules/gamification/application/get-achievements.ts` - Server-side use case for duo-scoped achievement read data.
- `apps/web/src/modules/gamification/application/ports.ts` - Adds achievement read model record and route-facing type contracts.
- `apps/web/src/modules/gamification/index.ts` - Publishes the new application use case and presentation components through the module public API.
- `apps/web/src/modules/gamification/presentation/achievement-badge-icon.tsx` - Custom engraved SVG badge icon system with rarity-aware variants.
- `apps/web/src/modules/gamification/presentation/achievement-grid.tsx` - Accessible grouped achievement cards with hidden and unlocked states.
- `apps/web/src/modules/gamification/presentation/achievement-rarity-filter.tsx` - Keyboard-accessible rarity filter links with shareable URLs.
- `apps/web/src/modules/gamification/presentation/view-models.ts` - Converts achievement records into route view models and safe hidden states.
- `apps/web/src/platform/performance/budgets.ts` - Adds performance budget metadata for `app.conquistas`.
- `apps/web/src/platform/performance/metrics.ts` - Adds `app.conquistas` to static server timing route allowlists.
- `apps/web/tests/accessibility.spec.ts` - Adds authenticated accessibility coverage for `/app/conquistas` with explicit fixture skips.
- `apps/web/tests/gamification-achievements.test.tsx` - Covers grouping, rarity filters, hidden states, public API, navigation source checks and no-emoji badge rendering.

## Decisions Made

- `/app/conquistas` treats rarity as a display-only read filter. Unlocks still come from the server transaction and repository state.
- Hidden locked achievements use synthetic view identifiers and mystery copy so predicate internals and source fact IDs are not exposed to the browser.
- The mobile bottom nav now supports seven app destinations through min-width tracks and horizontal overflow instead of shrinking labels into overlap.
- The new server timing label was added to performance allowlists/budgets because telemetry validation is intentionally strict.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Registered the new route in performance allowlists**
- **Found during:** Task 3 (Add `/app/conquistas` route and navigation)
- **Issue:** The route added static server timing stages, but `app.conquistas` was not in the performance route allowlist/budget tables, causing verification to reject the label.
- **Fix:** Added `app.conquistas` to the performance metrics allowlist, path normalizer and route budgets.
- **Files modified:** `apps/web/src/platform/performance/metrics.ts`, `apps/web/src/platform/performance/budgets.ts`
- **Verification:** `pnpm --filter @queue/web typecheck` and `pnpm check:architecture` passed.
- **Committed in:** `ba9c35c` (Task 3 commit)

**2. [Rule 1 - Bug] Removed a dead future-route link**
- **Found during:** Task 3 stub/dead-link scan
- **Issue:** An early page header link pointed to `/app/desafios`, a future Phase 05-05 route that does not exist yet.
- **Fix:** Removed the future-route link so the completed page only links to shipped surfaces.
- **Files modified:** `apps/web/src/app/app/conquistas/page.tsx`
- **Verification:** Source scan and `pnpm --filter @queue/web test -- gamification-achievements` passed.
- **Committed in:** `ba9c35c` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were required for correctness and verification. No architecture or product scope change was introduced.

## Issues Encountered

- `pnpm --filter @queue/web test:e2e -- tests/accessibility.spec.ts` completed with 21 skipped tests because authenticated browser fixtures are not configured. For the Phase 5 achievements route, the missing variables were `E2E_BASE_URL`, `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD`.
- `TEST_DATABASE_URL` was not required by this plan's verification commands, and no database integration pass is claimed here.

## Verification

- `pnpm --filter @queue/web test -- gamification-achievements` - passed, 8 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/web test:e2e -- tests/accessibility.spec.ts` - completed with 21 skipped tests due missing E2E fixtures; this is skip evidence, not browser pass evidence.
- `pnpm check:architecture` - passed.

## Known Stubs

None. Stub scan found only intentional defaults/nulls used for props, filter state and test helpers; no placeholder data source or UI-blocking stub remains in the files changed by this plan.

## Auth Gates

None. Missing E2E fixture variables were recorded as verification skips, not authentication gates for implementation.

## Next Phase Readiness

- Phase 05-05 can build challenges and streak surfaces on top of the public gamification exports and the established rarity/badge styling.
- Browser accessibility evidence for `/app/conquistas` remains blocked until authenticated E2E fixtures are configured with `E2E_BASE_URL`, `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD`.

## Self-Check: PASSED

- Found summary file and all created achievement route/read-model/presentation/test files.
- Found task commits `be725a0`, `8c41eda` and `ba9c35c` in git history.
- No unexpected tracked file deletion was detected in task commits.

---
*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*
