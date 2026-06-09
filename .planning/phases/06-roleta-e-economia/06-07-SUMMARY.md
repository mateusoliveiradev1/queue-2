---
phase: 06-roleta-e-economia
plan: 07
subsystem: roulette
tags: [roulette, play, transaction, notifications, push, vitest]

requires:
  - phase: 06-roleta-e-economia-03
    provides: Pending persisted roulette invitations that must be resolved server-side.
  - phase: 06-roleta-e-economia-06
    provides: Public Play replacement contract for selected full-queue replacement.
provides:
  - Roulette lock use case that turns a pending result into Jogando Principal through Play public contracts.
  - Replacement-required branch with `autoPause: false` and no state mutation before selected replacement.
  - Discard use case that closes the invitation, records cooldown/history and preserves boost spend.
  - Public Play operational notification collaborator for locked/discarded roulette outcomes.
  - Application coverage for lock, replacement, discard, resolved invitation refusal and notification push gating.
affects: [06-08, 06-10, phase-6-gate]

tech-stack:
  added: []
  patterns:
    - Roulette resolves invitations through injected Play public functions instead of importing Play internals.
    - Play operational roulette notifications validate a local two-value union while keeping `play-policy.ts` unchanged.
    - Push delivery remains dependency-injected and gated by existing enabled product-push subscriptions.

key-files:
  created:
    - apps/web/src/modules/roulette/application/lock-roulette-result-as-principal.ts
    - apps/web/src/modules/roulette/application/discard-roulette-result.ts
    - apps/web/src/modules/play/application/create-operational-notification.ts
  modified:
    - apps/web/src/modules/roulette/application/ports.ts
    - apps/web/src/modules/roulette/infrastructure/roulette-repository.ts
    - apps/web/src/modules/roulette/index.ts
    - apps/web/src/modules/play/index.ts
    - apps/web/tests/roulette-application.test.ts
    - apps/web/tests/play-application.test.ts

key-decisions:
  - "Roulette lock first asks Play activation through the public contract; if the queue is full it returns replacement-required with autoPause false until the user selects a replacement."
  - "When activation succeeds as secondary or already-playing secondary, Roulette promotes the exact persisted result library game through Play's public promote contract."
  - "Discard creates a 3-round cooldown at the existing 0.5 multiplier and records no boost return behavior."
  - "Play notification roulette types are validated by a local `ROULETTE_OPERATIONAL_NOTIFICATION_TYPES` union because `play-policy.ts` is read-only in this plan."

patterns-established:
  - "Cross-domain use cases receive public-domain collaborators as dependencies for testability and architecture compliance."
  - "Roulette SQL resolution updates only `pending_invitation` rounds and returns null when the invitation was already resolved."
  - "Operational push attempts happen after the in-app Central da Dupla fact is inserted and only for enabled subscriptions."

requirements-completed:
  - ROUL-09
  - ROUL-10
  - SAFE-06

duration: 18 min
completed: 2026-06-09
---

# Phase 06 Plan 07: Roulette Lock And Discard Summary

**Implemented server-side resolution for roulette invitations: lock as Principal, require explicit replacement, or discard with cooldown and Central da Dupla facts.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-09T13:28:00-03:00
- **Completed:** 2026-06-09T13:45:59-03:00
- **Tasks:** 1
- **Files modified:** 9

## Accomplishments

