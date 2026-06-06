---
phase: 05-gamificacao-coletiva
plan: "09"
subsystem: gamification
tags: [achievements, predicates, postgres, rls, idempotency, audit]
requires:
  - phase: 05-08
    provides: recurring timezone-aware gamification jobs and complete local gate
provides:
  - Executable predicate registry covering all 50 active achievements
  - Duo-scoped authoritative metric snapshot evaluated inside the fact transaction
  - Blocking 50/50 reachability audit in the Phase 5 gate
affects: [05-11, phase-5-gate, achievements, reward-engine]
tech-stack:
  added: []
  patterns:
    - typed metric and composite predicate definitions
    - one aggregated RLS-scoped read across authoritative facts
    - projected achievement count before idempotent unique inserts
key-files:
  created:
    - apps/web/src/modules/gamification/domain/achievement-predicates.ts
    - apps/web/tests/gamification-achievement-reachability.test.ts
  modified:
    - apps/web/src/modules/gamification/domain/achievement-catalog.ts
    - apps/web/src/modules/gamification/application/ports.ts
    - apps/web/src/modules/gamification/application/apply-gamification-fact.ts
    - apps/web/src/modules/gamification/infrastructure/gamification-repository.ts
    - apps/web/src/modules/gamification/index.ts
    - apps/web/tests/gamification-rewards.test.ts
    - scripts/phase-5-gate.mjs
key-decisions:
  - "The 50 seeds map to 49 predicate definitions because both seven-day achievements intentionally share streak-days:7."
  - "Unexpected matches are derived from real genre novelty against prior duo matches; no roulette or review fact is fabricated."
  - "The three Roulette-group achievements keep their visual group while using library growth, collective achievement count and level 25."
patterns-established:
  - "Achievement rules declare typed thresholds, authoritative sources and generated satisfying fixtures."
  - "Reward application updates the projection, reads duo-scoped metrics and inserts only newly persisted unlocks in one transaction."
requirements-completed: [GAME-05]
duration: 15min
completed: 2026-06-06
---

# Phase 05 Plan 09: Achievement Predicate Reachability Summary

**All 50 active achievements now have executable, authoritative and gate-enforced unlock paths.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-06T21:03:00Z
- **Completed:** 2026-06-06T21:18:00Z
- **Tasks:** 3
- **Files modified:** 18

## Accomplishments

- Replaced the 17-slug hardcoded emitter with 49 typed predicate definitions covering all 50 catalog seeds.
- Added explicit metric sources and satisfying fixtures for simple and composite predicates, including local-time, streak, quest, discovery, library and Play families.
- Remapped only the three impossible pre-Roulette achievements to real Phase 5 facts while preserving their group, rarity, visibility and icons.
- Added one duo-filtered aggregate query across authoritative tables and events, executed inside the same transaction as XP, quest, streak and projection changes.
- Preserved unique-key idempotency so repeated or concurrent facts return only unlocks actually inserted.
- Added a blocking reachability test to the Phase 5 gate and changed the source audit from approximate to exactly 50 seeds.

## Task Commits

1. **Task 1 RED: Define achievement predicate reachability** - `3df77a5` (test)
2. **Task 1 GREEN: Make all achievement predicates reachable** - `0cd6c5f` (feat)
3. **Task 2 RED: Define authoritative achievement evaluation** - `6949e2f` (test)
4. **Task 2 GREEN: Evaluate achievements from authoritative metrics** - `596fde9` (feat)
5. **Task 3: Gate all achievement predicates** - `91fb774` (test)

**Plan metadata:** recorded in the final docs commit after state updates.

## Verification

- `pnpm --filter @queue/web test -- gamification-domain.test.ts gamification-achievement-reachability.test.ts` - 22 tests passed.
- Focused transaction and integration-related web suite - 45 tests passed before gate integration.
- Direct execution of the extracted repository query against the migrated Postgres fixture - one row and all 46 snapshot fields returned.
- `pnpm phase:5:gate` - architecture, web/DB typecheck, 80 web tests, 16 DB tests, migrations, zero drift and query review passed.
- Browser terminal-status evidence remains blocked by missing `E2E_PHASE5_ZERADO_SLUG` and `E2E_PHASE5_DROPADO_SLUG`.
- Production cadence evidence remains blocked by missing `CRON_SECRET` and `GAMIFICATION_RUNNER_FREQUENCY_MINUTES`.

## Decisions Made

- `streak-days:7` intentionally unlocks both `dupla-afinada` and `semana-acesa`; reachability is audited per seed while definitions remain unique per predicate key.
- Comeback, same-day maxima, same-hour sessions, midnight activity and weekly maxima use the duo timezone passed to the transaction query.
- Boss markers normalize Portuguese accents before matching reviewed title markers.
- Freeze earnings are derived as `floor(level / 10)`, matching the level policy rather than trusting a client counter.
- The projected achievement count includes currently qualified, not-yet-unlocked seeds so the 25-achievement badge can unlock in the same transaction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Type Safety] Derived the key union from the predicate registry**
- **Found during:** Task 1 typecheck
- **Issue:** The catalog seed helper widened `predicateKey` to `string`, preventing safe indexed access despite runtime literals.
- **Fix:** Derived `AchievementPredicateKey` from the registry keys and kept catalog/registry exhaustiveness enforced by the executable audit.
- **Verification:** Typecheck and the missing/orphan-key tests passed.
- **Committed in:** `0cd6c5f`

**2. [Rule 3 - Blocking] Updated full-port test doubles**
- **Found during:** Task 2 typecheck
- **Issue:** Five existing test repositories implement the complete transaction port and lacked the new metric reader.
- **Fix:** Added the shared empty authoritative snapshot to those unrelated read-model scenarios.
- **Verification:** Web typecheck and 45 focused tests passed.
- **Committed in:** `596fde9`

**3. [Rule 3 - Blocking] Validated the generated SQL independently of TypeScript module loading**
- **Found during:** Task 2 database probe
- **Issue:** Direct Node import of the repository failed on extensionless TypeScript ESM resolution before reaching Postgres.
- **Fix:** Extracted the exact query template from the repository source and executed it unchanged through the real database client.
- **Verification:** The migrated database returned one row with 46 fields for a real duo.
- **Committed in:** no source change

---

**Total deviations:** 3 auto-fixed (1 type safety, 2 blocking)
**Impact on plan:** All changes preserve the intended architecture and strengthen executable evidence without introducing future-phase facts.

## Issues Encountered

- The runtime `DATABASE_URL` is not configured locally, so an additional direct runtime-role probe was unavailable. Existing database RLS suites passed with configured test/worker credentials, and the aggregate query itself executed successfully against the migrated database.
- Authenticated browser fixtures and production cron cadence evidence remain external release blockers.

## User Setup Required

Remaining external variables are documented in `.planning/phases/05-gamificacao-coletiva/05-USER-SETUP.md`.

## Next Phase Readiness

Achievement evaluation is now complete and deterministic. Plan 05-11 can focus on distinct concurrent fact updates and projection convergence.

## Self-Check: PASSED

- Found the 50-seed catalog, 49-key registry, authoritative snapshot query, transactional evaluator and 50/50 gate.
- Found task commits `3df77a5`, `0cd6c5f`, `6949e2f`, `596fde9` and `91fb774`.
- Confirmed 80 focused web tests, 16 DB tests, migrations, query review and zero schema drift.

---
*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*
