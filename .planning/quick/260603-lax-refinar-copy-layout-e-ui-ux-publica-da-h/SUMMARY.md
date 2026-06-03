---
quick_id: 260603-lax
slug: refinar-copy-layout-e-ui-ux-publica-da-h
status: complete
completed: 2026-06-03T18:36:00Z
---

# Quick Task Summary

## Delivered

- Used the local Impeccable repo as an explicit reference for brand/product register, polish and anti-pattern rules.
- Rewrote public copy for `/`, `/login`, `/cadastro`, `/verificar-email`, `/recuperar-senha` and `/parear`.
- Removed internal phase language from the home and replaced it with the public Phase 1 promise: verified account, revocable invite and fixed duo.
- Added form-level headings and support copy so auth panels read as task surfaces, not empty form cards.
- Refined the home board from nested-card treatment into a lined ritual panel.
- Added hover/active/input polish while preserving reduced-motion behavior.
- Updated unit tests for the new copy.

## Verification

- Passed: local Impeccable detector on public app files.
- Passed: `pnpm --filter @queue/web typecheck`
- Passed: `pnpm --filter @queue/web test`
- Passed: `pnpm --filter @queue/web build`
- Passed: public Playwright accessibility for `/`, `/login`, `/cadastro`, `/verificar-email`, `/recuperar-senha`.
- Browser screenshots inspected for desktop/mobile home, login and signup with no horizontal overflow.

## Notes

- No auth behavior, database schema, RLS, server actions or route authorization changed.
- The final marketing landing remains Phase 7. This pass makes the current public entry feel intentional without pretending catalog/library features are already live.
