---
phase: 06-roleta-e-economia
plan: 04
subsystem: roulette
tags: [nextjs, server-actions, roulette, duo, navigation, performance, vitest]

requires:
  - phase: 06-roleta-e-economia-03
    provides: Authoritative roulette state, history, replay and idempotent start transactions.
provides:
  - Authenticated `/app/roleta` route shell composed from public roulette contracts.
  - Route view models with exact PT-BR copy, first-viewport state mapping, boost/pity/audio labels and history rows.
  - Start, replay and audio preference server actions that derive authority from server sessions.
  - Duo audio preference mutation through the Duo public module and RLS-backed repository path.
  - Nine-item authenticated navigation with horizontally scrollable mobile bottom nav sizing.
affects: [06-05, 06-07, 06-08, 06-10, phase-6-gate]

tech-stack:
  added: []
  patterns:
    - Server route shells compose public module entrypoints and route-local server actions.
    - Native form fallbacks wrap enhanced server actions when the action returns a serializable result.
    - New authenticated route keys are registered in performance allowlists and budgets with tests.

key-files:
  created:
    - apps/web/src/app/app/roleta/page.tsx
    - apps/web/src/app/app/roleta/actions.ts
    - apps/web/src/modules/roulette/presentation/view-models.ts
    - apps/web/src/modules/duo/application/update-duo-audio-preference.ts
  modified:
    - apps/web/src/components/app-shell.tsx
    - apps/web/src/app/globals.css
    - apps/web/src/modules/roulette/index.ts
    - apps/web/src/modules/duo/application/ports.ts
    - apps/web/src/modules/duo/infrastructure/duo-repository.ts
    - apps/web/src/modules/duo/index.ts
    - apps/web/src/platform/performance/budgets.ts
    - apps/web/src/platform/performance/metrics.ts
    - apps/web/tests/roulette-ui.test.tsx
    - apps/web/tests/duo-flow.test.ts
    - apps/web/tests/duo-domain.test.ts
    - apps/web/tests/duo-isolation.test.ts
    - apps/web/tests/performance-metrics.test.ts

key-decisions:
  - "The roulette route imports route view models through `apps/web/src/modules/roulette/index.ts` rather than deep-importing presentation internals."
  - "`app.roleta` is registered as a performance route key and budgeted route so server timing labels remain allowlisted."
  - "Audio preference changes use a narrow Duo public contract that resolves membership server-side and updates only `app.duo_preferences.audio_enabled`."
  - "Native route forms call void wrappers around enhanced actions, preserving serializable action results for future client-enhanced forms."

patterns-established:
  - "Route-level form controls pass only proposal fields (`idempotencyKey`, `useBoost`, `roundId`, `audioEnabled`) and never browser-owned duo/result/economy facts."
  - "Mobile app-shell navigation uses stable 72px/52px scrollable items when new authenticated routes expand the track."

requirements-completed:
  - ROUL-01
  - ROUL-02
  - ROUL-04

duration: 26 min
completed: 2026-06-09
---

# Phase 06 Plan 04: Roulette Route Shell And Actions Summary

**Authenticated roulette route shell with server-owned state, actionable start/replay/audio forms and Duo-scoped audio preference persistence.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-06-09T13:18:17Z
- **Completed:** 2026-06-09T13:44:26Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- Added `/app/roleta` as an authenticated App Router page using `requireVerifiedSession`, `getRouletteState`, `getRouletteHistory` and `toRouletteRouteViewModel` through the roulette public module.
- Added route view models for blocked pool, ready roulette, resumable reveal, pending invitation and history-backed empty states with the exact Phase 6 copy.
- Added `startRouletteRoundAction`, `replayRouletteRoundAction` and `updateRouletteAudioPreferenceAction` with authoritative session checks and server-owned result/economy facts kept out of FormData.
- Added a Duo application use case and repository method for updating only `app.duo_preferences.audio_enabled` after resolving the current user's paired duo.
- Added `Roleta` to authenticated navigation after Biblioteca and before Conquistas, plus mobile nav CSS for nine readable, scrollable 44px+ targets.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing roulette route shell test** - `20732f0` (test)
2. **Task 1 GREEN: Add route, view models and navigation** - `b73c17a` (feat)
3. **Task 2 RED: Add failing roulette action tests** - `5a0fc29` (test)
4. **Task 2 GREEN: Add roulette server actions and audio preference** - `88f0ad0` (feat)
5. **Follow-up fix: Wire roulette route forms to actions** - `54f162c` (fix)

