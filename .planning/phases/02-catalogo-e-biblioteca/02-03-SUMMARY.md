---
phase: 02-catalogo-e-biblioteca
plan: "03"
subsystem: catalog-library-ui
tags: [nextjs, ui, catalog, library, accessibility]

requires:
  - phase: 02-catalogo-e-biblioteca
    provides: Plan 02-01 catalog public API, source/freshness view models and RAWG attribution contract
  - phase: 02-catalogo-e-biblioteca
    provides: Plan 02-02 library public API, platform state, status policy and match-score view models
provides:
  - Authenticated Catalogo, Biblioteca and Jogo detail routes
  - Thin server actions for Wishlist, platform update and status movement
  - Phase 2 UI tests, E2E skeleton and accessibility route coverage
affects: [ui, catalog, library, auth, accessibility]

tech-stack:
  added: []
  patterns:
    - Server Components compose catalog/library public APIs and pass thin Server Actions to forms
    - RAWG cover images use next/image with explicit remote patterns
    - Phase 2 status feedback is shared across catalog, library and detail routes

key-files:
  created:
    - apps/web/src/app/app/catalogo/page.tsx
    - apps/web/src/app/app/biblioteca/page.tsx
    - apps/web/src/app/app/jogo/[slug]/page.tsx
    - apps/web/src/app/app/phase-2-actions.ts
    - apps/web/src/app/app/phase-2-status.ts
    - apps/web/src/components/match-score-block.tsx
    - apps/web/src/modules/catalog/presentation/catalog-card.tsx
    - apps/web/src/modules/catalog/presentation/source-metadata.tsx
    - apps/web/src/modules/library/presentation/library-status-controls.tsx
    - apps/web/src/modules/library/presentation/platform-picker.tsx
    - apps/web/tests/catalog-library-ui.test.tsx
    - apps/web/tests/phase-2-e2e.spec.ts
  modified:
    - apps/web/next.config.ts
    - apps/web/src/components/app-shell.tsx
    - apps/web/src/app/app/page.tsx
    - apps/web/src/app/globals.css
    - apps/web/src/modules/catalog/index.ts
    - apps/web/src/modules/catalog/presentation/view-models.ts
    - apps/web/src/modules/library/index.ts
    - apps/web/tests/accessibility.spec.ts
    - apps/web/tests/brand-ui.test.tsx

key-decisions:
  - "Route server actions live in app composition and delegate mutations to the library public API; they only map results to redirects/status messages."
  - "The catalog page keeps the Tinder-like direction visible through a suggested eligible card plus browse/search grid, without Phase 3 double-like behavior."
  - "Zerado and Dropado are rendered as disabled future states in Phase 2, while Wishlist/Jogando/Pausado remain active."

patterns-established:
  - "Shared compatibility UI lives in app components so catalog and library do not deep-import each other's presentation internals."
  - "Catalog detail view models expose sourced time/availability facts for honest detail-page metadata."

requirements-completed: [CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, LIB-01, LIB-02, LIB-03, LIB-04, LIB-05]

duration: 19 min
completed: 2026-06-03
---

# Phase 02 Plan 03: Catalog, Library And Game Detail UI Summary

**Authenticated Phase 2 surfaces for sourced discovery, shared library organization and practical duo compatibility**

## Performance

- **Duration:** 19 min
- **Started:** 2026-06-03T21:49:00Z
- **Completed:** 2026-06-03T22:08:00Z
- **Tasks:** 5
- **Files modified:** 21

## Accomplishments

- Added authenticated navigation for Fila, Catalogo, Biblioteca, Dupla and Perfil.
- Updated `/app` to summarize real library counts, common platforms and honest next actions.
- Added `/app/catalogo` with search, eligible suggested card, supporting browse grid, RAWG attribution and Wishlist action.
- Added `/app/biblioteca` with current-member platform picker, common-platform summary, status filters/groups, match factors and disabled future states.
- Added `/app/jogo/[slug]` with cover, description, release/genre/platform facts, sourced time/availability metadata, library context, status controls and a compact future journey area.
- Added focused UI tests, Phase 2 E2E skeleton and accessibility coverage for the new authenticated routes.

## Task Commits

Implementation was committed in two grouped commits because shared CSS and presentation components span multiple Phase 2 route tasks:

1. **Catalog, library and detail surfaces** - `7e58851` (`feat(02-03): add catalog library app surfaces`)
2. **UI/E2E/accessibility coverage** - `aa28c69` (`test(02-03): cover catalog library UI flows`)

