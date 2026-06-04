---
status: complete
completed: 2026-06-03
quick_id: 260603-its
commit: 10a65d6
---

# Quick Task 260603-its: Fechar skips de integracao - Summary

## Outcome

The integration gate now runs through the root command with `TEST_DATABASE_URL` loaded from `.env.local`, without replaying stale Turbo skip output.

## Changes

- Added `scripts/with-env-local.mjs` to load `.env.local` for local commands while preserving already-set environment variables.
- Updated `pnpm test:integration` to use the env wrapper.
- Disabled Turbo cache for `test:integration` and declared `TEST_DATABASE_URL` as an allowed task environment variable.
- Fixed library integration fixtures to use unambiguous SQL parameters and unique catalog slugs on persistent test branches.

## Verification

- `pnpm test:integration` passed: 9 files, 23 tests, 0 skips.
- `pnpm catalog:seed-curation -- --dry-run` passed with 12 localization inputs and 3 availability inputs.
- `pnpm typecheck` passed.
- `pnpm test` passed: 12 files, 106 tests.
- `pnpm lint` passed.
- `pnpm check:architecture` passed.
- `pnpm check:secrets` passed.

## Notes

- The integration run still emits the current `pg` SSL-mode compatibility warning for `sslmode=require`; it does not block the gate.
