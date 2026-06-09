---
phase: 06-roleta-e-economia
plan: 03
subsystem: roulette
tags: [typescript, vitest, roulette, postgres, idempotency, boost, pity, history]

requires:
  - phase: 06-roleta-e-economia-01
    provides: Roulette tables, RLS, indexes and integration test scaffold.
  - phase: 06-roleta-e-economia-02
    provides: Roulette policy, public contracts and repository shell.
provides:
  - Authoritative roulette state, history and replay application use cases.
  - Idempotent roulette start transaction with persisted result, boost spend, pity, cooldowns, history and 60-slot reel entries.
  - Postgres repository internals for 06-03 read/start paths, including membership-scoped locks and boost materialization from XP facts.
affects: [06-04, 06-05, 06-07, 06-08, phase-6-gate]

tech-stack:
  added: []
  patterns:
    - Membership-scoped application use cases over injectable transaction ports.
    - Append-only roulette boost/history effects with idempotency keys.
    - Persisted 60-slot roulette snapshot used for refresh, replay and partner resume.

key-files:
  created:
    - apps/web/src/modules/roulette/application/get-roulette-state.ts
    - apps/web/src/modules/roulette/application/get-roulette-history.ts
    - apps/web/src/modules/roulette/application/replay-roulette-round.ts
    - apps/web/src/modules/roulette/application/start-roulette-round.ts
  modified:
    - apps/web/src/modules/roulette/application/ports.ts
    - apps/web/src/modules/roulette/infrastructure/roulette-repository.ts
    - apps/web/src/modules/roulette/index.ts
    - apps/web/tests/roulette-application.test.ts

key-decisions:
  - "Roulette state returns semantic CTA ids and server-read audio preference rather than route/UI copy."
  - "Boost materialization reads app.duo_xp_awards into earn: ledger entries and never mutates app.duos lifetime XP or level."
  - "Replay is read-only over a persisted round and does not redraw, spend, refund, update pity or write history."
  - "Existing active/revealing/pending rounds are returned before any new draw or boost spend."

patterns-established:
  - "Roulette application use cases remain framework-free and are tested with fake repositories."
  - "The public roulette module wires server-only wrappers while keeping infrastructure private."
  - "Start transactions persist the authoritative result, 60 entries, pity state, cooldown decrement and history event before returning reveal state."

requirements-completed:
  - ROUL-02
  - ROUL-06
  - ROUL-07
  - ROUL-08
  - ROUL-10
  - SAFE-06

duration: 29 min
completed: 2026-06-09
---

# Phase 06 Plan 03: Authoritative Roulette State And Start Summary

**Authoritative roulette state/history/replay and idempotent start transactions with boost, pity, history and persisted 60-slot reel snapshots.**

## Performance

- **Duration:** 29 min
- **Started:** 2026-06-09T12:35:00Z
- **Completed:** 2026-06-09T13:04:22Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added `getRouletteStateUseCase`, `getRouletteHistoryUseCase` and `replayRouletteRoundUseCase` with membership resolution, eligible `wishlist`/`pausado` reads, blocked-pool state, active/pending resume, simple pity progress, boost cap/balance and server-read D-18 audio preference.
- Added `startRouletteRoundUseCase` with existing-round/idempotency convergence, server-derived selection, persisted result, 60 persisted reel entries, pity transition, cooldown decrement, boost spend/refund handling and history event insertion before return.
- Implemented the 06-03 Postgres repository internals used by state/history/replay/start, including `FOR UPDATE` reads, boost materialization from `app.duo_xp_awards`, `earn:` and `spend:` ledger keys, and no mutation of lifetime duo XP/level.
- Extended roulette application tests through RED/GREEN commits for state/history/replay and start transaction behavior, including replay non-mutation, active-round resume, boosted spend, pre-persistence refund and post-persistence resume.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing state/history/replay tests** - `9e41feb` (test)
2. **Task 1 GREEN: Implement state/history/replay use cases** - `06b5830` (feat)
3. **Task 2 RED: Add failing start transaction tests** - `35b4407` (test)
4. **Task 2 GREEN: Implement idempotent start transaction** - `aceb186` (feat)
5. **Follow-up fix: Clarify future repository stubs** - `5da7964` (fix)

## Files Created/Modified

