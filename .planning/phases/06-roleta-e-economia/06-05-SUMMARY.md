---
phase: 06-roleta-e-economia
plan: 05
subsystem: roulette
tags: [roulette, ui, motion, audio, accessibility, e2e]

requires:
  - phase: 06-roleta-e-economia-04
    provides: Roulette route shell, server actions and persisted audio preference.
provides:
  - Composed `/app/roleta` reveal surface with reel, audio control, result panel and compact history.
  - Accessible 60-slot reel with fixed pointer, rarity token styling and reduced-motion staged reveal.
  - Opt-in synthesized reveal audio that never starts before user interaction.
  - Result and history presentation using commitment/trust copy and no casino or individual economy language.
  - Phase 6 E2E scaffold coverage with explicit fixture guards.
affects: [06-07, 06-08, 06-10, phase-6-gate]

tech-stack:
  added: []
  patterns:
    - Route UI consumes roulette public module exports instead of deep-importing presentation internals.
    - Server view models prepare reel/result/history props before client presentation components render.
    - Audio remains user-gesture gated and stores preference through the server action from Plan 06-04.

key-files:
  created:
    - apps/web/src/modules/roulette/presentation/roulette-reel.tsx
    - apps/web/src/modules/roulette/presentation/roulette-audio-control.tsx
    - apps/web/src/modules/roulette/presentation/result-panel.tsx
    - apps/web/src/modules/roulette/presentation/compact-history.tsx
  modified:
    - apps/web/src/app/app/roleta/page.tsx
    - apps/web/src/modules/roulette/presentation/view-models.ts
    - apps/web/src/modules/roulette/index.ts
    - apps/web/src/app/globals.css
    - apps/web/tests/roulette-ui.test.tsx
    - apps/web/tests/phase-6-e2e.spec.ts

key-decisions:
  - "The reel is decorative except for one live result announcement; all 60 cover slots are `aria-hidden`."
  - "Legendary feedback uses contained particles in normal motion and a static text seal/border in reduced motion."
  - "The route keeps lock/discard controls as UI slots for Plan 06-08 to wire to server behavior."
  - "Production copy and data attributes avoid casino/prize/store/ranking vocabulary; non-casino wording remains asserted only in tests/planning."

patterns-established:
  - "Roulette presentation components accept serializable view models and route-supplied action slots."
  - "Phase 6 browser E2E tests use `BLOCKED setup` guards when required authenticated duo fixtures are absent."
  - "Mobile roulette layout keeps the full-bleed reel, fixed centered pointer and controls below the reel as route-level contract."

requirements-completed:
  - ROUL-01
  - ROUL-03
  - ROUL-04
  - ROUL-05
  - ROUL-09

duration: 20 min
completed: 2026-06-09
---

# Phase 06 Plan 05: Roulette Reveal UI Summary

**Implemented the route-level roulette reveal surface with reel motion, opt-in audio, result panel and compact history.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-09T13:07:00-03:00
- **Completed:** 2026-06-09T13:27:46-03:00
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added `RouletteReel` with exactly 60 stable decorative cover slots, fixed `RoulettePointer`, 5.5s reveal timing, rarity token borders and reduced-motion staged copy.
- Added `RouletteAudioControl` with user-gesture gated Web Audio, mute state, persisted duo preference callback and no autoplay behavior.
- Added `ResultPanel` with cover, title, rarity seal, persisted status, replay disclaimer and lock/discard action slots.
- Added `CompactHistory` with compact round outcomes, rarity, boost/pity flags and trust summary copy.
- Updated `/app/roleta` to compose reel, audio, result and history from server state/view models.
- Extended Phase 6 E2E scaffold for route load, persisted result resume/replay, mobile full-bleed layout, no-overlap checks, Legendary states and reduced-motion path.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing roulette reel/audio contract tests** - `099edaa` (test)
2. **Task 1 GREEN: Add roulette reel, audio control and CSS shell** - `172c365` (feat)
3. **Task 2 RED: Add failing result/history/route tests** - `1aa950f3` (test)
4. **Task 2 GREEN: Compose result panel, compact history and route UI** - `7bc5e56` (feat)

## Files Created/Modified

- `apps/web/src/modules/roulette/presentation/roulette-reel.tsx` - Client reveal reel, reduced-motion states and live result announcement.
- `apps/web/src/modules/roulette/presentation/roulette-audio-control.tsx` - Opt-in audio preference control and synthesized reveal cues.
- `apps/web/src/modules/roulette/presentation/result-panel.tsx` - Persisted result card with commitment actions and rarity feedback.
- `apps/web/src/modules/roulette/presentation/compact-history.tsx` - Compact trust/history surface for recent rounds.
- `apps/web/src/modules/roulette/presentation/view-models.ts` - Reel and result view-model derivation from server state.
- `apps/web/src/modules/roulette/index.ts` - Public exports for route-safe roulette composition.
- `apps/web/src/app/app/roleta/page.tsx` - Authenticated route composition and audio preference action handoff.
- `apps/web/src/app/globals.css` - Roulette layout, rarity, full-bleed mobile reel, reduced-motion and Legendary styles.
- `apps/web/tests/roulette-ui.test.tsx` - Source/behavior contract tests for UI, copy, motion, audio and layout.
- `apps/web/tests/phase-6-e2e.spec.ts` - Browser scaffold checks with explicit fixture guards.

