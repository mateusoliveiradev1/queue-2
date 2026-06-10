---
phase: 07-paridade-visual-e-ux-com-prototipo
plan: "01"
subsystem: app-shell
tags: [phase-7, authenticated-shell, visual-primitives, hall, accessibility]
requires:
  - phase: 07-paridade-visual-e-ux-com-prototipo
    plan: "00"
    provides: Phase 7 RED/BLOCKED visual scaffold
provides:
  - Sticky authenticated top shell with seven primary route links
  - Shared Phase 7 dry panel, route rail, lime and roulette scanline primitives
  - Prepared protected `/app/hall` empty state
  - Compact notification trigger/panel for Central da Dupla
affects: [ui, app-shell, authenticated-routes, hall]
tech-stack:
  added: []
  patterns:
    - Horizontal authenticated route rail with contextual right-side links
    - Prepared route state before data-backed Hall behavior
key-files:
  created:
    - apps/web/src/app/app/hall/page.tsx
  modified:
    - apps/web/src/components/app-shell.tsx
    - apps/web/src/app/globals.css
    - apps/web/src/modules/play/presentation/notification-center.tsx
    - packages/ui/src/tokens.css
    - apps/web/tests/brand-ui.test.tsx
    - apps/web/tests/play-notifications-ui.test.tsx
key-decisions:
  - "Catalogo and Conquistas stay as contextual access, not primary route rail items."
  - "Hall exists as a truthful prepared empty state only; no Phase 8 shelf, review or timeline behavior was introduced."
  - "Central da Dupla is a compact notification area in the top action cluster, not an always-open page-level panel."
  - "Browser evidence against local auth remains blocked when the configured ready-user credentials do not match the local runtime."
patterns-established:
  - "Primary authenticated navigation is Home, Biblioteca, Descobrir, Roleta, Desafios, Hall and Dupla."
  - "Shared visual CSS favors dry panels, sharp radius, lime accents, focus-visible support and roulette-scoped scanline treatment."
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
  - SAFE-05
duration: 18 min
completed: 2026-06-10
---

# Phase 07 Plan 01: Authenticated Shell Summary

**Authenticated routes now share the Phase 7 top shell, visual primitives and a truthful prepared Hall route.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-10T00:11:00-03:00
- **Completed:** 2026-06-10T00:33:00-03:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Replaced the rendered authenticated sidebar and mobile bottom nav with a sticky top bar and horizontal route rail.
- Added the seven primary route links: Home, Biblioteca, Descobrir, Roleta, Desafios, Hall and Dupla.
- Kept Perfil and Sair on the account side, with Catalogo and Conquistas as contextual links.
- Added shared Phase 7 primitives in CSS/tokens: `queue2-shell`, route rail, `dry-panel`, lime alias, preserved focus/reduced-motion gates and roulette-scoped scanline overlay.
- Created `/app/hall` as a protected route using `AppShell currentPage="hall"` with honest PT-BR empty-state copy only.
- Added a focused component test for the prepared Hall route and active Hall nav state.
- Reworked Central da Dupla into a compact `Notificacoes` disclosure with unread count and anchored panel, so it no longer renders as an open block above route content.

## Task Commits

1. **Tasks 1-2: Authenticated shell and shared visual primitives** - `0ab8679` (`feat`)
2. **Task 3: Prepared Hall route** - `2ed025d` (`feat`)
3. **User feedback: Compact Central da Dupla notifications** - `953a86e` (`fix`)

## Verification

- `rg -n "Home|Biblioteca|Descobrir|Roleta|Desafios|Hall|Dupla|Perfil|Sair" apps/web/src/components/app-shell.tsx` - passed.
- `rg -n "app-sidebar|app-bottom-nav" apps/web/src/components/app-shell.tsx apps/web/src/app/globals.css` - passed with no matches.
- `rg -n "queue2-shell|route-rail|dry-panel|empty-state|lime|prefers-reduced-motion|focus-visible|scanline" apps/web/src/app/globals.css packages/ui/src/tokens.css` - passed.
- `rg -n "review|resenha|replay|timeline|completed" apps/web/src/app/app/hall/page.tsx` - passed with no matches.
- `pnpm --filter @queue/web test -- brand-ui -t "authenticated Phase 1 surfaces"` - passed.
- `pnpm --filter @queue/web test -- play-notifications-ui` - passed.
- `pnpm --filter @queue/web test -- roulette-ui -t "scanline|Phase 7|top navigation|authenticated"` - passed.
- `pnpm --filter @queue/web typecheck` - passed.

## Browser Evidence

- `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "authenticated shell exposes|mobile authenticated shell|authenticated-shell-hall"` against the configured `E2E_BASE_URL` reached production and exposed the old deployed shell, so it was not accepted as branch evidence.
- The same Playwright command with `E2E_BASE_URL=http://127.0.0.1:3000` and `E2E_START_SERVER=1` started a clean local Next server but failed before route assertions because the configured ready-user credentials produced `/login?estado=credenciais-invalidas`.
- This is recorded as `BLOCKED` browser evidence for local authenticated fixtures, not a pass.

## Deviations from Plan

- `apps/web/tests/accessibility.spec.ts` and `apps/web/tests/phase-7-visual.spec.ts` did not require changes in this plan because Plan 00 had already added the Hall/authenticated shell expectations.
- Full `brand-ui` still fails on the planned public landing/auth assertions that belong to `07-02`; the authenticated subset for this plan passes.

## Issues Encountered

- `.env.local` points `E2E_BASE_URL` at `https://queue-2.vercel.app`, so the browser run initially tested deployed code rather than this branch.
- Local authenticated Playwright evidence needs ready-duo credentials that work against the local/runtime database.

## User Setup Required

- Configure local or preview `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD` for the same `E2E_BASE_URL` being tested before treating authenticated browser screenshots as release evidence.

## Next Phase Readiness

Ready for `07-02`: public landing and auth routes can now be redesigned against the shared shell/primitives while authenticated route navigation has a truthful Hall destination.

---
*Phase: 07-paridade-visual-e-ux-com-prototipo*
*Completed: 2026-06-10*
