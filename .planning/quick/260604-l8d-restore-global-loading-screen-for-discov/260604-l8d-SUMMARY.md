---
quick_id: 260604-l8d
status: complete
completed: 2026-06-04T18:19:00Z
---

# Quick Task Summary: Restore Global Loading Screen For Discovery

## Completed

- Removed the Discovery route-specific loader.
- Removed the unused `.discovery-loading` selector from global CSS.
- Added a brand UI regression assertion that `src/app/app/descobrir/loading.tsx` is absent.
- Code commit: `9ea4ee2`.

## Verification

- `pnpm --filter "@queue/web" test -- brand-ui` passed.
- `pnpm --filter "@queue/web" typecheck` passed.

## Changed Files

- `apps/web/src/app/app/descobrir/loading.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/tests/brand-ui.test.tsx`