- Added `lockRouletteResultAsPrincipalUseCase` with membership checks, pending-round validation, exact result library id validation, Play activation, Play promotion and Play replacement branch.
- Added `discardRouletteResultUseCase` with pending-round validation, status transition, 3-round cooldown, history event and no boost return behavior.
- Implemented roulette repository transitions for `upsertCooldown`, `lockRoundResult` and `discardRoundResult`; `readRoundById` now locks the row for invitation resolution.
- Added `createOperationalPlayNotificationUseCase` for `roulette-result-locked` and `roulette-result-discarded`, using existing Play notification persistence and enabled push subscriptions.
- Exported public Play and Roulette wrappers without touching `apps/web/src/modules/play/domain/play-policy.ts` or `apps/web/src/modules/play/application/ports.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing roulette resolution and Play notification tests** - `1421409` (test)
2. **Task 1 GREEN: Add lock/discard use cases and notification collaborator** - `436cbfc` (feat)

## Files Created/Modified

- `apps/web/src/modules/roulette/application/lock-roulette-result-as-principal.ts` - Lock use case, Play activation/promote/replacement handoff and locked history/notification.
- `apps/web/src/modules/roulette/application/discard-roulette-result.ts` - Discard use case, cooldown, history and discarded notification.
- `apps/web/src/modules/play/application/create-operational-notification.ts` - Narrow roulette notification collaborator with enabled push delivery.
- `apps/web/src/modules/roulette/application/ports.ts` - Added `autoPause?: false` to the replacement-required lock result.
- `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` - SQL transitions for lock, discard and cooldown.
- `apps/web/src/modules/roulette/index.ts` - Public wrappers wired to Play public collaborators.
- `apps/web/src/modules/play/index.ts` - Public operational notification wrapper and exports.
- `apps/web/tests/roulette-application.test.ts` - Lock, replacement-required, replacement, discard and resolved-invitation tests.
- `apps/web/tests/play-application.test.ts` - Operational notification and push-gating tests.

## Decisions Made

- Kept `play-policy.ts` read-only and defined roulette notification type validation locally in the new Play application collaborator.
- Used existing `insertNotificationItem` and `readEnabledPushSubscriptions` ports rather than expanding `apps/web/src/modules/play/application/ports.ts`.
- Returned replacement information before any roulette status/history mutation when Play reports a full Jogando queue.
- Treated failed notification push as non-blocking for the in-app fact; the Central da Dupla notification is inserted first.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Avoided modifying Play repository and Play ports**
- **Found during:** Implementation
- **Issue:** The plan listed `play-repository.ts` as a likely modified file, but existing Play ports already exposed notification insertion and enabled push subscription reads.
- **Fix:** Added a Play application collaborator that uses existing repository methods and exported it from `modules/play`.
- **Files modified instead:** `apps/web/src/modules/play/application/create-operational-notification.ts`, `apps/web/src/modules/play/index.ts`
- **Verification:** `git diff -- apps/web/src/modules/play/application/ports.ts` returned no changes; `pnpm check:architecture` passed.
- **Commit:** `436cbfc`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Scope stayed the same while preserving the stricter "do not modify Play ports" instruction.

## Issues Encountered

- Typecheck initially failed because the new roulette test helper returned untyped Vitest mocks where the use cases expected typed Play collaborators. The helper now exposes the real use-case parameter shapes while preserving spy assertions.

## Verification

| Command | Result |
|---------|--------|
| `pnpm --filter @queue/web test -- roulette-application play-application` | Passed: 2 files, 30 tests |
| `pnpm --filter @queue/web typecheck` | Passed |
| `pnpm check:architecture` | Passed |
| `rg -n "lockRouletteResultAsPrincipalUseCase|discardRouletteResultUseCase|replacement-required|autoPause: false|roleta-principal|roulette_history_events" apps/web/src/modules/roulette apps/web/tests/roulette-application.test.ts` | Returned implementation and tests |
| `rg -n "createOperationalPlayNotification|roulette-result-locked|roulette-result-discarded|insertNotificationItem|push" apps/web/src/modules/play apps/web/src/modules/roulette apps/web/tests/roulette-application.test.ts apps/web/tests/play-application.test.ts` | Returned implementation and tests |
| `git diff -- apps/web/src/modules/play/domain/play-policy.ts` | No changes |
| `git diff -- apps/web/src/modules/play/application/ports.ts` | No changes |
| `rg -n "refund" apps/web/src/modules/roulette/application/discard-roulette-result.ts apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | No matches |
| `rg -n "play/(domain|infrastructure)|library/(domain|infrastructure)" apps/web/src/modules/roulette` | No matches |

## TDD Gate Compliance

- RED commit exists before GREEN: `1421409` then `436cbfc`.
- `play-policy.ts` remained unchanged.
- `play/application/ports.ts` remained unchanged.

## User Setup Required

None - no external service configuration required for the application/unit checks. Actual web push delivery still depends on VAPID configuration, as in earlier Play plans.

## Next Phase Readiness

- Plan 06-08 can wire result panel actions to `lockRouletteResultAsPrincipal` and `discardRouletteResult`.
- Replacement UI can use the `replacement-required` result and selected `pausedLibraryGameId` branch.
- Wave 4 is ready for a build/test gate.

## Self-Check: PASSED

- Created files exist: `lock-roulette-result-as-principal.ts`, `discard-roulette-result.ts`, `create-operational-notification.ts`.
- Public wrappers use `modules/play` exports, not Play internals.
- Forbidden `refund` search returns no production matches in discard/repository files.
- Task commits found in git history: `1421409`, `436cbfc`.

---
*Phase: 06-roleta-e-economia*
*Completed: 2026-06-09*
