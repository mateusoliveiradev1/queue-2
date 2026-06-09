---
phase: 06-roleta-e-economia
plan: 00
subsystem: testing
tags: [roulette, economy, vitest, playwright, postgres, gate]

requires:
  - phase: 05-gamificacao-coletiva
    provides: Shared XP/economy context, achievement rarity vocabulary and gate patterns.
provides:
  - Phase 6 RED policy, application, UI and browser coverage targets.
  - Roulette DB migration, RLS and concurrency integration scaffolds.
  - Deterministic economy simulation scaffold and root Phase 6 gate command.
affects: [06-roleta-e-economia, roulette, economy, database, ui, e2e]

tech-stack:
  added: []
  patterns:
    - RED tests dynamically target the future roulette public module until implementation lands.
    - Missing DB/browser/performance evidence is reported as named BLOCKED setup.

key-files:
  created:
    - apps/web/tests/roulette-domain.test.ts
    - apps/web/tests/roulette-application.test.ts
    - apps/web/tests/roulette-ui.test.tsx
    - apps/web/tests/phase-6-e2e.spec.ts
    - packages/db/tests/roulette-migrations.test.ts
    - packages/db/tests/roulette-rls.test.ts
    - packages/db/tests/roulette-concurrency.test.ts
    - scripts/roulette-economy-simulation.mjs
    - scripts/phase-6-gate.mjs
  modified:
    - package.json

key-decisions:
  - "Wave 0 tests intentionally fail RED on missing Phase 6 implementation or emit named setup blockers for missing external evidence."
  - "The Phase 6 gate is exposed as `pnpm phase:6:gate` because validation plans reference that executable target."

patterns-established:
  - "Roulette constants are locked in tests and simulation scaffolds: 70/22/7/1 base, 55/28/14/3 boost, pity 10, boost cost 100, cap 600, cooldown 3 at 50%, weekend 1.2 and 60 reel slots."
  - "Browser evidence requires real ready-duo, partner, other-duo and eligible-slug fixtures with no test-only auth bypass."

requirements-completed:
  - ROUL-01
  - ROUL-02
  - ROUL-03
  - ROUL-04
  - ROUL-05
  - ROUL-06
  - ROUL-07
  - ROUL-08
  - ROUL-09
  - ROUL-10
  - SAFE-06

duration: 15 min
completed: 2026-06-09
---

# Phase 06 Plan 00: Wave 0 Validation Scaffold Summary

**Roulette RED test matrix, fixture-blocked browser/DB evidence, and Phase 6 gate scaffolds for server-authoritative economy validation.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-09T10:48:56Z
- **Completed:** 2026-06-09T11:03:57Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added Phase 6 RED coverage for roulette policy, application, UI, DB migrations, RLS, concurrency and Play notification allowance.
- Added browser E2E scaffolds for `/app/roleta` with ready-duo, partner, other-duo and eligible-slug fixture gates.
- Added a deterministic economy simulation scaffold and `phase:6:gate` command that report honest missing implementation/evidence blockers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold domain, application and DB tests** - `ea82cb7` (test)
2. **Task 2: Scaffold UI and browser tests** - `869f357` (test)
3. **Task 3: Scaffold simulation and final gate** - `a29dd90` (test)

**Plan metadata:** included in the final docs commit for this summary.

## Files Created/Modified

- `apps/web/tests/roulette-domain.test.ts` - RED domain targets for eligibility, rarity weights, pity, boost, cooldown, weekend math and 60-slot reel behavior.
- `apps/web/tests/roulette-application.test.ts` - RED application targets for active-round resume, boost refund, replay, audio preference, lock replacement and discard history.
- `apps/web/tests/roulette-ui.test.tsx` - RED UI source assertions for exact PT-BR copy, 60 decorative slots, pointer, animation, audio, reduced motion, Legendary treatment, history and mobile nav.
- `apps/web/tests/phase-6-e2e.spec.ts` - Fixture-gated Playwright flow for persisted roulette state, partner resume, replay, replacement, mobile nav and cross-duo denial.
- `packages/db/tests/roulette-migrations.test.ts` - DB migration/RLS/index/comment/notification allowance targets.
- `packages/db/tests/roulette-rls.test.ts` - Duo-scoped RLS read/write and Play notification targets.
- `packages/db/tests/roulette-concurrency.test.ts` - One-active-round and exactly-once boost/pity/history concurrency targets.
- `scripts/roulette-economy-simulation.mjs` - Blocking simulation scaffold for base, boosted, pity, cooldown and weekend scenarios.
- `scripts/phase-6-gate.mjs` - Root Phase 6 gate scaffold covering architecture, typecheck, focused tests, DB, browser, accessibility, simulation, performance and security.
- `package.json` - Adds `phase:6:gate`.

## Decisions Made