## Files Created/Modified

- `apps/web/src/app/app/roleta/page.tsx` - Authenticated roulette route shell, first-viewport state renderer and native forms wired to server actions.
- `apps/web/src/app/app/roleta/actions.ts` - Start, replay and audio preference actions with authoritative session checks and serializable result objects.
- `apps/web/src/modules/roulette/presentation/view-models.ts` - Route copy, first-viewport mapping, boost/pity/audio labels and history item formatting.
- `apps/web/src/modules/roulette/index.ts` - Public export for route view-model composition.
- `apps/web/src/components/app-shell.tsx` - Authenticated navigation now includes `Roleta` in the required order.
- `apps/web/src/app/globals.css` - Mobile bottom navigation supports nine stable scrollable items plus roulette route shell styling.
- `apps/web/src/modules/duo/application/update-duo-audio-preference.ts` - Membership-scoped Duo audio preference use case.
- `apps/web/src/modules/duo/application/ports.ts` - Duo repository port includes the narrow audio preference mutation.
- `apps/web/src/modules/duo/infrastructure/duo-repository.ts` - RLS-backed upsert for `app.duo_preferences.audio_enabled`.
- `apps/web/src/modules/duo/index.ts` - Public Duo wrapper for audio preference updates.
- `apps/web/src/platform/performance/budgets.ts` and `apps/web/src/platform/performance/metrics.ts` - `app.roleta` route key, budget and normalization.
- `apps/web/tests/roulette-ui.test.tsx` - Route shell, nav, CSS, action, FormData and source contract tests.
- `apps/web/tests/duo-flow.test.ts` - Audio preference use case behavior and membership scoping tests.
- `apps/web/tests/duo-domain.test.ts` and `apps/web/tests/duo-isolation.test.ts` - Test repositories updated for the new Duo port.
- `apps/web/tests/performance-metrics.test.ts` - Performance route allowlist and budget coverage for `/app/roleta`.

## Decisions Made

- The route consumes `toRouletteRouteViewModel` through the roulette public entrypoint so routes do not deep-import module internals.
- `app.roleta` became part of the performance route contract immediately because server timing labels are allowlisted.
- Audio preference is a separate narrow Duo mutation rather than reusing the full Duo settings update, so the route can only change `audio_enabled`.
- Native server forms use void wrappers around result-returning actions; enhanced clients can still call the actions directly and receive serializable results.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Exported route view models through the roulette public module**
- **Found during:** Task 1 (Add route, view models and navigation)
- **Issue:** The plan needed route view models, but architecture rules prohibit route deep-imports into module internals.
- **Fix:** Exported `toRouletteRouteViewModel` and types from `apps/web/src/modules/roulette/index.ts`.
- **Files modified:** `apps/web/src/modules/roulette/index.ts`
- **Verification:** `pnpm --filter @queue/web test -- roulette-ui`, `pnpm --filter @queue/web typecheck`, `pnpm check:architecture`
- **Commit:** `b73c17a`

**2. [Rule 3 - Blocking] Registered `/app/roleta` in performance contracts**
- **Found during:** Task 1 typecheck/route timing verification
- **Issue:** The new route uses static server timing label `app.roleta`, which must be allowlisted and budgeted.
- **Fix:** Added route normalization and budgets for `app.roleta`, plus performance route tests.
- **Files modified:** `apps/web/src/platform/performance/metrics.ts`, `apps/web/src/platform/performance/budgets.ts`, `apps/web/tests/performance-metrics.test.ts`
- **Verification:** `pnpm --filter @queue/web test -- performance-metrics`, `pnpm --filter @queue/web typecheck`
- **Commit:** `b73c17a`

