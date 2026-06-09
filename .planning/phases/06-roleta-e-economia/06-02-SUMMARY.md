---
phase: 06-roleta-e-economia
plan: 02
subsystem: roulette
tags: [typescript, vitest, roulette-policy, modular-architecture, server-only]

requires:
  - phase: 06-roleta-e-economia-00
    provides: Phase 6 RED tests, evidence scaffolds and gate targets.
  - phase: 06-roleta-e-economia-01
    provides: Roulette database, RLS and migration foundation.
provides:
  - Pure roulette eligibility, rarity, pity, boost, cooldown and visual reel policy.
  - Server-only roulette public module boundary with wrapper contracts.
  - Roulette repository ports and transaction shell for Plan 06-03 persistence work.
affects: [06-03, 06-04, 06-05, 06-07, phase-6-gate]

tech-stack:
  added: []
  patterns:
    - Pure deterministic policy with injected rolls/seeds.
    - Public module wrappers over private infrastructure repository.
    - Repository shell uses withAppUserTransaction for transaction-local RLS identity.

key-files:
  created:
    - apps/web/src/modules/roulette/domain/roulette-policy.ts
    - apps/web/src/modules/roulette/index.ts
    - apps/web/src/modules/roulette/application/ports.ts
    - apps/web/src/modules/roulette/infrastructure/roulette-repository.ts
  modified:
    - apps/web/tests/roulette-domain.test.ts

key-decisions:
  - "Locked roulette constants to 70/22/7/1 base weights, 55/28/14/3 boosted weights, pity 10, boost cost 100, boost cap 600, cooldown 3 at 50%, and weekend earn multiplier 1.2."
  - "Roulette index exposes wrapper functions and application types while keeping the repository factory/object private to infrastructure."
  - "Repository transaction internals remain an explicit Plan 06-03 shell, with membership resolution and app-user transaction wiring in place now."

patterns-established:
  - "Roulette domain rules are framework-free and tested through deterministic pure functions."
  - "Roulette public APIs are server-only wrappers that delegate to application/repository contracts."

requirements-completed:
  - ROUL-01
  - ROUL-02
  - ROUL-06
  - ROUL-07
  - ROUL-08
  - ROUL-10

duration: 11 min
completed: 2026-06-09
---

# Phase 06 Plan 02: Roulette Policy And Contracts Summary

**Deterministic roulette policy with server-only public contracts and a transaction-ready repository shell.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-09T11:55:38Z
- **Completed:** 2026-06-09T12:06:28Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added pure roulette policy for eligible Wishlist/Pausado pool rules, deterministic weighted selection, 60-slot visual reel generation, pity transitions, boost earning/spend policy, cooldown weighting and active-round resume/refund behavior.
- Added focused domain tests that cover ROUL-01, ROUL-02, ROUL-06, ROUL-07, ROUL-08 and ROUL-10 without importing framework, database, auth or infrastructure from the domain policy.
- Added the roulette public module boundary, application repository contracts and a server-only repository shell wired through `withAppUserTransaction`.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Implement pure roulette policy tests** - `242450c` (test)
2. **Task 1 GREEN: Implement pure roulette policy** - `f8f4081` (feat)
3. **Task 2: Add public contracts and repository shell** - `80b88e3` (feat)

## Files Created/Modified

- `apps/web/src/modules/roulette/domain/roulette-policy.ts` - Pure constants and policies for eligibility, selection, reel, pity, boost, cooldown and resume/refund.
- `apps/web/src/modules/roulette/index.ts` - Server-only public wrapper boundary for roulette domain and application contracts.
- `apps/web/src/modules/roulette/application/ports.ts` - Repository and transaction contracts for future state, start, replay, lock/discard and history use cases.
- `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` - Server-only repository shell using app-user transactions and membership resolution.
- `apps/web/tests/roulette-domain.test.ts` - Deterministic roulette domain tests and framework-free boundary assertion.

## Decisions Made

- Constants were locked from `06-RESEARCH.md`: base weights `70/22/7/1`, boosted weights `55/28/14/3`, pity threshold `10`, boost cost `100`, boost cap `600`, cooldown `3` rounds at `0.5`, and weekend boost earn multiplier `1.2`.
- The public entrypoint exports wrapper functions and application/domain types only; the infrastructure repository object and factory remain private to the module.
- Repository transaction internals are intentionally deferred to Plan 06-03, but membership resolution and transaction-local user identity wiring are present now.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added minimal public entrypoint during Task 1**
- **Found during:** Task 1 (Implement pure roulette policy)
- **Issue:** The RED tests exercise the module public boundary, so the pure policy could not pass without a root roulette entrypoint.
- **Fix:** Added a minimal `apps/web/src/modules/roulette/index.ts` in the GREEN commit, then completed/narrowed it during Task 2.
- **Files modified:** `apps/web/src/modules/roulette/index.ts`
- **Verification:** `pnpm --filter @queue/web test -- roulette-domain`, `pnpm --filter @queue/web typecheck`, `pnpm check:architecture`
- **Committed in:** `f8f4081`, completed in `80b88e3`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The added entrypoint supports the planned public boundary and did not expand beyond 06-02 scope.

## Issues Encountered

- PowerShell required shell-safe quoting for `rg` patterns containing `@queue/db` and quoted `server-only`; the checks were rerun with safe patterns and passed.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | 237 | `roulette_repository_${methodName}_pending_06_03` marks transaction internals intentionally deferred to Plan 06-03 while this plan delivers the repository shell and contracts. |

## Verification

- `pnpm --filter @queue/web test -- roulette-domain` - PASSED (9 tests)
- `pnpm --filter @queue/web typecheck` - PASSED
- `pnpm check:architecture` - PASSED
- Acceptance grep for policy constants/functions - PASSED
- Acceptance grep for domain framework/import boundary - PASSED
- Acceptance grep for public contracts, transaction wiring and no domain/application infrastructure import - PASSED

## TDD Gate Compliance

- RED commit present: `242450c test(06-02): add failing tests for roulette policy`
- GREEN commit present after RED: `f8f4081 feat(06-02): implement pure roulette policy`
- Refactor commit: not needed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 06-03 to replace the repository shell internals with authoritative round creation, boost materialization, pity/cooldown persistence and state reads.

## Self-Check: PASSED

- Created/modified files exist on disk.
- Task commits `242450c`, `f8f4081` and `80b88e3` exist in git history.

---
*Phase: 06-roleta-e-economia*
*Completed: 2026-06-09*