**Plan metadata:** pending metadata commit

## Files Created/Modified

- `apps/web/src/app/app/catalogo/page.tsx` - Catalog browse/search route and suggested-card flow.
- `apps/web/src/app/app/biblioteca/page.tsx` - Shared library route with platforms, filters, groups and status controls.
- `apps/web/src/app/app/jogo/[slug]/page.tsx` - Catalog/library game detail route.
- `apps/web/src/app/app/phase-2-actions.ts` - Thin Server Actions for library mutations and safe redirects.
- `apps/web/src/app/app/phase-2-status.ts` - Shared Phase 2 status message mapping.
- `apps/web/src/components/match-score-block.tsx` - Shared qualitative compatibility block.
- `apps/web/src/modules/catalog/presentation/*` - Catalog card/source metadata components and detail sourced facts.
- `apps/web/src/modules/library/presentation/*` - Platform picker and Phase 2 status controls.
- `apps/web/src/app/globals.css` - Responsive catalog, library and detail layouts.
- `apps/web/tests/catalog-library-ui.test.tsx` - Focused render tests for Phase 2 surfaces.
- `apps/web/tests/phase-2-e2e.spec.ts` - Env-gated browser flow from catalog to library/detail.
- `apps/web/tests/accessibility.spec.ts` and `apps/web/tests/brand-ui.test.tsx` - Updated authenticated route coverage.

## Decisions Made

- Used `next/image` for RAWG covers and added RAWG remote image patterns in `next.config.ts`.
- Kept the suggested catalog card restricted to the normal `searchCatalogGames` main-flow behavior, while the supporting grid can include non-primary records with clear labels.
- Kept route-level mutation logic limited to authenticated session lookup, form parsing, public API calls and presentation redirects.
- Did not add Principal ordering, drag-and-drop, sessions, checkpoints, milestones or double-confirmed Zerado/Dropado controls in Phase 2.

## Deviations from Plan

- The source implementation was committed in one grouped commit rather than one commit per UI task because route CSS, shared components and page composition are coupled.
- Browser screenshot review could not inspect authenticated Phase 2 pages locally: the running dev server responds, but `/app/catalogo` redirects to `/login` without a ready-user authenticated fixture.

**Total deviations:** 2 documented.
**Impact on plan:** No product scope change; one verification item remains fixture-dependent.

## Issues Encountered

- Initial UI tests needed scoped assertions because navigation links and page action links intentionally share names.
- The env-gated Phase 2 Playwright flow skipped locally due missing `E2E_BASE_URL`, `E2E_READY_USER_EMAIL`, `E2E_READY_USER_PASSWORD` and `E2E_PHASE2_CATALOG_SLUG` in the process environment.
- Root database integration tests skipped because `TEST_DATABASE_URL` is not configured in the process environment.

## Verification

- `pnpm --filter @queue/web typecheck` -> passed.
- `pnpm --filter @queue/web test -- catalog-library-ui` -> passed.
- `pnpm --filter @queue/web test` -> passed, 84 tests.
- `pnpm check:architecture` -> passed.
- `pnpm --filter @queue/web test:e2e -- tests/phase-2-e2e.spec.ts` -> skipped with explicit missing fixture output.
- `pnpm lint` -> passed.
- `pnpm check:secrets` -> passed.
- `pnpm typecheck` -> passed.
- `pnpm test` -> passed.
- `pnpm test:integration` -> passed with DB integration tests skipped due missing `TEST_DATABASE_URL`.
- `pnpm --filter @queue/web build` -> passed.
- Local dev server probe -> `http://127.0.0.1:3000/` and `/app/catalogo` responded; authenticated catalog redirected to `/login` without a session.

## User Setup Required

For full browser validation:

- Configure `E2E_BASE_URL`.
- Configure `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD` for a verified named-duo user.
- Configure `E2E_PHASE2_CATALOG_SLUG` for a synchronized catalog game.
- Configure `TEST_DATABASE_URL` to run Neon/Postgres integration tests instead of skips.

## Next Phase Readiness

Phase 3 can build real two-person discovery/match behavior on top of the visible suggested-card catalog flow and shared Wishlist/library state. Phase 4 can later activate sessions, progress, Principal ordering, and double confirmation for Zerado/Dropado without contradicting the Phase 2 UI.

---
*Phase: 02-catalogo-e-biblioteca*
*Completed: 2026-06-03*
