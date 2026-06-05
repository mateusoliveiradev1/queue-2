---
quick_id: 260605-mbf
slug: fix-mobile-library-filter-overlap
status: complete
created: 2026-06-05T03:14:00.000Z
---

# Fix Mobile Library And Catalog Action Overlap

## Goal

Fix the mobile Biblioteca layout where the filter panel and first result card can sit underneath the fixed bottom navigation, and fix Catalogo Wishlist action feedback/layout regressions before redeploy.

## Tasks

- [x] Keep the Biblioteca filter section in normal flow on mobile instead of sticky.
- [x] Add mobile bottom padding and scroll margins to Biblioteca result areas and cards.
- [x] Keep the filter sheet above the bottom nav when opened.
- [x] Keep Catalogo action feedback stacked inside its form instead of squeezed beside the button.
- [x] Avoid revalidating the current Catalogo route during enhanced Wishlist mutations so the user is not thrown into a full-page loading screen.
- [x] Add a local Catalogo loading shell so route loading preserves authenticated navigation context.
- [x] Add CSS/source guards and rerun focused UI plus full verification.
