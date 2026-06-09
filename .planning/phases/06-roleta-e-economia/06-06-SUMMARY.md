---
phase: 06-roleta-e-economia
plan: 06
subsystem: play
tags: [play, roulette, transaction, postgres, vitest, architecture]

requires:
  - phase: 06-roleta-e-economia-03
    provides: Authoritative roulette result state that needs a Play-owned replacement handoff.
provides:
  - Public `replacePlayingGame` Play contract for explicit roulette replacements.
  - Application use case that validates membership, active selection and replacement layout server-side.
  - Repository transaction support to pause only the selected game and activate the incoming game as Principal.
  - Play application coverage for selected replacement and missing active selection.
affects: [06-07, 06-08, 06-10, phase-6-gate]

tech-stack:
  added: []
  patterns:
    - Cross-domain handoffs use public module wrappers instead of deep imports.
    - Active Play queue rewrites remain Play-owned and transaction-scoped.
    - Browser-selected library game ids are revalidated against duo-owned server state.

key-files:
  created:
    - apps/web/src/modules/play/application/replace-playing-game.ts
  modified:
    - apps/web/src/modules/play/application/ports.ts
    - apps/web/src/modules/play/infrastructure/play-repository.ts
    - apps/web/src/modules/play/index.ts
    - apps/web/tests/play-application.test.ts
    - apps/web/tests/play-scheduling.test.ts
    - apps/web/tests/play-sessions.test.ts
    - apps/web/tests/play-terminal-status.test.ts
    - apps/web/tests/play-timeline.test.ts

key-decisions:
  - "Replacement is addressed by library game id because roulette must replace one selected active queue item, not any game sharing catalog facts."
  - "The incoming game is always written as Principal at position 1 while remaining active games are compacted as secondaries."
  - "The existing `play-policy.ts` no-auto-pause behavior remains unchanged; replacement is an explicit public Play action."

patterns-established:
  - "Play replacement ports expose `readLibraryGameForReplacement` and `replacePlayingGameActiveSet` only inside the Play transaction boundary."
  - "Existing Play test repository doubles must implement all required transaction methods when `PlayRepositoryTransaction` grows."

requirements-completed:
  - ROUL-09
  - ROUL-10
  - SAFE-06

duration: 10 min
completed: 2026-06-09
---

# Phase 06 Plan 06: Play Replacement Contract Summary

**Public Play replacement contract for roulette handoff that pauses one selected active game and promotes the incoming result to Principal.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-09T12:56:49-03:00
- **Completed:** 2026-06-09T13:06:49-03:00
- **Tasks:** 1
- **Files modified:** 9

## Accomplishments

- Added `replacePlayingGameUseCase` with membership resolution, active queue locking, selected active-game validation and layout validation.
- Added public `replacePlayingGame` wrapper and exported `ReplacePlayingGameResult` through `apps/web/src/modules/play/index.ts`.
- Added repository support to read a replacement target by duo-owned `libraryGameId`, pause only the selected game and rewrite the active set in one Play-owned transaction.
- Added Play application tests proving the incoming roulette result becomes Principal and missing selected active games are refused.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing play replacement contract test** - `5ded3aa` (test)
2. **Task 1 GREEN: Add Play replacement use case, ports, repository and public wrapper** - `8a1c79f` (feat)

## Files Created/Modified

- `apps/web/src/modules/play/application/replace-playing-game.ts` - Selected replacement use case and active layout composition.
- `apps/web/src/modules/play/application/ports.ts` - Replacement result type and transaction methods.
- `apps/web/src/modules/play/infrastructure/play-repository.ts` - Duo-owned replacement lookup and transactional active set rewrite.
- `apps/web/src/modules/play/index.ts` - Public use case export and production wrapper.
- `apps/web/tests/play-application.test.ts` - TDD coverage for successful selected replacement and missing active selection.
- `apps/web/tests/play-scheduling.test.ts`, `apps/web/tests/play-sessions.test.ts`, `apps/web/tests/play-terminal-status.test.ts`, `apps/web/tests/play-timeline.test.ts` - Test repository doubles updated for the expanded transaction port.

## Decisions Made

- Used `libraryGameId` for the replacement contract because roulette receives an exact queue selection from the user.
- Kept the replacement mutation in Play infrastructure so roulette never writes active queue rows directly.
- Left `apps/web/src/modules/play/domain/play-policy.ts` untouched; existing `getFourthGameDecision` still requires explicit `pause`, `replace` or `cancel` and keeps `autoPause: false`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated existing Play test repositories for the new transaction port**
- **Found during:** Task 1 typecheck
- **Issue:** Adding required transaction methods to `PlayRepositoryTransaction` broke existing fake transaction objects in scheduling, sessions, terminal status and timeline tests.
- **Fix:** Added minimal `readLibraryGameForReplacement` and `replacePlayingGameActiveSet` stubs to those fakes.
- **Files modified:** `apps/web/tests/play-scheduling.test.ts`, `apps/web/tests/play-sessions.test.ts`, `apps/web/tests/play-terminal-status.test.ts`, `apps/web/tests/play-timeline.test.ts`
- **Verification:** `pnpm --filter @queue/web test -- play-application play-scheduling play-sessions play-terminal-status play-timeline`, `pnpm --filter @queue/web typecheck`
- **Commit:** `8a1c79f`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was required by the stricter Play transaction contract and did not change production scope.

## Issues Encountered

- Typecheck failed until existing Play test doubles implemented the newly required transaction methods. The production repository already had concrete implementations before the final verification pass.

## Verification

| Command | Result |
|---------|--------|
| `pnpm --filter @queue/web test -- play-application` | Passed: 1 file, 14 tests |
| `pnpm --filter @queue/web test -- play-application play-scheduling play-sessions play-terminal-status play-timeline` | Passed: 6 files, 36 tests |
| `pnpm --filter @queue/web typecheck` | Passed |
| `pnpm check:architecture` | Passed |
| `rg -n "replacePlayingGameUseCase|replacePlayingGame|pausedLibraryGameId|incomingLibraryGameId|makePrincipal" apps/web/src/modules/play apps/web/tests/play-application.test.ts` | Returned implementation and tests |
| `rg -n "autoPause:\\s*true|automatically pause|automatic pause" apps/web/src/modules/play apps/web/src/modules/roulette` | No matches |
| `git diff -- apps/web/src/modules/play/domain/play-policy.ts` | No changes |

## TDD Gate Compliance

- RED commit exists before GREEN: `5ded3aa` then `8a1c79f`.
- `play-policy.ts` remained unchanged throughout the plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 06-07 can call Play through `replacePlayingGame` when a roulette result is locked into a full `Jogando` queue.
- Plan 06-08 can keep discard behavior separate because no replacement happens implicitly.

## Self-Check: PASSED

- Created file exists: `apps/web/src/modules/play/application/replace-playing-game.ts`.
- Public wrapper and use case export exist in `apps/web/src/modules/play/index.ts`.
- Task commits found in git history: `5ded3aa`, `8a1c79f`.
- No Phase 6 changes were made to `apps/web/src/modules/play/domain/play-policy.ts`.

---
*Phase: 06-roleta-e-economia*
*Completed: 2026-06-09*