**3. [Rule 3 - Blocking] Updated existing Duo test repositories for the new port**
- **Found during:** Task 2 typecheck
- **Issue:** Adding `updateDuoAudioPreference` to `DuoRepository` broke existing fake repository implementations in unrelated Duo tests.
- **Fix:** Added minimal fake implementations that preserve existing test behavior and membership scoping.
- **Files modified:** `apps/web/tests/duo-domain.test.ts`, `apps/web/tests/duo-isolation.test.ts`
- **Verification:** `pnpm --filter @queue/web test -- roulette-ui duo-flow`, `pnpm --filter @queue/web typecheck`
- **Commit:** `88f0ad0`

**4. [Rule 2 - Missing Critical] Wired visible roulette controls to server actions**
- **Found during:** Post-task route review
- **Issue:** The route rendered start/replay/audio controls but did not submit the new server actions, undercutting the playable surface requirement.
- **Fix:** Added native forms for start, boost, replay and audio preference, with server-generated idempotency keys and only proposal fields in the form payload.
- **Files modified:** `apps/web/src/app/app/roleta/page.tsx`, `apps/web/tests/roulette-ui.test.tsx`
- **Verification:** `pnpm --filter @queue/web test -- roulette-ui duo-flow`, `pnpm --filter @queue/web typecheck`, `pnpm check:architecture`
- **Commit:** `54f162c`

---

**Total deviations:** 4 auto-fixed (2 missing critical, 2 blocking)
**Impact on plan:** All fixes preserved the planned architecture and server-authoritative boundaries. No result, economy or duo authority moved to the browser.

## Issues Encountered

- The first native form wiring attempt failed typecheck because Next's form `action` type expects `void | Promise<void>`, while the enhanced server actions intentionally return serializable result objects. This was resolved with route-local server wrappers that await and discard the result for native form fallback.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| `apps/web/src/app/app/roleta/page.tsx` | 208 | The visible `Travar como Principal` shell button remains intentionally unwired because lock/discard application behavior is owned by Plans 06-07 and 06-08. |
| `apps/web/src/app/app/roleta/page.tsx` | 55 | The route renders shell panels, not the final 60-cover reveal component; Plan 06-05 owns reveal UI, audio playback, reduced motion and history presentation polish. |

These do not block Plan 06-04 because this plan delivered the route shell and route actions that later reveal/lock plans will consume.

## Threat Flags

None. The new trust-boundary work matches the plan threat model: browser inputs are limited to `idempotencyKey`, `useBoost`, `roundId` and `audioEnabled`; session, duo membership, result, pity, balance, rarity and weekend/economy facts remain server-derived.

## Verification

| Command | Result |
|---------|--------|
| `pnpm --filter @queue/web test -- roulette-ui duo-flow` | Passed: 2 files, 20 tests |
| `pnpm --filter @queue/web test -- performance-metrics` | Passed: 1 file, 16 tests |
| `pnpm --filter @queue/web typecheck` | Passed |
| `pnpm check:architecture` | Passed |
| `rg -n "duoId|resultLibraryGameId|resultCatalogGameId|pity|boostBalance|resultRarity|weekend" apps/web/src/app/app/roleta/actions.ts` | No matches |

## TDD Gate Compliance

- Task 1 RED commit exists before GREEN: `20732f0` then `b73c17a`.
- Task 2 RED commit exists before GREEN: `5a0fc29` then `88f0ad0`.
- Follow-up fix commit `54f162c` updates tests and implementation after the GREEN commits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 06-05 can attach reveal components, audio behavior and reduced-motion handling to the route state and start/replay actions now present.
- Plans 06-07 and 06-08 can implement and wire lock/discard behavior using the pending invitation state already surfaced by the shell.

## Self-Check: PASSED

- Created files exist: `apps/web/src/app/app/roleta/page.tsx`, `apps/web/src/app/app/roleta/actions.ts`, `apps/web/src/modules/roulette/presentation/view-models.ts`, `apps/web/src/modules/duo/application/update-duo-audio-preference.ts`.
- Modified files exist: navigation, mobile CSS, Duo public/repository files, performance contracts and focused tests.
- Task and follow-up commits found in git history: `20732f0`, `b73c17a`, `5a0fc29`, `88f0ad0`, `54f162c`.
- No tracked file deletions were introduced by the implementation commits.

---
*Phase: 06-roleta-e-economia*
*Completed: 2026-06-09*
