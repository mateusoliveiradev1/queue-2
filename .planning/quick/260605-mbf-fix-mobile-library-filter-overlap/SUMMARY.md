---
quick_id: 260605-mbf
status: complete
completed: 2026-06-05T03:22:00.000Z
---

# Summary

Fixed the mobile Biblioteca filter/result overlap and the Catalogo Wishlist feedback/loading regression reported from production screenshots.

## Changes

- Biblioteca mobile filters now stay in normal document flow, and opened filter sheets cap their height above the fixed bottom navigation.
- Biblioteca result areas and cards reserve scroll space above the bottom nav on mobile.
- Catalogo action feedback forms stack inside their card slot instead of squeezing the green submit button beside a large feedback panel.
- Enhanced Catalogo Wishlist mutations no longer revalidate the current Catalogo route; they revalidate the dashboard and Biblioteca surfaces only.
- Catalogo now has a route-local loading shell inside the authenticated app navigation, avoiding the full-screen global loading fallback for route-level waits.
- Regression guards were added for the mobile CSS, Catalogo loading shell, and enhanced Wishlist revalidation contract.

## Verification

- `pnpm --filter @queue/web test -- catalog-library-ui performance-mutation-ui`
- `pnpm verify`