- `apps/web/src/modules/roulette/application/get-roulette-state.ts` - Authoritative state read model for blocked, ready and resumable/pending round states.
- `apps/web/src/modules/roulette/application/get-roulette-history.ts` - Bounded duo-scoped history use case.
- `apps/web/src/modules/roulette/application/replay-roulette-round.ts` - Read-only persisted round replay use case.
- `apps/web/src/modules/roulette/application/start-roulette-round.ts` - Idempotent authoritative round start transaction use case.
- `apps/web/src/modules/roulette/application/ports.ts` - Repository records, transaction methods and use case result contracts.
- `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` - Postgres transaction internals for 06-03 state/history/replay/start paths.
- `apps/web/src/modules/roulette/index.ts` - Public server-only roulette wrappers and exports.
- `apps/web/tests/roulette-application.test.ts` - Focused fake-repository application coverage.

## Decisions Made

- State exposes semantic CTA ids (`discover`, `catalog`, `library`) rather than Brazilian Portuguese UI copy so the application layer stays route/UI agnostic.
- The start path materializes roulette boost only from awarded XP facts in `app.duo_xp_awards`, with `earn:` ledger keys, `floor(amount * 0.2 * weekendFactor)`, weekend factor `1.2` in duo timezone and cap `600`.
- Replay returns persisted round/entries with `isReplay: true`; it intentionally does not call selection, spend, refund, pity or history methods.
- Persisted boosted failures split on persistence boundary: pre-persistence failure refunds with `refund:`; post-persistence failure resumes the saved round without refund.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Clarified stale 06-03 repository sentinel names**
- **Found during:** Post-task stub scan
- **Issue:** Future lock/discard repository methods still threw `pending_06_03` errors inherited from the Plan 06-02 shell, which made the remaining future stubs look like unfinished 06-03 work.
- **Fix:** Renamed the sentinel to `reserved_for_later_phase_6_plan` while leaving the current 06-03 start/state/history/replay behavior unchanged.
- **Files modified:** `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts`
- **Verification:** `pnpm --filter @queue/web test -- roulette-application`, `pnpm --filter @queue/web typecheck`, `pnpm check:architecture`
- **Commit:** `5da7964`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No behavioral expansion beyond 06-03; this only corrected stale diagnostic text for future Phase 6 methods.

## Issues Encountered

- `pnpm --filter @queue/db test:integration -- roulette-concurrency` could not exercise the real DB concurrency path because `TEST_DATABASE_URL` is not configured. The command exited successfully with explicit skip output and named blocker evidence: `BLOCKED setup - missing TEST_DATABASE_URL for Phase 6 roulette concurrency fixtures.`

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | 222 | `upsertCooldown` is reserved for later Phase 6 discard/lock flows and is not called by 06-03 start/state/history/replay. |
| `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | 226 | `markRoundRevealed` is reserved for later Phase 6 route/result flows and is not required for the 06-03 persisted pending invitation contract. |
| `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | 227 | `recordReplay` remains unused because 06-03 replay is intentionally read-only and writes no history. |
| `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | 228 | `lockRoundResult` is reserved for Plan 06-07 lock/handoff implementation. |
| `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | 229 | `discardRoundResult` is reserved for Plan 06-07 discard implementation. |
| `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | 287 | `lockRouletteResultAsPrincipal` public shell is reserved for Plan 06-07. |
| `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | 303 | `discardRouletteResult` public shell is reserved for Plan 06-07. |

## Verification

| Command | Result |
|---------|--------|
| `pnpm --filter @queue/web test -- roulette-application` | Passed: 1 file, 9 tests |
| `pnpm --filter @queue/db test:integration -- roulette-concurrency` | BLOCKED evidence recorded: skipped because `TEST_DATABASE_URL` is not configured |
| `pnpm --filter @queue/web typecheck` | Passed |
| `pnpm check:architecture` | Passed |

## TDD Gate Compliance

- Task 1 RED commit exists before GREEN: `9e41feb` then `06b5830`.
- Task 2 RED commit exists before GREEN: `35b4407` then `aceb186`.

## Threat Flags

None. The new trust-boundary work matches the plan threat model: browser inputs remain limited to `userId`, `idempotencyKey`, `useBoost` and `roundId`; result, duo, pity, balance, cooldown and economy facts are server-derived behind membership-scoped transactions.

## Self-Check: PASSED

- Created files exist: `get-roulette-state.ts`, `get-roulette-history.ts`, `replay-roulette-round.ts`, `start-roulette-round.ts`.
- Modified files exist: `ports.ts`, `roulette-repository.ts`, `index.ts`, `roulette-application.test.ts`.
- Task and follow-up commits found in git history: `9e41feb`, `06b5830`, `35b4407`, `aceb186`, `5da7964`.
- No tracked file deletions were introduced by the implementation commits.
