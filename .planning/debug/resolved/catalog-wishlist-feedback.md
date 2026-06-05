---
status: resolved
trigger: "Production Catalog Wishlist action shows success but the card does not change, making the click feel like nothing happened."
created: 2026-06-05T01:08:00.000Z
updated: 2026-06-05T01:15:00.000Z
root_cause: "Catalog cards rendered catalog-only data and did not read current duo library status for visible games."
fix: "Added a bounded library status read, rotated the main Catalog suggestion past already-added games, rendered queued cards as already in Biblioteca, and revalidated Catalog/Biblioteca paths after mutations."
verification: "Focused library/catalog tests, web typecheck, architecture gate and web build passed."
files_changed:
  - apps/web/src/app/app/catalogo/page.tsx
  - apps/web/src/app/app/phase-2-actions.ts
  - apps/web/src/app/globals.css
  - apps/web/src/modules/catalog/presentation/catalog-card.tsx
  - apps/web/src/modules/catalog/presentation/catalog-wishlist-submit-button.tsx
  - apps/web/src/modules/library/application/get-library-game-statuses.ts
  - apps/web/src/modules/library/application/ports.ts
  - apps/web/src/modules/library/index.ts
  - apps/web/src/modules/library/infrastructure/library-repository.ts
---

# Debug Session: Catalog Wishlist Feedback

## Symptoms

- Expected behavior: after adding a Catalog game to Wishlist, the Catalog surface should visibly react and the user should understand the game is now in the shared Biblioteca.
- Actual behavior: the URL gets `estado=wishlist-adicionada` and a toast/banner appears, but the same card still shows `Adicionar a Wishlist`.
- Error messages: none reported.
- Timeline: observed in production after Phase 03.2 deploy.
- Reproduction: open `/app/catalogo`, click `Adicionar a Wishlist` on a card, observe the card still looks addable.

## Current Focus

- hypothesis: Catalog cards render from catalog-only data and do not know the current duo library status.
- test: inspect Catalog page/action/card and add regression tests for already-queued cards.
- expecting: the Server Action succeeds, but Catalog page lacks a library-status read for visible catalog ids.
- next_action: resolved.

## Evidence

- timestamp: 2026-06-05T01:08:00.000Z
  note: `phase-2-actions.ts` redirects back with `estado=wishlist-adicionada`; `catalogo/page.tsx` rendered `CatalogCard` from `searchCatalogGames` only.
- timestamp: 2026-06-05T01:15:00.000Z
  note: Added `getLibraryGameStatuses`, Catalog status-aware card rendering, pending submit state and `revalidatePath` for Catalog/Biblioteca.

## Eliminated

- hypothesis: The Server Action never runs.
  reason: Production screenshot shows the success state and toast, so the mutation path completed.

## Resolution

The Server Action was working; the Catalog page had no post-mutation read model for "this visible card is already in the duo library". The fix makes Catalog cards status-aware and rotates the main suggestion to the next unqueued candidate.

## Verification

- `pnpm --filter @queue/web test -- library-application library-domain catalog-library-ui`
- `pnpm --filter @queue/web typecheck`
- `pnpm check:architecture`
- `pnpm --filter @queue/web build`