- Wave 0 is intentionally RED: web tests fail until `src/modules/roulette` and `/app/roleta` exist; DB tests fail when the test database has no roulette schema.
- External evidence is explicit: DB/browser/performance gaps are named blockers, not passing proof.
- `pnpm phase:6:gate` was added now because later validation and execution plans already depend on the root command.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added root `phase:6:gate` package script**
- **Found during:** Task 3 (Scaffold simulation and final gate)
- **Issue:** The plan listed `package.json` as read-first only, but Phase 6 validation and later plans reference `pnpm phase:6:gate`; without the root script the gate target would not be executable.
- **Fix:** Added `"phase:6:gate": "node scripts/phase-6-gate.mjs"` to `package.json`.
- **Files modified:** `package.json`
- **Verification:** `rg -n '"phase:6:gate"' package.json`
- **Committed in:** `a29dd90`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required to make the planned gate target executable. No product scope was added.

## Issues Encountered

- `pnpm --filter @queue/web test -- roulette-domain roulette-application` failed RED with missing `src/modules/roulette`, as expected for Wave 0.
- `pnpm --filter @queue/web test -- roulette-ui` failed RED with missing `src/app/app/roleta/page.tsx`, as expected before UI implementation.
- `pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency` without a DB fixture skipped with `BLOCKED setup - missing TEST_DATABASE_URL`.
- `node scripts/phase-6-gate.mjs` loaded available local fixtures and failed DB integration against missing roulette schema, while reporting `BLOCKED - missing external evidence` for `DATABASE_URL` and `E2E_PHASE6_ELIGIBLE_SLUGS`.

## Verification

- `rg -n "wave_0_plan: 06-00-PLAN.md" .planning/phases/06-roleta-e-economia/06-VALIDATION.md` - passed.
- `rg -n "D-01|D-16|ROUL-10|SAFE-06|60|600|1.2|BLOCKED setup" ...` - passed for Task 1 files.
- `rg -n "TEST_DATABASE_URL" packages/db/tests/roulette-*.test.ts` - passed via concrete PowerShell-compatible file list.
- `rg -n "A fila escolhe agora|A roleta precisa de tres jogos|A fila apontou para este|Escolham quem pausa|Historico da roleta|5500|cubic-bezier|no autoplay|audio preference|mobile nav" apps/web/tests/roulette-ui.test.tsx` - passed.
- `rg -n "E2E_READY_USER|E2E_READY_PARTNER|E2E_OTHER_DUO_USER|E2E_PHASE6_ELIGIBLE_SLUGS|BLOCKED setup" apps/web/tests/phase-6-e2e.spec.ts` - passed.
- `rg -n "70|22|7|1|55|28|14|3|pity|cooldown|weekend|1.2|100000" scripts/roulette-economy-simulation.mjs` - passed.
- `rg -n "phase:6:gate|DATABASE_URL|TEST_DATABASE_URL|E2E_PHASE6_ELIGIBLE_SLUGS|BLOCKED - missing external evidence" scripts/phase-6-gate.mjs` - passed.
- `pnpm --filter @queue/web test -- roulette-domain roulette-application` - expected RED failure on missing `src/modules/roulette`.
- `pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency` - reported `BLOCKED setup - missing TEST_DATABASE_URL` when run without loaded env.
- `pnpm --filter @queue/web test -- roulette-ui` - expected RED failure on missing `/app/roleta`.
- `pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts` - skipped with `BLOCKED setup` and exact fixture names.
- `node scripts/roulette-economy-simulation.mjs` - expected BLOCKED failure until economy distribution evidence exists.
- `node scripts/phase-6-gate.mjs` - expected BLOCKED/RED result; architecture, typecheck, accessibility and secret scan passed, while roulette tests, DB integration and simulation remain pending implementation/evidence.

## Known Stubs

None. The simulation and gate intentionally return RED/BLOCKED states as validation scaffolds; they are not product UI or data-source stubs.

## Threat Flags

None.

## User Setup Required

None generated by this plan. Future evidence runs need `DATABASE_URL`, `TEST_DATABASE_URL` and `E2E_PHASE6_ELIGIBLE_SLUGS` available to the gate environment.

## Next Phase Readiness

Ready for `06-01-PLAN.md`. Later Phase 6 plans can implement against concrete RED targets for schema, RLS, one-active-round, boost/pity/history idempotency, UI copy, audio/reduced-motion behavior, browser fixture flows and final gate evidence.

## Self-Check: PASSED

- Created files exist on disk.
- Task commits exist: `ea82cb7`, `869f357`, `a29dd90`.
- Acceptance criteria were rerun with PowerShell-compatible file lists.
- Expected RED/BLOCKED verification results are documented above.

---
*Phase: 06-roleta-e-economia*
*Completed: 2026-06-09*
