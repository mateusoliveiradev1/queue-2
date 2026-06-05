---
quick_id: 260605-lsf
slug: fix-library-status-refresh-action-sheet
status: complete
created: 2026-06-05T03:31:00.000Z
---

# Fix Library Status Refresh And Action Sheet

## Goal

Fix Biblioteca status moves so a game moved to Jogando/Pausado updates the visible queue immediately, and fix the Mais acoes sheet clipping/overflow on library cards.

## Tasks

- [x] Make enhanced Biblioteca status mutations refresh the current route after a successful server result.
- [x] Keep Catalogo Wishlist enhanced actions local; do not reintroduce Catalogo route refresh.
- [x] Allow Library card action sheets to render above the card instead of being clipped.
- [x] Add regression tests for route refresh and action sheet overflow.
- [x] Run focused UI tests, visual layout measurements and full verification before commit/push/deploy.
