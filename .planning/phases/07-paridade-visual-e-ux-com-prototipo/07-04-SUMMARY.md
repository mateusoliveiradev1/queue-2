---
phase: 07-paridade-visual-e-ux-com-prototipo
plan: "04"
subsystem: backlog-discovery-routes
tags: [phase-7, biblioteca, descobrir, visual-parity, accessibility]
requires:
  - phase: 07-paridade-visual-e-ux-com-prototipo
    plan: "01"
    provides: Authenticated shell and route rail
  - phase: 07-paridade-visual-e-ux-com-prototipo
    plan: "03"
    provides: Authenticated Home anchor and contextual route rhythm
provides:
  - Ritual-first Biblioteca hero with compact status strip
  - Biblioteca empty-state CTA to Descobrir
  - Dominant Descobrir card layout with larger cover treatment
  - Discovery decision row ordered as Pular, Agora nao, Quero jogar below card details
affects: [biblioteca, descobrir, discovery-card, visual-regression]
tech-stack:
  added: []
  patterns:
    - Route-first hero plus operational controls immediately below
    - Discovery card details before compact decision row
key-files:
  created: []
  modified:
    - apps/web/src/app/app/biblioteca/page.tsx
    - apps/web/src/app/app/descobrir/page.tsx
    - apps/web/src/app/globals.css
    - apps/web/src/modules/discovery/presentation/discovery-card.tsx
    - apps/web/tests/catalog-library-ui.test.tsx
    - apps/web/tests/discovery-ui.test.tsx
key-decisions:
  - "Biblioteca keeps the existing filter/action behavior but moves the filter bar near the top after a ritual hero."
  - "Zerado appears only as a status marker in the Biblioteca hero; no terminal archive action was added."
  - "Descobrir keeps the same decision values and refs while changing only visual order and layout."
patterns-established:
  - "`library-ritual-hero`, `library-status-strip` and `library-empty-hero` define the dry Biblioteca first-fold treatment."
  - "Discovery decisions render after source/details in the visual order Pular, Agora nao, Quero jogar."
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
  - SAFE-05
duration: 10 min
completed: 2026-06-10
---

# Phase 07 Plan 04: Biblioteca and Descobrir Summary

**Biblioteca and Descobrir now put the backlog/discovery ritual first without changing server-mediated behavior.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-10T01:00:00-03:00
- **Completed:** 2026-06-10T01:10:00-03:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added a dry Biblioteca hero with `Wishlist`, `Jogando`, `Pausado`, `Zerado`, a `NADA AQUI AINDA /` empty-state branch and CTA to `Descobrir`.
- Moved the existing Biblioteca filter bar close to the top while preserving search, tabs, filters, pagination and status mutations.
- Added top context copy to Descobrir so the route frames the one-card ritual before support trays.
- Enlarged the Descobrir card/cover treatment and moved the decision row below source/details.
- Kept the existing discovery decisions and server actions; only the visual order changed to `Pular`, `Agora nao`, `Quero jogar`.

## Task Commits

1. **Tasks 1-2: Biblioteca and Descobrir ritual-first routes** - `770b343` (`feat`)

## Verification

- `rg -n "NADA AQUI AINDA|Descobrir|Wishlist|Jogando|Pausado|Zerado" apps/web/src/app/app/biblioteca/page.tsx` - passed.
- `rg -n "Pular|Talvez|Agora nao|Quero|fonte|atualizado|RAWG|prefers-reduced-motion" apps/web/src/app/app/descobrir/page.tsx apps/web/tests/discovery-ui.test.tsx apps/web/src/modules/discovery/presentation/discovery-card.tsx` - passed.
- `pnpm --filter @queue/web test -- catalog-library-ui discovery-ui discovery-application discovery-domain discovery-search` - passed.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm check:secrets` - passed; skipped the missing client bundle at `apps\web\.next\static`.

## Browser Evidence

- `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "biblioteca|descobrir"` with local `E2E_BASE_URL` and `E2E_START_SERVER=1` exited cleanly but skipped authenticated checks.
- Authenticated browser evidence remains `BLOCKED` until `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD` are configured for the target runtime.

## Deviations from Plan

- `apps/web/src/modules/discovery/presentation/discovery-card.tsx` was modified even though it was not listed in plan frontmatter; the requested visual order of decision actions lives in that presentation component, not in the route file.
- The implementation commit covers both tasks because route CSS and Discovery card layout are coupled in the same visual contract.

## Issues Encountered

- Older catalog/discovery tests needed `logoutCurrentSessionAction` in their auth/session mocks after AppShell renders the logout form.
- A legacy test assumed Catalogo lived in the primary navigation rail; it now asserts contextual reachability instead.

## User Setup Required

- Configure authenticated E2E credentials before accepting Biblioteca and Descobrir desktop/mobile screenshots as release evidence.

## Next Phase Readiness

Ready for `07-05`: the backlog-building routes now use the Phase 7 visual rhythm while preserving filters, source attribution and decision behavior.

---
*Phase: 07-paridade-visual-e-ux-com-prototipo*
*Completed: 2026-06-10*
