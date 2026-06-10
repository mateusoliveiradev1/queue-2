---
phase: 07-paridade-visual-e-ux-com-prototipo
plan: "00"
subsystem: testing
tags: [phase-7, visual-regression, playwright, axe, accessibility, shell]
requires:
  - phase: 06-roleta-e-economia
    provides: roulette visual behavior and preservation tests
provides:
  - Phase 7 visual Playwright scaffold for public and authenticated routes
  - Phase 7 source guards for shell, loading, reduced motion and roulette scanline scope
  - Root `phase:7:gate` evidence command
affects: [ui, app-shell, public-auth, landing, roulette, discovery, accessibility]
tech-stack:
  added: []
  patterns:
    - Deterministic Phase 7 screenshot evidence under the phase directory
    - RED/BLOCKED visual tests before route implementation
key-files:
  created:
    - apps/web/tests/phase-7-visual.spec.ts
    - scripts/phase-7-gate.mjs
    - .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-EVIDENCE.md
    - .planning/phases/07-paridade-visual-e-ux-com-prototipo/evidence/screenshots/
  modified:
    - apps/web/tests/accessibility.spec.ts
    - apps/web/tests/brand-ui.test.tsx
    - apps/web/tests/discovery-ui.test.tsx
    - apps/web/tests/roulette-ui.test.tsx
    - package.json
key-decisions:
  - "Phase 7 visual evidence is captured by a dedicated Playwright spec plus a root gate, with missing fixtures reported by variable name only."
  - "The updated source guards intentionally describe the future horizontal shell and are RED until the implementation plans land."
patterns-established:
  - "Visual gate output writes a markdown summary and screenshot directory without embedding secret values."
  - "Phase 7 navigation guards use seven primary routes plus contextual Catalogo and Conquistas access."
requirements-completed:
  - BRND-02
  - BRND-04
  - BRND-05
  - BRND-06
  - BRND-07
  - BRND-08
  - BRND-09
  - BRND-10
  - BRND-11
  - BRND-12
  - BRND-13
  - META-01
  - META-02
  - SAFE-04
  - SAFE-05
duration: 13 min
completed: 2026-06-10
---

# Phase 07 Plan 00: Validation Scaffold Summary

**Phase 7 visual regression harness with Playwright screenshots, accessibility geometry checks and a root evidence gate**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-09T23:57:00-03:00
- **Completed:** 2026-06-10T00:10:47-03:00
- **Tasks:** 3
- **Files modified:** 27

## Accomplishments

- Added `apps/web/tests/phase-7-visual.spec.ts` covering public landing/auth/pairing routes and authenticated Home, Biblioteca, Descobrir, Roleta, Desafios, Hall, Dupla and Perfil.
- Updated existing accessibility/source guards away from the old sidebar/bottom-nav assumptions and toward the Phase 7 seven-route horizontal shell contract.
- Added `pnpm phase:7:gate`, which runs secret scan, architecture checks, focused source tests, Phase 7 Playwright evidence and a Phase 6 roulette preservation leg.
- Captured initial screenshot/evidence artifacts under `.planning/phases/07-paridade-visual-e-ux-com-prototipo/evidence/` without writing secret values.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Phase 7 visual browser scaffold** - `82fa614` (`test`)
2. **Task 2: Update source and accessibility guards for the new visual contract** - `d1399d3` (`test`)
3. **Task 3: Add the Phase 7 gate command** - `0732814` (`test`)

## Files Created/Modified

- `apps/web/tests/phase-7-visual.spec.ts` - Playwright browser scaffold for screenshots, axe, reduced motion, overflow, overlap and touch-target checks.
- `apps/web/tests/accessibility.spec.ts` - Authenticated accessibility route coverage now includes the Phase 7 primary route set.
- `apps/web/tests/brand-ui.test.tsx` - Source/component guards now assert the Phase 7 landing/auth and `/2` loader contract.
- `apps/web/tests/discovery-ui.test.tsx` - Discovery source guard now expects the new topbar/route-rail visual contract.
- `apps/web/tests/roulette-ui.test.tsx` - Roulette source guard now expects seven-route shell navigation and roulette-scoped scanline treatment.
- `scripts/phase-7-gate.mjs` - Root evidence gate with secret-safe env loading and markdown evidence output.
- `package.json` - Adds `phase:7:gate`.
- `.planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-EVIDENCE.md` - Initial gate evidence summary.

## Decisions Made

- Kept Phase 7 visual tests RED/BLOCKED rather than weakening assertions to match the old UI.
- Stored screenshots in the phase evidence directory so later plans can compare actual visual progress against the initial scaffold.
- Treated `Catalogo` and `Conquistas` as contextual access in tests, not primary top-nav items.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Focused source tests fail intentionally on missing Phase 7 implementation: landing copy, compact auth tabs, topbar/route rail selectors, Hall route in the shell, `Home` nav label and roulette-scoped scanline CSS.
- `pnpm phase:7:gate` currently returns `FAILED` because the new RED tests and Playwright visual checks expose the old UI state. Secret scan and architecture legs passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `07-01`: the shared shell and visual primitives now have failing tests describing the expected top navigation, route rail and visual discipline. Later plans should turn these RED checks green without changing auth, RLS, schema or domain behavior.

---
*Phase: 07-paridade-visual-e-ux-com-prototipo*
*Completed: 2026-06-10*
