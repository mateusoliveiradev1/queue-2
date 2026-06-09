---
phase: 06-roleta-e-economia
plan: 09
subsystem: verification
tags: [tests, accessibility, simulation, roulette, economy]

requires:
  - phase: 06-08
    provides: roulette route, lock/discard and replacement wiring
provides:
  - complete focused requirement and decision coverage map
  - authenticated `/app/roleta` accessibility scenario with fixture blockers
  - deterministic roulette economy simulation script
  - generated economy simulation evidence artifact
affects: [phase-06, roulette-tests, roulette-economy, accessibility]

tech-stack:
  added: []
  patterns:
    - "Focused source tests enumerate Phase 6 requirements and D-01 through D-32 decisions."
    - "Economy simulation duplicates the public domain constants as an executable evidence artifact and writes the generated report."

key-files:
  created:
    - .planning/phases/06-roleta-e-economia/06-ECONOMY-SIMULATION.md
  modified:
    - apps/web/tests/accessibility.spec.ts
    - apps/web/tests/phase-6-e2e.spec.ts
    - apps/web/tests/roulette-domain.test.ts
    - apps/web/tests/roulette-ui.test.tsx
    - scripts/roulette-economy-simulation.mjs

key-decisions:
  - "The simulation uses deterministic seeded randomness with 100000 rounds per stochastic scenario and asserts tolerance before writing evidence."
  - "Phase 6 browser/accessibility and DB checks remain fixture-gated; missing environment is recorded as BLOCKED setup instead of passing evidence."

patterns-established:
  - "A plan-level coverage map can make every requirement and decision ID searchable without weakening behavior-focused tests."
  - "Generated simulation evidence stays reproducible by running `node scripts/roulette-economy-simulation.mjs`."

requirements-completed: [ROUL-01, ROUL-02, ROUL-03, ROUL-04, ROUL-05, ROUL-06, ROUL-07, ROUL-08, ROUL-09, ROUL-10, SAFE-06]

duration: 20 min
completed: 2026-06-09
---

# Phase 06 Plan 09: Focused Coverage and Economy Simulation Summary

**Phase 6 now has focused coverage for every roulette requirement and deterministic economy evidence for rarity, pity, cooldown, boost cost/cap and weekend generation.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-09T17:05:00Z
- **Completed:** 2026-06-09T17:17:51Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added a focused Phase 6 coverage map that enumerates `ROUL-01` through `ROUL-10`, `SAFE-06` and decisions `D-01` through `D-32`.
- Extended `/app/roleta` accessibility coverage with mobile reduced-motion, no-autoplay audio preference, 44px controls, 72px by 52px mobile nav targets, no overlap, visual center and axe assertions.
- Added D-23 E2E measurement for fixed pointer visual center above the full-bleed reel with controls below.
- Replaced the blocked economy simulation scaffold with a deterministic seeded script that writes `.planning/phases/06-roleta-e-economia/06-ECONOMY-SIMULATION.md`.

## Task Commits

1. **Task 1/2 RED: focused coverage audit tests** - `ba5ecaa` (test)
2. **Task 1/2 GREEN: coverage, accessibility and economy simulation** - `9a1ea30` (feat)

**Plan metadata:** included in the docs commit for this summary.

## Files Created/Modified

- `.planning/phases/06-roleta-e-economia/06-ECONOMY-SIMULATION.md` - Generated simulation evidence with constants, observed percentages, pity triggers, cooldown, boost spend/refund counts and verdict.
- `scripts/roulette-economy-simulation.mjs` - Deterministic seeded simulation and report writer.
- `apps/web/tests/roulette-ui.test.tsx` - Added RED source assertions for Phase 6 focused coverage and roulette accessibility source coverage.
- `apps/web/tests/roulette-domain.test.ts` - Added complete requirement/decision coverage map.
- `apps/web/tests/accessibility.spec.ts` - Added fixture-gated Phase 6 roulette accessibility scenario and layout/touch-target helpers.
- `apps/web/tests/phase-6-e2e.spec.ts` - Added fixed pointer visual center assertion for the mobile full-bleed reel.

## Decisions Made

- The economy evidence is generated from a local deterministic script instead of relying on ad hoc manual calculations, so future constant changes can regenerate the report.
- The accessibility route test requires real `E2E_BASE_URL`, ready user credentials and eligible roulette slugs; without them it skips with `BLOCKED setup`.
- The database tests were not broadened in this plan because the existing migration/RLS/concurrency files already covered the required Phase 6 blockers and contracts.

## Deviations from Plan

- The exact glob `packages/db/tests/roulette-*.test.ts` is unsafe in this PowerShell environment, so verification used explicit DB test paths for the blocker `rg`.

## Issues Encountered

- `pnpm --filter @queue/web typecheck` initially caught a missing local `expectElementBefore` helper in `accessibility.spec.ts`; the helper was added and typecheck passed.

## Verification

- `node scripts/roulette-economy-simulation.mjs` - passed; generated `06-ECONOMY-SIMULATION.md`.
- `pnpm --filter @queue/web test -- roulette-domain roulette-application roulette-ui` - passed, 41 tests.
- `pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency` - passed with 1 file passing, 2 files skipped and explicit `TEST_DATABASE_URL` blockers.
- `pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts tests/accessibility.spec.ts` - passed with 35 fixture-guarded skips and exact Phase 6 blocker output.
- `pnpm --filter @queue/web typecheck` - passed.
- Phase 6 acceptance `rg` checks for requirement IDs, decision/accessibility strings, D-23 layout strings, blockers, simulation constants and simulation traceability all returned matches.

## User Setup Required

- Configure `TEST_DATABASE_URL` for real Phase 6 DB migration/RLS/concurrency evidence.
- Configure `E2E_BASE_URL`, `E2E_READY_USER_EMAIL`, `E2E_READY_USER_PASSWORD`, `E2E_READY_PARTNER_EMAIL`, `E2E_READY_PARTNER_PASSWORD`, `E2E_OTHER_DUO_USER_EMAIL`, `E2E_OTHER_DUO_USER_PASSWORD` and `E2E_PHASE6_ELIGIBLE_SLUGS` for real browser/accessibility evidence.

## Next Phase Readiness

Ready for 06-10 root Phase 6 gate and evidence artifacts.

---
*Phase: 06-roleta-e-economia*
*Completed: 2026-06-09*
