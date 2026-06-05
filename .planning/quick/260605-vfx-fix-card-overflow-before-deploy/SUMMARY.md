---
quick_id: 260605-vfx
slug: fix-card-overflow-before-deploy
status: complete
completed: 2026-06-05T03:08:10.000Z
---

# Summary

Fixed the card overflow reported in Catalogo and recent matches before deploy.

## Changes

- Hid idle `ActionFeedback` rows so compact cards do not render a stray empty `/2` box below actions.
- Changed action feedback button layout to `minmax(0, 1fr)` so labels can wrap inside the button instead of forcing overflow.
- Increased Catalogo card grid minimum width to 420px and collapsed narrow card containers to a single-column layout.
- Clamped long Catalogo, Biblioteca and match-history titles to prevent generated IDs from overlapping support copy.
- Added CSS source guards to Catalogo/Biblioteca, Discovery and performance mutation UI tests.

## Verification

- `pnpm --filter @queue/web test -- catalog-library-ui discovery-ui performance-mutation-ui` - passed, 3 files / 33 tests.
- `pnpm verify` - passed, including `@queue/db:test:integration` with 12 files / 32 tests and no DB setup skips.