## Decisions Made

- Exported presentation components through `apps/web/src/modules/roulette/index.ts` so the route can compose the surface without deep imports.
- Kept lock/discard as route-provided action slots because Plan 06-08 owns the confirmed server transitions.
- Removed the production `non-casino` data-policy phrase after the forbidden-copy check flagged the substring `casino`; the D-17 non-casino requirement remains asserted in tests and planning text.
- Treated browser E2E as scaffold evidence until authenticated duo fixtures are available.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed forbidden vocabulary from production audio metadata**
- **Found during:** Task 2 acceptance search
- **Issue:** `data-policy="no autoplay non-casino audio preference"` matched the plan's forbidden production copy search for `casino`.
- **Fix:** Changed the production attribute to `data-policy="no autoplay audio preference"` and kept the non-casino wording in tests/planning where the D-17 proof expects it.
- **Files modified:** `apps/web/src/modules/roulette/presentation/roulette-audio-control.tsx`, `apps/web/tests/roulette-ui.test.tsx`
- **Verification:** `rg -n "jackpot|premio|aposta|sorte grande|casino|comprar|loja|skin|meu XP|seu XP|ranking" apps/web/src/modules/roulette apps/web/src/app/globals.css` returned no matches.
- **Commit:** `7bc5e56`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope change; production UI became stricter about forbidden vocabulary.

## Issues Encountered

- Phase 6 E2E cannot execute authenticated browser flows without the configured ready-user, partner, other-duo and eligible-game fixtures. The spec reports `BLOCKED setup` and skips those browser checks intentionally.
- Subjective audio listening was not possible in CLI verification. The source and tests verify no autoplay, gesture gating, dry ticks, heavier cadence near the pointer and restrained fanfare; final audio feel still needs manual browser validation with real fixtures.

## Verification

| Command | Result |
|---------|--------|
| `pnpm --filter @queue/web test -- roulette-ui` | Passed: 1 file, 13 tests |
| `pnpm --filter @queue/web typecheck` | Passed |
| `pnpm check:architecture` | Passed |
| `pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts` | Passed with 7 skipped fixture-guarded tests |
| `rg -n "5500|cubic-bezier\\(\\.15,\\.85,\\.25,1\\)|useReducedMotion|RoulettePointer|Som da roleta ligado|Som da roleta desligado" apps/web/src/modules/roulette/presentation apps/web/src/app/globals.css apps/web/tests/roulette-ui.test.tsx` | Returned implementation and tests |
| `rg -n "roulette-reel-band|width:\\s*100vw|margin-inline:\\s*calc\\(50% - 50vw\\)|roulette-pointer-anchor|left:\\s*50%|translateX\\(-50%\\)|roulette-controls" apps/web/src/app/globals.css apps/web/tests/roulette-ui.test.tsx` | Returned layout contracts |
| `rg -n "data-rarity|--rarity-common|--rarity-rare|--rarity-epic|--rarity-legendary|legendary-particles|static Legendary|prefers-reduced-motion" apps/web/src/modules/roulette/presentation apps/web/src/app/globals.css apps/web/tests/roulette-ui.test.tsx` | Returned rarity and reduced-motion contracts |
| `rg -n "A fila apontou para este|Travar como Principal|Replay nao e novo sorteio|Historico da roleta|Os sorteios aparecem aqui" apps/web/src/modules/roulette apps/web/tests/roulette-ui.test.tsx` | Returned exact UI copy |
| `rg -n "jackpot|premio|aposta|sorte grande|casino|comprar|loja|skin|meu XP|seu XP|ranking" apps/web/src/modules/roulette apps/web/src/app/globals.css` | No matches |

## TDD Gate Compliance

- Task 1 RED commit exists before GREEN: `099edaa` then `172c365`.
- Task 2 RED commit exists before GREEN: `1aa950f3` then `7bc5e56`.
- No server selection logic was added to the client; the UI renders persisted server state.

## User Setup Required

Set these variables to exercise the browser E2E flow instead of fixture-guarded skips:

- `E2E_BASE_URL`
- `E2E_READY_USER_EMAIL`
- `E2E_READY_USER_PASSWORD`
- `E2E_READY_PARTNER_EMAIL`
- `E2E_READY_PARTNER_PASSWORD`
- `E2E_OTHER_DUO_USER_EMAIL`
- `E2E_OTHER_DUO_USER_PASSWORD`
- `E2E_PHASE6_ELIGIBLE_SLUGS`

## Next Phase Readiness

- Plan 06-07 can rely on the route-level result UI and compact history surface.
- Plan 06-08 can wire lock/discard and replacement actions into the existing result action slots.
- Phase gate should rerun full build/test after the remaining Wave 4 plan completes.

## Self-Check: PASSED

- Created files exist: `roulette-reel.tsx`, `roulette-audio-control.tsx`, `result-panel.tsx`, `compact-history.tsx`.
- `/app/roleta` imports the roulette UI through the public module entrypoint.
- Forbidden production copy search returns no matches.
- Task commits found in git history: `099edaa`, `172c365`, `1aa950f3`, `7bc5e56`.

---
*Phase: 06-roleta-e-economia*
*Completed: 2026-06-09*
