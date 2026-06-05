---
quick_id: 260605-acx
slug: close-library-action-sheet
status: complete
completed: 2026-06-05T03:46:18.000Z
---

# Summary

## Changes

- Replaced the native Biblioteca `Mais acoes` details control with a controlled action sheet using `aria-expanded` and `data-open`.
- Added explicit `Fechar`, outside pointer dismissal and Escape dismissal.
- Updated card action sheet CSS and E2E selectors for the controlled open state.
- Added UI regression coverage for Fechar, outside click and Escape close behavior.

## Verification

- `pnpm --filter @queue/web test -- catalog-library-ui performance-mutation-ui`
- `pnpm verify`
