---
phase: 07-paridade-visual-e-ux-com-prototipo
plan: "06"
subsystem: utility-routes-visual
tags: [phase-7, desafios, dupla, perfil, visual-parity, accessibility]
requires:
  - phase: 05-gamificacao-coletiva
    provides: Server-authoritative challenge, streak and gamification view models
  - phase: 07-paridade-visual-e-ux-com-prototipo
    plan: "01"
    provides: Authenticated shell, compact notifications and seven-route top rail
provides:
  - Dry utility hero and stat strip shared by Desafios, Dupla and Perfil
  - Two-column challenge cards with compact progress and collective XP framing
  - Dupla contract, compact avatar and collective stats layout
  - Compact authenticated profile form and overflow-safe session/profile panels
affects: [desafios, dupla, perfil, gamification, auth, visual-regression]
tech-stack:
  added: []
  patterns:
    - Route-owned utility hero with stat strip for low-noise operational surfaces
    - Ready Duo route shows the closed /2 contract while pairing code creation/copy stays in /parear
key-files:
  created:
    - .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-06-SUMMARY.md
  modified:
    - apps/web/src/app/app/desafios/page.tsx
    - apps/web/src/app/app/dupla/page.tsx
    - apps/web/src/app/app/perfil/page.tsx
    - apps/web/src/app/globals.css
    - apps/web/tests/auth-flow.test.ts
    - apps/web/tests/duo-flow.test.ts
    - apps/web/tests/gamification-challenges.test.tsx
key-decisions:
  - "The ready /app/dupla route does not invent or expose a duo code; it shows the closed 2/2 contract while invite and copy behavior remain in /parear."
  - "Desafios uses flat two-column cards and compact progress so the route feels operational instead of celebratory or competitive."
  - "Perfil gained visual structure only; session revocation, logout and profile update behavior remain in the existing server actions."
patterns-established:
  - "`utility-hero` and `utility-stat-strip` are the shared Phase 7 pattern for authenticated utility surfaces."
  - "`duo-contract-card`, `duo-member-card` and `duo-avatar` define the compact collective Dupla treatment."
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
  - META-02
  - SAFE-04
  - SAFE-05
duration: 10 min
completed: 2026-06-10
---

# Phase 07 Plan 06: Desafios, Dupla and Perfil Summary

**Authenticated utility routes now share a dry Phase 7 hierarchy while preserving gamification, duo and auth authority.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-10T01:16:00-03:00
- **Completed:** 2026-06-10T01:26:00-03:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Replaced the Desafios route header with a utility hero and stat strip, then tightened challenge cards into a flat two-column desktop grid with compact progress bars and lime XP emphasis.
- Rebuilt the Dupla first fold around the closed `/2` contract, collective stats and compact avatar cards without adding comparisons or changing member/settings authority.
- Reworked Perfil into compact form/session/logout panels with overflow-safe input and session text handling.
- Added focused source assertions for the new utility route patterns and preservation of auth, duo and challenge behavior.

## Task Commits

1. **Tasks 1-3: Utility route visual polish** - `a57ae32` (`feat`)

## Verification

- `rg -n "XP|progress|desafio|dupla" apps/web/src/app/app/desafios/page.tsx apps/web/tests/gamification-challenges.test.tsx` - passed.
- `rg -n "ranking|leaderboard|falhou|derrota" apps/web/src/app/app/desafios/page.tsx` - passed with no competitive/failure framing.
- `rg -n "codigo|dupla|avatar|stats|copy|copiar" apps/web/src/app/app/dupla/page.tsx apps/web/tests/duo-flow.test.ts` - passed through Duo route and pairing/copy source coverage.
- `rg -n "vs|ranking|maior que|melhor jogador" apps/web/src/app/app/dupla/page.tsx` - passed with no individual comparison copy.
- `rg -n "avatar|perfil|salvar|sair|logout|overflow-wrap" apps/web/src/app/app/perfil/page.tsx apps/web/src/app/globals.css apps/web/tests/auth-flow.test.ts` - passed.
- `pnpm --filter @queue/web test -- gamification-challenges duo-flow duo-isolation auth-flow auth-security` - passed, 56 tests.
- `pnpm --filter @queue/web test -- duo-flow gamification-challenges auth-flow` - passed after the Duo contract-card correction, 37 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm check:secrets` - passed; skipped the missing client bundle at `apps\web\.next\static`.
- `git diff --check` - passed.

## Browser Evidence

- `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "desafios|dupla|perfil"` - skipped 4 authenticated visual tests with `BLOCKED setup` because `E2E_BASE_URL`, `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD` are not configured.
- `pnpm --filter @queue/web exec playwright test tests/accessibility.spec.ts --grep "challenges|dupla|perfil"` - skipped 3 authenticated accessibility tests because the same ready-user fixture variables are not configured.

## Decisions Made

- The ready Dupla route does not show an active pairing code because the product state is already closed at 2/2; pairing code display and copy remain in `/parear`.
- The shared utility hero is route-owned presentation. It composes existing server-derived values and does not introduce a new domain view model.
- Profile overflow hardening is CSS-only and does not expose tokens, session ids beyond existing server-rendered labels, or secrets.

## Deviations from Plan

The plan said the ready Dupla surface should make the duo code prominent. During review, showing `2/2` as a code would have been misleading, and no active code exists after pairing. The implementation instead makes the closed `/2` contract prominent and verifies that invitation/copy behavior remains in the existing `/parear` flow.

## Issues Encountered

- Authenticated browser evidence could not run in this local session due missing E2E fixture environment variables.
- `apps/web/next-env.d.ts` remains an unrelated pre-existing working-tree change and was intentionally left out of the 07-06 commit.

## User Setup Required

- Configure `E2E_BASE_URL`, `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD` before accepting desktop/mobile screenshots and axe evidence for Desafios, Dupla and Perfil from this environment.

## Next Phase Readiness

Ready for `07-07`: the remaining Phase 7 closeout can verify the full visual contract with the utility routes aligned and behavior boundaries preserved.

---
*Phase: 07-paridade-visual-e-ux-com-prototipo*
*Completed: 2026-06-10*
